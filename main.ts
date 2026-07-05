import {
  Editor, MarkdownView, Plugin, TFile, Menu,
  MarkdownPostProcessorContext, normalizePath, WorkspaceLeaf, Platform
} from "obsidian";
import { ViewPlugin, DecorationSet, Decoration, ViewUpdate, EditorView } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { ScriptureScribeSettings, DEFAULT_SETTINGS } from "./settings";
import { parseScriptureRefs, ScriptureRef, refToString } from "./parser";
import { ScriptureTooltip } from "./tooltip";
import { embedAllRefs } from "./embedEngine";
import { ScriptureScribeSettingTab } from "./settingsTab";
import { setKJVData, getKJVData, setSweteData } from "./fetcher";
import { setGreekData, setHebrewData, setLXXData, setStrongsData, setLXXDefsData, setLSJData, getGreekData, getHebrewData, getLXXData, initLazyLoader } from "./interlinear";
import { ScriptureReadingPanel, READING_PANEL_VIEW_TYPE } from "./readingPanel";
import { setCrossRefData } from "./crossRefs";
import { setVersificationData } from "./versification";
import { buildSearchIndex } from "./searchIndex";
import { buildVaultIndex, updateVaultIndexForFile, removeVaultIndexFile, setVaultHighlightSettings } from "./vaultIndex";
import { getVerseOfTheDay } from "./verseOfTheDay";
import { formatCitation } from "./citation";
import { loadVerseVectors, setVerseRefs, loadEmbeddingPipeline } from "./semanticSearch";

function buildCM6Plugin(getTooltip: () => ScriptureTooltip | null, getSettings: () => ScriptureScribeSettings) {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet;
    constructor(view: EditorView) { this.decorations = this.build(view); }
    update(u: ViewUpdate) { if (u.docChanged || u.viewportChanged) this.decorations = this.build(u.view); }
    build(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        const refs = parseScriptureRefs(text);
        for (const ref of refs) {
          builder.add(from + ref.start, from + ref.end, Decoration.mark({
            class: "ss-ref-highlight",
            attributes: { "data-ref": refToString(ref) },
          }));
        }

        // Strong's numbers (G# / H#)
        const strongsRegex = /\b[gh]\d{1,5}\b/gi;
        let match;
        while ((match = strongsRegex.exec(text)) !== null) {
          builder.add(from + match.index, from + match.index + match[0].length, Decoration.mark({
            class: "ss-strongs-highlight",
            attributes: { "data-strongs": match[0] },
          }));
        }
      }
      return builder.finish();
    }
  }, { decorations: v => v.decorations });
}

export default class ScriptureScribePlugin extends Plugin {
  settings!: ScriptureScribeSettings;
  tooltip!: ScriptureTooltip;
  private hoverTimer: ReturnType<typeof setTimeout> | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();
    // Initialize the lazy per-book loader so interlinear data can be
    // fetched on demand (crucial for mobile memory management).
    initLazyLoader(this.manifest.dir!, this.app.vault.adapter);

    // Offload heavy data parsing and search indexing to the background.
    // This prevents Obsidian from warning about slow startup times
    // and prevents mobile OS watchdogs from crashing the plugin during load.
    Promise.all([
      this.loadKJVData(),
      this.loadSweteData(),
      this.loadInterlinearData(),
      this.loadCrossRefData(),
      this.loadVersificationData()
    ]).then(async () => {
      // Build the search index (Strongs/Morph) asynchronously to prevent mobile freezing
      await buildSearchIndex(getGreekData(), getHebrewData(), getLXXData());
    });

    // Semantic Search — load pre-shipped vectors.bin, then lazily probe for
    // an embedding runtime (Smart Connections first, Xenova second, TF-IDF always).
    loadVerseVectors(this.app, this.manifest.dir!).then(() => {
      // After vectors load, give TF-IDF the full verse ref list so it can
      // scan even when the embedding pipeline isn't available.
      const kjv = getKJVData();
      setVerseRefs(Object.keys(kjv));
      // Begin probing for an embedding runtime in the background.
      // Priority: Smart Connections bridge → Xenova → TF-IDF fallback.
      loadEmbeddingPipeline(this.app);
    });

    // Vault scan — runs in the background, does not block plugin startup
    this.startVaultScan();

    // Incremental index updates when notes are created, changed, or deleted
    // Helper: update index for a file then immediately refresh panel highlights
    const indexAndRefresh = async (file: TFile) => {
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
    this.addSettingTab(new ScriptureScribeSettingTab(this.app, this));

    // Register the persistent reading panel view type
    this.registerView(
      READING_PANEL_VIEW_TYPE,
      (leaf) => new ScriptureReadingPanel(leaf, this.settings, () => this.saveSettings())
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
    this.registerMarkdownPostProcessor((el: HTMLElement, _ctx: MarkdownPostProcessorContext) => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      this.highlightInElement(el, view?.editor ?? null);
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
      const refs = parseScriptureRefs(refAttr);
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
    this.tooltip?.destroy();
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
    if (panel) panel.onVaultIndexReady();
  }

  private async loadCrossRefData(): Promise<void> {
    try {
      const path = normalizePath(this.manifest.dir + "/cross-refs.json");
      const raw  = await this.app.vault.adapter.read(path);
      const data = JSON.parse(raw);
      setCrossRefData(data);
      console.log(`ScriptureScribe: ${Object.keys(data).length} cross-reference entries loaded`);
    } catch (e) {
      console.info("ScriptureScribe: cross-refs.json not found — cross-references unavailable.");
      setCrossRefData({});
    }
  }

  private async loadVersificationData(): Promise<void> {
    try {
      const path = normalizePath(this.manifest.dir + "/versification-mapping.json");
      const raw  = await this.app.vault.adapter.read(path);
      const data = JSON.parse(raw);
      setVersificationData(data);
      console.log(`ScriptureScribe: versification mapping loaded`);
    } catch (e) {
      console.info("ScriptureScribe: versification-mapping.json not found — versification mapping unavailable.");
      setVersificationData({});
    }
  }

  private async loadKJVData(): Promise<void> {
    try {
      const path = normalizePath(this.manifest.dir + "/kjv.json");
      const raw  = await this.app.vault.adapter.read(path);
      const data = JSON.parse(raw);
      setKJVData(data);
      console.log(`ScriptureScribe: ${Object.keys(data).length} KJV verses loaded`);
    } catch (e) {
      console.warn("ScriptureScribe: kjv.json not found — offline KJV unavailable.", e);
      setKJVData({});
    }
  }

  private async loadSweteData(): Promise<void> {
    try {
      const path = normalizePath(this.manifest.dir + "/swete-lxx.json");
      const raw  = await this.app.vault.adapter.read(path);
      const data = JSON.parse(raw);
      setSweteData(data);
      console.log(`ScriptureScribe: Greek LXX (Swete) text loaded`);
    } catch (e) {
      console.info("ScriptureScribe: swete.json not found — offline LXX text unavailable.");
      setSweteData({});
    }
  }

  private async loadInterlinearData(): Promise<void> {
    const files: Array<{ file: string; setter: (d: any) => void; label: string }> = [
      { file: "strongs-greek.json",       setter: setGreekData,   label: "Greek interlinear" },
      { file: "strongs-hebrew.json",      setter: setHebrewData,  label: "Hebrew interlinear" },
      { file: "strongs-lxx.json",         setter: setLXXData,     label: "LXX interlinear" },
      { file: "strongs-definitions.json", setter: setStrongsData, label: "Strong's definitions" },
      { file: "strongs-greek-lxx.json",   setter: setLXXDefsData, label: "LXX definitions" },
      { file: "lexicon-lsj.json",         setter: setLSJData,     label: "LSJ lexicon" },
    ];
    for (const { file, setter, label } of files) {
      if (Platform.isMobile) {
        // On mobile, skip monolithic LXX/Hebrew files — lazy per-book loading handles these.
        // This saves ~60MB of RAM at startup while keeping 100% offline capability.
        if (file === "strongs-lxx.json" || file === "strongs-hebrew.json" || file === "lexicon-lsj.json") {
          console.info(`ScriptureScribe: ${file} → skipping massive file to save memory on mobile.`);
          continue;
        }
      }
      try {
        const path = normalizePath(this.manifest.dir + "/" + file);
        let raw: string | null = await this.app.vault.adapter.read(path);
        let data: any = JSON.parse(raw);
        setter(data);
        console.log(`ScriptureScribe: ${label} loaded (${Object.keys(data).length} entries)`);
        
        // Explicitly clear references to allow GC to sweep the massive string/object overhead
        raw = null;
        data = null;
      } catch (e) {
        console.info(`ScriptureScribe: ${file} not found — ${label} will use online API.`);
      }
      // Yield to main thread to allow garbage collection of large JSON strings
      // This prevents Out-Of-Memory crashes on mobile devices.
      await new Promise(r => setTimeout(r, 250));
    }
  }

  // Reading mode only — CM6 handles the editor
  private processReadingViews(): void {
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

  private highlightInElement(rootEl: HTMLElement, editor: Editor | null): void {
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
      acceptNode: (node: Node) => {
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        const tag = p.tagName?.toLowerCase() ?? "";
        if (["code","pre","a","script","style"].includes(tag)) return NodeFilter.FILTER_REJECT;
        if (p.classList.contains("ss-ref-highlight")) return NodeFilter.FILTER_REJECT;
        if (p.closest("code,pre,a")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) nodes.push(n as Text);
    for (const tn of nodes) {
      const text = tn.textContent ?? "";
      const refs = parseScriptureRefs(text);
      
      // Also look for Strong's numbers
      const strongsMatches: Array<{start: number, end: number, text: string, isStrongs: boolean}> = [];
      const strongsRegex = /\b[gh]\d{1,5}\b/gi;
      let match;
      while ((match = strongsRegex.exec(text)) !== null) {
        strongsMatches.push({ start: match.index, end: match.index + match[0].length, text: match[0], isStrongs: true });
      }

      if (refs.length || strongsMatches.length) {
        this.wrapReadingMatches(tn, refs, strongsMatches, editor);
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
        span.addEventListener("mouseenter", (e: MouseEvent) => {
          this.cancelHoverTimer();
          const view = this.app.workspace.getActiveViewOfType(MarkdownView);
          const ed = view?.editor ?? editor;
          const behavior = this.settings.display.referenceClickBehavior;
          this.hoverTimer = setTimeout(() => {
            if (behavior === "tooltip" || behavior === "both") {
              if (ed) this.tooltip?.show(ref, e.clientX, e.clientY, ed);
            }
            if (behavior === "panel" || behavior === "both") {
              this.sendToPanel(ref, ed);
            }
          }, this.settings.hoverSettings.triggerDelayMs);
        });
      } else {
        const num = m.data as string;
        span.className = "ss-strongs-highlight";
        span.textContent = num;
        span.dataset.strongs = num;
        span.addEventListener("mouseenter", (e: MouseEvent) => {
          this.cancelHoverTimer();
          const view = this.app.workspace.getActiveViewOfType(MarkdownView);
          const ed = view?.editor ?? editor;
          this.hoverTimer = setTimeout(() => {
            if (ed) this.tooltip?.showStrongs(num, e.clientX, e.clientY, ed);
          }, this.settings.hoverSettings.triggerDelayMs);
        });
      }
      
      span.addEventListener("mouseleave", () => {
        this.cancelHoverTimer();
        this.tooltip?.scheduleHide();
      });
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
    const existing = this.getReadingPanel();
    if (existing) {
      this.app.workspace.revealLeaf(
        this.app.workspace.getLeavesOfType(READING_PANEL_VIEW_TYPE)[0]
      );
      return existing;
    }

    const side = this.settings.readingPanel.lastSide ?? "right";
    const leaf = side === "left"
      ? this.app.workspace.getLeftLeaf(false)
      : this.app.workspace.getRightLeaf(false);

    if (!leaf) return null;
    await leaf.setViewState({ type: READING_PANEL_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);

    const view = leaf.view;
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

  private cancelHoverTimer(): void {
    if (this.hoverTimer !== null) { clearTimeout(this.hoverTimer); this.hoverTimer = null; }
  }

  private getVaultScanExclusions(): string[] {
    const s = this.settings;
    const base = s.vaultScan.useGlobalExclusions ? [...s.excludedFolders] : [];
    return [...base, ...(s.vaultScan.additionalExclusions ?? [])];
  }

  async startVaultScan(): Promise<void> {
    const exclusions = this.getVaultScanExclusions();
    const total = this.app.vault.getMarkdownFiles().length;
    console.log(`ScriptureScribe: starting vault scan (${total} notes)…`);
    await buildVaultIndex(this.app.vault, exclusions, (done, t) => {
      if (done === t || done % 100 === 0) {
        console.debug(`ScriptureScribe vault scan: ${done}/${t}`);
      }
    });
    // If the reading panel is already open, refresh it so highlights appear
    const panel = this.getReadingPanel();
    if (panel) panel.onVaultIndexReady();
  }

  private isExcluded(filePath: string): boolean {
    return this.settings.excludedFolders.some(f => filePath.startsWith(f.replace(/\/?$/, "/")));
  }
}
