import { mapToHebrew } from "./versification";
import { renderPassage } from "./textFormatting";
import { App, Editor } from "obsidian";
import type { VerseCard } from "./verseCard";
import { ScriptureRef, refToString, parseScriptureRefs, previewRef } from "./parser";
import { getScripture, sourceLabel } from "./fetcher";
import { fillVersionMenu } from "./versionMenu";
import { embedSingleRef, embedInterlinear, getGlobalEmbedStyle, setGlobalEmbedStyle, setCachedCursorOffset, clearCachedCursorOffset } from "./embedEngine";
import { ScriptureScribeSettings, VERSION_CODES, DEFAULT_SETTINGS } from "./settings";
import { parseMorph } from "./morphParser";
import {
  fetchInterlinear, fetchStrongsDefinition, expandMorphCode,
  setActiveInterlinear, clearActiveInterlinear, OT_BOOKS
} from "./interlinear";
import type { EmbedStyle } from "./settings";
import { buildSimpleDefinition, buildSimpleDom, buildAdvancedDefinition, makeSpeakerLink, makeGlobeLink, isDefAdvanced, toggleDefAdvanced, DefCallbacks, setDefPalette } from "./defHelpers";
import { getKJVText } from "./searchIndex";
import { ensureCrossRefData, getCrossRefs, isCrossRefLoaded } from "./crossRefs";
import {
  BookPalette,
  getBookPalette,
  getRefBookColor,
  getRefBookPalette,
  contrastSafeText,
  contrastSafePalette,
  DEFAULT_PALETTE,
} from "./bookColorUtils";

// ── Colour palette — instance-derived from bookColorUtils ────────────────────
const _DP = DEFAULT_PALETTE; // used only in static buildDOM() before instance palette is set

// Shared button height — every control in the toolbar uses this so they are
// pixel-identical in height. Change this one constant to resize them all.
const BTN_H = "24px";

export class ScriptureTooltip {
  private el: HTMLElement;
  private app: App;
  settings: ScriptureScribeSettings;
  private currentRef: ScriptureRef | null = null;
  private _lastEditor: Editor | null = null;

  // ── Instance palette (updated per hovered book) ────────────────────────────
  private P:  string = DEFAULT_PALETTE.base;
  private PL: string = DEFAULT_PALETTE.light;
  private PM: string = DEFAULT_PALETTE.mid;
  private PD: string = DEFAULT_PALETTE.dark;
  private PX: string = DEFAULT_PALETTE.textOnLight; // readable accent ON the PL card bg
  private PV: string = DEFAULT_PALETTE.textOnVivid;  // readable text ON the vivid hover fill
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private interlinearState: "off" | "MT" | "LXX" = "off";
  private activeTooltipCard: HTMLElement | null = null;

  /** Full-screen verse card (set by the plugin); used instead of the tooltip in Card Mode */
  card: VerseCard | null = null;
  cardContext: ((ref: ScriptureRef, text: string, editor: Editor | null) => {noteText?: string; contrastText?: string}) | null = null;

  // ── Card trigger keys (Card Mode can require holding Shift / Ctrl) ──
  private mods = { shift: false, ctrl: false };

  private get cardEnabled(): boolean {
    return !!this.card && this.settings.display.cardMode === true;
  }

  private triggerHeld(): boolean {
    const t = this.settings.display.cardTrigger ?? "always";
    return t === "always" || (t === "shift" && this.mods.shift) || (t === "ctrl" && this.mods.ctrl);
  }

  /** True when a hover right now should become a full-screen card */
  private get cardModeOn(): boolean {
    return this.cardEnabled && this.triggerHeld();
  }

  private syncMods = (e: KeyboardEvent | MouseEvent): void => {
    if (this.mods.shift === e.shiftKey && this.mods.ctrl === e.ctrlKey) return;
    this.mods.shift = e.shiftKey;
    this.mods.ctrl  = e.ctrlKey;
    this.onModsChanged();
  };
  private clearMods = (): void => {
    if (!this.mods.shift && !this.mods.ctrl) return;
    this.mods.shift = this.mods.ctrl = false;
    this.onModsChanged();
  };

  /** Pressing/releasing the trigger key while hovering swaps tooltip ⇄ card live */
  private onModsChanged(): void {
    if (!this.cardEnabled || (this.settings.display.cardTrigger ?? "always") === "always") return;
    if (this.triggerHeld()) {
      if (this.currentRef && !this.card!.isVisible()) {
        this.cancelHide();
        this.el.style.display = "none";
        void this.showAsCard(this.currentRef);
      }
    } else if (this.card!.isVisible()) {
      this.card!.hide();
    }
  }

  private get isOT(): boolean {
    if (!this.currentRef) return false;
    return OT_BOOKS.has(this.currentRef.book);
  }
  private saveSettings: () => Promise<void>;

  constructor(app: App, settings: ScriptureScribeSettings, saveSettings: () => Promise<void>) {
    this.app      = app;
    this.settings = settings;
    this.saveSettings = saveSettings;
    this.el       = this.buildDOM();
    document.body.appendChild(this.el);

    // Keep card alive while mouse is over it
    this.el.addEventListener("mouseenter", () => this.cancelHide());
    this.el.addEventListener("mouseleave", () => this.scheduleHide());

    // Stop clicks inside the card from bubbling to the document dismiss
    // handler in main.ts — use bubble phase (no third arg / false) so that
    // button onclick handlers fire first, THEN we stop propagation.
    this.el.addEventListener("click", (e) => e.stopPropagation());

    // Discreet "switch to full-screen card mode" button
    const cardBtn = this.q<HTMLElement>(".ss-card-btn")!;
    cardBtn.onclick = (e) => { e.stopPropagation(); void this.setCardMode(true, true); };
    cardBtn.addEventListener("mouseenter", () => { cardBtn.style.opacity = "1"; });
    cardBtn.addEventListener("mouseleave", () => { cardBtn.style.opacity = "0.5"; });

    window.addEventListener("keydown", this.syncMods, true);
    window.addEventListener("keyup", this.syncMods, true);
    window.addEventListener("mousemove", this.syncMods, true);
    window.addEventListener("blur", this.clearMods);
  }

  // ── Build DOM ─────────────────────────────────────────────────

  private buildDOM(): HTMLElement {
    const w = document.createElement("div");
    w.className = "ss-tooltip";
    w.style.cssText = `
      position:fixed; z-index:9999; display:none; flex-direction:column;
      width:340px; max-width:calc(100vw - 20px);
      background:var(--background-primary);
      backdrop-filter:blur(18px) saturate(1.6);
      -webkit-backdrop-filter:blur(18px) saturate(1.6);
      border:1px solid var(--background-modifier-border);
      border-radius:10px;
      box-shadow:0 8px 32px rgba(0,0,0,0.22),0 1px 4px rgba(0,0,0,0.10);
      font-family:var(--font-interface,-apple-system,sans-serif);
      font-size:13px; overflow:hidden;
    `;

    w.innerHTML = `
      <div class="ss-bar" style="
        display:flex; align-items:center; justify-content:space-between;
        padding:5px 8px; flex-shrink:0;
        background:var(--background-secondary);
        border-bottom:1px solid var(--background-modifier-border);
        gap:6px;
      ">
        <div style="display:flex;align-items:center;gap:5px;min-width:0;overflow:hidden;">

          <button class="ss-ver-btn" style="
            box-sizing:border-box;
            height:${BTN_H}; padding:0 7px;
            background:${_DP.base}; color:${_DP.light};
            border:none; border-radius:4px;
            cursor:pointer; font-size:10px; font-weight:700;
            display:flex; align-items:center; gap:2px;
            flex-shrink:0; white-space:nowrap;
          "><span class="ss-ver-label">KJV</span><span style="font-size:8px;opacity:.75;margin-left:1px;">▾</span></button>

          <span class="ss-ref-lbl" style="
            font-size:11px; font-weight:600; color:var(--text-normal);
            white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
          "></span>
        </div>

        <div style="display:flex;align-items:center;gap:3px;flex-shrink:0;">

          <button class="ss-card-btn" title="Card Mode — show verses as full-screen cards" style="
            box-sizing:border-box;
            width:${BTN_H}; height:${BTN_H};
            padding:0; margin-right:2px;
            background:transparent; color:var(--text-muted);
            border:none; border-radius:4px;
            cursor:pointer; opacity:0.5;
            display:flex; align-items:center; justify-content:center;
            transition:opacity 0.15s;
          "><svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"/></svg></button>

          <button class="ss-int-btn" title="Interlinear" style="
            box-sizing:border-box;
            width:${BTN_H}; height:${BTN_H};
            padding:0;
            background:transparent; color:${_DP.base};
            border:1px solid ${_DP.mid}; border-radius:4px;
            cursor:pointer;
            font-size:13px; font-style:italic; font-weight:700;
            font-family:Georgia,serif;
            line-height:${BTN_H}; text-align:center;
            transition:background 0.1s, color 0.1s, border-color 0.1s;
          ">α</button>

          <button class="ss-emb-btn" style="
            box-sizing:border-box;
            height:${BTN_H}; padding:0 8px;
            background:${_DP.base}; color:${_DP.light};
            border:none; border-radius:4px 0 0 4px;
            cursor:pointer; font-size:10px; font-weight:700;
            white-space:nowrap; line-height:${BTN_H};
          ">Embed</button>

          <button class="ss-emb-caret" style="
            box-sizing:border-box;
            width:18px; height:${BTN_H};
            padding:0;
            background:${_DP.base}; color:${_DP.light};
            border:none; border-left:1px solid ${_DP.mid};
            border-radius:0 4px 4px 0;
            cursor:pointer; font-size:9px;
            line-height:${BTN_H}; text-align:center;
          ">▾</button>
        </div>
      </div>

      <div class="ss-ver-dd" style="
        display:none; position:absolute; top:36px; left:8px;
        background:var(--background-primary);
        border:1px solid var(--background-modifier-border);
        border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,0.13);
        z-index:10002; min-width:110px; overflow:hidden;
      "></div>

      <div class="ss-emb-dd" style="
        display:none; position:absolute; top:36px; right:8px;
        background:var(--background-primary);
        border:1px solid var(--background-modifier-border);
        border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,0.13);
        z-index:10002; min-width:150px; overflow:hidden;
      ">
        <div class="ss-eopt" data-style="link"    style="padding:7px 12px;cursor:pointer;font-size:12px;">🔗 URL Link</div>
        <div class="ss-eopt" data-style="tooltip" style="padding:7px 12px;cursor:pointer;font-size:12px;">📎 MD Footnote</div>
        <div class="ss-eopt" data-style="quote"   style="padding:7px 12px;cursor:pointer;font-size:12px;">❝ Quote Block</div>
      </div>

      <div class="ss-verse-panel" style="flex:1; overflow-y:auto; min-height:0; display:flex; flex-direction:column;">
        <div class="ss-text" style="
          padding:10px 13px; font-size:13px; color:var(--text-normal);
          line-height:1.75;
        "></div>
        <div class="ss-xref" style="
          display:none; padding:4px 10px 6px; gap:5px;
          flex-wrap:wrap;
        "></div>
        <div class="ss-foot" style="
          padding:3px 11px 5px;
          font-size:10px; color:var(--text-muted);
          border-top:1px solid var(--background-modifier-border);
          display:flex; justify-content:space-between; margin-top:auto;
        ">
          <span class="ss-src"></span>
          <span class="ss-offline" style="display:none;color:var(--text-error);">⚠ Offline – KJV</span>
        </div>
      </div>

      <div class="ss-int-panel" style="display:none; flex:1; overflow-y:auto; min-height:0; flex-direction:column;">
        <div class="ss-grid" style="
          padding:7px 7px 4px; display:flex; flex-wrap:wrap; gap:4px;
          align-content:flex-start;
        "></div>
        <div class="ss-sdef" style="
          display:none; margin:2px 7px 7px; border-radius:6px;
          padding:8px 10px; background:${_DP.light}; border:1px solid ${_DP.mid};
        ">
          <div class="ss-sdef-hdr" style="
            display:flex; align-items:center; gap:4px; margin-bottom:6px;
          ">
            <div class="ss-shdr" style="
              flex:1; min-width:0; font-size:10px; color:${_DP.base}; font-weight:700;
            "></div>
            <span class="ss-speaker-wrap" style="flex-shrink:0; display:inline-flex;"></span>
            <button class="ss-def-toggle" style="
              background:none; border:none; cursor:pointer; outline:none; box-shadow:none;
              font-size:9px; font-weight:700; color:${_DP.base};
              padding:0; line-height:1; flex-shrink:0;
              text-decoration:underline; text-underline-offset:2px;
            ">simple</button>
          </div>
          <div class="ss-sbdy-simple" style="min-height:8px;"></div>
          <div class="ss-sbdy-advanced" style="display:none;"></div>
        </div>
      </div>
    `;
    return w;
  }

  // ── Show ──────────────────────────────────────────────────────

  async show(ref: ScriptureRef, x: number, y: number, editor: Editor, hoverOffset?: number | null): Promise<void> {
    const source = ref; // as written in the note; embedding replaces this exact text
    ref = previewRef(ref);
    this.cancelHide();
    this.currentRef  = ref;
    this._lastEditor = editor;
    this.activeTooltipCard = null;
    clearActiveInterlinear();

    if (hoverOffset != null && !isNaN(hoverOffset)) {
      setCachedCursorOffset(hoverOffset);
    } else {
      setCachedCursorOffset(editor.posToOffset(editor.getCursor()));
    }

    // Update palette for the book being hovered
    this.updatePaletteForRef(ref);
    this.applyPaletteToDOM();

    if (this.cardModeOn) {
      this.el.style.display = "none";
      await this.showAsCard(ref);
      return;
    }

    this.resetToVersePanel();
    this.updateIntBtn();
    this.closeDropdowns();
    this.position(x, y);
    this.el.style.display = "flex";

    const refLbl = this.q<HTMLElement>(".ss-ref-lbl")!;
    const textEl = this.q<HTMLElement>(".ss-text")!;
    const srcEl  = this.q<HTMLElement>(".ss-src")!;
    const offEl  = this.q<HTMLElement>(".ss-offline")!;
    const verLbl = this.q<HTMLElement>(".ss-ver-label")!;

    refLbl.textContent  = refToString(ref);
    textEl.textContent  = "Loading…";
    srcEl.textContent   = "";
    offEl.style.display = "none";

    const verse = await getScripture(ref, this.settings);
    if (this.currentRef !== ref) return; // ref changed while fetching

    renderPassage(textEl, verse.formattedText ?? verse.text);
    verLbl.textContent = verse.version;
    srcEl.textContent  = sourceLabel(verse);

    this.wireVersion(ref, editor, verLbl);
    this.wireEmbed(source, editor);
    this.wireInterlinear(ref);
    await ensureCrossRefData();
    if (this.currentRef !== ref) return;
    this.renderCrossRefChips(ref, editor);

    // If interlinear was active from the previous verse, open it immediately
    if (this.interlinearState !== "off") {
      this.openInterlinear(ref);
    }
  }

  // ── Card Mode ─────────────────────────────────────────────────

  private async showAsCard(ref: ScriptureRef, force = false): Promise<void> {
    const shown = previewRef(ref);
    const verse = await getScripture(shown, this.settings);
    if (this.currentRef !== ref || !this.card) return; // left the verse while fetching
    await this.card.show({
      key: refToString(shown),
      reference: refToString(shown),
      text: verse.text,
      formattedText: verse.formattedText,
      lazyContext: this.cardContext ? () => this.cardContext!(ref, verse.text, this._lastEditor) : undefined,
      version: verse.version,
      book: ref.book,
      testament: OT_BOOKS.has(ref.book) ? "ot" : "nt",
      palette: { base: this.P, light: this.PL, mid: this.PM, dark: this.PD },
    }, force);
  }

  getRecordingEditor(): Editor | null { return this._lastEditor; }

  async showRecordingRef(ref: ScriptureRef, editor: Editor): Promise<void> {
    this.cancelHide();
    this.currentRef = ref;
    this._lastEditor = editor;
    await this.showAsCard(ref, true);
  }

  /**
   * Switch between tooltip and full-screen card display. `preview` (used by the
   * tooltip's own toggle button) flashes the card for the verse that was open,
   * since the mouse is no longer over a link to trigger it.
   */
  async setCardMode(on: boolean, preview = false): Promise<void> {
    const ref = this.currentRef;
    this.settings.display.cardMode = on;
    await this.saveSettings();
    if (on) this.card?.warm(); else this.card?.hide(true);
    if (!preview) return;
    this.hide();
    if (on && ref) {
      this.currentRef = ref;
      await this.showAsCard(ref);
      this.scheduleHide(2600);
    }
  }

  async showStrongs(num: string, x: number, y: number, editor: Editor, morph?: string): Promise<void> {
    this.cancelHide();
    this.currentRef = null;
    this._lastEditor = editor;
    this.activeTooltipCard = null;
    clearActiveInterlinear();
    setCachedCursorOffset(editor.posToOffset(editor.getCursor()));

    const isGreek = /^[Gg]/.test(num);
    const accent = isGreek ? "#5c4dc4" : "#2a7a4a"; // Greek purple vs Hebrew green
    const light  = isGreek ? "#eeedfe" : "#ecf6ef"; 
    const mid    = isGreek ? "#afa9ec" : "#9ecaa7";
    const dark   = isGreek ? "#3c3489" : "#1b5e20";
    this.PX = dark;  // dark fallback for text-on-light in strongs standalone view
    this.PV = "#ffffff";  // these are dark bases, white hover text is fine
    this.P = accent; this.PL = light; this.PM = mid; this.PD = dark;
    setDefPalette(accent, light, mid, dark, dark);
    this.applyPaletteToDOM();

    // Setup UI for definition mode
    this.resetToVersePanel();
    this.q<HTMLElement>(".ss-ref-lbl")!.textContent = num;
    this.q<HTMLElement>(".ss-text")!.textContent = "Finding definition...";
    this.q<HTMLElement>(".ss-int-panel")!.style.display = "flex";
    this.q<HTMLElement>(".ss-verse-panel")!.style.display = "none";
    this.q<HTMLElement>(".ss-grid")!.style.display = "none";
    this.q<HTMLElement>(".ss-int-btn")!.style.display = "none";
    this.position(x, y);
    this.el.style.display = "flex";

    const def = await fetchStrongsDefinition(num);
    if (this.el.style.display === "none") return;

    const sdefEl = this.q<HTMLElement>(".ss-sdef")!;
    sdefEl.style.display = "block";
    sdefEl.innerHTML = ""; // clear old definition icons
    
    if (def) {
      const callbacks: DefCallbacks = {
        onStrongsNum: (n) => this.showStrongs(n, x, y, editor),
        onVerseRef: (r) => { 
          const refs = parseScriptureRefs(r);
          if (refs.length) this.show(refs[0], x, y, editor);
        },
        getVerseText: (r) => getKJVText(r)
      };

      const header = sdefEl.createDiv({ cls: "ss-sdef-hdr" });
      header.style.cssText = `display:flex; align-items:center; gap:4px; margin-bottom:6px;`;
      const title = header.createDiv({ cls: "ss-shdr", text: `${def.number} · ${def.transliteration} · ${def.phonetic}` });
      title.style.cssText = `flex:1; min-width:0; font-size:10px; color:${accent}; font-weight:700;`;
      
      header.appendChild(makeSpeakerLink(def.number, def.original, def.transliteration));
      header.appendChild(makeGlobeLink(def.number));
      
      const toggle = header.createEl("button", { cls: "ss-def-toggle", text: isDefAdvanced() ? "technical" : "simple" });
      toggle.style.cssText = `background:none; border:none; cursor:pointer; outline:none; box-shadow:none; font-size:9px; font-weight:700; color:${accent}; padding:0; line-height:1; flex-shrink:0; text-decoration:underline; text-underline-offset:2px;`;
      toggle.onclick = () => {
        this.toggleDefMode();
        this.showStrongs(num, x, y, editor);
      };

      const bodySimple = sdefEl.createDiv({ cls: "ss-sbdy-simple" });
      bodySimple.textContent = buildSimpleDefinition(def.definition);
      
      const bodyAdvanced = sdefEl.createDiv({ cls: "ss-sbdy-advanced" });
      bodyAdvanced.style.display = isDefAdvanced() ? "block" : "none";
      buildAdvancedDefinition(bodyAdvanced, def.definition, callbacks);
      
      bodySimple.style.display = isDefAdvanced() ? "none" : "block";
      
      // ── Scholar Mode Morphology Breakdown ──────────────────────────────────
      if (morph && this.settings.morphology.enabled) {
        const mDetail = parseMorph(morph);
        if (mDetail) {
          const mWrap = sdefEl.createDiv({ cls: "ss-morph-wrap" });
          mWrap.style.cssText = `margin:10px 0; padding:10px; background:rgba(255,255,255,.6); border-radius:6px; border:1px solid ${this.PM}66; position:relative; overflow:hidden;`;
          
          // Technical Row
          const techRow = mWrap.createDiv({ text: mDetail.techLine });
          techRow.style.cssText = `font-size:10px; font-weight:700; color:${this.PX}; margin-bottom:4px; font-variant:all-small-caps;`;
          
          // Plain English Row (Simple Mode)
          const plainRow = mWrap.createDiv({ text: mDetail.plainLine });
          plainRow.style.cssText = `font-size:11px; color:#2a2838; line-height:1.4; font-style:italic;`;

          // Teaching Note (if significant)
          if (mDetail.note && this.settings.morphology.showTeachingNotes) {
            const noteBox = mWrap.createDiv();
            noteBox.style.cssText = `margin-top:8px; padding-top:8px; border-top:1px dashed ${this.PM}44; font-size:10.5px; color:#3d3a4f; line-height:1.4;`;
            noteBox.innerHTML = `<span style="color:${this.PX}; font-weight:700; margin-right:4px;">💡</span> ${mDetail.note}`;
          }
        }
      }

      this.q<HTMLElement>(".ss-text")!.style.display = "none";
    } else {
      this.q<HTMLElement>(".ss-text")!.textContent = "Could not find a definition for this record.";
    }
  }

  // ── Positioning ───────────────────────────────────────────────

  private position(x: number, y: number): void {
    const W      = 340;
    const margin = 10;
    const vw     = window.innerWidth;
    const vh     = window.innerHeight;

    if (vw < 600) {
      const cardW = Math.min(W, vw - margin * 2);
      this.el.style.width     = `${cardW}px`;
      this.el.style.left      = `${Math.round((vw - cardW) / 2)}px`;
      this.el.style.top       = `${Math.round(vh * 0.18)}px`;
      this.el.style.bottom    = "auto";
      this.el.style.maxHeight = `${vh - Math.round(vh * 0.18) - margin}px`;
      return;
    }

    this.el.style.width = `${W}px`;

    let left = x + 14;
    if (left + W > vw - margin) left = x - W - 14;
    left = Math.max(margin, Math.min(left, vw - W - margin));

    let top = y + 22;
    let maxH = vh - top - margin;

    // flip above cursor if near bottom edge
    if (maxH < 320 && y > 340) {
      top = y - 330;
      maxH = 320;
    }
    
    top = Math.max(margin, top);
    maxH = vh - top - margin;

    this.el.style.left      = `${left}px`;
    this.el.style.top       = `${top}px`;
    this.el.style.bottom    = "auto";
    this.el.style.maxHeight = `${maxH}px`;
  }

  // ── Interlinear ───────────────────────────────────────────────

  private wireInterlinear(ref: ScriptureRef): void {
    const btn = this.q<HTMLElement>(".ss-int-btn")!;
    btn.onclick = (e) => {
      e.stopPropagation();
      
      // Cycle state
      if (this.isOT) {
        if      (this.interlinearState === "off") this.interlinearState = "MT";
        else if (this.interlinearState === "MT")  this.interlinearState = "LXX";
        else                                      this.interlinearState = "off";
      } else {
        if (this.interlinearState === "off") this.interlinearState = "LXX";
        else                                 this.interlinearState = "off";
      }

      if (this.interlinearState === "off") {
        clearActiveInterlinear();
        this.resetToVersePanel();
        this.updateIntBtn();
        this.syncEmbedBtnLabel();
      } else {
        this.updateIntBtn();
        this.syncEmbedBtnLabel();
        this.openInterlinear(ref);
      }
    };
  }

  private updateIntBtn(): void {
    const btn = this.q<HTMLElement>(".ss-int-btn");
    if (!btn) return;
    if (this.currentRef && this.interlinearState === "MT") btn.title = `Hebrew address: ${refToString(mapToHebrew(this.currentRef))}`;

    if (this.interlinearState !== "off") {
      btn.textContent = this.interlinearState === "MT" ? "\u05d0" : "\u03b1";
      btn.style.background = this.P;
      btn.style.color       = this.PL;
      btn.style.borderColor = this.P;
    } else {
      // "off" uses current book
      btn.textContent = this.isOT ? "\u05d0" : "\u03b1";
      btn.style.background  = "transparent";
      btn.style.color = this.P;
      btn.style.borderColor = this.PM;
    }
  }

  private async openInterlinear(ref: ScriptureRef): Promise<void> {
    const versePanel = this.q<HTMLElement>(".ss-verse-panel")!;
    const intPanel   = this.q<HTMLElement>(".ss-int-panel")!;
    const grid       = this.q<HTMLElement>(".ss-grid")!;
    const sdef       = this.q<HTMLElement>(".ss-sdef")!;

    versePanel.style.display = "none";
    intPanel.style.display   = "flex";
    sdef.style.display       = "none";
    grid.innerHTML = `<div style="padding:14px;font-size:12px;color:var(--text-muted);width:100%;text-align:center;">Loading…</div>`;

    const lang  = this.interlinearState === "MT" ? "hebrew" : "greek";
    const version = this.interlinearState === "LXX" ? "LXX" : this.settings.primaryTranslation;
    const words = await fetchInterlinear(ref, lang === "greek" ? "greek" : "hebrew", version);
    if (this.currentRef !== ref || this.interlinearState === "off") return;
    grid.innerHTML = "";

    if (!words.length) {
      clearActiveInterlinear();
      grid.innerHTML = `<div style="padding:14px;font-size:12px;color:var(--text-muted);width:100%;text-align:center;">
        No interlinear data for this verse.<br>
        <span style="font-size:10px;opacity:.7;">Requires internet connection.</span>
      </div>`;
      return;
    }

    setActiveInterlinear(refToString(ref), words);

    for (const word of words) {
      if (!word.original || word.original === "—") continue;
      const card = this.buildTooltipCard(word, sdef);
      grid.appendChild(card);
    }
  }

  // ── Tooltip word card ─────────────────────────────────────────────────────

  private buildTooltipCard(word: any, sdef: HTMLElement): HTMLElement {
    const isHeb = word.language === "hebrew";
    const card  = document.createElement("div");

    card.style.cssText = `
      text-align:center; background:var(--background-secondary);
      border-radius:5px; padding:4px 6px; min-width:44px; max-width:84px;
      border:1px solid var(--background-modifier-border);
      cursor:pointer; display:flex; flex-direction:column; gap:1px;
      transition:border-color 0.15s, background 0.15s, box-shadow 0.15s;
    `;

    const showTranslit = this.settings.display.cardShowTranslit !== false;

    if (this.settings.display.cardShowEnglish !== false && word.english) {
      const el = document.createElement("div");
      el.className = "ss-tc-eng";
      el.textContent = word.english;
      el.style.cssText = `font-size:10px; color:var(--text-normal); margin-bottom:1px;
        white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        transition:color 0.15s;`;
      card.appendChild(el);
    }

    const origEl = document.createElement("div");
    origEl.className = "ss-tc-orig";
    origEl.textContent = word.original;
    origEl.style.cssText = `
      font-size:${isHeb ? "14px" : "12px"};
      color:${this.PM}; font-style:${isHeb ? "normal" : "italic"};
      direction:${isHeb ? "rtl" : "ltr"};
      font-family:${isHeb ? "Georgia,serif" : "inherit"};
      margin-bottom:${showTranslit && word.transliteration ? "1px" : "0"};
      transition:color 0.15s;
    `;
    card.appendChild(origEl);

    if (showTranslit && word.transliteration) {
      const el = document.createElement("div");
      el.className = "ss-tc-translit";
      el.textContent = word.transliteration;
      el.style.cssText = `font-size:8px; color:var(--text-muted); font-style:normal;
        white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        opacity:0.8; transition:color 0.15s;`;
      card.appendChild(el);
    }

    if (word.strongsNum) {
      // Keep dataset.s so click-for-definition always works regardless of visibility
      card.dataset.s = word.strongsNum;
      card.title     = word.strongsNum;

      if (this.settings.display.cardShowStrongs !== false) {
        const snEl = document.createElement("div");
        snEl.className = "ss-tc-snum";
        snEl.textContent = word.strongsNum;
        snEl.style.cssText = `font-size:8px; color:${this.PM}; font-weight:700;
          opacity:0.75; transition:color 0.15s;`;
        card.appendChild(snEl);
      }
    }
    if (word.morph) {
      card.dataset.morph = word.morph;
      if (this.settings.morphology.enabled) {
        const mEl = document.createElement("div");
        mEl.className = "ss-tc-morph";
        mEl.textContent = word.morph;
        mEl.style.cssText = `font-size:8px; color:${this.PM}; font-weight:700;
          opacity:0.8; transition:color 0.15s; margin-top:1px;`;
        card.appendChild(mEl);
      }
    }

    // ── Hover ───────────────────────────────────────────────────────────
    card.addEventListener("mouseenter", () => {
      if (this.activeTooltipCard === card) return; // already selected
      card.style.borderColor = this.P;
      card.style.background = this.P;
      card.style.boxShadow   = `0 2px 8px ${this.P}55`;
      card.querySelector<HTMLElement>(".ss-tc-eng")?.style.setProperty("color", this.PV);
      card.querySelector<HTMLElement>(".ss-tc-orig")?.style.setProperty("color", this.PV);  // PV = dark for bright fills, white for dark
      card.querySelector<HTMLElement>(".ss-tc-translit")?.style.setProperty("color", this.PV === "#ffffff" ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)");
      card.querySelector<HTMLElement>(".ss-tc-morph")?.style.setProperty("color", this.PV === "#ffffff" ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)");
      card.querySelector<HTMLElement>(".ss-tc-snum")?.style.setProperty("color", this.PV === "#ffffff" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.4)");
    });
    card.addEventListener("mouseleave", () => {
      if (this.activeTooltipCard === card) return; // keep selected state
      this.resetTooltipCard(card);
    });

    // ── Click ───────────────────────────────────────────────────────────
    card.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!word.strongsNum) return;

      // Inject spring keyframes once
      if (!document.getElementById("ss-tooltip-card-kf")) {
        const s = document.createElement("style");
        s.id = "ss-tooltip-card-kf";
        s.textContent = `
          @keyframes ss-tc-select {
            0%  { transform:scale(1); }
            35% { transform:scale(1.09); }
            60% { transform:scale(0.95); }
            80% { transform:scale(1.04); }
            100%{ transform:scale(1); }
          }
          @keyframes ss-tc-deselect {
            0%  { transform:scale(1); }
            40% { transform:scale(0.95); }
            100%{ transform:scale(1); }
          }
        `;
        document.head.appendChild(s);
      }

      // Toggle off if same card clicked again
      if (this.activeTooltipCard === card && sdef.style.display !== "none") {
        this.activeTooltipCard = null;
        card.style.animation = "none"; void card.offsetWidth;
        card.style.animation = "ss-tc-deselect 0.24s cubic-bezier(0.34,1.56,0.64,1) forwards";
        this.resetTooltipCard(card);
        sdef.style.display = "none";
        return;
      }

      // Deselect previous
      if (this.activeTooltipCard && this.activeTooltipCard !== card) {
        const prev = this.activeTooltipCard;
        prev.style.animation = "none"; void prev.offsetWidth;
        prev.style.animation = "ss-tc-deselect 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards";
        this.resetTooltipCard(prev);
      }

      this.activeTooltipCard = card;
      card.style.animation = "none"; void card.offsetWidth;
      card.style.animation = "ss-tc-select 0.38s cubic-bezier(0.34,1.56,0.64,1) forwards";
      this.selectTooltipCard(card);
      this.showStrongsPopup(word.strongsNum, word.morph);
    });

    return card;
  }

  // ── Card color helpers (mirrors panel resetCardColors / selectCardColors) ──

  private resetTooltipCard(card: HTMLElement): void {
    card.style.borderColor = "var(--background-modifier-border)";
    card.style.background  = "var(--background-secondary)";
    card.style.boxShadow   = "none";
    card.querySelector<HTMLElement>(".ss-tc-eng")?.style.setProperty("color", "var(--text-normal)");
    card.querySelector<HTMLElement>(".ss-tc-orig")?.style.setProperty("color", this.PM);
    card.querySelector<HTMLElement>(".ss-tc-translit")?.style.setProperty("color", "var(--text-muted)");
    card.querySelector<HTMLElement>(".ss-tc-snum")?.style.setProperty("color", this.PM);
  }

  private selectTooltipCard(card: HTMLElement): void {
    card.style.borderColor = this.P;
    card.style.background = this.PL;
    card.style.boxShadow   = `0 2px 10px ${this.P}33`;
    // PL is a light tint — use PX (contrast-safe dark accent) so text is readable
    card.querySelector<HTMLElement>(".ss-tc-eng")?.style.setProperty("color", "#1a1a1a");
    card.querySelector<HTMLElement>(".ss-tc-orig")?.style.setProperty("color", this.PX);
    card.querySelector<HTMLElement>(".ss-tc-translit")?.style.setProperty("color", "#666");
    card.querySelector<HTMLElement>(".ss-tc-snum")?.style.setProperty("color", this.PX);
    card.querySelector<HTMLElement>(".ss-tc-morph")?.style.setProperty("color", this.PX);  // morph tag
  }

  private async showStrongsPopup(num: string, morphCode?: string): Promise<void> {
    const sdef        = this.q<HTMLElement>(".ss-sdef")!;
    const shdr        = this.q<HTMLElement>(".ss-shdr")!;
    const speakerWrap = this.q<HTMLElement>(".ss-speaker-wrap")!;
    const simple      = this.q<HTMLElement>(".ss-sbdy-simple")!;
    const advanced    = this.q<HTMLElement>(".ss-sbdy-advanced")!;
    const toggle      = this.q<HTMLElement>(".ss-def-toggle")!;

    sdef.style.display  = "block";
    shdr.textContent    = `${num} · loading…`;
    simple.innerHTML    = "";
    advanced.innerHTML  = "";
    if (speakerWrap) speakerWrap.innerHTML = "";

    const callbacks: DefCallbacks = {
      onVerseRef: (rawRef) => {
        const normalised = rawRef.replace(/^([123]?[A-Za-z]+)\./, "$1 ");
        const parsed = parseScriptureRefs(normalised);
        if (parsed.length) {
            const leaves = this.app.workspace.getLeavesOfType("scripture-scribe-panel");
            if (leaves.length > 0) {
                // Route to the Reading Panel
                const view = leaves[0].view as any;
                view.pendingStrongsHighlight = num;
                view.setRef(parsed[0], this._lastEditor);
                this.app.workspace.revealLeaf(leaves[0]);
                this.hide();
            } else {
                // Fallback: Show within the tooltip
                const rect = this.el.getBoundingClientRect();
                this.show(parsed[0], rect.left, rect.top, this._lastEditor!);
            }
        }
      },
      onStrongsNum: (n) => {
          const leaves = this.app.workspace.getLeavesOfType("scripture-scribe-panel");
          if (leaves.length > 0) {
              const view = leaves[0].view as any;
              view.searchInput.value = n;
              view.runSearch();
              this.app.workspace.revealLeaf(leaves[0]);
              this.hide();
          } else {
              this.showStrongsPopup(n);
          }
      },
      getVerseText: (rawRef) => {
        const normalised = rawRef.replace(/^([123]?[A-Za-z]+)\./, "$1 ");
        const parsed = parseScriptureRefs(normalised);
        if (!parsed.length) return null;
        const key = `${parsed[0].book} ${parsed[0].chapter}:${parsed[0].verseStart}`;
        return getKJVText(key) || null;
      },
    };

    const def = await fetchStrongsDefinition(num);

    if (def) {
      const phonetic = def.phonetic ? ` /${def.phonetic}/` : "";
      shdr.innerHTML = `<span class="ss-snum-link" style="cursor:pointer;text-decoration:underline;text-underline-offset:2px;" title="Search ${def.number}">${def.number}</span> <span style="opacity:0.6;">·</span> <span style="font-size:12px;">${def.original}</span> <span style="opacity:0.6;">·</span> ${def.transliteration + phonetic}`;
      
      if (morphCode && this.settings.morphology.enabled) {
        const mDetail = parseMorph(morphCode);
        if (mDetail) {
          const mWrap = simple.createDiv({ cls: "ss-morph-wrap" });
          mWrap.style.cssText = `margin:10px 0; padding:10px; background:rgba(255,255,255,.6); border-radius:6px; border:1px solid ${this.PM}66; position:relative; overflow:hidden;`;
          
          const techRow = mWrap.createDiv({ text: mDetail.techLine });
          techRow.style.cssText = `font-size:10px; font-weight:700; color:${this.PX}; margin-bottom:4px; font-variant:all-small-caps;`;
          
          const plainRow = mWrap.createDiv({ text: mDetail.plainLine });
          plainRow.style.cssText = `font-size:11px; color:#2a2838; line-height:1.4; font-style:italic;`;

          if (mDetail.note && this.settings.morphology.showTeachingNotes) {
            const noteBox = mWrap.createDiv();
            noteBox.style.cssText = `margin-top:8px; padding-top:8px; border-top:1px dashed ${this.PM}44; font-size:10.5px; color:#3d3a4f; line-height:1.4;`;
            noteBox.innerHTML = `<span style="color:${this.PX}; font-weight:700; margin-right:4px;">💡</span> ${mDetail.note}`;
          }
        }
      }

      const link = shdr.querySelector(".ss-snum-link") as HTMLElement;
      if (link) {
        link.addEventListener("click", (e) => {
          e.stopPropagation();
          const leaves = this.app.workspace.getLeavesOfType("scripture-scribe-panel");
          if (leaves.length > 0) {
              const view = leaves[0].view as any;
              view.searchInput.value = def.number;
              view.runSearch();
              this.app.workspace.revealLeaf(leaves[0]);
              this.hide();
          }
        });
      }

      if (speakerWrap) {
        speakerWrap.appendChild(makeSpeakerLink(def.number, def.original, def.transliteration));
        speakerWrap.appendChild(makeGlobeLink(def.number));
      }
      simple.textContent = buildSimpleDefinition(def.definition);
      advanced.innerHTML = "";
      buildAdvancedDefinition(advanced, def.definition, callbacks);
    } else {
      shdr.textContent   = num;
      simple.textContent = "Definition unavailable — check internet connection.";
    }

    this.applyDefMode(simple, advanced, toggle);
    toggle.onclick = (e) => {
      e.stopPropagation();
      this.toggleDefMode();
      this.applyDefMode(simple, advanced, toggle);
    };
  }

  /** Flip simple/technical definitions and remember it: it is the same choice as in settings. */
  private toggleDefMode(): void {
    this.settings.morphology.uiMode = toggleDefAdvanced() ? "advanced" : "simple";
    void this.saveSettings();
  }

  private applyDefMode(
    simple: HTMLElement, advanced: HTMLElement, toggle: HTMLElement
  ): void {
    if (isDefAdvanced()) {
      simple.style.display   = "none";
      advanced.style.display = "block";
      toggle.textContent     = "advanced";
    } else {
      simple.style.display   = "block";
      advanced.style.display = "none";
      toggle.textContent     = "simple";
    }
  }

  private resetToVersePanel(): void {
    const v = this.q<HTMLElement>(".ss-verse-panel");
    const i = this.q<HTMLElement>(".ss-int-panel");
    if (v) v.style.display = "flex";
    if (i) i.style.display = "none";
  }

  // ── Cross-reference chips ─────────────────────────────────────

  private renderCrossRefChips(ref: ScriptureRef, editor: Editor): void {
    const xrefEl = this.q<HTMLElement>(".ss-xref")!;
    xrefEl.innerHTML = "";
    xrefEl.style.display = "none";

    if (!isCrossRefLoaded()) return;
    const all = getCrossRefs(ref);
    if (!all.length) return;

    // Show up to 3 chips — compact, no full previews
    const toShow = all.slice(0, 3);
    xrefEl.style.display = "flex";

    for (const refStr of toShow) {
      const chip = document.createElement("span");
      chip.textContent = refStr;
      const chipColor = getRefBookColor(refStr);
      chip.style.cssText = `
        display:inline-block; padding:2px 7px;
        font-size:10px; font-weight:700; color:${chipColor};
        background:var(--background-secondary); border:1px solid ${chipColor}44;
        border-radius:10px; cursor:pointer; white-space:nowrap;
        transition:background 0.1s, border-color 0.1s;
      `;
      chip.addEventListener("mouseenter", () => {
        chip.style.background = `${chipColor}11`;
        chip.style.borderColor = chipColor;
      });
      chip.addEventListener("mouseleave", () => {
        chip.style.background = "var(--background-secondary)";
        chip.style.borderColor = `${chipColor}44`;
      });
      chip.addEventListener("click", (e) => {
        e.stopPropagation();
        const parsed = parseScriptureRefs(refStr);
        if (!parsed.length) return;
        const rect = this.el.getBoundingClientRect();
        this.show(parsed[0], rect.left, rect.top, editor);
      });
      xrefEl.appendChild(chip);
    }
  }

  // ── Version dropdown ──────────────────────────────────────────

  private wireVersion(ref: ScriptureRef, editor: Editor, verLbl: HTMLElement): void {
    const dd  = this.q<HTMLElement>(".ss-ver-dd")!;
    const btn = this.q<HTMLElement>(".ss-ver-btn")!;
    dd.innerHTML = "";

    btn.onclick = (e) => {
      e.stopPropagation();
      const open = dd.style.display !== "none";
      this.closeDropdowns();
      if (!open) dd.style.display = "block";
    };

    fillVersionMenu(dd, this.settings.primaryTranslation, async (id) => {
      dd.style.display = "none";
      this.settings.primaryTranslation = id;
      await this.saveSettings();
      const t = this.q<HTMLElement>(".ss-text")!;
      t.textContent = "Loading…";
      const verse = await getScripture(ref, this.settings);
      if (this.currentRef !== ref) return;
      renderPassage(t, verse.formattedText ?? verse.text);
      verLbl.textContent = verse.version; // what loaded, not what was asked for
      this.q<HTMLElement>(".ss-src")!.textContent = sourceLabel(verse);
    }, () => this.currentRef);
  }

  // ── Embed buttons ─────────────────────────────────────────────

  private wireEmbed(ref: ScriptureRef, editor: Editor): void {
    const btn   = this.q<HTMLElement>(".ss-emb-btn")!;
    const caret = this.q<HTMLElement>(".ss-emb-caret")!;
    const dd    = this.q<HTMLElement>(".ss-emb-dd")!;

    // Context-aware primary action
    btn.onclick = async (e) => {
      e.stopPropagation();
      if (this.interlinearState !== "off") {
        await embedInterlinear(editor, ref, this.settings);
      } else {
        await embedSingleRef(editor, ref, getGlobalEmbedStyle(this.settings), this.settings);
      }
      this.hide();
    };

    // Update button label to reflect context
    this.syncEmbedBtnLabel();

    caret.onclick = (e) => {
      e.stopPropagation();
      const open = dd.style.display !== "none";
      this.closeDropdowns();
      if (!open) dd.style.display = "block";
    };

    this.el.querySelectorAll<HTMLElement>(".ss-eopt").forEach(opt => {
      opt.onmouseenter = () => (opt.style.background = "var(--background-modifier-hover)");
      opt.onmouseleave = () => (opt.style.background = "");
      opt.onclick = async (e) => {
        e.stopPropagation();
        dd.style.display = "none";
        // Dropdown always embeds verse text, regardless of interlinear state
        const style = opt.dataset.style as EmbedStyle;
        setGlobalEmbedStyle(style, this.settings, this.saveSettings);
        await embedSingleRef(editor, ref, style, this.settings);
        this.hide();
      };
    });
  }

  /** Update Embed button label to hint current context */
  private syncEmbedBtnLabel(): void {
    const btn = this.q<HTMLElement>(".ss-emb-btn");
    if (!btn) return;
    btn.textContent = this.interlinearState !== "off" ? "Embed Grid" : "Embed";
  }

  private closeDropdowns(): void {
    this.el.querySelectorAll<HTMLElement>(".ss-ver-dd,.ss-emb-dd")
      .forEach(d => (d.style.display = "none"));
  }

  // ── Helpers ───────────────────────────────────────────────────

  private q<T extends Element>(sel: string): T | null {
    return this.el.querySelector<T>(sel);
  }

  // ── Palette management ────────────────────────────────────────────────────

  private updatePaletteForRef(ref: ScriptureRef): void {
    // Use getRefBookPalette which parses book name → bookId → palette
    // ref.book is e.g. "John" — we build a minimal ref string to feed getRefBookPalette
    const refStr = `${ref.book} ${ref.chapter}:${ref.verseStart}`;
    const raw = getRefBookPalette(refStr, this.settings.display?.useBookColors ?? true);
    const pal = contrastSafePalette(raw);
    this.P  = pal.base;
    this.PL = pal.light;
    this.PM = pal.mid;
    this.PD = pal.dark;
    this.PX = pal.textOnLight;
    this.PV = pal.textOnVivid;
    setDefPalette(this.P, this.PL, this.PM, this.PD, this.PX);
  }

  /** Called externally when useBookColors setting changes */
  refreshPalette(): void {
    if (this.currentRef) this.updatePaletteForRef(this.currentRef);
    this.applyPaletteToDOM();
  }

  /** Push current palette into the persistent DOM elements that use inline styles */
  private applyPaletteToDOM(): void {
    const verBtn  = this.q<HTMLElement>(".ss-ver-btn");
    const embBtn  = this.q<HTMLElement>(".ss-emb-btn");
    const embCaret= this.q<HTMLElement>(".ss-emb-caret");
    const intBtn  = this.q<HTMLElement>(".ss-int-btn");
    const sdef    = this.q<HTMLElement>(".ss-sdef");
    const shdr    = this.q<HTMLElement>(".ss-shdr");
    const defToggle = this.q<HTMLElement>(".ss-def-toggle");

    if (verBtn) {
      verBtn.style.background = this.P;
      verBtn.style.color = this.PV;
    }
    if (embBtn) {
      embBtn.style.background = this.P;
      embBtn.style.color = this.PV;
    }
    if (embCaret) {
      embCaret.style.background = this.P;
      embCaret.style.color = this.PV;
      embCaret.style.borderLeft = `1px solid ${this.PM}`;
    }
    if (intBtn) {
      // Preserve active/inactive state colors
      this.updateIntBtn();
    }
    if (sdef) {
      sdef.style.background = this.PL;
      sdef.style.border = `1px solid ${this.PM}`;
    }
    if (shdr) shdr.style.color = this.PX;
    if (defToggle) defToggle.style.color = this.PX;
  }

  scheduleHide(ms = this.card?.isVisible() ? 120 : 400): void {
    this.cancelHide();
    this.hideTimer = setTimeout(() => this.hide(), ms);
  }

  cancelHide(): void {
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
  }

  hide(): void {
    this.currentRef = null;
    this.el.style.display = "none";
    this.card?.hide();
    this.closeDropdowns();
    clearCachedCursorOffset();
  }

  destroy(): void {
    window.removeEventListener("keydown", this.syncMods, true);
    window.removeEventListener("keyup", this.syncMods, true);
    window.removeEventListener("mousemove", this.syncMods, true);
    window.removeEventListener("blur", this.clearMods);
    this.card?.destroy();
    this.el.remove();
  }
}
