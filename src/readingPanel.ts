import { expandRef } from "./parser";
import { mapToHebrew } from "./versification";
import { renderPassage } from "./textFormatting";
import { ItemView, WorkspaceLeaf, Editor, App, MarkdownView, Notice } from "obsidian";
import { ScriptureRef, refToString, parseScriptureRefs } from "./parser";
import { ensureKJVData, getScripture, getKJVData } from "./fetcher";
import { fetchInterlinear, fetchStrongsDefinition, InterlinearWord, getGreekData, getHebrewData, getLXXData, OT_BOOKS } from "./interlinear";
import { ScriptureScribeSettings } from "./settings";
import { buildSimpleDefinition, buildSimpleDom, buildAdvancedDefinition, makeSpeakerLink, makeGlobeLink, isDefAdvanced, toggleDefAdvanced, DefCallbacks, setDefPalette } from "./defHelpers";
import { ensureCrossRefData, getCrossRefs, isCrossRefLoaded } from "./crossRefs";
import { ensureSearchIndex, buildSearchIndex, search, isIndexBuilt, SearchResult, getKJVText, morphSearch, isMorphIndexBuilt } from "./searchIndex";
import { parseMorph } from "./morphParser";
import { BibleModeView } from "./bibleMode";
import { BIBLE_BOOKS } from "./bibleData";
import { openBibleSvg, researchBibleSvg, scrollSvg } from "./svgAssets";
import { getIcon } from "./iconRegistry";
import { embedSingleRef, embedAtCursor, getGlobalEmbedStyle, setGlobalEmbedStyle } from "./embedEngine";
import { getVerseOfTheDay } from "./verseOfTheDay";
import {
  getNotesForVerse,
  notePathToColor,
  isVaultIndexReady,
  isVaultIndexScanning,
  onVaultIndexReady,
} from "./vaultIndex";
import {
  BookPalette,
  getBookPalette,
  getRefBookColor,
  getRefBookPalette,
  contrastSafeText,
  contrastSafePalette,
  textOnVividFor,
  DEFAULT_PALETTE,
} from "./bookColorUtils";

export const READING_PANEL_VIEW_TYPE = "scripture-scribe-panel";

// ── Navigation entry types ────────────────────────────────────────────────────
type NavEntry =
  | { type: "research"; ref: ScriptureRef }
  | { type: "search";   query: string }
  | { type: "bible";    ref?: ScriptureRef };

// ── Colour palette — instance-derived from bookColorUtils ────────────────────
// (P/PL/PM/PD are now instance properties on ScriptureReadingPanel)

// ── SVG spinner ───────────────────────────────────────────────────────────────
function spinnerSVG(): string {
  return `
    <svg width="36" height="36" viewBox="0 0 36 36"
         xmlns="http://www.w3.org/2000/svg" style="display:block;margin:18px auto;">
      <circle cx="18" cy="18" r="14"
              fill="none" stroke="${DEFAULT_PALETTE.mid}" stroke-width="3" opacity="0.3"/>
      <circle cx="18" cy="18" r="14"
              fill="none" stroke="${DEFAULT_PALETTE.base}" stroke-width="3"
              stroke-dasharray="22 66" stroke-linecap="round"
              transform-origin="18 18">
        <animateTransform attributeName="transform" type="rotate"
          from="0" to="360" dur="0.9s" repeatCount="indefinite"/>
      </circle>
    </svg>`;
}

// ── Skeleton word card ────────────────────────────────────────────────────────
function skeletonCard(): HTMLElement {
  const card = document.createElement("div");
  card.style.cssText = `
    border-radius:6px; padding:8px 6px;
    border:1px solid var(--background-modifier-border);
    background:var(--background-secondary);
    display:flex; flex-direction:column; gap:5px;
  `;
  for (const h of ["10px", "14px", "8px"]) {
    const bar = document.createElement("div");
    bar.style.cssText = `
      height:${h}; border-radius:3px;
      background:var(--background-modifier-border);
      animation:ss-shimmer 1.4s ease-in-out infinite;
    `;
    card.appendChild(bar);
  }
  return card;
}

// Inject shimmer keyframes once
if (!document.getElementById("ss-shimmer-kf")) {
  const s = document.createElement("style");
  s.id = "ss-shimmer-kf";
  s.textContent = `@keyframes ss-shimmer{0%,100%{opacity:.45}50%{opacity:.9}}`;
  document.head.appendChild(s);
}

// ── Main class ────────────────────────────────────────────────────────────────

export class ScriptureReadingPanel extends ItemView {
  settings: ScriptureScribeSettings;
  private onSaveSettings: () => Promise<void>;

  private currentRef: ScriptureRef | null = null;
  private currentEditor: Editor | null = null;
  private loadingSeq = 0;

  // ── Unified navigation history ─────────────────────────────────────────────
  // Tracks every navigation across Research mode, Bible mode, and Search mode.
  // Each entry describes the state to restore when the user taps Back.
  private navStack: NavEntry[] = [];
  /** @deprecated kept only so old callers compile — replaced by navStack */
  private get refHistory(): ScriptureRef[] { return []; }

  private backBtn!: HTMLElement;
  private touchActive = false;
  private touchTimer: ReturnType<typeof setTimeout> | null = null;

  // Layout state — "off" | "MT" | "LXX"
  // OT books cycle: off -> MT (Hebrew, א) -> LXX (Greek, α) -> off
  // NT books cycle: off -> NT (Greek, α) -> off
  private interlinearState: "off" | "MT" | "LXX" = "MT";
  /** The icon letter last shown while active — persists while off */
  private lastInterlinearIcon = "\u03b1"; // default alpha
  private activeStrongsCard: HTMLElement | null = null;
  private searchMode = false;
  /** Strong's number to auto-activate after next grid render (set by search click) */
  public pendingStrongsHighlight: string | null = null;
  private searchSort: "canonical" | "reverse" | "score" = "score";

  // Bible mode
  // ── Instance palette (derived from current book) ────────────────────────────
  private P: string = DEFAULT_PALETTE.base;
  private PL: string = DEFAULT_PALETTE.light;
  private PM: string = DEFAULT_PALETTE.mid;
  private PD: string = DEFAULT_PALETTE.dark;
  private PX: string = DEFAULT_PALETTE.textOnLight; // readable accent ON the PL card bg
  private PV: string = DEFAULT_PALETTE.textOnVivid;  // readable text ON the vivid hover fill

  private bibleMode = false;
  private bibleModeView: BibleModeView | null = null;
  private bibleModeEl!: HTMLElement;
  private bibleToggleBtn!: HTMLElement;
  private readerCenterEl!: HTMLElement;
  private bibleCenterEl!: HTMLElement;
  private bibleBookTitleEl!: HTMLElement;
  private bibleChapterNumEl!: HTMLElement;
  private bibleNavCaret!: HTMLElement;

  // Persistent DOM elements (set in onOpen)
  private emptyEl!: HTMLElement;
  private contentWrapEl!: HTMLElement;
  private intToggleBtn!: HTMLElement;
  private refLbl!: HTMLElement;
  private verLabel!: HTMLElement;
  private intSection!: HTMLElement;
  private gridEl!: HTMLElement;
  private sdefEl!: HTMLElement;
  private xrefEl!: HTMLElement;
  private verseSection!: HTMLElement;
  private verseTextEl!: HTMLElement;
  private footEl!: HTMLElement;
  private resultsList!: HTMLElement;
  private emptyState!: HTMLElement;
  private searchPopover: HTMLElement | null = null;

  // ── Morph search panel ────────────────────────────────────────────────────
  private morphPanelEl!: HTMLElement;
  private morphPanelOpen   = false;
  private morphStrongsInput!: HTMLInputElement;
  private morphPatternSelect!: HTMLSelectElement;
  private morphPatternInput!: HTMLInputElement;   // advanced raw code field
  private morphAdvancedMode = false;

  // ── Swipe & Drawer Gestures ──ments
  private searchBarEl!: HTMLElement;
  public searchInput!: HTMLInputElement;
  private searchResultsEl!: HTMLElement;
  // Vault indexing indicator
  private indexingBarEl!: HTMLElement;
  // Backlinks section (research panel)
  private backlinkEl!: HTMLElement;
  private intLbl!: HTMLElement;

  constructor(leaf: WorkspaceLeaf, settings: ScriptureScribeSettings, onSaveSettings: () => Promise<void>) {
    super(leaf);
    this.settings = settings;
    this.onSaveSettings = onSaveSettings;
  }

  getViewType() { return READING_PANEL_VIEW_TYPE; }
  getDisplayText() { return "ScriptureScribe"; }
  getIcon() { return "book-open"; }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  private pendingRef: {ref: ScriptureRef; editor: Editor | null} | null = null;
  private closed = false;
  get isOpen(): boolean { return !this.closed; }
  private resolveReady: (() => void) | null = null;
  readonly ready = new Promise<void>(resolve => { this.resolveReady = resolve; });

  async onOpen(): Promise<void> {
    this.closed = false;
    await ensureKJVData();
    await ensureCrossRefData();
    const root = this.contentEl;
    root.empty();
    root.style.cssText = `
      display:flex; flex-direction:column; height:100%; overflow:hidden;
      font-family:var(--font-interface,-apple-system,sans-serif);
      font-size:13px; position:relative;
    `;

    this.buildHeader(root);
    this.buildVersionDropdown(root);
    this.buildSearchBar(root);
    this.buildMorphPanel(root);
    this.buildIndexingBar(root);
    this.buildSearchResults(root);
    this.buildEmptyState(root);
    this.buildContentWrap(root);

    // Bible mode container — hidden until activated
    this.bibleModeEl = root.createEl("div");
    this.bibleModeEl.style.cssText = "display:none; flex:1; overflow:hidden; min-height:0;";
    this.resolveReady?.();
    const pending = this.pendingRef; this.pendingRef = null;
    if (pending) void this.setRef(pending.ref, pending.editor);
  }

  async onClose(): Promise<void> {
    this.closed = true;
    this.loadingSeq++;
    this.pendingRef = null;
    this.bibleModeView?.destroy();
    if (this.searchPopover) {
      this.searchPopover.remove();
      this.searchPopover = null;
    }
  }

  // ── Palette management ────────────────────────────────────────────────────

  private updatePalette(): void {
    // Use getRefBookPalette — parses book name → ID → palette internally
    const refStr = this.currentRef
      ? `${this.currentRef.book} ${this.currentRef.chapter}:${this.currentRef.verseStart}`
      : "Genesis 1:1";
    const raw = getRefBookPalette(refStr, this.settings.display?.useBookColors ?? true);
    const pal = contrastSafePalette(raw);
    this.P = pal.base;
    this.PL = pal.light;
    this.PM = pal.mid;
    this.PD = pal.dark;
    this.PX = pal.textOnLight;
    this.PV = pal.textOnVivid;
    setDefPalette(this.P, this.PL, this.PM, this.PD, this.PX);
    if (this.intLbl) this.intLbl.style.color = this.P;
    // Update button icon/hint when book changes (OT <-> NT transition)
    if (this.intToggleBtn) this.syncToggleBtnStyle();
  }

  /** Called by settingsTab when useBookColors is toggled */
  refreshPalette(): void { this.updatePalette(); }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Focus the search input — called from command palette */
  focusSearch(): void {
    if (this.searchInput) {
      this.searchInput.focus();
      this.searchInput.select();
    }
  }

  /**
   * Loads today's curated verse into the panel.
   * If the panel already has a reference loaded, this is a no-op unless
   * forceShow is true (used by the command palette action).
   */
  showVerseOfTheDay(forceShow = false): void {
    if (this.currentRef && !forceShow) return; // already showing a verse
    const votd = getVerseOfTheDay();
    const ref: ScriptureRef = {
      book:       votd.book,
      chapter:    votd.chapter,
      verseStart: votd.verse,
      raw:        `${votd.book} ${votd.chapter}:${votd.verse}`,
      start:      0,
      end:        0,
    };
    this.setRef(ref, null);
  }

  /**
   * Called by main.ts whenever the vault index is updated — initial scan,
   * editor-change debounce, or file save. Refreshes highlights without
   * discarding the current scroll position or re-fetching verse text.
   */
  onVaultIndexReady(): void {
    this.indexingBarEl.style.display = "none";
    if (this.bibleMode && this.bibleModeView) {
      // Light refresh: re-colour existing verse spans in-place
      this.bibleModeView.refreshHighlights();
    } else if (this.currentRef) {
      this.renderBacklinks(this.currentRef);
    }
  }

  async setRef(ref: ScriptureRef, editor: Editor | null): Promise<void> {
    try {
      // Guard: DOM may not be ready if setRef is called before onOpen completes
      if (!this.refLbl || !this.contentWrapEl) {
        this.pendingRef = {ref, editor};
        return;
      }

      // If Bible mode is active, navigate the Bible to this ref AND
      // scroll/flash the specific verse.
      if (this.bibleMode && this.bibleModeView) {
        const { BIBLE_BOOKS } = await import("./bibleData");
        const book = BIBLE_BOOKS.find(b => b.name === ref.book);
        if (book) {
          const verseKey = ref.chapterOnly ? undefined : `${ref.book} ${ref.chapter}:${ref.verseStart}`;
          this.bibleModeView.goTo(book.id, ref.chapter, verseKey);
        }
        return;
      }

      // Push current research state onto the nav stack before overwriting
      if (this.currentRef && refToString(this.currentRef) !== refToString(ref)) {
        this.pushNav({ type: "research", ref: this.currentRef });
      }

      this.currentRef = ref;
      this.currentEditor = editor;
      const seq = ++this.loadingSeq;

      // Update accent palette for the new book, then sync every header element
      // that carries book-colour (α button, version pill, back arrow, ref label).
      this.updatePalette();
      this.applyLayout(); // syncs α border / bg / color
      if (this.verLabel) {
        this.verLabel.style.color = this.PV;
        this.verLabel.parentElement!.style.background = this.P;
      }
      this.backBtn.style.color = this.P;

      console.debug(`ScriptureScribe panel: setRef called for "${refToString(ref)}"`);

      this.refLbl.textContent = refToString(ref);
      if (this.intLbl) this.intLbl.title = `Hebrew address: ${refToString(mapToHebrew(ref))}`;
      this.refLbl.style.color = this.P;

      // Switch empty → content
      this.emptyEl.style.display = "none";
      this.contentWrapEl.style.display = "flex";

      // Reset state
      this.closeSdef();
      this.activeStrongsCard = null;

      // Loading states
      this.showGridLoading();
      this.verseTextEl.innerHTML = spinnerSVG();
      this.verseTextEl.style.color = "var(--text-muted)";

      // Derive interlinear version from the toggle state, not the version dropdown
      const intVersion = this.interlinearState === "MT"  ? "KJV"
                       : this.interlinearState === "LXX" ? "LXX"
                       : "KJV";
      const intLang    = this.interlinearState === "MT"  ? "hebrew" : "greek";

      // Parallel fetch — only fetch interlinear if the panel is active
      const intPromise = this.interlinearState !== "off"
        ? fetchInterlinear(ref, intLang as any, intVersion)
        : Promise.resolve([] as InterlinearWord[]);

      const [verse, words] = await Promise.all([
        getScripture(ref, this.settings),
        intPromise,
      ]);

      if (seq !== this.loadingSeq) return;

      // Verse text
      this.verseTextEl.style.color = "var(--text-normal)";
      this.renderVerseText(this.verseTextEl, verse.formattedText ?? verse.text);
      this.verLabel.textContent = verse.version;

      // Footer
      const srcEl = this.contentEl.querySelector<HTMLElement>(".ss-panel-src")!;
      const offlineEl = this.contentEl.querySelector<HTMLElement>(".ss-panel-offline")!;
      srcEl.textContent = verse.source === "local" ? (verse.version === "LXX" ? "Local LXX (Swete)" : "Local KJV")
        : verse.source === "cache" ? `Cache · ${verse.version}`
          : "bible-api.com";
      offlineEl.style.display = verse.offline ? "inline" : "none";
      this.footEl.style.display = "flex";

      // Grid — only render if interlinear is active
      if (this.interlinearState !== "off") this.renderGrid(words);

      // Cross-references
      this.renderCrossRefs(ref);

      // Backlinks (vault notes that cite this verse)
      this.renderBacklinks(ref);

    } catch (err) {
      console.error("ScriptureScribe panel: setRef error", err);
    }
  }

  // ── DOM construction ──────────────────────────────────────────────────────

  private buildSearchBar(root: HTMLElement): void {
    this.searchBarEl = root.createEl("div");
    this.searchBarEl.style.cssText = `
      display:flex; align-items:center; flex-shrink:0;
      padding:5px 8px;
      background:var(--background-secondary);
      border-bottom:1px solid var(--background-modifier-border);
    `;

    // Pill: darker interior, rounded, contains icon + input
    const pillWrap = this.searchBarEl.createEl("div");
    pillWrap.style.cssText = `
      display:flex; align-items:center; flex:1;
      background:var(--background-primary);
      border:1px solid var(--background-modifier-border);
      border-radius:14px; padding:0 10px; height:26px;
      transition:border-color 0.15s, box-shadow 0.15s;
    `;

    // ── Animated search icon ──────────────────────────────────────────────────
    // ── Search icon: magnifier + cycling char overlay ────────────────────────
    // charEl sits ON TOP of the SVG (z-index:2) — no need to see through SVG fill.
    // Screenshot confirmed this approach renders correctly; SVG <text> did not.

    let kfEl = document.getElementById("ss-search-anim-kf") as HTMLStyleElement | null;
    if (!kfEl) { kfEl = document.createElement("style"); kfEl.id = "ss-search-anim-kf"; document.head.appendChild(kfEl); }
    kfEl.textContent = `
      @keyframes ss-lens-pulse {
        0%,100% { transform:scale(1);    opacity:0.75; }
        50%     { transform:scale(1.18); opacity:1;    }
      }
      .ss-search-animating { animation:ss-lens-pulse 1.8s ease-in-out infinite; }
    `;

    const iconEl = pillWrap.createEl("span");
    // position:relative is REQUIRED so charEl's absolute coords anchor to iconEl
    iconEl.style.cssText = "position:relative; display:inline-flex; align-items:center; flex-shrink:0; margin-right:6px; color:var(--text-muted); opacity:0.55;";

    // Cycling character — z-index:2 puts it ABOVE the magnifier SVG
    const charEl = iconEl.createEl("span");
    charEl.style.cssText = "position:absolute; top:1px; left:4px; font-size:8px; font-weight:700; line-height:1; pointer-events:none; z-index:2; user-select:none; opacity:0;";
    charEl.textContent = "α";

    // Magnifier SVG underneath (z-index:1)
    const svgEl = iconEl.createEl("span");
    svgEl.style.cssText = "position:relative; z-index:1; display:block; flex-shrink:0;";
    svgEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

    const SEARCH_CHARS = [
      "α","β","γ","δ","ε","ζ","η","θ","ι","κ","λ","μ","ν","ξ","ο","π","ρ","σ","τ","υ","φ","χ","ψ","ω",
      "א","ב","ג","ד","ה","ו","ז","ח","ט","י","כ","ל","מ","נ","ס","ע","פ","צ","ק","ר","ש","ת",
      "G","H","A","E","I","O","N","S","R","T","L","D","C","M","P",
    ];
    let animFrameId: number | null = null;
    let lastCharTs = 0;
    const CYCLE_MS = 80;

    (this as any)._startSearchAnim = () => {
      if (animFrameId !== null) { cancelAnimationFrame(animFrameId); animFrameId = null; }
      iconEl.classList.add("ss-search-animating");
      iconEl.style.color = this.P;
      iconEl.style.opacity = "1";
      charEl.style.transition = "";
      charEl.style.color = this.P;
      charEl.style.opacity = "0.9";
      // First char immediately — visible on the very first frame
      charEl.textContent = SEARCH_CHARS[Math.floor(Math.random() * SEARCH_CHARS.length)];
      lastCharTs = 0;
      const tick = (ts: number) => {
        if (ts - lastCharTs >= CYCLE_MS) {
          charEl.textContent = SEARCH_CHARS[Math.floor(Math.random() * SEARCH_CHARS.length)];
          lastCharTs = ts;
        }
        animFrameId = requestAnimationFrame(tick);
      };
      animFrameId = requestAnimationFrame(tick);
    };

    (this as any)._stopSearchAnim = () => {
      if (animFrameId !== null) { cancelAnimationFrame(animFrameId); animFrameId = null; }
      iconEl.classList.remove("ss-search-animating");
      // Transitions set FIRST, values changed in next rAF — forces two separate paint frames
      iconEl.style.transition = "transform 0.5s ease-out, color 0.35s ease-out, opacity 0.35s ease-out";
      charEl.style.transition = "opacity 0.25s ease-out";
      requestAnimationFrame(() => {
        iconEl.style.color   = "var(--text-muted)";
        iconEl.style.opacity = "0.55";
        charEl.style.opacity = "0";
        setTimeout(() => {
          iconEl.style.transition = "";
          charEl.style.transition  = "";
          charEl.textContent = "α";
        }, 400);
      });
    };


    this.searchInput = pillWrap.createEl("input") as HTMLInputElement;
    this.searchInput.type = "text";
    this.searchInput.placeholder = "G25  H7225  love  ἀγάπη  John 1:1";
    this.searchInput.style.cssText = `
      flex:1; height:100%; padding:0;
      background:transparent; border:none; outline:none; box-shadow:none;
      font-size:12px; color:var(--text-normal);
      -webkit-appearance:none; appearance:none;
    `;

    // Focus ring on the pill wrapper — background stays dark, only border glows
    this.searchInput.addEventListener("focus", () => {
      pillWrap.style.borderColor = this.P;
      pillWrap.style.boxShadow = `0 0 0 2px ${this.PM}40`;
    });
    this.searchInput.addEventListener("blur", () => {
      pillWrap.style.borderColor = "var(--background-modifier-border)";
      pillWrap.style.boxShadow = "none";
    });
    this.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); this.runSearch(); }
      if (e.key === "Escape") { e.preventDefault(); this.exitSearch(); }
    });

    // Morph search toggle button — lives outside the pill, right of it
    const morphBtn = this.searchBarEl.createEl("button");
    morphBtn.title = "Morphological search";
    morphBtn.style.cssText = `
      background:none; border:none; box-shadow:none; outline:none;
      cursor:pointer; font-size:14px; font-weight:700;
      color:var(--text-muted); padding:0 0 0 7px; line-height:1;
      flex-shrink:0; opacity:.55; transition:opacity 0.15s, color 0.15s;
    `;
    morphBtn.textContent = "Ω";
    morphBtn.addEventListener("mouseenter", () => { morphBtn.style.opacity = "1"; morphBtn.style.color = this.P; });
    morphBtn.addEventListener("mouseleave", () => {
      morphBtn.style.opacity = this.morphPanelOpen ? "1" : ".55";
      morphBtn.style.color = this.morphPanelOpen ? this.P : "var(--text-muted)";
    });
    morphBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.morphPanelOpen = !this.morphPanelOpen;
      this.morphPanelEl.style.display = this.morphPanelOpen ? "block" : "none";
      morphBtn.style.opacity = this.morphPanelOpen ? "1" : ".55";
      morphBtn.style.color   = this.morphPanelOpen ? this.P : "var(--text-muted)";
      if (this.morphPanelOpen) this.morphStrongsInput?.focus();
    });
  }

  private buildMorphPanel(root: HTMLElement): void {
    this.morphPanelEl = root.createEl("div");
    this.morphPanelEl.style.cssText = `
      display:none; flex-shrink:0;
      background:var(--background-secondary);
      border-bottom:1px solid var(--background-modifier-border);
      padding:10px 12px 12px;
    `;

    // ── Section title row ─────────────────────────────────────────────────
    const titleRow = this.morphPanelEl.createEl("div");
    titleRow.style.cssText = `
      display:flex; align-items:center; justify-content:space-between;
      margin-bottom:10px;
    `;

    const titleLbl = titleRow.createEl("span");
    titleLbl.style.cssText = `
      font-size:10px; font-weight:700; letter-spacing:0.05em;
      text-transform:uppercase; color:var(--text-normal);
    `;
    titleLbl.textContent = "Grammar Search";

    // Simple / Advanced toggle
    const modeToggle = titleRow.createEl("button");
    modeToggle.textContent = "advanced ▾";
    modeToggle.style.cssText = `
      background:none; border:none; box-shadow:none; outline:none;
      cursor:pointer; font-size:10px; font-weight:600; color:var(--text-muted);
      padding:0; transition:color 0.15s;
    `;
    modeToggle.addEventListener("mouseenter", () => modeToggle.style.color = this.P);
    modeToggle.addEventListener("mouseleave", () => modeToggle.style.color = "var(--text-muted)");

    // ── Simple mode ──────────────────────────────────────────────────────
    const simplePane = this.morphPanelEl.createEl("div");

    // Row 1: Root Word
    const row1 = simplePane.createEl("div");
    row1.style.cssText = "display:flex; flex-direction:column; gap:4px; margin-bottom:8px;";

    const lbl1 = row1.createEl("label");
    lbl1.textContent = "Root Word (Optional)";
    lbl1.style.cssText = "font-size:10px; color:var(--text-muted); font-weight:600;";

    this.morphStrongsInput = row1.createEl("input") as HTMLInputElement;
    this.morphStrongsInput.type = "text";
    this.morphStrongsInput.placeholder = "e.g. G4100 or ἀγάπη";
    this.morphStrongsInput.style.cssText = `
      width:100%; font-size:12px; padding:5px 8px;
      border:1px solid var(--background-modifier-border);
      border-radius:4px; background:var(--background-primary);
      color:var(--text-normal); outline:none; box-shadow:none;
      transition:border-color 0.15s, box-shadow 0.15s;
    `;
    this.morphStrongsInput.addEventListener("focus", () => {
      this.morphStrongsInput.style.borderColor = this.P;
      this.morphStrongsInput.style.boxShadow = `0 0 0 1px ${this.P}40`;
    });
    this.morphStrongsInput.addEventListener("blur", () => {
      this.morphStrongsInput.style.borderColor = "var(--background-modifier-border)";
      this.morphStrongsInput.style.boxShadow = "none";
    });
    this.morphStrongsInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); this.runMorphSearch(); }
    });

    // Row 2: Grammatical Form
    const row2 = simplePane.createEl("div");
    row2.style.cssText = "display:flex; flex-direction:column; gap:4px; margin-bottom:10px;";

    const lbl2 = row2.createEl("label");
    lbl2.textContent = "Grammatical Form";
    lbl2.style.cssText = "font-size:10px; color:var(--text-muted); font-weight:600;";

    this.morphPatternSelect = row2.createEl("select") as HTMLSelectElement;
    this.morphPatternSelect.style.cssText = `
      width:100%; font-size:12px; padding:5px 8px;
      border:1px solid var(--background-modifier-border);
      border-radius:4px; background:var(--background-primary);
      color:var(--text-normal); outline:none; box-shadow:none;
      cursor:pointer; transition:border-color 0.15s, box-shadow 0.15s;
    `;
    this.morphPatternSelect.addEventListener("focus", () => {
      this.morphPatternSelect.style.borderColor = this.P;
      this.morphPatternSelect.style.boxShadow = `0 0 0 1px ${this.P}40`;
    });
    this.morphPatternSelect.addEventListener("blur", () => {
      this.morphPatternSelect.style.borderColor = "var(--background-modifier-border)";
      this.morphPatternSelect.style.boxShadow = "none";
    });

    // Plain-English options mapped to morph code wildcards
    const MORPH_OPTIONS: Array<{ label: string; pattern: string; note: string }> = [
      { label: "Any form",                   pattern: "*",        note: "All occurrences of the specified root word." },
      { label: "Action: Completed (Aorist)",  pattern: "V-A*",    note: "Views the action as a single whole event, not ongoing. Often used for historical events." },
      { label: "Action: Ongoing (Present)",   pattern: "V-P*",    note: "Continuous or repeated action in the present time." },
      { label: "Action: Past Ongoing (Imperfect)", pattern: "V-I*", note: "Action that was continually happening in the past." },
      { label: "Action: Completed with Effect (Perfect)", pattern: "V-R*", note: "The action is complete but its effects continue to the present." },
      { label: "Mood: Command (Imperative)",  pattern: "V-*M*",   note: "A direct command, instruction, or urgent request." },
      { label: "Mood: Possibility/Purpose (Subjunctive)", pattern: "V-*S*", note: "Expresses possibility, purpose, or contingency (e.g. 'so that...')." },
      { label: "Mood: Wish/Prayer (Optative)",pattern: "V-*O*",   note: "Expresses a strong wish or remote possibility (e.g. 'God forbid!')." },
      { label: "Participle (-ing, used as noun/adj)", pattern: "V-*P*", note: "A verbal adjective (e.g. 'the one believing')." },
      { label: "Infinitive (to...)",          pattern: "V-*N*",   note: "The base form of a verb (e.g. 'to believe')." },
      { label: "Voice: Passive",              pattern: "V-*P*",   note: "The subject receives the action. Often signals God acting implicitly." },
      { label: "Case: Genitive (of/from)",    pattern: "*-G*",    note: "Expresses possession, source, or relationship (e.g. 'faith OF Christ')." },
      { label: "Case: Dative (to/for/by)",    pattern: "*-D*",    note: "Indirect object or instrument (e.g. 'saved BY grace')." },
    ];

    for (const opt of MORPH_OPTIONS) {
      const el = this.morphPatternSelect.createEl("option");
      el.value       = opt.pattern;
      el.textContent = opt.label;
      el.title       = opt.note;
    }

    // Note box — shows the explanation for selected pattern
    const noteBox = simplePane.createEl("div");
    noteBox.style.cssText = `
      font-size:11px; color:var(--text-muted); line-height:1.4;
      padding:8px 10px; background:var(--background-primary);
      border:1px solid var(--background-modifier-border);
      border-radius:4px; margin-bottom:10px;
      display: flex; gap: 8px; align-items: flex-start;
    `;
    const noteIcon = noteBox.createEl("span");
    noteIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.6"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>`;
    noteIcon.style.cssText = `color:${this.P}; flex-shrink:0; display:flex; align-items:center;`;
    
    const noteText = noteBox.createEl("span");

    const updateNote = () => {
      const sel = MORPH_OPTIONS.find(o => o.pattern === this.morphPatternSelect.value);
      noteText.textContent = sel?.note ?? "";
    };
    updateNote();
    this.morphPatternSelect.addEventListener("change", updateNote);

    // ── Advanced mode ────────────────────────────────────────────────────
    const advancedPane = this.morphPanelEl.createEl("div");
    advancedPane.style.display = "none";

    const advRow = advancedPane.createEl("div");
    advRow.style.cssText = "display:flex; flex-direction:column; gap:4px; margin-bottom:10px;";

    const advLbl = advRow.createEl("label");
    advLbl.textContent = "Raw Morphology Code";
    advLbl.style.cssText = "font-size:10px; color:var(--text-muted); font-weight:600;";

    this.morphPatternInput = advRow.createEl("input") as HTMLInputElement;
    this.morphPatternInput.type = "text";
    this.morphPatternInput.placeholder = "e.g. V-A* or *-GSM";
    this.morphPatternInput.style.cssText = `
      width:100%; font-size:12px; font-family:var(--font-monospace, monospace);
      padding:5px 8px;
      border:1px solid var(--background-modifier-border);
      border-radius:4px; background:var(--background-primary);
      color:var(--text-normal); outline:none; box-shadow:none;
      transition:border-color 0.15s, box-shadow 0.15s;
    `;
    this.morphPatternInput.addEventListener("focus", () => {
      this.morphPatternInput.style.borderColor = this.P;
      this.morphPatternInput.style.boxShadow = `0 0 0 1px ${this.P}40`;
    });
    this.morphPatternInput.addEventListener("blur", () => {
      this.morphPatternInput.style.borderColor = "var(--background-modifier-border)";
      this.morphPatternInput.style.boxShadow = "none";
    });
    this.morphPatternInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); this.runMorphSearch(); }
    });

    // Cheat-sheet toggle
    const cheatToggle = advancedPane.createEl("button");
    cheatToggle.textContent = "View syntax reference ▾";
    cheatToggle.style.cssText = `
      background:none; border:none; box-shadow:none; outline:none;
      cursor:pointer; font-size:10px; font-weight:600; color:${this.P};
      padding:0; margin-bottom:8px; transition:opacity 0.15s;
      display:inline-block;
    `;
    cheatToggle.addEventListener("mouseenter", () => cheatToggle.style.opacity = "0.8");
    cheatToggle.addEventListener("mouseleave", () => cheatToggle.style.opacity = "1");

    const cheatSheet = advancedPane.createEl("div");
    cheatSheet.style.cssText = `
      display:none; font-size:11px; line-height:1.5;
      color:var(--text-muted); padding:10px;
      background:var(--background-primary);
      border:1px solid var(--background-modifier-border);
      border-radius:4px; margin-bottom:10px;
      font-family:var(--font-monospace, monospace);
      max-height: 200px; overflow-y: auto;
    `;
    cheatSheet.innerHTML = `
      <b style="font-family:var(--font-interface,sans-serif);color:var(--text-normal);">Greek verb (TAGNT): V - Tense Voice Mood Person Number</b><br>
      Tense: P=Present  I=Imperfect  F=Future  A=Aorist  R=Perfect  L=Pluperfect<br>
      Voice: A=Active  M=Middle  P=Passive  D=Deponent<br>
      Mood:  I=Indicative  S=Subjunctive  O=Optative  M=Imperative  N=Infinitive  P=Participle<br>
      <br>
      <b style="font-family:var(--font-interface,sans-serif);color:var(--text-normal);">Greek noun/adj: POS - Case Number Gender</b><br>
      Case:   N=Nominative  G=Genitive  D=Dative  A=Accusative  V=Vocative<br>
      Number: S=Singular  P=Plural<br>
      Gender: M=Masculine  F=Feminine  N=Neuter<br>
      <br>
      <b style="font-family:var(--font-interface,sans-serif);color:var(--text-normal);">Hebrew verb (TAHOT): V Stem Aspect Person Gender Number</b><br>
      Stem:   q=Qal  N=Niphal  p=Piel  P=Pual  h=Hiphil  H=Hophal  t=Hithpael<br>
      Aspect: p=Perfect  i=Imperfect  w=Waw-consec  v=Imperative  a=Part.Active<br>
      <br>
      <b style="font-family:var(--font-interface,sans-serif);color:var(--text-normal);">Wildcard: * matches any characters</b><br>
      V-A*    → all aorist verb forms<br>
      V-AAI3S → aorist active indicative 3rd singular (exact)<br>
      *-G*    → any genitive noun/adj<br>
      G4100|V-A* → G4100 (pisteuō) in any aorist form
    `;

    cheatToggle.addEventListener("click", () => {
      const open = cheatSheet.style.display !== "none";
      cheatSheet.style.display = open ? "none" : "block";
      cheatToggle.textContent  = open ? "Hide syntax reference ▴" : "View syntax reference ▾";
    });

    // ── Search button (shared) ────────────────────────────────────────────
    const searchBtnWrap = this.morphPanelEl.createEl("div");
    searchBtnWrap.style.cssText = "display:flex; justify-content:flex-end;";

    const searchBtn = searchBtnWrap.createEl("button");
    searchBtn.textContent = "Search Grammar";
    searchBtn.className = "mod-cta";
    searchBtn.style.cssText = `
      padding:6px 14px; font-size:12px; font-weight:600;
      border:none; border-radius:4px; cursor:pointer;
      background:${this.P}; color:white;
      transition:opacity 0.15s;
    `;
    searchBtn.addEventListener("mouseenter", () => searchBtn.style.opacity = "0.9");
    searchBtn.addEventListener("mouseleave", () => searchBtn.style.opacity = "1");
    searchBtn.addEventListener("click", () => this.runMorphSearch());

    // ── Mode toggle wiring ────────────────────────────────────────────────
    modeToggle.addEventListener("click", () => {
      this.morphAdvancedMode = !this.morphAdvancedMode;
      simplePane.style.display   = this.morphAdvancedMode ? "none"  : "block";
      advancedPane.style.display = this.morphAdvancedMode ? "block" : "none";
      modeToggle.textContent     = this.morphAdvancedMode ? "simple ▴" : "advanced ▾";
      if (this.morphAdvancedMode) this.morphPatternInput.focus();
    });

    // Assemble
    simplePane.appendChild(row1);
    simplePane.appendChild(row2);
    simplePane.appendChild(noteBox);
    advancedPane.appendChild(advRow);
    advancedPane.appendChild(cheatToggle);
    advancedPane.appendChild(cheatSheet);
    this.morphPanelEl.appendChild(titleRow);
    this.morphPanelEl.appendChild(simplePane);
    this.morphPanelEl.appendChild(advancedPane);
    this.morphPanelEl.appendChild(searchBtnWrap);
  }

  private async runMorphSearch(): Promise<void> {
    await ensureSearchIndex();

    let strongsNum = this.morphStrongsInput.value.trim().toUpperCase().replace(/^([GH])0+/, "$1");
    let morphPat: string;

    if (this.morphAdvancedMode) {
      // Advanced: parse "G4100|V-A*" from the raw input, or use as morph-only
      const raw = this.morphPatternInput.value.trim();
      if (raw.includes("|")) {
        const [left, right] = raw.split("|", 2);
        const norm = left.trim().toUpperCase().replace(/^([GH])0+/, "$1");
        if (/^[GH]\d+$/.test(norm)) { strongsNum = norm; morphPat = right.trim(); }
        else morphPat = raw;
      } else {
        morphPat = raw;
      }
    } else {
      morphPat = this.morphPatternSelect.value;
    }

    if (!morphPat || morphPat === "*" && !strongsNum) {
      new Notice("ScriptureScribe: Enter a lemma or a morph pattern to search.");
      return;
    }

    const results = morphSearch(strongsNum, morphPat);
    const modeLabel = strongsNum
      ? `${strongsNum} · ${morphPat}`
      : morphPat;

    this.showSearchResults(modeLabel, results, "morph");
  }

  private buildIndexingBar(root: HTMLElement): void {
    this.indexingBarEl = root.createEl("div");
    this.indexingBarEl.style.cssText = `
      display:none; align-items:center; gap:6px; flex-shrink:0;
      padding:3px 12px;
      background:var(--background-secondary);
      border-bottom:1px solid var(--background-modifier-border);
      font-size:10px; color:var(--text-muted);
    `;

    // Animated spinner dot
    const dot = this.indexingBarEl.createEl("span");
    dot.className = "ss-indexing-dot";
    dot.style.cssText = `font-size:10px; color:${this.P}; font-weight:700;`;
    dot.textContent = "Indexing notes";

    // Show if scan is already running at panel open time
    if (isVaultIndexScanning()) this.indexingBarEl.style.display = "flex";

    // Hide when ready
    onVaultIndexReady(() => {
      this.indexingBarEl.style.display = "none";
    });
  }

  private buildSearchResults(root: HTMLElement): void {
    this.searchResultsEl = root.createEl("div");
    this.searchResultsEl.style.cssText = `
      display:none; flex-direction:column; flex:1; overflow:hidden; min-height:0;
      position:relative;
    `;
  }

  // ── Search logic ──────────────────────────────────────────────────────────

  async runSearch(): Promise<void> {
    const raw = this.searchInput.value.trim();
    if (!raw) return;

    // Start the search animation and let one frame paint before work begins.
    // The scanners yield to the event loop on a time budget, so the animation
    // keeps playing for exactly as long as the search actually takes — no
    // artificial sleeps needed on either side.
    (this as any)._startSearchAnim?.();
    await new Promise<void>(r => requestAnimationFrame(() => r()));

    // ── Verse address shortcut ────────────────────────────────────────────────
    const normalized = raw.replace(/[a-zA-Z]+/g, w =>
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    );
    const parsedAddress = parseScriptureRefs(normalized);
    if (parsedAddress.length > 0) {
      (this as any)._stopSearchAnim?.();
      this.exitSearch(false);
      this.setRef(parsedAddress[0], this.currentEditor);
      return;
    }

    // ── Strong's / word search ────────────────────────────────────────────────
    // The build must be awaited: the index object exists from the first line
    // of buildSearchIndex, so an un-awaited build lets search() scan a
    // half-populated index and silently return partial results. search()
    // already falls through to semantic search internally when results are
    // sparse — no second semantic pass needed here.
    await ensureSearchIndex();
    const { results, mode } = await search(raw);

    (this as any)._stopSearchAnim?.();
    this.showSearchResults(raw, results, mode);
  }

  private showSearchResults(query: string, results: SearchResult[], mode: string): void {
    if (this.searchPopover) {
      this.searchPopover.remove();
      this.searchPopover = null;
    }
    
    this.searchMode = true;

    this.emptyEl.style.display = "none";
    this.contentWrapEl.style.display = "none";
    this.searchResultsEl.style.display = "flex";
    this.searchResultsEl.empty();

    // Focus + select input so user can immediately retype
    setTimeout(() => { this.searchInput.focus(); this.searchInput.select(); }, 50);

    // ── Results header ────────────────────────────────────────────
    const hdr = this.searchResultsEl.createEl("div");
    hdr.style.cssText = `
      display:flex; align-items:center; justify-content:space-between;
      padding:5px 10px; flex-shrink:0;
      background:var(--background-secondary);
      border-bottom:1px solid var(--background-modifier-border);
    `;
    const lbl = hdr.createEl("span");
    lbl.style.cssText = `font-size:11px; font-weight:700; color:${this.P};`;

    const modeLabel: Record<string, string> = {
      strongs:  "Strong's",
      english:  "English",
      original: "Original Language",
      phrase:   "Phrase",
      boolean:  "Boolean",
      semantic: "Concept Match",
      morph:    "Morphology",
    };

    // ── Sort helpers ─────────────────────────────────────────────────────────
    const getCanonicalIdx = (ref: string) => {
      const parts = ref.split(" ");
      const last = parts[parts.length - 1];
      const name = ref.slice(0, ref.length - last.length).trim();
      const bookIdx = BIBLE_BOOKS.findIndex(b => b.name === name);
      const [ch, vs] = last.split(":").map(n => parseInt(n, 10));
      return (bookIdx * 100000) + ((ch || 0) * 1000) + (vs || 0);
    };

    const sortResults = () => {
      if (this.searchSort === "score") {
        // Primary: descending relevance score; secondary: canonical within equal scores
        results.sort((a, b) => {
          const sd = (b.score ?? 0) - (a.score ?? 0);
          if (Math.abs(sd) > 0.001) return sd;
          return getCanonicalIdx(a.reference) - getCanonicalIdx(b.reference);
        });
      } else {
        results.sort((a, b) => {
          const va = getCanonicalIdx(a.reference);
          const vb = getCanonicalIdx(b.reference);
          return this.searchSort === "canonical" ? va - vb : vb - va;
        });
      }
    };
    sortResults();

    const displayQuery = mode === "strongs"
      ? query.toUpperCase().replace(/^([GH])0+/, "$1")
      : `"${query}"`;

    const labelPrefix = modeLabel[mode] || "Search";
    lbl.textContent = results.length
      ? `${labelPrefix}: ${displayQuery} — ${results.length} result${results.length === 1 ? "" : "s"}`
      : `${labelPrefix}: ${displayQuery} — no results`;
    const rightSide = hdr.createEl("div");
    rightSide.style.cssText = "display:flex; align-items:center; gap:2px;";

    const hasScores = results.some(r => (r.score ?? 0) > 0);
    if (!hasScores && this.searchSort === "score") {
      this.searchSort = "canonical";
    }

    if (hasScores) {
      const percBtn = rightSide.createEl("button");
      percBtn.textContent = "%";
      percBtn.title = "Sort by relevance (most likely first, then canonical)";
      const isScore = this.searchSort === "score";
      percBtn.style.cssText = `
        background:none; border:none; font-size:10px; font-weight:700; padding:2px 6px; cursor:pointer;
        transition:color 0.12s, opacity 0.12s;
        ${isScore ? `color:${this.P}; opacity:1;` : `color:var(--text-muted); opacity:0.6;`}
      `;
      percBtn.addEventListener("mouseenter", () => {
        if (!isScore) { percBtn.style.opacity = "0.9"; percBtn.style.color = this.P; }
      });
      percBtn.addEventListener("mouseleave", () => {
        if (!isScore) { percBtn.style.opacity = "0.6"; percBtn.style.color = "var(--text-muted)"; }
      });
      percBtn.addEventListener("click", () => {
        this.searchSort = "score";
        this.showSearchResults(query, results, mode);
      });
    }

    const sortBtn = rightSide.createEl("button");
    const isRev = this.searchSort === "reverse";
    sortBtn.textContent = isRev ? "R↓" : "G↓";
    sortBtn.title = "Toggle Sort Order (Genesis → Revelation / Reverse)";
    
    const isBookSort = this.searchSort !== "score";
    sortBtn.style.cssText = `
      background:none; border:none; font-size:10px; font-weight:700; padding:2px 6px; cursor:pointer;
      transition:color 0.12s, opacity 0.12s; margin-right:4px;
      ${isBookSort ? `color:${this.P}; opacity:1;` : `color:var(--text-muted); opacity:0.6;`}
    `;
    sortBtn.addEventListener("mouseenter", () => {
        sortBtn.style.opacity = "1";
        if (!isBookSort) sortBtn.style.color = this.P;
    });
    sortBtn.addEventListener("mouseleave", () => {
        if (!isBookSort) { sortBtn.style.opacity = "0.6"; sortBtn.style.color = "var(--text-muted)"; }
    });
    sortBtn.addEventListener("click", () => {
      this.searchSort = this.searchSort === "canonical" ? "reverse" : "canonical";
      this.showSearchResults(query, results, mode);
    });

    const backBtn = rightSide.createEl("button");
    backBtn.textContent = "← back";
    backBtn.style.cssText = `background:none;border:none;box-shadow:none;cursor:pointer;font-size:10px;color:${this.P};padding:0 0 0 6px;font-weight:600;`;
    backBtn.addEventListener("click", (e) => { e.stopPropagation(); this.exitSearch(); });


    // ── Definition panel (Strong's and original-language searches) ────────
    if (mode === "strongs" || mode === "original") {
      // Derive the Strong's number to look up
      let strongsToFetch: string | null = null;
      if (mode === "strongs") {
        strongsToFetch = query.toUpperCase().replace(/^([GH])0+/, "$1");
      } else if (results[0]?.matchedWord?.strongs) {
        strongsToFetch = results[0].matchedWord.strongs;
      }

      if (strongsToFetch) {
        const defPanel = this.searchResultsEl.createEl("div");
        defPanel.style.cssText = `
          flex-shrink:0; margin:6px 8px 2px; border-radius:7px;
          padding:8px 10px; background:${this.PL};
          border:1px solid ${this.PM};
        `;
        const defHdr = defPanel.createEl("div");
        defHdr.style.cssText = `font-size:10px;color:${this.P};font-weight:700;margin-bottom:4px;`;
        defHdr.textContent = `${strongsToFetch} · loading…`;
        const defBody = defPanel.createEl("div");
        defBody.style.cssText = `font-size:11px;color:${this.PD};line-height:1.6;`;
        defBody.textContent = "";

        fetchStrongsDefinition(strongsToFetch).then(def => {
          if (!def) { defHdr.textContent = strongsToFetch!; defBody.textContent = "Definition unavailable."; return; }
          defHdr.textContent = [def.number, def.original, def.transliteration].filter(Boolean).join(" · ");
          defBody.textContent = buildSimpleDefinition(def.definition);
        });
      }
    }

    if (!results.length) {
      const empty = this.searchResultsEl.createEl("div");
      empty.style.cssText = `flex:1;display:flex;align-items:center;justify-content:center;font-size:12px;color:var(--text-muted);text-align:center;padding:24px;`;
      const hint = mode === "strongs"
        ? "Make sure the interlinear data files are loaded."
        : mode === "phrase"
          ? "Try fewer words, or check spelling. Paraphrased verses may appear with stemmed matching."
          : mode === "boolean"
            ? "Use AND, OR, NOT between terms. Example: faith AND works, love OR grace."
            : "Try a different spelling, or search by Strong's number (G25).";
      empty.textContent = `No results for ${displayQuery}. ${hint}`;
      return;
    }

    // ── Hover popover — appended to body to escape any overflow:hidden parents ──
    const popover = document.createElement("div");
    popover.style.cssText = `
      display:none; position:fixed; z-index:9999;
      max-width:280px; padding:8px 10px;
      background:var(--background-primary);
      border:1px solid var(--background-modifier-border);
      border-radius:7px; box-shadow:0 4px 16px rgba(0,0,0,0.18);
      font-size:12px; color:var(--text-normal); line-height:1.6;
      pointer-events:none;
    `;
    this.searchPopover = popover;
    document.body.appendChild(popover);
    // Clean up popover when search exits
    const cleanupPopover = () => {
      if (this.searchPopover) {
        this.searchPopover.remove();
        this.searchPopover = null;
      }
    };
    backBtn.addEventListener("click", cleanupPopover);
    let popoverHideTimer: ReturnType<typeof setTimeout> | null = null;

    // ── Swipe-out keyframes (inject once) ───────────────────────────────────
    if (!document.getElementById("ss-swipe-kf")) {
      const sk = document.createElement("style");
      sk.id = "ss-swipe-kf";
      sk.textContent = `
        @keyframes ss-swipe-out {
          to { transform: translateX(-110%) scaleX(0.85); opacity: 0; }
        }
        @keyframes ss-swipe-back {
          from { transform: translateX(var(--ss-dx, 0px)); }
          to   { transform: translateX(0); }
        }
      `;
      document.head.appendChild(sk);
    }

    // ── Result list ───────────────────────────────────────────────
    const list = this.searchResultsEl.createEl("div");
    list.style.cssText = "flex:1; overflow-y:auto; min-height:0;";

    for (const result of results) {
      const wrap = list.createEl("div");
      wrap.style.cssText = `position:relative; overflow:hidden;`;

      // ✅ Derive color from the referenced book, not the panel's current book
      const _srColor = contrastSafeText(getRefBookColor(result.reference));

      const underlay = wrap.createEl("div");
      underlay.setAttribute("data-ss-underlay", "1");
      underlay.style.cssText = `position:absolute;inset:0;background:${_srColor};display:flex;align-items:center;justify-content:flex-end;padding-right:20px;gap:8px;`;
      const srSent = underlay.createEl("span");
      srSent.textContent = "Quote";
      srSent.style.cssText = `font-size:11px;font-weight:700;color:#fff;opacity:0.5;transition:opacity 0.12s;`;
      const srQuill = underlay.createEl("span");
      srQuill.innerHTML = getIcon("embed-text-white-qwill", 40);
      srQuill.style.cssText = `line-height:1;opacity:0.5;transform:scale(0.85);transition:opacity 0.12s,transform 0.12s; display:flex;`;

      const row = wrap.createEl("div");
      row.style.cssText = `
        padding:7px 12px; cursor:pointer;
        border-bottom:1px solid var(--background-modifier-border);
        background:var(--background-primary);
        will-change:transform; position:relative;
      `;
      row.addEventListener("mouseenter", (e) => {
        if (!row.dataset.ssDragging) row.style.background = "var(--background-secondary)";
        if (popoverHideTimer) { clearTimeout(popoverHideTimer); popoverHideTimer = null; }
        const fullVerse = this.getKJVPreview(result.reference);
        if (!fullVerse) return;
        popover.textContent = fullVerse;
        const rect = row.getBoundingClientRect();
        const popH = 80;
        const spaceBelow = window.innerHeight - rect.bottom - 8;
        const top = spaceBelow > popH ? rect.bottom + 4 : rect.top - popH - 4;
        popover.style.left = `${rect.left}px`;
        popover.style.width = `${rect.width}px`;
        popover.style.top = `${top}px`;
        popover.style.display = "block";
      });
      row.addEventListener("mouseleave", () => {
        row.style.background = "var(--background-primary)";
        popoverHideTimer = setTimeout(() => { popover.style.display = "none"; }, 120);
      });

      const topRow = row.createEl("div");
      topRow.style.cssText = "display:flex; align-items:baseline; gap:6px; margin-bottom:2px;";
      const ref = topRow.createEl("span");
      ref.textContent = result.reference;
      // ✅ Use the same derived book color for the address text
      ref.style.cssText = `font-size:11px; font-weight:700; color:${_srColor};`;

      if (result.matchedWord && mode !== "strongs") {
        const chip = topRow.createEl("span");
        const mw = result.matchedWord;
        const parts = [mw.original, mw.gloss, mw.strongs].filter(Boolean);
        chip.textContent = parts.join(" · ");
        chip.style.cssText = `font-size:9px;color:${this.PM};font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:1;min-width:0;`;
      }
      
      if (result.source) {
        const badge = topRow.createEl("span");
        const icon  = result.source === "Vector" ? "🧠" 
                    : result.source === "Link"   ? "🔗" 
                    : result.source === "Exact"  ? "🎯" 
                    : result.source === "Phrase" ? "📜" 
                    : result.source === "Morph"  ? "Ω" 
                    : "🔍";
        badge.textContent = `${icon} ${result.source}`;
        if (result.score) badge.title = `Score: ${(result.score * 100).toFixed(1)}%`;
        badge.style.cssText = `font-size:9px; background:${this.PL}; color:${this.P}; padding:1px 4px; border-radius:4px; font-weight:700; border:1px solid ${this.P}30;`;
      }

      const preview = row.createEl("div");
      preview.textContent = result.preview || "…";
      preview.style.cssText = `font-size:11px; color:var(--text-muted); line-height:1.4;`;

      // Tap → load into panel
      const onTap = () => {
        popover.style.display = "none";
        const parsed = parseScriptureRefs(result.reference);
        if (parsed.length) {
          const sRef = parsed[0];
          
          // ── Smart Interlinear Switching ──
          // If the match was original language, ensure the correct interlinear mode is active
          if (result.matchedWord?.strongs) {
            const sn = result.matchedWord.strongs.toUpperCase();
            if (sn.startsWith("H")) {
              this.interlinearState = "MT"; // Hebrew OT
            } else if (sn.startsWith("G")) {
              // Greek match: check if book is OT (needs LXX) or NT (needs regular MT/Greek)
              const isOT = OT_BOOKS.has(sRef.book);
              this.interlinearState = isOT ? "LXX" : "MT";
            }
          }

          if (mode === "strongs") {
            const q = this.searchInput.value.trim().toUpperCase().replace(/^([GH])0+/, "$1");
            this.pendingStrongsHighlight = q;
          } else if ((mode === "original" || mode === "english") && result.matchedWord?.strongs) {
            this.pendingStrongsHighlight = result.matchedWord.strongs;
          }
          // Push current search query so Back returns to these results
          const currentQuery = this.searchInput.value.trim();
          if (currentQuery) this.pushNav({ type: "search", query: currentQuery });
          this.flashVerseText(row, () => {
            this.exitSearch(false);
            this.setRef(parsed[0], this.currentEditor);
          });
        }
      };

      // Swipe left → embed
      const onEmbed = () => {
        const parsed = parseScriptureRefs(result.reference);
        if (!parsed.length) return;
        const style = getGlobalEmbedStyle(this.settings);
        const ed = this.getBestEditor();
        if (!ed) { new Notice("Open a note first"); return; }
        embedAtCursor(ed, parsed[0], style, this.settings)
          .then(() => this.showEmbedToast(result.reference))
          .catch(console.error);
      };

      // ── Long-press → push to Bible mode ──────────────────────────────────
      // Mirrors the same gesture on cross-reference cards.
      {
        const parsed = parseScriptureRefs(result.reference);
        if (parsed.length) {
          const srRef = parsed[0];
          let srLongTimer: ReturnType<typeof setTimeout> | null = null;
          let srTouchActive = false;
          let srTouchTimer: ReturnType<typeof setTimeout> | null = null;
          let srStartX = 0, srStartY = 0;

          const cancelSrLong = () => { if (srLongTimer) { clearTimeout(srLongTimer); srLongTimer = null; } };
          const fireSrLong = () => {
            cancelSrLong();
            popover.style.display = "none";
            // Ripple flash on the row before fling
            this.flashVerseText(row, () => {
              this.exitSearch(false);
              if (!this.bibleMode) this.enterBibleMode();
              const book = BIBLE_BOOKS.find(b => b.name === srRef.book);
              if (book) {
                this.bibleModeView!.goTo(
                  book.id,
                  srRef.chapter,
                  `${srRef.book} ${srRef.chapter}:${srRef.verseStart}`
                );
              }
            });
          };

          row.addEventListener("touchstart", (e) => {
            if (srTouchTimer) { clearTimeout(srTouchTimer); srTouchTimer = null; }
            srTouchActive = true;
            srStartX = e.touches[0].clientX;
            srStartY = e.touches[0].clientY;
            srLongTimer = setTimeout(fireSrLong, 600);
          }, { passive: true });
          row.addEventListener("touchmove", (e) => {
            // Cancel long-press if finger moved more than 10 px (thumb scroll)
            const dx = e.touches[0].clientX - srStartX;
            const dy = e.touches[0].clientY - srStartY;
            if (Math.abs(dx) > 10 || Math.abs(dy) > 10) cancelSrLong();
          }, { passive: true });
          row.addEventListener("touchend", () => {
            cancelSrLong();
            if (srTouchTimer) clearTimeout(srTouchTimer);
            srTouchTimer = setTimeout(() => { srTouchActive = false; srTouchTimer = null; }, 500);
          }, { passive: true });
          row.addEventListener("touchcancel", () => {
            cancelSrLong();
            if (srTouchTimer) clearTimeout(srTouchTimer);
            srTouchTimer = setTimeout(() => { srTouchActive = false; srTouchTimer = null; }, 500);
          }, { passive: true });

          // Desktop: hold mouse button for 600 ms
          row.addEventListener("mousedown", (e) => {
            if (srTouchActive || e.button !== 0) return;
            srStartX = e.clientX; srStartY = e.clientY;
            srLongTimer = setTimeout(fireSrLong, 600);
          });
          row.addEventListener("mouseup",    () => { if (!srTouchActive) cancelSrLong(); });
          row.addEventListener("mousemove",  (e) => {
            if (!srTouchActive && srLongTimer) {
              const dx = e.clientX - srStartX;
              const dy = e.clientY - srStartY;
              if (Math.abs(dx) > 5 || Math.abs(dy) > 5) cancelSrLong();
            }
          });
          row.addEventListener("mouseleave", () => { if (!srTouchActive) cancelSrLong(); });
        }
      }

      this.wireSwipeEmbed(row, wrap, onTap, onEmbed);
    }
  }

  /** Get full KJV verse text for hover previews */
  private getKJVPreview(verseKey: string): string {
    return getKJVText(verseKey);
  }

  private exitSearch(refocus = true): void {
    this.searchMode = false;
    this.searchResultsEl.style.display = "none";
    if (this.currentRef) {
      this.emptyEl.style.display = "none";
      this.contentWrapEl.style.display = "flex";
    } else {
      this.emptyEl.style.display = "flex";
    }
    if (refocus) {
      setTimeout(() => { this.searchInput?.focus(); this.searchInput?.select(); }, 50);
    }
  }

  /**
   * Navigates to an adjacent verse, with full wraparound:
   *   verse → chapter → book → Genesis 1:1 (or Revelation 22:21 going back).
   * Uses the loaded KJV store to validate verse existence rather than
   * assuming sequential verse numbers — prevents the "1 John 1:11" off-by-one crash.
   */
  private async navigateVerse(dir: 1 | -1): Promise<void> {
    if (!this.currentRef) return;
    const { BIBLE_BOOKS } = await import("./bibleData");
    const { getKJVData } = await import("./fetcher");
    const kjv = getKJVData();

    const CANONICAL_BOOKS = BIBLE_BOOKS.filter(b => b.id >= 1 && b.id <= 66);

    let bookIdx = CANONICAL_BOOKS.findIndex(b => b.name === this.currentRef!.book);
    // Fallback: book may be Apocrypha, not in CANONICAL_BOOKS — just go to Genesis
    if (bookIdx < 0) bookIdx = 0;

    let ch = this.currentRef.chapter;
    let vs = this.currentRef.verseStart + dir;

    const hasVerse = (bookName: string, chapter: number, verse: number): boolean =>
      `${bookName} ${chapter}:${verse}` in kjv;

    if (dir === 1) {
      // Forward: try next verse in same chapter
      const book = CANONICAL_BOOKS[bookIdx];
      if (!hasVerse(book.name, ch, vs)) {
        // End of chapter → next chapter, verse 1
        ch += 1;
        vs = 1;
        if (!hasVerse(book.name, ch, vs)) {
          // End of book → next book, chapter 1, verse 1
          bookIdx += 1;
          if (bookIdx >= CANONICAL_BOOKS.length) {
            // End of Revelation → wrap to Genesis 1:1
            bookIdx = 0;
          }
          ch = 1; vs = 1;
        }
      }
    } else {
      // Backward: try previous verse in same chapter
      if (vs < 1) {
        // Beginning of chapter → previous chapter, last verse
        ch -= 1;
        if (ch < 1) {
          // Beginning of book → previous book, last chapter, last verse
          bookIdx -= 1;
          if (bookIdx < 0) {
            // Genesis 1:1 → wrap to Revelation 22:21
            bookIdx = CANONICAL_BOOKS.length - 1;
          }
          ch = CANONICAL_BOOKS[bookIdx].chapters;
        }
        // Find last verse in this chapter by probing down from a safe max
        const bookName = CANONICAL_BOOKS[bookIdx].name;
        vs = 1;
        for (let probe = 200; probe >= 1; probe--) {
          if (hasVerse(bookName, ch, probe)) { vs = probe; break; }
        }
      }
    }

    const nextRefStr = `${CANONICAL_BOOKS[bookIdx].name} ${ch}:${vs}`;
    const parsed = parseScriptureRefs(nextRefStr);
    if (parsed.length) {
      this.setRef(parsed[0], this.currentEditor);
    }
  }

  private buildHeader(root: HTMLElement): void {
    // Inject shimmer + ellipsis keyframes once
    if (!document.getElementById("ss-icon-kf")) {
      const s = document.createElement("style");
      s.id = "ss-icon-kf";
      s.textContent = `
        @keyframes ss-spring-in{0%{transform:scale(1)}40%{transform:scale(1.28)}70%{transform:scale(0.93)}100%{transform:scale(1.08)}}
        @keyframes ss-spring-out{0%{transform:scale(1.08)}60%{transform:scale(0.97)}100%{transform:scale(1)}}
        @keyframes ss-ellipsis{0%,100%{content:'…'}33%{content:'.  '}66%{content:'.. '}}
        .ss-mode-icon { color: var(--interactive-accent) !important; }
        .ss-indexing-dot::after{content:'…';animation:ss-ellipsis 1.4s steps(1,end) infinite;}
      `;
      document.head.appendChild(s);
    }

    const bar = root.createEl("div");
    bar.style.cssText = `
      display:flex; align-items:center; gap:0; flex-shrink:0; height:38px;
      background:var(--background-secondary);
      border-bottom:1px solid var(--background-modifier-border);
      position:relative;
    `;

    // ── LEFT: Back button + Mode toggle ──────────────────────────────────────
    const leftBar = bar.createEl("div");
    leftBar.style.cssText = "display:flex; align-items:center; gap:0; padding:0 8px; z-index:2;";

    // ◄ Back button — prominent left
    this.backBtn = leftBar.createEl("button");
    this.backBtn.title = "Back";
    this.backBtn.style.cssText = `
      box-sizing:border-box; width:28px; height:24px; padding:0;
      background:transparent !important; border:none !important; box-shadow:none !important; cursor:pointer;
      font-size:18px; line-height:24px; text-align:center;
      color:${this.P}; flex-shrink:0; display:none;
      transition:opacity 0.15s, transform 0.15s;
    `;
    this.backBtn.textContent = "◄";
    this.backBtn.addEventListener("mouseenter", () => { this.backBtn.style.transform = "translateX(-2px)"; });
    this.backBtn.addEventListener("mouseleave", () => { this.backBtn.style.transform = ""; });
    this.backBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.navigateBack();
    });

    this.bibleToggleBtn = leftBar.createEl("button");
    this.bibleToggleBtn.title = "Open Bible";
    this.bibleToggleBtn.className = "ss-mode-icon";
    this.bibleToggleBtn.style.cssText = `
      box-sizing:border-box; flex-shrink:0;
      padding:0 6px; margin:0; height:38px;
      background:transparent !important; border:none !important; box-shadow:none !important; border-radius:0; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      opacity:0.8; transition:opacity 0.15s;
    `;
    this.bibleToggleBtn.innerHTML = researchBibleSvg(24);
    this.bibleToggleBtn.addEventListener("mouseenter", () => {
      this.bibleToggleBtn.style.animation = "ss-spring-in 0.38s cubic-bezier(0.34,1.56,0.64,1) forwards";
      this.bibleToggleBtn.style.opacity = "1";
    });
    this.bibleToggleBtn.addEventListener("mouseleave", () => {
      this.bibleToggleBtn.style.animation = "ss-spring-out 0.32s cubic-bezier(0.34,1.56,0.64,1) forwards";
      this.bibleToggleBtn.style.opacity = this.bibleMode ? "1" : "0.8";
    });
    this.bibleToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleBibleMode();
    });

    // ── CENTER: Absolutely Centered Elements ──
    const centerWrap = bar.createEl("div");
    centerWrap.style.cssText = `
      position:absolute; left:0; right:0; top:0; bottom:0;
      display:flex; align-items:center; justify-content:center;
      pointer-events:none; z-index:1;
    `;

    this.readerCenterEl = centerWrap.createEl("div");
    this.readerCenterEl.style.cssText = "display:flex; align-items:center; justify-content:center; gap:8px; pointer-events:auto;";

    const prevVerseBtn = this.readerCenterEl.createEl("button");
    prevVerseBtn.textContent = "‹";
    prevVerseBtn.style.cssText = "background:none !important; border:none !important; box-shadow:none !important; cursor:pointer; padding:0; font-size:16px; color:var(--text-muted); opacity:0.6; line-height:1;";
    prevVerseBtn.title = "Previous verse";
    prevVerseBtn.addEventListener("click", () => this.navigateVerse(-1));

    this.refLbl = this.readerCenterEl.createEl("span");
    this.refLbl.className = "ss-panel-ref-lbl";
    this.refLbl.style.cssText = `
      font-size:12px; font-weight:700; color:${this.P};
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
      max-width:140px; cursor:pointer;
      text-decoration-line:underline; text-decoration-style:dotted;
      text-underline-offset:2px;
      transition:opacity 0.15s;
    `;
    this.refLbl.textContent = "";
    this.refLbl.title = "Open in Bible reader";
    this.refLbl.addEventListener("click", (e) => {
      e.stopPropagation();
      const ref = this.currentRef;
      if (!ref) return;
      if (!this.bibleMode) this.enterBibleMode();
      const book = BIBLE_BOOKS.find(b => b.name === ref.book);
      if (book && this.bibleModeView) {
        this.bibleModeView.goTo(book.id, ref.chapter, ref.chapterOnly ? undefined : `${ref.book} ${ref.chapter}:${ref.verseStart}`);
      }
    });

    const nextVerseBtn = this.readerCenterEl.createEl("button");
    nextVerseBtn.textContent = "›";
    nextVerseBtn.style.cssText = "background:none !important; border:none !important; box-shadow:none !important; cursor:pointer; padding:0; font-size:16px; color:var(--text-muted); opacity:0.6; line-height:1;";
    nextVerseBtn.title = "Next verse";
    nextVerseBtn.addEventListener("click", () => this.navigateVerse(1));

    // Bible mode center (hidden in Reader mode)
    this.bibleCenterEl = centerWrap.createEl("div");
    this.bibleCenterEl.style.cssText = `
      display:none; align-items:center; justify-content:center;
      gap:5px; cursor:pointer; user-select:none; padding:0 6px; pointer-events:auto;
    `;
    this.bibleCenterEl.title = "Navigate";

    this.bibleBookTitleEl = this.bibleCenterEl.createEl("span");
    this.bibleBookTitleEl.style.cssText = `
      font-size:14px; font-weight:700; color:var(--text-normal);
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    `;

    const dot = this.bibleCenterEl.createEl("span");
    dot.textContent = "·";
    dot.style.cssText = `font-size:13px; color:var(--text-muted); opacity:.5; flex-shrink:0;`;

    this.bibleChapterNumEl = this.bibleCenterEl.createEl("span");
    this.bibleChapterNumEl.style.cssText = `font-size:14px; font-weight:700; color:${this.P}; flex-shrink:0;`;

    this.bibleNavCaret = this.bibleCenterEl.createEl("span");
    this.bibleNavCaret.textContent = "▾";
    this.bibleNavCaret.style.cssText = `
      font-size:10px; color:${this.P}; opacity:.7; flex-shrink:0;
      display:inline-block;
      transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
    `;

    this.bibleCenterEl.addEventListener("click", (e) => {
      e.stopPropagation();
      this.bibleModeView?.handleHeaderClick();
    });

    // ── RIGHT: α · version pill · settings gear ──────
    const rightBar = bar.createEl("div");
    rightBar.style.cssText = `
      display:flex; align-items:center; gap:5px; flex-shrink:0;
      padding:0 8px; height:100%; margin-left:auto; z-index:2;
    `;

    // α interlinear toggle — reader mode only
    this.intToggleBtn = rightBar.createEl("button");
    this.intToggleBtn.title = "Toggle interlinear / verse view";
    this.intToggleBtn.style.cssText = `
      box-sizing:border-box; width:24px; height:24px; padding:0;
      border:1px solid ${this.PM}; border-radius:4px; cursor:pointer;
      font-size:13px; font-style:italic; font-weight:700;
      font-family:Georgia,serif; line-height:24px; text-align:center;
      flex-shrink:0; transition:background 0.1s,color 0.1s,border-color 0.1s;
      background:transparent; color:#808080;
    `;
    this.intToggleBtn.textContent = "α";
    this.intToggleBtn.addEventListener("mouseenter", () => {
      this.intToggleBtn.style.color = "var(--text-normal)";
    });
    this.intToggleBtn.addEventListener("mouseleave", () => {
      this.syncToggleBtnStyle();
    });
    this.intToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.cycleInterlinearState();
    });

    // Version pill — always visible, right-most element
    const verBtn = rightBar.createEl("button");
    verBtn.className = "ss-panel-ver-btn";
    verBtn.style.cssText = `
      box-sizing:border-box; height:24px; padding:0 8px;
      background:${this.P} !important; color:${this.PV} !important; border:none !important; box-shadow:none !important;
      border-radius:4px; cursor:pointer;
      font-size:10px; font-weight:700; white-space:nowrap; flex-shrink:0;
      display:flex; align-items:center; gap:2px;
    `;
    this.verLabel = verBtn.createEl("span");
    this.verLabel.className = "ss-panel-ver-label";
    this.verLabel.textContent = this.settings.primaryTranslation;
    const caret = verBtn.createEl("span");
    caret.textContent = "▾";
    caret.style.cssText = "font-size:8px;opacity:.75;";

    verBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const dd = this.contentEl.querySelector<HTMLElement>(".ss-panel-ver-dd");
      if (dd) dd.style.display = dd.style.display === "none" ? "block" : "none";
    });

    // ⚙ Settings gear — opens ScriptureScribe settings tab
    const gearBtn = rightBar.createEl("button");
    gearBtn.title = "Settings";
    gearBtn.style.cssText = `
      box-sizing:border-box; width:22px; height:22px; padding:0;
      background:transparent !important; border:none !important; box-shadow:none !important; cursor:pointer;
      color:var(--text-muted); flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      opacity:0.55; transition:opacity 0.15s, transform 0.2s;
    `;
    gearBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
    gearBtn.addEventListener("mouseenter", () => {
      gearBtn.style.opacity = "1";
      gearBtn.style.transform = "rotate(30deg)";
    });
    gearBtn.addEventListener("mouseleave", () => {
      gearBtn.style.opacity = "0.55";
      gearBtn.style.transform = "rotate(0deg)";
    });
    gearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      (this.app as any).setting?.open?.();
      (this.app as any).setting?.openTabById?.("scripture-scribe");
    });
  }

  // ── Unified navigation stack ──────────────────────────────────────────────

  private pushNav(entry: NavEntry): void {
    // Avoid duplicate consecutive entries
    const top = this.navStack[this.navStack.length - 1];
    if (top) {
      if (top.type === "research" && entry.type === "research" &&
          refToString(top.ref) === refToString(entry.ref)) return;
      if (top.type === "search" && entry.type === "search" &&
          top.query === entry.query) return;
      if (top.type === "bible" && entry.type === "bible") return;
    }
    this.navStack.push(entry);
    if (this.navStack.length > 60) this.navStack.shift();
    this.updateBackBtn();
  }

  private updateBackBtn(): void {
    if (!this.backBtn) return;
    this.backBtn.style.display = this.navStack.length > 0 ? "block" : "none";
  }

  private navigateBack(): void {
    const entry = this.navStack.pop();
    this.updateBackBtn();
    if (!entry) return;

    if (entry.type === "research") {
      // Exit any current mode first
      if (this.bibleMode) this.exitBibleMode();
      if (this.searchMode) this.exitSearch(false);
      this.currentRef = entry.ref;
      this.setRefInternal(entry.ref, this.currentEditor);
    } else if (entry.type === "search") {
      if (this.bibleMode) this.exitBibleMode();
      // Restore search query and results
      if (this.searchInput) this.searchInput.value = entry.query;
      this.runSearch();
    } else if (entry.type === "bible") {
      if (!this.bibleMode) this.enterBibleMode();
      // Navigate to the stored verse in bible mode
      if (entry.ref && this.bibleModeView) {
        import("./bibleData").then(({ BIBLE_BOOKS }) => {
          const book = BIBLE_BOOKS.find(b => b.name === entry.ref!.book);
          if (book) {
            this.bibleModeView!.goTo(
              book.id,
              entry.ref!.chapter,
              `${entry.ref!.book} ${entry.ref!.chapter}:${entry.ref!.verseStart}`
            );
          }
        });
      }
    }
  }


  private async setRefInternal(ref: ScriptureRef, editor: Editor | null): Promise<void> {
    if (!this.refLbl || !this.contentWrapEl) return;

    if (this.bibleMode && this.bibleModeView) {
      const { BIBLE_BOOKS } = await import("./bibleData");
      const book = BIBLE_BOOKS.find(b => b.name === ref.book);
      if (book) {
        const verseKey = ref.chapterOnly ? undefined : `${ref.book} ${ref.chapter}:${ref.verseStart}`;
        this.bibleModeView.goTo(book.id, ref.chapter, verseKey);
      }
      return;
    }

    this.currentRef = ref;
    const seq = ++this.loadingSeq;

    // Update accent palette for the new book, then sync every header element
    this.updatePalette();
    this.applyLayout();
    if (this.verLabel) {
      this.verLabel.style.color = this.PV;
      this.verLabel.parentElement!.style.background = this.P;
    }
    this.backBtn.style.color = this.P;

    this.refLbl.textContent = refToString(ref);
    this.refLbl.style.color = this.P;
    this.emptyEl.style.display = "none";
    this.contentWrapEl.style.display = "flex";
    this.closeSdef();
    this.activeStrongsCard = null;
    this.showGridLoading();
    this.verseTextEl.innerHTML = spinnerSVG();
    this.verseTextEl.style.color = "var(--text-muted)";

    const [verse, words] = await Promise.all([
      getScripture(ref, this.settings),
      fetchInterlinear(ref, this.settings.display.interlinearLanguage),
    ]);

    if (seq !== this.loadingSeq) return;

    this.verseTextEl.style.color = "var(--text-normal)";
    this.renderVerseText(this.verseTextEl, verse.formattedText ?? verse.text);
    this.verLabel.textContent = verse.version;

    const srcEl = this.contentEl.querySelector<HTMLElement>(".ss-panel-src")!;
    const offlineEl = this.contentEl.querySelector<HTMLElement>(".ss-panel-offline")!;
    srcEl.textContent = verse.source === "local" ? "Local KJV"
      : verse.source === "cache" ? `Cache · ${verse.version}`
        : "bible-api.com";
    offlineEl.style.display = verse.offline ? "inline" : "none";
    this.footEl.style.display = "flex";

    this.renderGrid(words);
    this.renderCrossRefs(ref);
    this.renderBacklinks(ref);
  }

  // ── Bible mode toggle ─────────────────────────────────────────────────────

  private toggleBibleMode(): void {
    if (this.bibleMode) this.exitBibleMode();
    else this.enterBibleMode();
  }

  private enterBibleMode(): void {
    // Push current state onto nav stack before switching
    if (this.searchMode) {
      const q = this.searchInput?.value?.trim() ?? "";
      if (q) this.pushNav({ type: "search", query: q });
    } else if (this.currentRef) {
      this.pushNav({ type: "research", ref: this.currentRef });
    }

    this.bibleMode = true;

    // Swap icon → open-bible, full opacity
    this.bibleToggleBtn.innerHTML = openBibleSvg(32);
    this.bibleToggleBtn.title = "Back to Reader";
    this.bibleToggleBtn.style.opacity = "1";

    // Show bible center (book·chapter), hide reader-mode elements in header
    this.bibleCenterEl.style.display = "flex";
    this.readerCenterEl.style.display = "none";
    this.intToggleBtn.style.display = "none";

    // Hide reader body elements (including morphPanel — fix #6)
    this.searchBarEl.style.display = "none";
    this.searchResultsEl.style.display = "none";
    this.emptyEl.style.display = "none";
    this.contentWrapEl.style.display = "none";
    // Always close the morph panel when entering Bible mode
    if (this.morphPanelOpen) {
      this.morphPanelOpen = false;
      this.morphPanelEl.style.display = "none";
    }

    // Show bible container
    this.bibleModeEl.style.cssText = "display:flex; flex-direction:column; flex:1; overflow:hidden; min-height:0;";

    if (!this.bibleModeView) {
      this.bibleModeView = new BibleModeView(this.app, this.bibleModeEl, this.settings);

      // Wire verse gesture callbacks → research mode
      this.bibleModeView.onOpenResearch = (verseKeyOrSearch: string, withInterlinear?: boolean, highlightWord?: string) => {
        this.exitBibleMode();

        if (verseKeyOrSearch.startsWith("search:")) {
          const parts = verseKeyOrSearch.split(":");
          const query = parts[1] ?? "";
          const isOriginal = parts[2] === "original";
          if (this.searchInput) {
            this.searchInput.value = query;
            this.runSearch();
            if (isOriginal) this.searchInput.placeholder = `Searching "${query}" in glosses…`;
          }
        } else {
          const parsed = parseScriptureRefs(verseKeyOrSearch);
          if (parsed.length) {
            if (withInterlinear && this.interlinearState === "off") {
              this.cycleInterlinearState();
            }
            this.setRef(parsed[0], this.currentEditor);

            // ✅ Auto-activate card matching the tapped word.
            // KJV surface forms and interlinear glosses often diverge
            // (e.g. KJV "righteous" vs gloss "being unrighteous", or
            // KJV "love" vs gloss "loving"), so we try progressively
            // looser match strategies before giving up.
            if (highlightWord) {
              setTimeout(() => {
                const cards = this.gridEl.querySelectorAll<HTMLElement>('.ss-word-card');
                const clean = (s: string) =>
                  s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
                // Strip common English inflection suffixes for stem comparison
                const stem = (w: string) =>
                  w.replace(/(ingly|ness|ful|less|tion|sion|ment|edly|ing|ed|er|est|ly|s)$/, "");

                const cleanTarget = clean(highlightWord);
                const stemTarget  = stem(cleanTarget);

                const hits = (eng: string, orig: string): boolean => {
                  if (!cleanTarget) return false;
                  // 1. Exact whole-field match
                  if (eng === cleanTarget || orig === cleanTarget) return true;
                  // 2. Substring: the KJV word appears inside the gloss
                  //    ("righteous" inside "unrighteous", "holy" inside "being holy")
                  if (eng.includes(cleanTarget)) return true;
                  // 3. Reverse substring: gloss is contained in the KJV word
                  //    ("dark" inside "darkness") — require min 3 chars to avoid noise
                  if (eng.length > 3 && cleanTarget.includes(eng)) return true;
                  // 4. Stem both whole field
                  const stemEng = stem(eng);
                  if (stemEng.length > 2 && stemEng === stemTarget) return true;
                  // 5. Try each individual word in a multi-word gloss
                  //    ("being righteous still" → check "righteous")
                  for (const w of eng.split(/\s+/)) {
                    const cw = clean(w);
                    if (cw === cleanTarget) return true;
                    const sw = stem(cw);
                    if (sw.length > 2 && sw === stemTarget) return true;
                  }
                  return false;
                };

                for (const card of Array.from(cards)) {
                  const eng  = clean(card.querySelector('.ss-card-english')?.textContent ?? "");
                  const orig = clean(card.querySelector('.ss-card-orig')?.textContent ?? "");
                  if (hits(eng, orig)) {
                    card.scrollIntoView({ block: "center", behavior: "smooth" });
                    setTimeout(() => card.click(), 250);
                    break;
                  }
                }
              }, 450);
            }
          }
        }
      };
    }
    // Wire bible mode to update the shared header elements
    this.bibleModeView.updateHeaderExternal(
      this.bibleBookTitleEl,
      this.bibleChapterNumEl,
      this.bibleNavCaret
    );

    // When the Bible mode book changes, re-theme the readingPanel header elements
    // that are styled with the current book color (back arrow, chapter num, caret).
    this.bibleModeView.onPaletteChange = (P, PL, PM, PD) => {
      this.bibleChapterNumEl.style.color = P;
      this.bibleNavCaret.style.color = P;
      this.backBtn.style.color = P;

      // ✅ Sync header version pill & interlinear toggle to current book palette
      if (this.verLabel) {
        this.verLabel.style.color = textOnVividFor(P);
        this.verLabel.parentElement!.style.background = P;
      }
      this.intToggleBtn.style.borderColor = PM;
      // Delegate full icon+color sync to the state-aware helper
      this.syncToggleBtnStyle();
    };

    // ✅ Kick the palette callback once immediately so the header colors
    // reflect the bible mode's CURRENT position (not the research ref) the
    // moment you toggle in — without navigating bible mode anywhere.
    this.bibleModeView.firePaletteChange();
  }

  private exitBibleMode(): void {
    this.bibleModeView?.clearTextSelection();
    this.bibleMode = false;

    // Swap icon → research-bible, muted
    this.bibleToggleBtn.innerHTML = researchBibleSvg(32);
    this.bibleToggleBtn.title = "Open Bible";
    this.bibleToggleBtn.style.opacity = "0.75";

    // Hide bible center, restore reader header elements
    this.bibleCenterEl.style.display = "none";
    this.readerCenterEl.style.display = "flex";
    this.intToggleBtn.style.display = "flex";

    // Hide bible container
    this.bibleModeEl.style.display = "none";

    // ✅ Re-sync header palette to current research mode book
    this.updatePalette();
    this.applyLayout();
    if (this.verLabel) {
      this.verLabel.style.color = this.PV;
      this.verLabel.parentElement!.style.background = this.P;
    }
    this.backBtn.style.color = this.P;

    // Restore reader body elements (morph panel stays closed after Bible mode)
    this.searchBarEl.style.display = "flex";
    if (this.searchMode) {
      this.searchResultsEl.style.display = "flex";
    } else if (this.currentRef) {
      this.contentWrapEl.style.display = "flex";
    } else {
      this.emptyEl.style.display = "flex";
    }
  }

  private buildVersionDropdown(root: HTMLElement): void {
    // The dropdown is appended to root (contentEl) as position:absolute.
    // It anchors right:8px and appears just below the header (~40px).
    // We query it by class name when the version button is clicked.
    const dd = root.createEl("div");
    dd.className = "ss-panel-ver-dd";
    dd.style.cssText = `
      display:none; position:absolute; top:38px; right:8px;
      background:var(--background-primary);
      border:1px solid var(--background-modifier-border);
      border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,0.18);
      z-index:500; min-width:110px; overflow:hidden;
    `;
    this.populateVersionDropdown(dd);
    document.addEventListener("click", () => { dd.style.display = "none"; });
  }

  private populateVersionDropdown(dd: HTMLElement): void {
    dd.empty();
    for (const v of this.settings.favoriteTranslations) {
      const item = dd.createEl("div");
      item.textContent = v;
      item.style.cssText = "padding:7px 12px;cursor:pointer;font-size:12px;color:var(--text-normal);";
      item.addEventListener("mouseenter", () => item.style.background = "var(--background-modifier-hover)");
      item.addEventListener("mouseleave", () => item.style.background = "");
      item.addEventListener("click", async (e) => {
        e.stopPropagation();
        dd.style.display = "none";
        this.settings.primaryTranslation = v;
        this.verLabel.textContent = v;

        // Bible mode: reload current chapter verse text in new version
        if (this.bibleMode && this.bibleModeView) {
          this.bibleModeView.settings = this.settings;
          const pos = this.bibleModeView.getPosition();
          this.bibleModeView.goTo(pos.bookId, pos.chapter);
          return;
        }

        // Reader mode: reload verse text only (not interlinear —
        // interlinear is always the original language, unaffected by translation)
        if (this.currentRef) {
          const srcEl = this.contentEl.querySelector<HTMLElement>(".ss-panel-src");
          const verseText = this.verseTextEl;
          if (verseText) {
            const { getScripture } = await import("./fetcher");
            const verse = await getScripture(this.currentRef, this.settings);
            this.renderVerseText(verseText, verse.formattedText ?? verse.text);
            if (this.verLabel) this.verLabel.textContent = verse.version;
            if (srcEl) srcEl.textContent = verse.source === "local" ? "Local KJV"
              : verse.source === "cache" ? `Cache · ${verse.version}`
                : "bible-api.com";
          }
        }
      });
    }
  }

  private buildEmptyState(root: HTMLElement): void {
    this.emptyEl = root.createEl("div");
    this.emptyEl.style.cssText = `
      flex:1; display:flex; flex-direction:column;
      align-items:center; justify-content:center;
      padding:24px 16px; color:var(--text-muted); text-align:center;
    `;

    const iconWrap = this.emptyEl.createEl("div");
    iconWrap.style.cssText = `margin-bottom:14px; opacity:0.22; color:${this.P};`;
    iconWrap.innerHTML = scrollSvg(108);

    const title = this.emptyEl.createEl("div");
    title.style.cssText = `font-size:13px; font-weight:600; margin-bottom:6px; color:var(--text-normal);`;
    title.textContent = "No reference selected";

    const sub = this.emptyEl.createEl("div");
    sub.style.cssText = `font-size:11px; line-height:1.7; opacity:.75; margin-bottom:20px;`;
    sub.innerHTML = `Hover a scripture reference in your note to load it here.<br>
      <span style="opacity:.6;font-size:10px;">Or type a verse above — try <em>John 3:16</em></span>`;

    // ── Verse of the Day — full display card ──────────────────────────────────
    if (this.settings.verseOfTheDay?.enabled !== false) {
      const votd = getVerseOfTheDay();

      // Look up verse text from local KJV data synchronously
      const kjvData = getKJVData() as Record<string, string>;
      const verseKey = `${votd.book} ${votd.chapter}:${votd.verse}`;
      const verseText = kjvData[verseKey] ?? "";

      const card = this.emptyEl.createEl("div");
      card.style.cssText = `
        width:100%; max-width:280px;
        background:${this.P}14;
        border:1px solid ${this.P}30;
        border-radius:10px;
        padding:14px 16px 12px;
        cursor:pointer;
        text-align:left;
        transition:background 0.15s, border-color 0.15s, transform 0.1s;
      `;
      card.addEventListener("mouseenter", () => {
        card.style.background = `${this.P}24`;
        card.style.borderColor = `${this.P}55`;
        card.style.transform = "scale(1.01)";
      });
      card.addEventListener("mouseleave", () => {
        card.style.background = `${this.P}14`;
        card.style.borderColor = `${this.P}30`;
        card.style.transform = "";
      });
      card.addEventListener("click", () => this.showVerseOfTheDay(true));

      // Header row: TODAY chip + tag
      const header = card.createEl("div");
      header.style.cssText = `
        display:flex; align-items:center; gap:7px; margin-bottom:10px;
      `;
      const chip = header.createEl("span");
      chip.textContent = "TODAY";
      chip.style.cssText = `
        font-size:8px; font-weight:800; letter-spacing:.1em;
        background:${this.P}; color:white;
        border-radius:4px; padding:2px 6px; flex-shrink:0;
      `;
      const tag = header.createEl("span");
      tag.textContent = votd.tag;
      tag.style.cssText = `font-size:10px; color:${this.P}; font-weight:600; opacity:0.85;`;

      // Verse text — the whole point
      if (verseText) {
        const text = card.createEl("div");
        // Truncate gracefully if very long
        const display = verseText.length > 180
          ? verseText.slice(0, 177) + "…"
          : verseText;
        text.textContent = `"${display}"`;
        text.style.cssText = `
          font-size:12px; line-height:1.65;
          color:var(--text-normal); font-style:italic;
          margin-bottom:10px;
        `;
      }

      // Reference line
      const ref = card.createEl("div");
      ref.textContent = `— ${votd.book} ${votd.chapter}:${votd.verse}`;
      ref.style.cssText = `
        font-size:10.5px; font-weight:600;
        color:${this.P}; opacity:0.9;
        text-align:right;
      `;

      this.emptyEl.appendChild(card);
    }
  }

  private buildContentWrap(root: HTMLElement): void {
    this.contentWrapEl = root.createEl("div");
    // Ensure the entire pane is naturally scrollable
    this.contentWrapEl.style.cssText = "display:none;flex-direction:column;flex:1;overflow-y:auto;min-height:0;overscroll-behavior:contain;";

    // Rubber-band overscroll: brief squash+bounce when hitting top/bottom on the main pane
    let rbTimer: ReturnType<typeof setTimeout> | null = null;
    this.contentWrapEl.addEventListener("scroll", () => {
      const el = this.contentWrapEl;
      if (rbTimer) return;
      const atTop = el.scrollTop <= 0;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
      if (atTop || atBottom) {
        rbTimer = setTimeout(() => { rbTimer = null; }, 400);
        const dir = atTop ? 1 : -1;
        el.style.transition = "transform 0.18s cubic-bezier(0.34,1.56,0.64,1)";
        el.style.transform = `translateY(${dir * 6}px) scaleY(0.985)`;
        setTimeout(() => {
          el.style.transition = "transform 0.28s cubic-bezier(0.34,1.2,0.64,1)";
          el.style.transform = "translateY(0) scaleY(1)";
        }, 180);
      }
    }, { passive: true });

    // ── Interlinear section ───────────────────────────────────────
    this.intSection = this.contentWrapEl.createEl("div");
    this.intSection.style.cssText = `
      display:flex; flex-direction:column; flex-shrink:0;
      border-bottom:1px solid var(--background-modifier-border);
    `;

    this.intLbl = this.intSection.createEl("div");
    this.intLbl.style.cssText = `
      padding:3px 10px; font-size:9px; font-weight:700; letter-spacing:.08em;
      text-transform:uppercase; color:${this.P};
      background:var(--background-secondary);
      border-bottom:1px solid var(--background-modifier-border);
      flex-shrink:0;
    `;
    this.intLbl.textContent = "Interlinear";

    // Auto-fit word grid
    this.gridEl = this.intSection.createEl("div");
    this.gridEl.className = "ss-panel-grid";
    this.gridEl.style.cssText = `
      display:flex; flex-wrap:wrap; align-content:flex-start;
      gap:5px; padding:8px;
    `;

    // Horizontal swipe on the interlinear grid → navigate verses
    this.wireGridSwipeNav(this.gridEl);

    // ── Strong's definition drawer — sits between interlinear and verse ───────
    this.sdefEl = this.contentWrapEl.createEl("div");
    this.sdefEl.className = "ss-panel-sdef";
    this.sdefEl.style.cssText = `
      display:none; margin:0 8px 8px; border-radius:7px;
      padding:8px 10px; background:${this.PL};
      border:1px solid ${this.PM}; flex-shrink:0;
    `;

    // ── Backlinks section — notes in your vault that cite this verse ──────────
    this.backlinkEl = this.contentWrapEl.createEl("div");
    this.backlinkEl.className = "ss-panel-backlinks";
    this.backlinkEl.style.cssText = "display:none; flex-shrink:0;";

    // ── Cross-reference section — between Backlinks and verse ───────────
    this.xrefEl = this.contentWrapEl.createEl("div");
    this.xrefEl.className = "ss-panel-xref";
    this.xrefEl.style.cssText = "display:none; flex-shrink:0;";

    // ── Verse section ─────────────────────────────────────────────
    this.verseSection = this.contentWrapEl.createEl("div");
    this.verseSection.style.cssText = "display:flex;flex-direction:column;flex-shrink:0;";

    const verseLbl = this.verseSection.createEl("div");
    verseLbl.style.cssText = `
      padding:3px 10px; font-size:9px; font-weight:700; letter-spacing:.08em;
      text-transform:uppercase; color:var(--text-muted);
      background:var(--background-secondary);
      border-bottom:1px solid var(--background-modifier-border);
      flex-shrink:0;
    `;
    verseLbl.textContent = "Verse";

    this.verseTextEl = this.verseSection.createEl("div");
    this.verseTextEl.style.cssText = `
      padding:12px 14px 6px;
      font-size:14px; line-height:1.85; color:var(--text-normal);
      user-select:text; -webkit-user-select:text;
    `;

    // Double-tap on the verse text → switch to Bible mode at that verse
    let tapTimer: ReturnType<typeof setTimeout> | null = null;
    this.verseTextEl.addEventListener("click", (e) => {
      // Ignore if user is actively highlighting text to drag/copy
      if (window.getSelection()?.toString().length) return;
      if (tapTimer) {
        clearTimeout(tapTimer);
        tapTimer = null;
        // Double-tap detected — flash the verse text then navigate
        if (!this.currentRef) return;
        this.flashVerseText(this.verseTextEl, () => {
          if (!this.bibleMode) this.enterBibleMode();
          import("./bibleData").then(({ BIBLE_BOOKS }) => {
            const book = BIBLE_BOOKS.find(b => b.name === this.currentRef!.book);
            if (book && this.bibleModeView) {
              const verseKey = `${this.currentRef!.book} ${this.currentRef!.chapter}:${this.currentRef!.verseStart}`;
              this.bibleModeView.goTo(book.id, this.currentRef!.chapter, verseKey);
            }
          });
        });
      } else {
        tapTimer = setTimeout(() => { tapTimer = null; }, 320);
      }
    });

    this.footEl = this.verseSection.createEl("div");
    this.footEl.style.cssText = `
      flex-shrink:0; display:none;
      justify-content:space-between; align-items:center;
      padding:3px 12px 5px;
      font-size:10px; color:var(--text-muted);
      border-top:1px solid var(--background-modifier-border);
    `;
    this.footEl.innerHTML = `
      <span class="ss-panel-src"></span>
      <span class="ss-panel-offline" style="display:none;color:var(--text-error);">⚠ Offline – KJV</span>
    `;

    this.applyLayout();
  }

  // ── Layout ────────────────────────────────────────────────────────────────

  /** Determines if the current ref is an OT book */
  private get isOT(): boolean {
    if (!this.currentRef) return false;
    return OT_BOOKS.has(this.currentRef.book);
  }

  /** Cycle the interlinear state and re-render */
  private cycleInterlinearState(): void {
    if (this.isOT) {
      // OT: off -> MT -> LXX -> off
      if      (this.interlinearState === "off") this.interlinearState = "MT";
      else if (this.interlinearState === "MT")  this.interlinearState = "LXX";
      else                                       this.interlinearState = "off";
    } else {
      // NT: off -> LXX (Greek) -> off
      if (this.interlinearState === "off") this.interlinearState = "LXX";
      else                                  this.interlinearState = "off";
    }
    // Remember which icon was last shown while active
    if (this.interlinearState === "MT")  this.lastInterlinearIcon = "\u05d0";
    if (this.interlinearState === "LXX") this.lastInterlinearIcon = "\u03b1";
    this.applyLayout();
    if (this.currentRef && this.interlinearState !== "off") {
      // Re-fetch interlinear for the selected mode
      const lang = this.interlinearState === "MT" ? "hebrew" : "greek";
      fetchInterlinear(this.currentRef, lang === "greek" ? "greek" : "hebrew", this.interlinearState === "LXX" ? "LXX" : "KJV")
        .then(words => this.renderGrid(words));
    }
  }

  /** Sync the toggle button's icon and color to current state */
  private syncToggleBtnStyle(): void {
    switch (this.interlinearState) {
      case "MT":
        this.intToggleBtn.textContent = "\u05d0"; // Aleph
        this.intToggleBtn.title = "Interlinear: Hebrew MT (click for LXX)";
        this.intToggleBtn.style.background    = this.P;
        this.intToggleBtn.style.color         = this.PL;
        this.intToggleBtn.style.borderColor   = this.P;
        break;
      case "LXX":
        this.intToggleBtn.textContent = "\u03b1"; // Alpha
        this.intToggleBtn.title = this.isOT
          ? "Interlinear: Greek LXX (click to turn off)"
          : "Interlinear: Greek NT (click to turn off)";
        this.intToggleBtn.style.background    = this.P;
        this.intToggleBtn.style.color         = this.PL;
        this.intToggleBtn.style.borderColor   = this.P;
        break;
      default: // "off" — icon matches current book (aleph for OT, alpha for NT)
        this.intToggleBtn.textContent = this.isOT ? "\u05d0" : "\u03b1";
        this.intToggleBtn.title = this.isOT
          ? "Toggle interlinear (tap: MT Hebrew א → LXX Greek α)"
          : "Toggle interlinear (Greek α)";
        this.intToggleBtn.style.background  = "transparent";
        this.intToggleBtn.style.color       = this.P;   // accent, not gray
        this.intToggleBtn.style.borderColor = this.PM;
        break;
    }
  }

  private applyLayout(): void {
    if (this.interlinearState !== "off") {
      this.intSection.style.display = "flex";
      this.verseSection.style.order = "0";
    } else {
      this.intSection.style.display = "none";
      this.verseSection.style.order = "-1";
    }
    this.syncToggleBtnStyle();
  }

  // ── Grid ──────────────────────────────────────────────────────────────────

  private showGridLoading(): void {
    this.gridEl.style.cssText = `
      display:flex; flex-wrap:wrap; align-content:flex-start;
      gap:5px; padding:8px;
    `;
    this.gridEl.empty();
    for (let i = 0; i < 8; i++) this.gridEl.appendChild(skeletonCard());
  }

  private renderGrid(words: InterlinearWord[]): void {
    const filtered = words.filter(w => w.original && w.original !== "—");

    if (!filtered.length) {
      this.gridEl.style.cssText = `
        display:flex; align-items:center; justify-content:center;
        padding:16px; font-size:11px; color:var(--text-muted); text-align:center;
      `;
      this.gridEl.innerHTML = `
        No interlinear data for this verse.<br>
        <span style="font-size:10px;opacity:.7;margin-top:4px;display:block;">
          Requires internet or offline data files.
        </span>
      `;
      return;
    }

    this.gridEl.style.cssText = `
      display:flex; flex-wrap:wrap; align-content:flex-start;
      gap:5px; padding:8px;
    `;
    this.gridEl.empty();
    for (const word of filtered) this.gridEl.appendChild(this.buildWordCard(word));

    // Auto-activate card if coming from a Strong's search
    if (this.pendingStrongsHighlight) {
      const pending = this.pendingStrongsHighlight;
      this.pendingStrongsHighlight = null;
      const target = this.gridEl.querySelector<HTMLElement>(`[data-strongs="${pending}"]`);
      console.debug(`ScriptureScribe: auto-activate ${pending} → found=${!!target}`);
      if (target) {
        setTimeout(() => {
          target.scrollIntoView({ block: "nearest", behavior: "smooth" });
          this.handleCardClick(target, pending);
        }, 200);
      }
    }
  }

  private buildWordCard(word: InterlinearWord): HTMLElement {
    const isHeb = word.language === "hebrew";
    const card = document.createElement("div");

    // Inject card keyframes once
    if (!document.getElementById("ss-card-kf")) {
      const s = document.createElement("style");
      s.id = "ss-card-kf";
      s.textContent = `
        @keyframes ss-card-select {
          0%   { transform: scale(1); }
          35%  { transform: scale(1.07); }
          60%  { transform: scale(0.96); }
          80%  { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
        @keyframes ss-card-deselect {
          0%   { transform: scale(1); }
          40%  { transform: scale(0.96); }
          100% { transform: scale(1); }
        }
      `;
      document.head.appendChild(s);
    }

    card.className = "ss-word-card";
    card.style.cssText = `
      text-align:center;
      background:var(--background-secondary);
      border-radius:6px; padding:6px 8px;
      border:1px solid var(--background-modifier-border);
      display:flex; flex-direction:column; gap:2px;
      transition:border-color 0.15s, background 0.15s, box-shadow 0.15s;
      cursor:pointer; transform-origin:center;
      user-select:text; -webkit-user-select:text;
    `;

    if (this.settings.display.cardShowEnglish !== false && word.english) {
      const el = document.createElement("div");
      el.textContent = word.english;
      el.className = "ss-card-english";
      // Use theme-aware color so it reads on both light and dark card backgrounds
      el.style.cssText = `
        font-size:10px; color:var(--text-normal);
        line-height:1.3; word-break:break-word;
        transition:color 0.15s;
      `;
      card.appendChild(el);
    }

    const origEl = document.createElement("div");
    origEl.textContent = word.original;
    origEl.className = "ss-card-orig";
    // Unselected: purple accent — distinguishes original language from gloss
    origEl.style.cssText = `
      font-size:${isHeb ? "15px" : "13px"};
      color:${this.PM};
      font-style:${isHeb ? "normal" : "italic"};
      direction:${isHeb ? "rtl" : "ltr"};
      font-family:${isHeb ? "Georgia,serif" : "inherit"};
      line-height:1.4; transition:color 0.15s;
    `;
    card.appendChild(origEl);

    if (this.settings.display.cardShowTranslit !== false && word.transliteration) {
      const el = document.createElement("div");
      el.textContent = word.transliteration;
      el.className = "ss-card-translit";
      el.style.cssText = `
        font-size:8.5px; color:var(--text-muted);
        word-break:break-word; line-height:1.2; transition:color 0.15s;
      `;
      card.appendChild(el);
    }

    if (word.strongsNum) {
      // Always store the dataset attr so click-for-definition still works
      card.dataset.strongs = word.strongsNum.replace(/([GH]\d+)[A-Za-z]$/, "$1");

      if (this.settings.display.cardShowStrongs !== false) {
        const numEl = document.createElement("div");
        numEl.textContent = word.strongsNum;
        numEl.className = "ss-card-strongs";
        numEl.style.cssText = `
          font-size:8px; color:${this.PM};
          font-weight:700; margin-top:1px; transition:color 0.15s;
          opacity:0.75;
        `;
        card.appendChild(numEl);
      }
    }

    if (word.morph) {
      card.dataset.morph = word.morph;
      if (this.settings.morphology.enabled) {
        const mEl = document.createElement("div");
        mEl.textContent = word.morph;
        mEl.className = "ss-card-morph";
        mEl.style.cssText = `
          font-size:8px; color:${this.PM}; font-weight:700;
          opacity:0.8; margin-top:2px; transition:color 0.15s;
        `;
        card.appendChild(mEl);
      }
    }

    card.title = word.strongsNum
      ? `${word.strongsNum} — click for definition`
      : word.english || word.transliteration || "";

    // ── Hover: purple fill, white text labels ─────────────────────────────
    card.addEventListener("mouseenter", () => {
      if (this.activeStrongsCard !== card) {
        card.style.borderColor = this.P;
        card.style.background = this.P;
        card.style.boxShadow = `0 2px 8px ${this.P}55`;
        card.querySelector<HTMLElement>(".ss-card-english")
          ?.style.setProperty("color", this.PV);  // PV = white for dark bases, dark for bright
        card.querySelector<HTMLElement>(".ss-card-orig")
          ?.style.setProperty("color", this.PV);  // PV = dark for bright fills, white for dark
        card.querySelector<HTMLElement>(".ss-card-translit")
          ?.style.setProperty("color", this.PV === "#ffffff" ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)");
        card.querySelector<HTMLElement>(".ss-card-strongs")
          ?.style.setProperty("color", this.PV === "#ffffff" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.4)");
      }
    });
    card.addEventListener("mouseleave", () => {
      if (this.activeStrongsCard !== card) {
        this.resetCardColors(card);
      }
    });
    card.addEventListener("click", (e) => {
      // Don't trigger card if the user is just trying to drag-select text
      if (window.getSelection()?.toString().length) return;
      e.stopPropagation();
      this.handleCardClick(card, word.strongsNum || "", word.morph);
    });
    return card;
  }

  /** Reset card to unselected visual state */
  private resetCardColors(card: HTMLElement): void {
    card.style.borderColor = "var(--background-modifier-border)";
    card.style.background = "var(--background-secondary)";
    card.style.boxShadow = "none";
    card.querySelector<HTMLElement>(".ss-card-english")
      ?.style.setProperty("color", "var(--text-normal)");
    card.querySelector<HTMLElement>(".ss-card-orig")
      ?.style.setProperty("color", this.PM);
    card.querySelector<HTMLElement>(".ss-card-translit")
      ?.style.setProperty("color", "var(--text-muted)");
    card.querySelector<HTMLElement>(".ss-card-strongs")
      ?.style.setProperty("color", this.PM);
  }

  /** Apply selected visual state */
  private selectCardColors(card: HTMLElement): void {
    card.style.borderColor = this.P;
    card.style.background = this.PL;
    card.style.boxShadow = `0 2px 10px ${this.P}33`;
    // PL is a light tint — use PX (contrast-safe dark accent) so text is readable
    card.querySelector<HTMLElement>(".ss-card-english")
      ?.style.setProperty("color", "#1a1a1a");
    card.querySelector<HTMLElement>(".ss-card-orig")
      ?.style.setProperty("color", this.PX);  // dark-readable accent on light bg
    card.querySelector<HTMLElement>(".ss-card-translit")
      ?.style.setProperty("color", "#666");
    card.querySelector<HTMLElement>(".ss-card-strongs")
      ?.style.setProperty("color", this.PX);
    card.querySelector<HTMLElement>(".ss-card-morph")
      ?.style.setProperty("color", this.PX);  // morph tag on light bg
  }

  // ── Strong's drawer ───────────────────────────────────────────────────────

  private handleCardClick(card: HTMLElement, strongsNum: string, morph?: string): void {
    // Toggle off if same card clicked again
    if (this.activeStrongsCard === card && this.sdefEl.style.display !== "none") {
      // Deselect spring
      card.style.animation = "none";
      void card.offsetWidth;
      card.style.animation = "ss-card-deselect 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards";
      this.closeSdef();
      return;
    }
    // Deselect previous card
    if (this.activeStrongsCard && this.activeStrongsCard !== card) {
      this.activeStrongsCard.style.animation = "none";
      void this.activeStrongsCard.offsetWidth;
      this.activeStrongsCard.style.animation = "ss-card-deselect 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards";
      this.resetCardColors(this.activeStrongsCard);
    }
    this.activeStrongsCard = card;
    // Select spring bounce
    card.style.animation = "none";
    void card.offsetWidth;
    card.style.animation = "ss-card-select 0.38s cubic-bezier(0.34,1.56,0.64,1) forwards";
    this.selectCardColors(card);
    if (strongsNum || morph) this.showSdef(strongsNum, morph);
  }

  private closeSdef(): void {
    this.sdefEl.style.display = "none";
    if (this.activeStrongsCard) {
      this.resetCardColors(this.activeStrongsCard);
      this.activeStrongsCard = null;
    }
  }

  private async showSdef(strongsNum: string, morph?: string): Promise<void> {
    // Reset touch state on navigation
    this.touchActive = false;
    if (this.touchTimer) { clearTimeout(this.touchTimer); this.touchTimer = null; }
    this.sdefEl.style.display = "block";
    this.sdefEl.style.background = this.PL;
    this.sdefEl.style.borderColor = this.PM;
    this.sdefEl.empty();

    // ── Header: num + original + toggle + speaker + close ───────────────────
    const hdr = this.sdefEl.createEl("div");
    hdr.style.cssText = "display:flex; align-items:center; gap:4px; margin-bottom:6px;";

    const lbl = hdr.createEl("div");
    lbl.style.cssText = `
      flex:1; min-width:0; font-size:10px; color:${this.PX}; font-weight:700; line-height:1.4;
      cursor:pointer; text-decoration:underline; text-decoration-style:dotted;
      text-underline-offset:2px;
    `;
    lbl.title = `Search for ${strongsNum}`;
    lbl.textContent = `${strongsNum} · loading…`;
    // Tap the strongs number header → run a search for it
    lbl.addEventListener("click", (e) => {
      e.stopPropagation();
      this.searchInput.value = strongsNum;
      this.runSearch();
    });

    const toggleBtn = hdr.createEl("button");
    toggleBtn.style.cssText = `
      background:none; border:none; box-shadow:none; outline:none;
      cursor:pointer; font-size:9px; font-weight:700; color:${this.PX};
      padding:0; line-height:1; flex-shrink:0;
      text-decoration:underline; text-underline-offset:2px;
    `;
    toggleBtn.textContent = isDefAdvanced() ? "advanced" : "simple";

    // Speaker icon placeholder — replaced after def loads with real URL
    const speakerWrap = hdr.createEl("span");
    speakerWrap.style.cssText = "flex-shrink:0; display:inline-flex;";

    const closeBtn = hdr.createEl("button");
    closeBtn.textContent = "✕";
    closeBtn.style.cssText = `
      background:none; border:none; box-shadow:none; outline:none;
      cursor:pointer; font-size:10px; color:${this.PX};
      padding:0; line-height:1; opacity:.5; flex-shrink:0; margin-left:2px;
    `;
    closeBtn.addEventListener("click", (e) => { e.stopPropagation(); this.closeSdef(); });

    // ── Scholar Mode Morphology Breakdown ────────────────────────────────────
    // Rendered below after simpleEl/advancedEl are created so the layout order
    // is: header → morph card → simple def → advanced def

    const simpleEl = this.sdefEl.createEl("div");
    // Force dark body text — sdefEl has a light (PL) background so we always want
    // dark-on-light regardless of the Obsidian theme's cascade.
    simpleEl.style.cssText = "min-height:8px; color:#1a1a2e;";
    const advancedEl = this.sdefEl.createEl("div");
    advancedEl.style.cssText = "display:none;";

    const callbacks: DefCallbacks = {
      onVerseRef: (rawRef) => {
        const normalised = rawRef.replace(/^([123]?[A-Za-z]+)\./, "$1 ");
        const parsed = parseScriptureRefs(normalised);
        if (parsed.length) {
          this.pendingStrongsHighlight = strongsNum;
          this.setRef(parsed[0], this.currentEditor);
        }
      },
      onStrongsNum: (num) => {
        this.searchInput.value = num;
        this.runSearch();
      },
      getVerseText: (rawRef) => {
        const normalised = rawRef.replace(/^([123]?[A-Za-z]+)\./, "$1 ");
        const parsed = parseScriptureRefs(normalised);
        if (!parsed.length) return null;
        const key = `${parsed[0].book} ${parsed[0].chapter}:${parsed[0].verseStart}`;
        return getKJVText(key) || null;
      },
    };

    const applyMode = () => {
      simpleEl.style.display = isDefAdvanced() ? "none" : "block";
      advancedEl.style.display = isDefAdvanced() ? "block" : "none";
      toggleBtn.textContent = isDefAdvanced() ? "advanced" : "simple";
    };
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation(); toggleDefAdvanced(); applyMode();
    });

    // ── Scholar Mode Morphology Breakdown ────────────────────────────────────
    if (morph && this.settings.morphology.enabled) {
      const mDetail = parseMorph(morph);
      if (mDetail) {
        const mWrap = this.sdefEl.createDiv({ cls: "ss-morph-wrap" });
        mWrap.style.cssText = `
          margin:0 0 10px; padding:9px 11px;
          background:rgba(255,255,255,.6); border-radius:7px;
          border:1px solid ${this.P}28; position:relative;
        `;

        // Language badge
        const langBadge = mWrap.createEl("span");
        langBadge.textContent = mDetail.language === "greek" ? "GK" : "HB";
        langBadge.style.cssText = `
          position:absolute; top:6px; right:8px;
          font-size:8px; font-weight:800; letter-spacing:.08em;
          color:${this.PX}; opacity:.7;
        `;

        // Raw code — small, monospaced, clickable to open morph search with this pattern
        const rawCode = mWrap.createEl("div");
        rawCode.textContent = morph;
        rawCode.style.cssText = `
          font-size:9px; font-family:var(--font-monospace,monospace);
          color:${this.PX}; margin-bottom:5px; cursor:pointer;
          text-decoration:underline; text-decoration-style:dotted;
          text-underline-offset:2px;
        `;
        rawCode.title = "Search all verses with this morph pattern";
        rawCode.addEventListener("click", () => {
          // Open morph panel and pre-fill the advanced input
          this.morphPanelOpen = true;
          this.morphPanelEl.style.display = "block";
          this.morphAdvancedMode = true;
          // Trigger mode switch visually
          const simP = this.morphPanelEl.querySelector<HTMLElement>(".ss-morph-simple");
          const advP = this.morphPanelEl.querySelector<HTMLElement>(".ss-morph-advanced");
          if (simP) simP.style.display = "none";
          if (advP) advP.style.display = "block";
          this.morphPatternInput.value = morph;
          this.morphPatternInput.focus();
        });

        // Technical line (all-small-caps)
        const techRow = mWrap.createDiv();
        techRow.textContent = mDetail.techLine;
        techRow.style.cssText = `
          font-size:10px; font-weight:800; color:${this.PX};
          margin-bottom:3px; font-variant:all-small-caps; letter-spacing:.04em;
        `;

        // Plain English line
        const plainRow = mWrap.createDiv();
        plainRow.textContent = mDetail.plainLine;
        plainRow.style.cssText = `
          font-size:11px; color:#2a2838;
          line-height:1.4; font-style:italic;
        `;

        // Teaching note
        if (mDetail.note && this.settings.morphology.showTeachingNotes) {
          const noteBox = mWrap.createDiv();
          noteBox.style.cssText = `
            margin-top:8px; padding-top:8px;
            border-top:1px dashed ${this.P}30;
            font-size:10.5px; color:#3d3a4f; line-height:1.55;
          `;
          noteBox.innerHTML = `<span style="color:${this.PX};font-weight:700;margin-right:5px;">💡</span>${mDetail.note}`;
        }
      }
    }

    const def = await fetchStrongsDefinition(strongsNum);
    if (!def && !morph) {
       lbl.textContent = strongsNum;
       simpleEl.textContent = "Definition unavailable.";
       return;
    }

    if (def) {
      const phonetic = def.phonetic ? ` /${def.phonetic}/` : "";
      lbl.textContent = [def.number, def.original, def.transliteration + phonetic]
        .filter(Boolean).join(" · ");
      speakerWrap.appendChild(makeSpeakerLink(def.number, def.original, def.transliteration));
      speakerWrap.appendChild(makeGlobeLink(def.number));
      buildSimpleDom(simpleEl, def.definition);
      advancedEl.innerHTML = "";
      buildAdvancedDefinition(advancedEl, def.definition, callbacks);
    } else {
      lbl.textContent = strongsNum;
      simpleEl.textContent = "Definition unavailable — check internet connection.";
    }
    applyMode();
  }

  // ── Backlinks ─────────────────────────────────────────────────────────────

  /**
   * Shows notes from the vault that reference this verse,
   * excluding the currently-active file to avoid self-links.
   * Placed above cross-references so personal notes come first.
   */
  private renderBacklinks(ref: ScriptureRef): void {
    this.backlinkEl.empty();
    this.backlinkEl.style.display = "none";

    // If vault scan hasn't finished yet, we'll be called again via onVaultIndexReady
    if (!isVaultIndexReady()) return;

    const notes = [...new Map(expandRef(ref).flatMap(({chapter, verse}) =>
      getNotesForVerse(`${ref.book} ${chapter}:${verse}`)).map(note => [note.filePath, note] as const)).values()];
    if (!notes.length) return;

    this.backlinkEl.style.display = "block";

    // ── Section header ────────────────────────────────────────────
    const hdr = this.backlinkEl.createEl("div");
    hdr.style.cssText = `
      padding:3px 10px; font-size:9px; font-weight:700; letter-spacing:.08em;
      text-transform:uppercase; color:var(--text-muted);
      background:var(--background-secondary);
      border-top:1px solid var(--background-modifier-border);
      border-bottom:1px solid var(--background-modifier-border);
      display:flex; align-items:center; justify-content:space-between;
    `;
    hdr.createEl("span").textContent = "In Your Notes";
    const countBadge = hdr.createEl("span");
    countBadge.textContent = String(notes.length);
    countBadge.style.cssText = `
      font-size:9px; font-weight:700; color:${this.P};
      background:${this.PL}; border-radius:8px; padding:1px 6px;
      letter-spacing:0; text-transform:none;
    `;

    // ── Note list ─────────────────────────────────────────────────
    const list = this.backlinkEl.createEl("div");
    list.style.cssText = "display:flex; flex-direction:column;";

    for (const note of notes) {
      const color = notePathToColor(note.filePath);
      const basename = note.filePath.split("/").pop()?.replace(/\.md$/, "") ?? note.filePath;
      const dirPath = note.filePath.split("/").slice(0, -1).join("/");

      const row = list.createEl("div");
      row.style.cssText = `
        display:flex; align-items:stretch; cursor:pointer;
        border-bottom:1px solid var(--background-modifier-border);
        transition:background 0.1s;
      `;
      row.addEventListener("mouseenter", () => row.style.background = "var(--background-modifier-hover)");
      row.addEventListener("mouseleave", () => row.style.background = "");
      row.addEventListener("click", (e) => {
        e.stopPropagation();
        this.app.workspace.openLinkText(note.filePath, "", false);
      });

      // Colored vertical bar
      const bar = row.createEl("div");
      bar.style.cssText = `
        width:3px; flex-shrink:0; align-self:stretch;
        background:${color};
      `;

      // Text
      const text = row.createEl("div");
      text.style.cssText = `
        flex:1; padding:7px 12px; min-width:0;
        display:flex; flex-direction:column; gap:2px;
      `;

      const nameEl = text.createEl("div");
      nameEl.textContent = basename;
      nameEl.style.cssText = `
        font-size:11px; font-weight:700;
        color:var(--text-normal);
        white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
      `;

      if (note.context) {
        const ctxEl = text.createEl("div");
        ctxEl.textContent = note.context;
        ctxEl.style.cssText = `
          font-size:10px; color:var(--text-muted); line-height:1.4;
          display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
          overflow:hidden;
        `;
      }

      if (dirPath) {
        const dirEl = text.createEl("div");
        dirEl.textContent = dirPath;
        dirEl.style.cssText = `
          font-size:9px; color:var(--text-muted); opacity:0.6;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        `;
      }

      // Arrow
      const arrow = row.createEl("div");
      arrow.textContent = "›";
      arrow.style.cssText = `
        flex-shrink:0; font-size:18px; color:var(--text-muted);
        opacity:0.35; align-self:center; padding-right:12px;
      `;
    }
  }

  // ── Cross-references ──────────────────────────────────────────────────────

  private renderCrossRefs(ref: ScriptureRef): void {
    this.xrefEl.empty();

    if (!isCrossRefLoaded()) {
      this.xrefEl.style.display = "none";
      return;
    }

    const all = getCrossRefs(ref);
    if (!all.length) {
      this.xrefEl.style.display = "none";
      return;
    }

    this.xrefEl.style.display = "block";

    // ── Section header ────────────────────────────────────────────
    const hdr = this.xrefEl.createEl("div");
    hdr.style.cssText = `
      padding:3px 10px; font-size:9px; font-weight:700; letter-spacing:.08em;
      text-transform:uppercase; color:var(--text-muted);
      background:var(--background-secondary);
      border-top:1px solid var(--background-modifier-border);
      border-bottom:1px solid var(--background-modifier-border);
      display:flex; align-items:center; justify-content:space-between;
    `;
    hdr.createEl("span").textContent = "Cross-References";

    // "show all (N)" / "show less" toggle
    const toggleLbl = hdr.createEl("span");
    toggleLbl.style.cssText = `
      font-size:9px; color:var(--text-muted); cursor:pointer;
      font-weight:400; letter-spacing:0; text-transform:none;
      opacity:.75;
    `;

    // ── Card list ─────────────────────────────────────────────────
    const list = this.xrefEl.createEl("div");
    list.style.cssText = "display:flex; flex-direction:column;";

    const showLess = this.settings.crossRefs?.showLessCount ?? 3;
    const expanded = this.settings.crossRefs?.expanded ?? false;

    const renderList = (isExpanded: boolean) => {
      list.empty();
      const toShow = isExpanded ? all : all.slice(0, showLess);
      for (const refStr of toShow) {
        list.appendChild(this.buildCrossRefCard(refStr));
      }
      // Update toggle label
      if (all.length <= showLess) {
        toggleLbl.textContent = "";
      } else if (isExpanded) {
        toggleLbl.textContent = "show less";
      } else {
        toggleLbl.textContent = `show all (${all.length})`;
      }
    };

    // Initial render
    renderList(expanded);

    // Wire toggle
    toggleLbl.addEventListener("click", async (e) => {
      e.stopPropagation();
      const nowExpanded = !(this.settings.crossRefs?.expanded ?? false);
      this.settings.crossRefs.expanded = nowExpanded;
      renderList(nowExpanded);
      this.onSaveSettings();
    });
  }

  /**
   * Build one cross-reference preview card.
   * Shows the address in accent colour, verse text on the next line (truncated
   * to ~2 lines with CSS). Clicking loads the ref into the panel.
   */
  private buildCrossRefCard(refStr: string): HTMLElement {
    const wrap = document.createElement("div");
    wrap.style.cssText = `position:relative; overflow:hidden;`;

    // Per-book color for this cross-reference (contrast-safe)
    const _crColor = contrastSafeText(getRefBookColor(refStr));

    // Embed underlay colored to the referenced book — not the current palette
    const underlay = document.createElement("div");
    underlay.setAttribute("data-ss-underlay", "1");
    underlay.style.cssText = `
      position:absolute; inset:0; background:${_crColor};
      display:flex; align-items:center; justify-content:flex-end;
      padding-right:20px; gap:8px;
    `;
    const cSent = document.createElement("span");
    cSent.textContent = "Quote";
    cSent.style.cssText = `font-size:11px;font-weight:700;color:#fff;opacity:0.5;transition:opacity 0.12s;`;
    underlay.appendChild(cSent);
    const cQuill = document.createElement("span");
    cQuill.innerHTML = getIcon("embed-text-white-qwill", 40);
    cQuill.style.cssText = `line-height:1;opacity:0.5;transform:scale(0.85);transition:opacity 0.12s,transform 0.12s; display:flex;`;
    underlay.appendChild(cQuill);
    wrap.appendChild(underlay);

    const card = document.createElement("div");
    card.style.cssText = `
      padding:7px 12px; cursor:pointer;
      border-bottom:1px solid var(--background-modifier-border);
      background:var(--background-primary);
      will-change:transform; position:relative;
    `;
    card.addEventListener("mouseenter", () => { if (!card.dataset.ssDragging) card.style.background = "var(--background-secondary)"; });
    card.addEventListener("mouseleave", () => card.style.background = "var(--background-primary)");

    // Right-edge swipe affordance — matches the Bible mode drawer hint.
    const swipeHint = document.createElement("span");
    swipeHint.setAttribute("data-ss-swipe-hint", "1");
    swipeHint.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="${this.PM}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
    swipeHint.style.cssText = `position:absolute;right:10px;top:50%;transform:translateY(-50%);opacity:0.45;pointer-events:none;transition:opacity 0.15s;display:flex;align-items:center;`;
    card.appendChild(swipeHint);

    // Address line — tap inserts ref into notes
    const addr = document.createElement("div");
    addr.textContent = refStr;
    // _crColor already computed above — reuse it for the address text
    addr.style.cssText = `
      font-size:11px; font-weight:700; color:${_crColor};
      margin-bottom:2px; line-height:1.3;
      cursor:pointer; display:inline-block; padding:2px 4px;
      border-radius:4px; margin-left:-4px;
      transition:background 0.15s, opacity 0.2s;
    `;
    addr.addEventListener("mouseenter", () => addr.style.background = "var(--background-secondary)");
    addr.addEventListener("mouseleave", () => addr.style.background = "");
    addr.addEventListener("click", (e) => {
      e.stopPropagation();
      addr.style.opacity = "0.3"; setTimeout(() => addr.style.opacity = "1", 200);
      const ed = this.getBestEditor();
      if (ed) {
        const cursor = ed.getCursor();
        ed.replaceRange(" " + refStr, cursor);
        ed.setCursor({ line: cursor.line, ch: cursor.ch + refStr.length + 1 });
        new Notice(`Inserted: ${refStr}`);
      } else {
        new Notice("Open a note first");
      }
    });
    card.appendChild(addr);

    // Verse text preview — fetched async, shows "…" until ready
    const preview = document.createElement("div");
    preview.textContent = "…";
    preview.style.cssText = `
      font-size:11px; color:var(--text-muted); line-height:1.5;
      display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
      overflow:hidden;
    `;
    card.appendChild(preview);
    wrap.appendChild(card);

    const parsed = parseScriptureRefs(refStr);
    if (parsed.length) {
      const xRef = parsed[0];

      getScripture(xRef, this.settings).then(verse => {
        preview.textContent = verse.text;
      }).catch(() => {
        preview.textContent = "";
      });

      const onTap = () => { this.setRef(xRef, this.currentEditor); };

      // Long-press → shunt to Bible mode and navigate there
      // Use touch/mouse separation to avoid double-fire on mobile
      // Long-press → shunt to Bible mode and navigate there
      // ✅ Fixed: tolerates micro-movements & safely lazy-initializes BibleModeView
      let longTimer: ReturnType<typeof setTimeout> | null = null;
      let cardTouchActive = false;
      let cardTouchTimer: ReturnType<typeof setTimeout> | null = null;
      let longPressStartX = 0;
      let longPressStartY = 0;

      const cancelLong = () => { if (longTimer) { clearTimeout(longTimer); longTimer = null; } };
      const fireLong = () => {
        cancelLong();
        const book = BIBLE_BOOKS.find(b => b.name === xRef.book);
        if (book) {
          // ✅ Initialize Bible mode if it hasn't been opened yet
          if (!this.bibleMode) this.enterBibleMode();
          // bibleModeView is guaranteed to exist after enterBibleMode()
          this.bibleModeView!.goTo(book.id, xRef.chapter, `${xRef.book} ${xRef.chapter}:${xRef.verseStart}`);
        }
      };

      card.addEventListener("touchstart", (e) => {
        if (cardTouchTimer) { clearTimeout(cardTouchTimer); cardTouchTimer = null; }
        cardTouchActive = true;
        longPressStartX = e.touches[0].clientX;
        longPressStartY = e.touches[0].clientY;
        longTimer = setTimeout(fireLong, 600);
      }, { passive: true });

      card.addEventListener("touchmove", (e) => {
        // ✅ Only cancel if finger actually moved > 10px (ignores scroll jitter)
        const dx = e.touches[0].clientX - longPressStartX;
        const dy = e.touches[0].clientY - longPressStartY;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) cancelLong();
      }, { passive: true });

      card.addEventListener("touchend", () => {
        cancelLong();
        if (cardTouchTimer) clearTimeout(cardTouchTimer);
        cardTouchTimer = setTimeout(() => { cardTouchActive = false; }, 500);
      }, { passive: true });

      card.addEventListener("touchcancel", () => {
        cancelLong();
        if (cardTouchTimer) clearTimeout(cardTouchTimer);
        cardTouchTimer = setTimeout(() => { cardTouchActive = false; }, 500);
      }, { passive: true });

      card.addEventListener("mousedown", (e) => {
        longPressStartX = e.clientX;
        longPressStartY = e.clientY;
        if (!cardTouchActive) longTimer = setTimeout(fireLong, 600);
      });
      card.addEventListener("mouseup", () => { if (!cardTouchActive) cancelLong(); });
      card.addEventListener("mousemove", (e) => {
        if (!cardTouchActive && longTimer) {
          // Cancel on desktop mouse drag to prevent stuck timers
          const dx = e.clientX - longPressStartX;
          const dy = e.clientY - longPressStartY;
          if (Math.abs(dx) > 5 || Math.abs(dy) > 5) cancelLong();
        }
      });
      card.addEventListener("mouseleave", () => { if (!cardTouchActive) cancelLong(); });

      const onEmbed = () => {
        const style = getGlobalEmbedStyle(this.settings);
        const ed = this.getBestEditor();
        if (!ed) { new Notice("Open a note first"); return; }
        embedAtCursor(ed, xRef, style, this.settings)
          .then(() => this.showEmbedToast(xRef.raw ?? ""))
          .catch(console.error);
      };
      this.wireSwipeEmbed(card, wrap, onTap, onEmbed);
    } else {
      card.style.cursor = "default";
    }

    return wrap;
  }

  // ── Verse text ────────────────────────────────────────────────────────────

  private renderVerseText(container: HTMLElement, text: string): void {
    renderPassage(container, text);
  }

  // ── Swipe helpers ─────────────────────────────────────────────────────────

  /**
   * Swipe-left-to-embed on search result rows and cross-ref cards.
   * Same model as wireDrawerSwipe in bibleMode — row slides left to reveal
   * the purple underlay. Never writes dragEl.style.transition during normal
   * state so background hover transitions are never corrupted.
   *
   * IMPORTANT: uses LOCAL touchActive / touchTimer (not class-level this.touchActive)
   * so that multiple simultaneous card instances don't corrupt each other's state.
   */
  private wireSwipeEmbed(
    dragEl: HTMLElement,
    containerEl: HTMLElement,
    onTap: () => void,
    onEmbed: () => void
  ): void {
    if (!document.getElementById("ss-quill-kf")) {
      const s = document.createElement("style");
      s.id = "ss-quill-kf";
      s.textContent = `@keyframes ss-quill-pop{0%{transform:scale(0.85)}40%{transform:scale(1.4)}70%{transform:scale(0.95)}100%{transform:scale(1.15)}}`;
      document.head.appendChild(s);
    }

    const sentEl = containerEl.querySelector<HTMLElement>("[data-ss-underlay] span:first-child") as HTMLElement | null;
    const quillEl = containerEl.querySelector<HTMLElement>("[data-ss-underlay] span:last-child") as HTMLElement | null;
    const hintEl = dragEl.querySelector<HTMLElement>("[data-ss-swipe-hint]");

    let startX = 0, startY = 0, dx = 0;
    let dragging = false, axisLocked = false, isHoriz = false;
    // Per-element touch flag — NOT shared on `this` to avoid cross-card corruption
    let touchActive = false;
    let touchTimer: ReturnType<typeof setTimeout> | null = null;

    const W = () => containerEl.offsetWidth || 300;
    const PEEK = 0.25;
    const COMMIT = 0.45;

    const peekAt = (ratio: number) => {
      if (hintEl) hintEl.style.opacity = ratio > 0.04 ? "0" : "0.45";
      if (!quillEl) return;
      if (ratio <= 0) {
        quillEl.style.opacity = "0.5";
        quillEl.style.transform = "scale(0.85)";
        if (sentEl) { sentEl.style.opacity = "0.5"; sentEl.textContent = "Quote"; }
      } else if (ratio >= PEEK) {
        quillEl.style.opacity = "1";
        quillEl.style.transform = "scale(1.1)";
        if (sentEl) { sentEl.style.opacity = "1"; sentEl.textContent = "Quote"; }
      } else {
        const t = ratio / PEEK;
        quillEl.style.opacity = String(0.5 + t * 0.5);
        quillEl.style.transform = `scale(${0.85 + t * 0.25})`;
        if (sentEl) { sentEl.style.opacity = String(0.5 + t * 0.5); sentEl.textContent = "Quote"; }
      }
    };

    const commitFlash = (then: () => void) => {
      if (quillEl) { quillEl.style.animation = "ss-quill-pop 0.3s ease forwards"; quillEl.style.opacity = "1"; }
      if (sentEl) { sentEl.style.opacity = "1"; sentEl.textContent = "Quoted!"; }
      setTimeout(() => { if (quillEl) quillEl.style.animation = ""; then(); }, 320);
    };

    const springBack = () => {
      dragEl.dataset.ssDragging = "";
      dragEl.style.transition = "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)";
      dragEl.style.transform = "";
      dragEl.style.opacity = "";
      peekAt(0);
      const cleanup = () => { dragEl.style.transition = ""; delete dragEl.dataset.ssDragging; dragEl.removeEventListener("transitionend", cleanup); };
      dragEl.addEventListener("transitionend", cleanup);
    };

    const flyOff = () => {
      commitFlash(() => {
        onEmbed();
        setTimeout(() => {
          if (dragEl.isConnected) springBack();
        }, 150);
      });
    };

    const onStart = (cx: number, cy: number) => {
      startX = cx; startY = cy; dx = 0;
      dragging = true; axisLocked = false; isHoriz = false;
    };

    const onMove = (cx: number, cy: number) => {
      if (!dragging) return;
      const ddx = cx - startX, ddy = cy - startY;
      if (!axisLocked) {
        if (Math.abs(ddx) < 4 && Math.abs(ddy) < 4) return;
        isHoriz = Math.abs(ddx) > Math.abs(ddy);
        axisLocked = true;
        if (isHoriz) dragEl.dataset.ssDragging = "1";
      }
      if (!isHoriz) return;
      dx = Math.min(0, ddx);
      dragEl.style.transform = `translateX(${dx}px)`;
      peekAt(Math.abs(dx) / W());
    };

    const onEnd = (isTap: boolean) => {
      if (!dragging) return;
      dragging = false;
      delete dragEl.dataset.ssDragging;

      // ✅ Tap detected (no significant movement in any direction)
      if (isTap || Math.abs(dx) < 6) {
        dragEl.style.transform = "";
        peekAt(0);
        if (isTap) onTap();
        return;
      }

      // ✅ If it moved but wasn't horizontal (i.e., vertical scroll)
      if (!isHoriz) {
        dragEl.style.transform = "";
        peekAt(0);
        return;
      }

      if (Math.abs(dx) / W() >= COMMIT) { flyOff(); } else { springBack(); }
    };

    // ── Touch ────────────────────────────────────────────────────────────────
    dragEl.addEventListener("touchstart", (e) => {
      if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
      touchActive = true;
      onStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    dragEl.addEventListener("touchmove", (e) => {
      onMove(e.touches[0].clientX, e.touches[0].clientY);
      if (isHoriz && Math.abs(dx) > 4) e.preventDefault();
    }, { passive: false });
    dragEl.addEventListener("touchend", (e) => {
      const tdx = e.changedTouches[0].clientX - startX;
      const tdy = e.changedTouches[0].clientY - startY;
      const wasTap = Math.abs(tdx) < 10 && Math.abs(tdy) < 10;
      // ✅ If this is a tap-navigation, install a short-lived capture-phase blocker
      // on the content pane so the browser's synthetic mousedown/mouseup/click
      // events don't land on freshly-rendered content at the same screen position
      // and accidentally trigger a second navigation.
      if (wasTap) this.blockSyntheticMouse();
      onEnd(wasTap);
      if (touchTimer) clearTimeout(touchTimer);
      touchTimer = setTimeout(() => { touchActive = false; touchTimer = null; }, 500);
    }, { passive: true });
    dragEl.addEventListener("touchcancel", () => {
      dragging = false; delete dragEl.dataset.ssDragging;
      springBack();
      if (touchTimer) clearTimeout(touchTimer);
      touchTimer = setTimeout(() => { touchActive = false; touchTimer = null; }, 500);
    }, { passive: true });

    // Block all synthetic clicks on mobile
    dragEl.addEventListener("click", (e) => {
      if (touchActive) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    // ── Mouse ────────────────────────────────────────────────────────────────
    dragEl.addEventListener("mousedown", (e) => {
      if (touchActive || e.button !== 0) return;
      onStart(e.clientX, e.clientY);
    });
    dragEl.addEventListener("mousemove", (e) => {
      if (touchActive || e.buttons !== 1) return;
      onMove(e.clientX, e.clientY);
    });
    dragEl.addEventListener("mouseup", (e) => {
      if (touchActive || e.button !== 0) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const wasTap = Math.abs(dx) < 10 && Math.abs(dy) < 10;
      onEnd(wasTap);
    });
    dragEl.addEventListener("mouseleave", () => {
      if (touchActive || !dragging) return;
      onEnd(false);
    });

    // ── Right-click peek ─────────────────────────────────────────────────────
    dragEl.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (touchActive || dragging) return;
      const peekPx = -(W() * 0.36);
      dragEl.style.transition = "transform 0.2s cubic-bezier(0.34,1.3,0.64,1)";
      dragEl.style.transform = `translateX(${peekPx}px)`;
      peekAt(0.36);
      setTimeout(() => { dragEl.style.transition = ""; }, 220);

      const dismiss = (ev: MouseEvent) => {
        document.removeEventListener("mousedown", dismiss, true);
        const inUnderlay = containerEl.querySelector("[data-ss-underlay]")?.contains(ev.target as Node);
        if (inUnderlay) {
          ev.preventDefault(); ev.stopPropagation();
          dragging = true; isHoriz = true; dx = peekPx;
          onEnd(false);
        } else {
          springBack();
        }
      };
      setTimeout(() => document.addEventListener("mousedown", dismiss, true), 30);
    });
  }

  /**
   * Attaches a horizontal swipe gesture on the interlinear word grid
   * to navigate to the previous (right swipe) or next (left swipe) verse.
   */
  private wireGridSwipeNav(el: HTMLElement): void {
    let startX = 0, moved = false;
    el.addEventListener("touchstart", (e) => {
      startX = e.touches[0].clientX; moved = false;
    }, { passive: true });
    el.addEventListener("touchmove", () => { moved = true; }, { passive: true });
    el.addEventListener("touchend", (e) => {
      if (!moved) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) < 50) return;
      // Brief visual nudge
      const dir = dx < 0 ? -1 : 1;
      el.style.transition = "transform 0.12s ease";
      el.style.transform = `translateX(${dir * 6}px)`;
      setTimeout(() => {
        el.style.transition = "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)";
        el.style.transform = "";
      }, 120);
      // Navigate: swipe left = next verse (+1), swipe right = prev (-1)
      this.navigateVerse(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /**
   * Flashes the verse text container with a brief purple highlight,
   * then calls the callback once the flash peaks — so navigation happens
   * while the glow is still visible, giving clear tactile confirmation.
   */
  private flashVerseText(el: HTMLElement, callback: () => void): void {
    if (!document.getElementById("ss-research-tap-kf")) {
      const s = document.createElement("style");
      s.id = "ss-research-tap-kf";
      s.textContent = `
        @keyframes ss-research-tap {
          0%   { background: transparent; }
          25%  { background: ${this.P}33; border-radius: 6px; }
          100% { background: transparent; }
        }
      `;
      document.head.appendChild(s);
    }
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "ss-research-tap 0.42s ease forwards";
    // Fire the navigation callback at the peak of the flash (~100ms in)
    setTimeout(() => {
      callback();
      setTimeout(() => { el.style.animation = ""; }, 350);
    }, 100);
  }

  /**
   * Finds the best available markdown editor across all workspace leaves.
   * Falls back through: currentEditor → most recent leaf → any open MarkdownView.
   * Necessary because getActiveViewOfType returns null when the panel has focus.
   */
  private getBestEditor(): import("obsidian").Editor | null {
    // 1. Use the tracked editor from the most recent cursor event
    if (this.currentEditor) return this.currentEditor;
    // 2. Try the most recently active leaf
    const recentView = this.app.workspace.getMostRecentLeaf()?.view;
    if (recentView && "editor" in recentView && (recentView as any).editor) {
      return (recentView as any).editor;
    }
    // 3. Iterate all leaves for any markdown editor
    let found: import("obsidian").Editor | null = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (found) return;
      const view = leaf.view;
      if (view && "editor" in view && (view as any).editor) {
        found = (view as any).editor;
      }
    });
    return found;
  }

  // advanceCursorAfterEmbed removed — embedAtCursor now handles cursor
  // advancement internally to ensure consecutive embeds flow downward.

  /**
   * Installs a short-lived capture-phase mousedown blocker on the content
   * pane. Called immediately before a touch-tap navigation so the browser's
   * synthetic mouse events (fired ~300 ms after touchend) don't land on
   * freshly-rendered cards at the same screen position and trigger a second
   * unintended navigation.
   */
  private blockSyntheticMouse(): void {
    const blocker = (e: MouseEvent) => { e.stopPropagation(); e.preventDefault(); };
    // Target contentWrapEl so only research-pane content is guarded.
    // Falls back to contentEl if wrap isn't visible (e.g. search mode).
    const target = this.contentWrapEl ?? this.contentEl;
    target.addEventListener("mousedown", blocker, { capture: true });
    target.addEventListener("mouseup",   blocker, { capture: true });
    setTimeout(() => {
      target.removeEventListener("mousedown", blocker, true);
      target.removeEventListener("mouseup",   blocker, true);
    }, 600);
  }

  /**
   * Shows a brief "Embedded" toast notification at the bottom of the screen.
   */
  private showEmbedToast(ref: string): void {
    const toast = document.createElement("div");
    toast.textContent = ref ? `Embedded: ${ref}` : "Embedded ✓";
    toast.style.cssText = `
      position:fixed; bottom:72px; left:50%; transform:translateX(-50%);
      background:${this.P}; color:#fff; padding:7px 18px;
      border-radius:20px; font-size:12px; font-weight:700;
      z-index:99999; pointer-events:none; opacity:1;
      transition:opacity 0.4s ease; white-space:nowrap;
      box-shadow:0 2px 12px rgba(83,74,183,0.35);
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = "0"; }, 1600);
    setTimeout(() => { toast.remove(); }, 2100);
  }
}
