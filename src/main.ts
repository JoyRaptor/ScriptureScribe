import {
  Editor, MarkdownView, Plugin, TFile, Menu,
  MarkdownPostProcessorContext, Notice, Platform
} from "obsidian";
import { ViewPlugin, DecorationSet, Decoration, ViewUpdate, EditorView } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { ScriptureScribeSettings, DEFAULT_SETTINGS } from "./settings";
import { parseScriptureRefs, parseBlockRun, continuesAcrossBlank, ScriptureRef, refToString } from "./parser";
import { ScriptureTooltip } from "./tooltip";
import { VerseCard } from "./verseCard";
import { seedSkinFolder, readSkin, BUILTIN_SKIN_HTML } from "./verseCardSkins";
import { embedAllRefs } from "./embedEngine";
import { ScriptureScribeSettingTab } from "./settingsTab";
import { getKJVData, ensureKJVData } from "./fetcher";
import { initLazyLoader } from "./interlinear";
import { ScriptureReadingPanel, READING_PANEL_VIEW_TYPE } from "./readingPanel";
import { SearchStores, configureSearchLoader } from "./searchIndex";
import { stopVaultIndex, buildVaultIndex, updateVaultIndexForFile, removeVaultIndexFile, setVaultHighlightSettings } from "./vaultIndex";
import { formatCitation } from "./citation";
import { configureSemanticSearch } from "./semanticSearch";
import { configureDataLoader, clearDataLoader } from "./dataLoader";

function buildCM6Plugin(getTooltip: () => ScriptureTooltip | null, getSettings: () => ScriptureScribeSettings) {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet;
    constructor(view: EditorView) { this.decorations = this.build(view); }
    update(u: ViewUpdate) { if (u.docChanged || u.viewportChanged) this.decorations = this.build(u.view); }
    build(view: EditorView): DecorationSet {
      const marks: any[] = [];
      for (const visible of view.visibleRanges) {
        let first = view.state.doc.lineAt(visible.from);
        while (first.number > 1 && first.text.trim() && !/^\s*#{1,6}\s/.test(first.text)) {
          let previous = view.state.doc.line(first.number - 1);
          // A list introduced by a colon-ended line one blank line up still belongs to that line's run.
          if (!previous.text.trim() && previous.number > 1) {
            const lead = view.state.doc.line(previous.number - 1);
            if (continuesAcrossBlank(lead.text, first.text)) previous = lead;
          }
          if (!previous.text.trim() || /^\s*#{1,6}\s/.test(previous.text)) break;
          first = previous;
        }
        const from = first.from;
        const to = view.state.doc.lineAt(visible.to).to;
        const text = view.state.doc.sliceString(from, to);
        const excluded: Array<{from: number; to: number}> = [];
        syntaxTree(view.state).iterate({ from, to, enter(node) {
          if (/code|link|url|hmd-frontmatter/i.test(node.name)) {
            excluded.push({from: node.from, to: node.to});
            return false;
          }
        }});
        const allowed = (start: number, end: number) => !excluded.some(r => r.from < from + end && r.to > from + start);
        const refs = parseScriptureRefs(text, getSettings().primaryTranslation).filter(r => allowed(r.start, r.end));
        for (const ref of refs) {
          if (from + ref.end <= visible.from || from + ref.start >= visible.to) continue;
          marks.push(Decoration.mark({
            class: "ss-ref-highlight",
            attributes: { "data-ref": refToString(ref) },
          }).range(from + ref.start, from + ref.end));
        }

        // Strong's numbers (G# / H#)
        const strongsRegex = /\b[gh]\d{1,5}\b/gi;
        let match;
        while ((match = strongsRegex.exec(text)) !== null) {
          if (!allowed(match.index, match.index + match[0].length)) continue;
          marks.push(Decoration.mark({
            class: "ss-strongs-highlight",
            attributes: { "data-strongs": match[0] },
          }).range(from + match.index, from + match.index + match[0].length));
        }
      }
      return Decoration.set(marks, true);
    }
  }, { decorations: v => v.decorations });
}

export default class ScriptureScribePlugin extends Plugin {
  settings!: ScriptureScribeSettings;
  tooltip!: ScriptureTooltip;
  private scanStarted = false;
  private disposed = false;
  private recordingIndex = -1;
  private panelViews = new Set<ScriptureReadingPanel>();
  private cacheIdentity = "";
  private scanExclusions = "";
  private scanPromise: Promise<void> | null = null;
  private hoverTimer: ReturnType<typeof setTimeout> | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    try {
      const key = "scripture-scribe-index-device";
      this.cacheIdentity = localStorage.getItem(key) ?? crypto.randomUUID();
      localStorage.setItem(key, this.cacheIdentity);
      this.cacheIdentity = this.cacheIdentity.replace(/[^a-zA-Z0-9-]/g, "");
    } catch { this.cacheIdentity = Platform.isMobile ? "mobile" : "desktop"; }
    // Initialize the lazy per-book loader so interlinear data can be
    // fetched on demand (crucial for mobile memory management).
    initLazyLoader(this.manifest.dir!, this.app.vault.adapter);

    configureDataLoader(this.manifest.dir!, this.app.vault.adapter);
    configureSemanticSearch(this.app, this.manifest.dir!);
    configureSearchLoader(() => this.loadSearchData());
    // Registration is cheap; data is loaded by the feature that needs it.
    // Check for the panel's leaf, not its view: Obsidian builds sidebar views lazily, so at this
    // point a restored panel is usually still a placeholder and `getReadingPanel()` returns null.
    // (The view factory below also starts the scan when the panel is built.)
    this.app.workspace.onLayoutReady(() => {
      if (this.app.workspace.getLeavesOfType(READING_PANEL_VIEW_TYPE).length) void this.startVaultScan();
    });

    // Incremental index updates when notes are created, changed, or deleted
    // Helper: update index for a file then immediately refresh panel highlights
    const indexAndRefresh = async (file: TFile) => {
      if (!this.scanStarted || this.disposed) return;
      await updateVaultIndexForFile(this.app.vault, file, this.getVaultScanExclusions());
      this.getReadingPanel()?.onVaultIndexReady();
    };

    this.registerEvent(this.app.vault.on("create", (file) => {
      if (file instanceof TFile && file.extension === "md") indexAndRefresh(file);
    }));
    this.registerEvent(this.app.vault.on("modify", (file) => {
      if (file instanceof TFile && file.extension === "md") indexAndRefresh(file);
    }));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      removeVaultIndexFile(file.path);
      this.getReadingPanel()?.onVaultIndexReady();
    }));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      removeVaultIndexFile(oldPath);
      if (file instanceof TFile && file.extension === "md") indexAndRefresh(file);
      else this.getReadingPanel()?.onVaultIndexReady();
    }));

    // Real-time update as you type — debounced 1.5 s so it fires only after
    // you pause, not on every keystroke. Catches new scripture addresses
    // before the file is saved to disk.
    let editorChangeTimer: ReturnType<typeof setTimeout> | null = null;
    this.register(() => { if (editorChangeTimer) clearTimeout(editorChangeTimer); });
    this.registerEvent(this.app.workspace.on("editor-change", (_editor, info) => {
      const file = (info as any).file as TFile | undefined;
      if (!file || file.extension !== "md") return;
      if (editorChangeTimer) clearTimeout(editorChangeTimer);
      editorChangeTimer = setTimeout(() => {
        editorChangeTimer = null;
        indexAndRefresh(file);
      }, 1500);
    }));

    // Apply vault highlight settings immediately so first render uses them
    const vh = this.settings.vaultHighlight;
    setVaultHighlightSettings(vh.opacity, vh.textColor);

    this.tooltip = new ScriptureTooltip(this.app, this.settings, () => this.saveSettings());

    // Card Mode: full-screen verse card driven by a swappable HTML skin
    void seedSkinFolder(this.app.vault.adapter, this.manifest.dir!);
    this.tooltip.card = new VerseCard(
      (name) => readSkin(this.app.vault.adapter, this.manifest.dir!, name),
      () => this.settings.display.cardSkin,
      BUILTIN_SKIN_HTML,
      () => this.settings.display.cardHideCursor !== false,
    );
    if (this.settings.display.cardMode) this.tooltip.card.warm();
    // Bible text loads on demand; pre-load it shortly after startup so the first hover is instant.
    window.setTimeout(() => { void ensureKJVData(); }, 1500);
    this.tooltip.card.onNavigate = direction => { void this.navigateRecordingCard(direction); };
    this.tooltip.cardContext = (ref, text, editor) => this.recordingContext(ref, text, editor);
    this.registerDomEvent(document, "keydown", (event: KeyboardEvent) => {
      if (!this.tooltip.card?.isVisible() || event.isComposing) return;
      if (event.key === "Escape") { event.preventDefault(); this.tooltip.card.hide(true); }
      if (event.altKey && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
        event.preventDefault(); void this.navigateRecordingCard(event.key === "ArrowRight" ? 1 : -1);
      }
    });

    this.addSettingTab(new ScriptureScribeSettingTab(this.app, this));

    // Register the persistent reading panel view type
    this.registerView(
      READING_PANEL_VIEW_TYPE,
      (leaf) => {
        const view = new ScriptureReadingPanel(leaf, this.settings, () => this.saveSettings());
        this.panelViews.add(view);
        // Bible-mode highlights and "In your notes" need the vault index. Start it whenever a panel
        // is built, however late; startVaultScan reuses a scan that is already running or done.
        this.app.workspace.onLayoutReady(() => { if (!this.disposed) void this.startVaultScan(); });
        return view;
      }
    );

    // Persist lastSide when the panel leaf is moved between sidebars
    this.registerEvent(this.app.workspace.on("layout-change", () => {
      this.persistPanelSide();
    }));

    // CM6 editor extension for Live Preview
    this.registerEditorExtension(
      buildCM6Plugin(() => this.tooltip, () => this.settings)
    );

    // Reading mode post-processor
    this.registerMarkdownPostProcessor((el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!this.isExcluded(ctx.sourcePath)) this.highlightInElement(el, view?.editor ?? null, this.sectionLeadIn(el, ctx));
    });

    // Hover — works for both CM6 decorated spans and reading mode spans
    this.registerDomEvent(document, "mouseover", (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const refSpan = target.closest(".ss-ref-highlight") as HTMLElement | null;
      const strongsSpan = target.closest(".ss-strongs-highlight") as HTMLElement | null;
      
      if (!refSpan && !strongsSpan) return;
      let editor: Editor | undefined;
      const mdLeaves = this.app.workspace.getLeavesOfType("markdown");
      for (const leaf of mdLeaves) {
        if (leaf.view && leaf.view.containerEl.contains(target)) {
          editor = (leaf.view as MarkdownView).editor;
          break;
        }
      }
      if (!editor) {
        editor = this.app.workspace.activeEditor?.editor ?? this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
      }
      if (!editor) return;

      this.cancelHoverTimer();

      if (strongsSpan) {
        const num = strongsSpan.dataset.strongs ?? strongsSpan.textContent ?? "";
        this.hoverTimer = setTimeout(() => {
          this.tooltip?.showStrongs(num, e.clientX, e.clientY, editor!);
        }, this.settings.hoverSettings.triggerDelayMs);
        return;
      }

      // Scripture Ref Hover
      const refAttr = refSpan!.dataset.ref ?? refSpan!.textContent ?? "";
      const refs = parseScriptureRefs(refAttr, this.settings.primaryTranslation);
      if (refs.length) refs[0].raw = refSpan!.textContent ?? refs[0].raw;
      if (!refs.length) return;

      const behavior = this.settings.display.referenceClickBehavior;

      this.hoverTimer = setTimeout(() => {
        if (behavior === "tooltip" || behavior === "both") {
          this.tooltip?.show(refs[0], e.clientX, e.clientY, editor!);
        }
        if (behavior === "panel" || behavior === "both") {
          this.sendToPanel(refs[0], editor!);
        }
      }, this.settings.hoverSettings.triggerDelayMs);
    });

    this.registerDomEvent(document, "mouseout", (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(".ss-ref-highlight")) {
        this.cancelHoverTimer();
        this.tooltip?.scheduleHide();
      }
    });

    this.registerDomEvent(document, "click", (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest(".ss-tooltip") && !el.closest(".ss-ref-highlight")) {
        this.tooltip?.hide();
      }
    });

    // Commands
    this.addCommand({ id: "open-reading-panel", name: "Open Reading Panel",
      callback: () => this.activatePanel() });
    this.addCommand({ id: "toggle-card-mode", name: "Toggle Card Mode (full-screen verse cards)",
      hotkeys: [{modifiers: ["Mod", "Alt"], key: "c"}],
      callback: async () => {
        const on = !this.settings.display.cardMode;
        await this.tooltip.setCardMode(on);
        new Notice(on ? "Card Mode on — hover a verse for a full-screen card" : "Card Mode off — tooltips restored", 2000);
      }});
    this.addCommand({ id: "next-recording-card", name: "Next recording card", callback: () => { void this.navigateRecordingCard(1); } });
    this.addCommand({ id: "previous-recording-card", name: "Previous recording card", callback: () => { void this.navigateRecordingCard(-1); } });
    this.addCommand({ id: "emphasis-recording-card", name: "Card: toggle note emphasis", callback: () => this.tooltip.card?.toggleEmphasis() });
    this.addCommand({ id: "contrast-recording-card", name: "Card: toggle contrast text", callback: () => this.tooltip.card?.toggleContrast() });
    this.addCommand({ id: "pin-recording-card", name: "Pin or unpin recording card", callback: () => this.tooltip.card?.togglePin() });
    this.addCommand({ id: "search-strongs", name: "Search Strong's number",
      callback: async () => {
        const panel = await this.activatePanel();
        panel?.focusSearch();
      }});
    this.addCommand({ id: "embed-all-link",    name: "Embed All References as Links",
      editorCallback: (ed) => embedAllRefs(ed, "link", this.settings) });
    this.addCommand({ id: "embed-all-quote",   name: "Embed All References as Quote Blocks",
      editorCallback: (ed) => embedAllRefs(ed, "quote", this.settings) });
    this.addCommand({ id: "embed-all-tooltip", name: "Embed All References as Footnote Tooltips",
      editorCallback: (ed) => embedAllRefs(ed, "tooltip", this.settings) });
    this.addCommand({ id: "embed-all-default", name: "Embed All References (default style)",
      editorCallback: (ed) => embedAllRefs(ed, this.settings.embedding.defaultStyle, this.settings) });
    this.addCommand({ id: "verse-of-the-day", name: "Show Verse of the Day",
      callback: async () => {
        const panel = await this.activatePanel();
        panel?.showVerseOfTheDay();
      }});

    // Re-scan reading mode on leaf change
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => {
      setTimeout(() => this.processReadingViews(), 300);
    }));

    setTimeout(() => this.processReadingViews(), 600);

    // VOTD — show today's verse when panel is open but no ref is loaded yet
    this.app.workspace.onLayoutReady(() => {
      if (this.settings.verseOfTheDay?.showOnStartup) {
        const panel = this.getReadingPanel();
        if (panel) panel.showVerseOfTheDay();
      }
    });

    // Right-click context menu on editor selections
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
        const sel    = editor.getSelection().trim();
        if (!sel) return;
        const refs   = parseScriptureRefs(sel);
        if (!refs.length) return;
        const ref    = refs[0];

        menu.addSeparator();

        menu.addItem(item => item
          .setTitle("Open in ScriptureScribe")
          .setIcon("book-open")
          .onClick(async () => {
            const panel = await this.activatePanel();
            panel?.setRef(ref, editor);
          }));

        menu.addItem(item => item
          .setTitle("Copy as Citation")
          .setIcon("quote-glyph")
          .onClick(async () => {
            // Fetch the verse text for the citation
            const kjv = getKJVData();
            const key = `${ref.book} ${ref.chapter}:${ref.verseStart}`;
            const verseText: string =
              (kjv as Record<string, string>)[key] ?? sel;
            const citation = formatCitation(
              ref, verseText,
              this.settings.primaryTranslation,
              this.settings.citation?.format ?? "plain",
              this.settings.citation?.includeVersion ?? true,
            );
            await navigator.clipboard.writeText(citation);
          }));

        menu.addItem(item => item
          .setTitle("Embed Verse")
          .setIcon("arrow-down-square")
          .onClick(() => {
            const style = this.settings.embedding.defaultStyle;
            embedAllRefs(editor, style, this.settings);
          }));
      })
    );

    console.log("ScriptureScribe loaded ✓");
  }

  onunload(): void {
    this.disposed = true;
    clearDataLoader();
    stopVaultIndex();
    this.tooltip?.destroy();
    for (const view of this.panelViews) if (view.isOpen) void view.onClose();
    this.panelViews.clear();
    if (this.hoverTimer) clearTimeout(this.hoverTimer);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    // Ensure nested objects are fully merged
    this.settings.display       = Object.assign({}, DEFAULT_SETTINGS.display,       this.settings.display       ?? {});
    this.settings.hoverSettings = Object.assign({}, DEFAULT_SETTINGS.hoverSettings, this.settings.hoverSettings ?? {});
    this.settings.embedding     = Object.assign({}, DEFAULT_SETTINGS.embedding,     this.settings.embedding     ?? {});
    this.settings.readingPanel  = Object.assign({}, DEFAULT_SETTINGS.readingPanel,  this.settings.readingPanel  ?? {});
    this.settings.crossRefs     = Object.assign({}, DEFAULT_SETTINGS.crossRefs,     this.settings.crossRefs     ?? {});
    this.settings.vaultScan      = Object.assign({}, DEFAULT_SETTINGS.vaultScan,      this.settings.vaultScan      ?? {});
    this.settings.vaultHighlight = Object.assign({}, DEFAULT_SETTINGS.vaultHighlight, this.settings.vaultHighlight ?? {});
    this.settings.bibleText      = Object.assign({}, DEFAULT_SETTINGS.bibleText,      this.settings.bibleText      ?? {});
    this.settings.verseOfTheDay  = Object.assign({}, DEFAULT_SETTINGS.verseOfTheDay,  this.settings.verseOfTheDay  ?? {});
    this.settings.citation       = Object.assign({}, DEFAULT_SETTINGS.citation,       this.settings.citation       ?? {});
    this.settings.morphology     = Object.assign({}, DEFAULT_SETTINGS.morphology,     this.settings.morphology     ?? {});
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    if (this.tooltip) this.tooltip.settings = this.settings;
    const panel = this.getReadingPanel();
    if (panel) panel.settings = this.settings;
    // Push current highlight style into vaultIndex module
    const vh = this.settings.vaultHighlight;
    setVaultHighlightSettings(vh.opacity, vh.textColor);
    // Re-paint highlights with the new settings
    if (panel) { panel.onVaultIndexReady(); void this.startVaultScan(); }
  }

  private async loadSearchData(): Promise<SearchStores> {
    const stores = {} as SearchStores;
    for (const language of ["greek", "hebrew", "lxx"] as const) {
      const raw = await this.app.vault.adapter.read(`${this.manifest.dir}/search-data/${language}.json`);
      const data = JSON.parse(raw);
      const store: SearchStores[typeof language] = {};
      for (const key of Object.keys(data.verses)) store[key] = data.verses[key].map((id: number) => data.words[id]);
      stores[language] = store;
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    return stores;
  }

  // Reading mode only — CM6 handles the editor
  private processReadingViews(): void {
    if (this.disposed) return;
    this.app.workspace.iterateAllLeaves(leaf => {
      const view = leaf.view;
      if (!(view instanceof MarkdownView)) return;
      const filePath = view.file?.path ?? "";
      if (this.isExcluded(filePath)) return;
      // Only scan reading mode containers
      const previewEl = (view as any).previewMode?.containerEl as HTMLElement | undefined;
      if (previewEl) this.highlightInElement(previewEl, view.editor);
    });
  }

  /**
   * Source lines directly above a reading-mode section, back to a blank line: the run the editor
   * parses as one, so a "v40" opening this section can still lean on the reference above it.
   */
  private sectionLeadIn(el: HTMLElement, ctx: MarkdownPostProcessorContext): string {
    const info = ctx.getSectionInfo(el);
    if (!info || info.lineStart < 1) return "";
    const lines = info.text.split(/\r?\n/);
    const lead: string[] = [];
    let i = info.lineStart - 1;
    // A list introduced by a colon-ended line one blank line up continues that line's run. The rendered
    // list items carry no "- " marker for the parser to see, so the blank line itself is left out.
    if (i > 0 && !lines[i].trim() && continuesAcrossBlank(lines[i - 1], lines[info.lineStart] ?? "")) i--;
    for (; i >= 0 && lead.length < 60; i--) {
      const line = lines[i];
      // Stop at blank lines, frontmatter fences and code fences, none of which the editor reads across.
      if (!line.trim() || /^(?:---|\.\.\.)\s*$/.test(line) || /^\s*(?:```|~~~)/.test(line)) break;
      lead.unshift(line);
    }
    return lead.join("\n");
  }

  private highlightInElement(rootEl: HTMLElement, editor: Editor | null, leadIn = ""): void {
    const groups = new Map<Element, Text[]>();
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const p = node.parentElement;
      if (!p || p.closest("script,style,.frontmatter,.metadata-container")) continue;
      const block = p.closest("p,li,td,th,h1,h2,h3,h4,h5,h6") ?? rootEl;
      const group = groups.get(block) ?? [];
      group.push(node as Text);
      groups.set(block, group);
    }
    // Blocks in one section are consecutive source lines, so they are parsed as one run (see parseBlockRun).
    const blocks = [...groups].map(([block, nodes]) => {
      let content = "";
      const offsets: number[] = [];
      for (const tn of nodes) {
        offsets.push(content.length);
        const text = tn.textContent ?? "";
        content += tn.parentElement?.closest("code,pre,a") ? text.replace(/[^\r\n]/g, " ") : text;
      }
      return { nodes, offsets, text: content, isolated: /^(?:H[1-6]|TD|TH)$/.test(block.tagName) };
    });
    const parsed = parseBlockRun(blocks, leadIn, this.settings.primaryTranslation);
    for (const [b, { nodes, offsets }] of blocks.entries()) {
      const refs = parsed[b];
      for (let i = 0; i < nodes.length; i++) {
        const tn = nodes[i];
        if (tn.parentElement?.closest("code,pre,a,.ss-ref-highlight,.ss-strongs-highlight")) continue;
        const offset = offsets[i];
        const text = tn.textContent ?? "";
        const local = refs.filter(r => r.start < offset + text.length && r.end > offset).map(r => ({...r,
          start: Math.max(r.start - offset, 0), end: Math.min(r.end - offset, text.length),
          raw: text.slice(Math.max(r.start - offset, 0), Math.min(r.end - offset, text.length))}));
        const strongs = [...text.matchAll(/\b[gh]\d{1,5}\b/gi)].map(m => ({start: m.index!, end: m.index! + m[0].length, text: m[0]}));
        if (local.length || strongs.length) this.wrapReadingMatches(tn, local, strongs, editor);
      }
    }
  }

  private wrapReadingMatches(textNode: Text, refs: ScriptureRef[], strongs: any[], editor: Editor | null): void {
    const parent = textNode.parentNode;
    if (!parent) return;
    const text = textNode.textContent ?? "";
    const frag = document.createDocumentFragment();
    
    // Combine and sort matches by start position
    const allMatches = [
      ...refs.map(r => ({ start: r.start, end: r.end, data: r, isRef: true, isStrongs: false })),
      ...strongs.map(s => ({ start: s.start, end: s.end, data: s.text, isRef: false, isStrongs: true }))
    ].sort((a, b) => a.start - b.start);

    let last = 0;
    for (const m of allMatches) {
      if (m.start < last) continue; // Skip overlaps
      if (m.start > last) frag.appendChild(document.createTextNode(text.slice(last, m.start)));
      
      const span = document.createElement("span");
      if (m.isRef) {
        const ref = m.data as ScriptureRef;
        span.className = "ss-ref-highlight";
        span.textContent = ref.raw;
        span.dataset.ref = refToString(ref);
      } else {
        const num = m.data as string;
        span.className = "ss-strongs-highlight";
        span.textContent = num;
        span.dataset.strongs = num;
      }
      frag.appendChild(span);
      last = m.end;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    parent.replaceChild(frag, textNode);
  }

  // ── Reading Panel helpers ─────────────────────────────────────

  /**
   * Returns the live ScriptureReadingPanel instance if one is already open,
   * otherwise null — does NOT open a new leaf.
   */
  private getReadingPanel(): ScriptureReadingPanel | null {
    // On mobile, sidebar leaves can be absent from getLeavesOfType while their
    // view remains mounted in the mobile drawer.
    for (const view of this.panelViews) {
      if (view.isOpen) return view;
      this.panelViews.delete(view);
    }
    const leaves = this.app.workspace.getLeavesOfType(READING_PANEL_VIEW_TYPE);
    if (!leaves.length) return null;
    const view = leaves[0].view;
    return view instanceof ScriptureReadingPanel ? view : null;
  }

  /**
   * If the panel is already open, send a ref to it immediately (no await needed).
   * If it's not open, do nothing — we only auto-push when the user has it visible.
   */
  private sendToPanel(ref: ScriptureRef, editor: Editor | null): void {
    const panel = this.getReadingPanel();
    panel?.setRef(ref, editor);
  }

  /**
   * Opens the reading panel if it isn't already open, docking it on the side
   * stored in settings.readingPanel.lastSide. Returns the view instance.
   */
  async activatePanel(): Promise<ScriptureReadingPanel | null> {
    void this.startVaultScan();
    const existing = this.getReadingPanel();
    if (existing) {
      await this.app.workspace.revealLeaf(
        existing.leaf
      );
      await existing.ready;
      return existing;
    }

    const side = this.settings.readingPanel.lastSide ?? "right";
    const leaf = side === "left"
      ? this.app.workspace.getLeftLeaf(false)
      : this.app.workspace.getRightLeaf(false);

    if (!leaf) return null;
    await leaf.setViewState({ type: READING_PANEL_VIEW_TYPE, active: true });
    await this.app.workspace.revealLeaf(leaf);
    await leaf.loadIfDeferred();

    const view = leaf.view;
    if (view instanceof ScriptureReadingPanel) await view.ready;
    return view instanceof ScriptureReadingPanel ? view : null;
  }

  /**
   * Detect which sidebar the panel is currently in and persist it to settings.
   * Called on every layout-change event.
   */
  private persistPanelSide(): void {
    const leaves = this.app.workspace.getLeavesOfType(READING_PANEL_VIEW_TYPE);
    if (!leaves.length) return;
    const leaf = leaves[0];
    const rootType = (leaf as any).getRoot?.()?.type as string | undefined;
    const newSide = rootType === "left" ? "left"
                  : rootType === "right" ? "right"
                  : null;
    if (newSide && newSide !== this.settings.readingPanel.lastSide) {
      this.settings.readingPanel.lastSide = newSide;
      this.saveSettings();
    }
  }

  private async navigateRecordingCard(direction: number): Promise<void> {
    if (this.tooltip.card?.step(direction)) return;
    const editor = this.app.workspace.activeEditor?.editor
      ?? this.app.workspace.getActiveViewOfType(MarkdownView)?.editor
      ?? this.tooltip.getRecordingEditor();
    if (!editor) return;
    const refs = parseScriptureRefs(editor.getValue(), this.settings.primaryTranslation);
    if (!refs.length) return;
    const key = this.tooltip.card?.currentKeyOf();
    if (this.recordingIndex < 0 || refToString(refs[this.recordingIndex] ?? refs[0]) !== key) {
      this.recordingIndex = refs.findIndex(ref => refToString(ref) === key);
    }
    this.recordingIndex = (this.recordingIndex + direction + refs.length) % refs.length;
    await this.tooltip.showRecordingRef(refs[this.recordingIndex], editor);
  }

  private recordingContext(ref: ScriptureRef, text: string, editor: Editor | null): {noteText?: string; contrastText?: string} {
    if (!editor) return {};
    const content = editor.getValue();
    const near = editor.posToOffset(editor.getCursor());
    const matches = parseScriptureRefs(content, this.settings.primaryTranslation).filter(r => refToString(r) === refToString(ref));
    if (!matches.length) return {};
    const match = matches.reduce((a, b) => Math.abs(a.start - near) < Math.abs(b.start - near) ? a : b);
    const start = content.lastIndexOf("\n\n", match.start);
    const end = content.indexOf("\n\n", match.end);
    const paragraph = content.slice(start < 0 ? 0 : start + 2, end < 0 ? content.length : end);
    let noteText = text;
    for (const emphasis of paragraph.matchAll(/(\*\*\*|\*\*)([^*]+)\1/g)) {
      const phrase = emphasis[2];
      const at = noteText.toLowerCase().indexOf(phrase.toLowerCase());
      if (at >= 0) noteText = noteText.slice(0, at) + emphasis[1] + noteText.slice(at, at + phrase.length) + emphasis[1] + noteText.slice(at + phrase.length);
    }
    const slash = paragraph.indexOf(" / ");
    const previous = start >= 0 ? content.slice(0, start).split(/\n\s*\n/).pop()?.trim() : "";
    const contrastText = (slash >= 0 ? paragraph.slice(0, slash) : previous) ?? "";
    return {noteText: noteText !== text ? noteText : undefined,
      contrastText: contrastText && contrastText.length <= 1000 && !/^#/.test(contrastText) ? contrastText : undefined};
  }

  private cancelHoverTimer(): void {
    if (this.hoverTimer !== null) { clearTimeout(this.hoverTimer); this.hoverTimer = null; }
  }

  private getVaultScanExclusions(): string[] {
    const s = this.settings;
    const base = s.vaultScan.useGlobalExclusions ? [...s.excludedFolders] : [];
    return [...base, ...(s.vaultScan.additionalExclusions ?? [])];
  }

  async startVaultScan(force = false): Promise<void> {
    if (force) { await this.scanPromise; this.scanPromise = null; }
    const exclusions = this.getVaultScanExclusions();
    const signature = JSON.stringify(exclusions);
    if (this.scanPromise && signature === this.scanExclusions) return this.scanPromise;
    if (this.scanPromise) await this.scanPromise;
    this.scanExclusions = signature;
    this.scanStarted = true;
    this.scanPromise = buildVaultIndex(this.app.vault, exclusions, undefined,
      this.manifest.dir!, () => this.disposed, !force, this.cacheIdentity).then(() => {
        if (!this.disposed) this.getReadingPanel()?.onVaultIndexReady();
      }).catch(error => {
        this.scanPromise = null;
        console.error("ScriptureScribe: vault scan failed", error);
      });
    return this.scanPromise;
  }

  private isExcluded(filePath: string): boolean {
    return this.settings.excludedFolders.some(f => filePath.startsWith(f.replace(/\/?$/, "/")));
  }
}
