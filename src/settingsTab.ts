import { App, PluginSettingTab, Notice } from "obsidian";
import type ScriptureScribePlugin from "./main";
import { TRANSLATIONS } from "./settings";
import { clearScriptureCache } from "./fetcher";
import { setDefAdvanced } from "./defHelpers";
import { getBookPalette, contrastSafePalette } from "./bookColorUtils";
import { getIcon } from "./iconRegistry";
import { listSkins, skinsFolderPath, BUILTIN_SKIN_LABEL, SKIN_GUIDE_TEXT } from "./verseCardSkins";
import { buildVerseHighlightStyle, setVaultHighlightSettings, getVaultHighlightTextColor } from "./vaultIndex";

const BRAND_ICONS: Record<string, string> = {
  discord: `<path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028z" fill="currentColor"/>`,
  twitter: `<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor"/>`,
  youtube: `<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="currentColor"/>`,
  paypal: `<path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z" fill="currentColor"/>`,
  venmo: `<path d="M13.04 0c.583.96.844 1.948.844 3.197 0 3.986-3.403 9.153-6.168 12.784H3.83L2.086 1.66l5.367-.519 1.026 8.242C9.756 7.175 11.02 4.045 11.02 1.8c0-1.196-.205-2.01-.543-2.682L13.04 0z" fill="currentColor"/>`,
  zelle: `<path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.25 8.25H9.938l6.437 8.25H8.25v-1.5h7.313l-6.438-8.25H15.75V8.25h1.5V6.75H15v1.5h2.25z" fill="currentColor"/>`,
  bitcoin: `<path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.407s.975.225.955.236c.535.136.63.486.615.766l-1.477 5.92c-.075.166-.24.406-.614.314.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.93h.01zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.524 2.75 2.084v.006z" fill="currentColor"/>`,
  ethereum: `<path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" fill="currentColor"/>`,
  litecoin: `<path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.5 5.5h2l-1.5 5.5H17l-.5 2h-3.5l-1 3.5H15l-.5 2H7l1.5-5.5H5l.5-2h3.5L10.5 7H8l.5-2h4v.5z" fill="currentColor"/>`,
  dogecoin: `<path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm1.44 16.538H9.12V13.44H7.2v-1.44h1.92V12H7.2v-1.44h1.92V7.2h4.32c2.64 0 4.08 1.56 4.08 4.56s-1.44 4.778-4.08 4.778zm.24-7.578H10.8v5.82h2.88c1.32 0 2.16-.84 2.16-2.94 0-2.04-.84-2.88-2.16-2.88z" fill="currentColor"/>`,
  dero: `<path d="M12 2L3 7v10l9 5 9-5V7L12 2zm0 2.236L19.09 8.5 12 12.764 4.91 8.5 12 4.236zM4 9.764l7 3.882V19.5l-7-3.882V9.764zm16 0v5.854L13 19.5v-5.854l7-3.882z" fill="currentColor"/>`,
};

function copyToast(text: string, label: string): void {
  navigator.clipboard?.writeText(text).then(() => {
    new Notice(`✓ ${label} copied!`, 2500);
  });
}

// ── Google Font Injector ─────────────────────────────────────────────────────
const FONT_FLAT_LIST = [
  { key: "default", display: "Default Theme Font", css: "var(--font-text, Georgia, serif)" },
  { key: "Inter", display: "Inter", css: "'Inter', sans-serif" },
  { key: "Plus Jakarta", display: "Plus Jakarta Sans", css: "'Plus Jakarta Sans', sans-serif" },
  { key: "Lora", display: "Lora", css: "'Lora', serif" },
  { key: "Playfair", display: "Playfair Display", css: "'Playfair Display', serif" },
  { key: "EB Garamond", display: "EB Garamond", css: "'EB Garamond', serif" },
  { key: "Cormorant", display: "Cormorant Garamond", css: "'Cormorant Garamond', serif" },
  { key: "Cinzel", display: "Cinzel", css: "'Cinzel', serif" },
  { key: "UnifrakturMaguntia", display: "UnifrakturMaguntia", css: "'UnifrakturMaguntia', cursive" },
  { key: "Aref Ruqaa", display: "Aref Ruqaa", css: "'Aref Ruqaa', serif" },
  { key: "Grenze Gotisch", display: "Grenze Gotisch", css: "'Grenze Gotisch', cursive" },
  { key: "Sansation", display: "Sansation", css: "'Sansation', sans-serif" },
  { key: "Baumans", display: "Baumans", css: "'Baumans', sans-serif" },
  { key: "Aldrich", display: "Aldrich", css: "'Aldrich', sans-serif" },
  { key: "Megrim", display: "Megrim", css: "'Megrim', cursive" },
];

const GFONTS_URLS: Record<string, string> = {
  "Inter": "Inter:wght@400;600",
  "Plus Jakarta": "Plus+Jakarta+Sans:wght@400;600",
  "Lora": "Lora:wght@400;600",
  "Playfair": "Playfair+Display:wght@400;700",
  "EB Garamond": "EB+Garamond:wght@400;600",
  "Cormorant": "Cormorant+Garamond:wght@400;600",
  "Cinzel": "Cinzel:wght@700",
  "UnifrakturMaguntia": "UnifrakturMaguntia",
  "Aref Ruqaa": "Aref+Ruqaa:wght@400;700",
  "Grenze Gotisch": "Grenze+Gotisch:wght@400;600",
  "Sansation": "Sansation",
  "Baumans": "Baumans",
  "Aldrich": "Aldrich",
  "Megrim": "Megrim",
};

const loadGFont = (key: string) => {
  if (key === "default" || !GFONTS_URLS[key]) return;
  const id = `ss-gfont-${key.replace(/\s/g, "")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id; link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${GFONTS_URLS[key]}&display=swap`;
  document.head.appendChild(link);
};

// Book color families for the word-card preview: one representative book each.
const COLOR_FAMILIES = [
  { id: 1, label: "Law" }, { id: 9, label: "History" }, { id: 19, label: "Poetry" },
  { id: 23, label: "Prophets" }, { id: 41, label: "Gospels" }, { id: 45, label: "Paul" },
  { id: 54, label: "Pastorals" }, { id: 62, label: "General" }, { id: 66, label: "Revelation" },
];
const SAMPLE_WORDS = [
  { english: "world", original: "κόσμον", translit: "kosmon", strongs: "G2889", morph: "N-ASM" },
  { english: "gospel", original: "εὐαγγέλιον", translit: "euangelion", strongs: "G2098", morph: "N-ASN" },
  { english: "all", original: "πάσῃ", translit: "pasē", strongs: "G3956", morph: "A-DSF" },
];
const SAMPLE_PASSAGE = [
  { v: 1, text: "There is therefore now no condemnation to them which are in Christ Jesus, who walk not after the flesh, but after the Spirit.", notes: ["Study/Grace.md"] },
  { v: 2, text: "For the law of the Spirit of life in Christ Jesus hath made me free from the law of sin and death.", notes: [] },
  { v: 3, text: "For what the law could not do, in that it was weak through the flesh, God sending his own Son in the likeness of sinful flesh, and for sin, condemned sin in the flesh:", notes: ["Study/Grace.md", "Sermons/Romans 8.md"] },
];

// ── Styles ───────────────────────────────────────────────────────────────────
// One fluid column: nothing has a fixed width, rows wrap, so the page lays out at any window size.
const STYLE_ID = "ss-settings-v2";
const STYLES = `
.ss-set { --ss-a: #8c5cff; --ss-b: #ff4fc8; --ss-c: #35d6ff; max-width: 820px; margin: 0 auto; padding-bottom: 40px; }
.ss-set * { box-sizing: border-box; }
.ss-set-head { display: flex; align-items: center; gap: 16px; padding: 4px 0 14px; flex-wrap: wrap; }
.ss-set-head-icon svg { width: 60px !important; height: 60px !important; }
.ss-set-title { font-size: 26px; font-weight: 800; letter-spacing: -.02em; line-height: 1.1;
  background: linear-gradient(100deg, var(--ss-c), var(--ss-a) 45%, var(--ss-b)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.ss-set-sub { color: var(--text-muted); font-size: 13px; margin-top: 2px; }
.ss-set-head-actions { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; }
.ss-set-nav { position: sticky; top: 0; z-index: 5; display: flex; gap: 6px; flex-wrap: wrap; padding: 10px 0;
  background: var(--background-primary); border-bottom: 1px solid var(--background-modifier-border); margin-bottom: 18px; }
.ss-set-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px 5px 7px; border-radius: 999px; font-size: 12px; font-weight: 600;
  border: 1px solid var(--background-modifier-border); background: var(--background-secondary); color: var(--text-normal); cursor: pointer; box-shadow: none; height: auto; }
.ss-set-chip:hover { border-color: var(--ss-a); }
.ss-set-chip svg { width: 18px !important; height: 18px !important; }
.ss-sec { scroll-margin-top: 64px; border: 1px solid var(--background-modifier-border); border-radius: 14px; padding: 18px 20px 8px; margin-bottom: 18px;
  background: var(--background-secondary); position: relative; overflow: hidden; }
.ss-sec::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 3px; background: linear-gradient(90deg, var(--ss-c), var(--ss-a), var(--ss-b)); opacity: .85; }
.ss-sec.ss-quiet::before { opacity: .25; }
.ss-sec-head { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
.ss-sec-head svg { width: 34px !important; height: 34px !important; }
.ss-sec-title { font-size: 16px; font-weight: 750; }
.ss-sec-desc { font-size: 12px; color: var(--text-muted); }
.ss-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 18px; padding: 12px 0; border-top: 1px solid var(--background-modifier-border); }
.ss-sec-head + .ss-row, .ss-preview + .ss-row { border-top: none; }
.ss-row-info { flex: 1 1 240px; min-width: 0; }
.ss-row-name { font-size: 14px; font-weight: 600; }
.ss-row-desc { font-size: 12px; color: var(--text-muted); line-height: 1.45; margin-top: 2px; }
.ss-row-ctl { flex: 0 1 auto; margin-left: auto; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; max-width: 100%; }
.ss-row.ss-stack .ss-row-ctl { flex-basis: 100%; margin-left: 0; justify-content: flex-start; }
.ss-seg { display: inline-flex; flex-wrap: wrap; gap: 3px; padding: 3px; border-radius: 10px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); }
.ss-seg button { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 7px; font-size: 12.5px; font-weight: 600; height: auto;
  background: transparent; border: none; box-shadow: none; color: var(--text-muted); cursor: pointer; }
.ss-seg button svg { width: 18px !important; height: 18px !important; }
.ss-seg button:hover { color: var(--text-normal); background: var(--background-modifier-hover); }
.ss-seg button.on { color: #fff; background: linear-gradient(110deg, var(--ss-a), var(--ss-b)); box-shadow: 0 2px 10px rgba(140, 92, 255, .35); }
.ss-switch { position: relative; width: 44px; height: 24px; flex: none; }
.ss-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
.ss-switch span { position: absolute; inset: 0; border-radius: 24px; background: var(--background-modifier-border); transition: background .2s; cursor: pointer; }
.ss-switch span::before { content: ""; position: absolute; width: 18px; height: 18px; left: 3px; top: 3px; border-radius: 50%; background: #fff; transition: transform .25s cubic-bezier(.34,1.56,.64,1); box-shadow: 0 1px 3px rgba(0,0,0,.3); }
.ss-switch input:checked + span { background: linear-gradient(110deg, var(--ss-a), var(--ss-b)); }
.ss-switch input:checked + span::before { transform: translateX(20px); }
.ss-range { display: inline-flex; align-items: center; gap: 10px; }
.ss-range input { width: 160px; accent-color: var(--ss-a); }
.ss-range output { min-width: 52px; text-align: right; font-variant-numeric: tabular-nums; font-size: 12px; font-weight: 600; color: var(--text-muted); }
.ss-set select, .ss-set .ss-text { background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 7px; padding: 5px 10px; font-size: 13px; color: var(--text-normal); }
.ss-set .ss-text { width: 100%; font-family: var(--font-monospace); }
.ss-set textarea.ss-text { min-height: 70px; resize: vertical; }
.ss-btn2 { padding: 6px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 650; cursor: pointer; height: auto; border: 1px solid var(--background-modifier-border); background: var(--background-primary); color: var(--text-normal); box-shadow: none; }
.ss-btn2:hover { border-color: var(--ss-a); }
.ss-btn2.ss-go { color: #fff; border: none; background: linear-gradient(110deg, var(--ss-a), var(--ss-b)); box-shadow: 0 3px 12px rgba(255, 79, 200, .3); }
.ss-preview { border-radius: 12px; border: 1px solid var(--background-modifier-border); background: var(--background-primary); padding: 14px 16px; margin: 8px 0 6px; }
.ss-pv-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.ss-pv-book { font-family: Georgia, serif; letter-spacing: .14em; font-size: 13px; font-weight: 700; }
.ss-pv-pill { margin-left: auto; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 5px; }
.ss-pv-text { line-height: 1.9; }
.ss-pv-text sup { font-size: .62em; font-weight: 700; margin: 0 2px 0 6px; }
.ss-pv-hl { border-radius: 4px; padding: 1px 3px; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.ss-pv-legend { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 8px; font-size: 11px; color: var(--text-muted); }
.ss-pv-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
.ss-fonts { display: flex; flex-wrap: wrap; gap: 6px; }
.ss-fonts button { padding: 6px 12px; border-radius: 8px; font-size: 14px; cursor: pointer; height: auto; box-shadow: none; border: 1px solid var(--background-modifier-border); background: var(--background-primary); color: var(--text-normal); }
.ss-fonts button.on { border-color: var(--ss-a); box-shadow: 0 0 0 2px rgba(140, 92, 255, .35); }
.ss-words { display: flex; flex-wrap: wrap; gap: 6px; }
.ss-wc { text-align: center; border-radius: 8px; padding: 7px 10px; min-width: 76px; border: 1px solid var(--background-modifier-border); background: var(--background-secondary); line-height: 1.3; }
.ss-wc-e { font-size: 11px; color: var(--text-normal); }
.ss-wc-o { font-size: 16px; font-style: italic; }
.ss-wc-t { font-size: 9.5px; color: var(--text-muted); }
.ss-wc-s, .ss-wc-m { font-size: 9px; font-weight: 700; }
.ss-def { margin-top: 10px; border-radius: 9px; padding: 9px 12px; font-size: 12px; }
.ss-def-h { font-weight: 800; font-size: 11px; margin-bottom: 4px; }
.ss-def-m { margin-top: 6px; padding: 7px 9px; border-radius: 7px; background: rgba(255,255,255,.6); }
.ss-def-m b { display: block; font-size: 10px; font-variant: all-small-caps; letter-spacing: .04em; }
.ss-def-m span { font-style: italic; color: #2a2838; }
.ss-checks { display: flex; flex-wrap: wrap; gap: 6px 16px; }
.ss-checks label { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }
.ss-pills { display: flex; flex-wrap: wrap; gap: 8px; }
.ss-brand { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border: none; border-radius: 20px; color: #fff; cursor: pointer; font-size: 12px; font-weight: 700; height: auto; box-shadow: none; }
.ss-brand:hover { filter: brightness(1.1); }
.ss-label { font-size: 10px; font-weight: 800; letter-spacing: .1em; color: var(--text-muted); margin: 10px 0 6px; }
`;

type Opt<T extends string> = { value: T; label: string; icon?: string };

// ── Main Settings Tab ────────────────────────────────────────────────────────
// Ordered by how often people reach for things: how verses show and look first,
// set-and-forget setup (folders to ignore, cache) last.
export class ScriptureScribeSettingTab extends PluginSettingTab {
  plugin: ScriptureScribePlugin;

  constructor(app: App, plugin: ScriptureScribePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  private get s() { return this.plugin.settings; }
  private async save(): Promise<void> { await this.plugin.saveSettings(); }

  display(): void {
    document.getElementById("ss-design-system")?.remove(); // pre-1.0 settings stylesheet
    if (!document.getElementById(STYLE_ID)) {
      const style = document.head.createEl("style", { attr: { id: STYLE_ID } });
      style.textContent = STYLES;
    }
    const { containerEl } = this;
    containerEl.empty();
    const root = containerEl.createDiv({ cls: "ss-set" });

    const head = root.createDiv({ cls: "ss-set-head" });
    head.createDiv({ cls: "ss-set-head-icon" }).innerHTML = getIcon("Open-Bible-app-icon", 60);
    const titles = head.createDiv();
    titles.createDiv({ cls: "ss-set-title", text: "ScriptureScribe" });
    titles.createDiv({ cls: "ss-set-sub", text: `v${this.plugin.manifest.version} · a second brain for your Bible` });
    const actions = head.createDiv({ cls: "ss-set-head-actions" });
    this.button(actions, "Open Reading Panel", () => (this.plugin as any).activatePanel?.(), true);

    const nav = root.createDiv({ cls: "ss-set-nav" });
    const sections: Array<[string, string, string, () => void]> = [
      ["Hover", "verticle-page", "Hover & cards", () => this.renderHover(root)],
      ["Look", "Lamp-burning-suppoert", "Look", () => this.renderLook(root)],
      ["Cards", "open-scroll", "Card Mode", () => this.renderCards(root)],
      ["Study", "interliniar", "Word study", () => this.renderStudy(root)],
      ["Writing", "embed-text-white-qwill", "Writing & embeds", () => this.renderWriting(root)],
      ["Setup", "shepards-hook", "Setup", () => this.renderSetup(root)],
      ["Support", "olive-branch-give", "Support", () => this.renderSupport(root)],
    ];
    for (const [label, icon, , render] of sections) {
      const chip = nav.createEl("button", { cls: "ss-set-chip" });
      chip.innerHTML = getIcon(icon, 18);
      chip.createSpan({ text: label });
      chip.addEventListener("click", () => root.querySelector(`[data-sec="${label}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
      render();
    }
  }

  // ── Building blocks ─────────────────────────────────────────────────────────

  private section(root: HTMLElement, key: string, icon: string, title: string, desc: string, quiet = false): HTMLElement {
    const sec = root.createDiv({ cls: `ss-sec${quiet ? " ss-quiet" : ""}`, attr: { "data-sec": key } });
    const head = sec.createDiv({ cls: "ss-sec-head" });
    head.createDiv().innerHTML = getIcon(icon, 34);
    const t = head.createDiv();
    t.createDiv({ cls: "ss-sec-title", text: title });
    if (desc) t.createDiv({ cls: "ss-sec-desc", text: desc });
    return sec;
  }

  private row(parent: HTMLElement, name: string, desc: string, stack = false): HTMLElement {
    const row = parent.createDiv({ cls: `ss-row${stack ? " ss-stack" : ""}` });
    const info = row.createDiv({ cls: "ss-row-info" });
    info.createDiv({ cls: "ss-row-name", text: name });
    if (desc) info.createDiv({ cls: "ss-row-desc", text: desc });
    return row.createDiv({ cls: "ss-row-ctl" });
  }

  private segmented<T extends string>(parent: HTMLElement, opts: Opt<T>[], value: T, onChange: (v: T) => void | Promise<void>): void {
    const seg = parent.createDiv({ cls: "ss-seg" });
    for (const o of opts) {
      const b = seg.createEl("button", { cls: o.value === value ? "on" : "" });
      if (o.icon) b.innerHTML = getIcon(o.icon, 18);
      b.createSpan({ text: o.label });
      b.addEventListener("click", async () => {
        seg.querySelectorAll("button").forEach(x => x.toggleClass("on", x === b));
        await onChange(o.value);
      });
    }
  }

  private toggle(parent: HTMLElement, value: boolean, onChange: (v: boolean) => void | Promise<void>): void {
    const label = parent.createEl("label", { cls: "ss-switch" });
    const input = label.createEl("input", { type: "checkbox" });
    input.checked = value;
    label.createSpan();
    input.addEventListener("change", () => onChange(input.checked));
  }

  private range(parent: HTMLElement, min: number, max: number, step: number, value: number, unit: string,
                onInput: (v: number) => void, onChange: (v: number) => void | Promise<void>): void {
    const wrap = parent.createDiv({ cls: "ss-range" });
    const input = wrap.createEl("input", { type: "range" });
    input.min = String(min); input.max = String(max); input.step = String(step); input.value = String(value);
    const out = wrap.createEl("output", { text: `${value}${unit}` });
    input.addEventListener("input", () => { out.textContent = `${input.value}${unit}`; onInput(Number(input.value)); });
    input.addEventListener("change", () => onChange(Number(input.value)));
  }

  private select(parent: HTMLElement, options: Record<string, string>, value: string, onChange: (v: string) => void | Promise<void>): void {
    const sel = parent.createEl("select");
    for (const [k, v] of Object.entries(options)) sel.createEl("option", { text: v, value: k });
    sel.value = value;
    sel.addEventListener("change", () => onChange(sel.value));
  }

  private button(parent: HTMLElement, text: string, onClick: () => void, primary = false): HTMLButtonElement {
    const b = parent.createEl("button", { cls: `ss-btn2${primary ? " ss-go" : ""}`, text });
    b.addEventListener("click", onClick);
    return b;
  }

  private textInput(parent: HTMLElement, value: string, lines: number, onChange: (v: string) => void | Promise<void>): void {
    const el = lines > 1 ? parent.createEl("textarea", { cls: "ss-text" }) : parent.createEl("input", { cls: "ss-text", type: "text" });
    if (el instanceof HTMLTextAreaElement) el.rows = lines;
    el.value = value;
    el.addEventListener("change", () => onChange(el.value));
  }

  private refreshPalettes(): void {
    const { workspace } = this.plugin.app;
    workspace.getLeavesOfType("scripture-scribe-panel").forEach(leaf => {
      const view = leaf.view as any;
      view?.refreshPalette?.();
      view?.bibleModeView?.refreshPalette?.();
    });
    (this.plugin as any).tooltip?.refreshPalette?.();
  }

  // ── 1. Hover & cards: what happens when you point at a verse ─────────────────

  private renderHover(root: HTMLElement): void {
    const sec = this.section(root, "Hover", "verticle-page", "When you hover a verse", "The switches you flip most: tooltip or full-screen card, and where the verse opens.");
    let c = this.row(sec, "Show it as", "A tooltip beside the text, or a full-screen card for recording and presenting.");
    this.segmented(c, [
      { value: "tooltip", label: "Tooltip", icon: "verticle-page" },
      { value: "card", label: "Full-screen card", icon: "open-scroll" },
    ], this.s.display.cardMode ? "card" : "tooltip", async v => { await this.plugin.tooltip.setCardMode(v === "card"); });

    c = this.row(sec, "Also open in the Reading Panel", "Follow along in the sidebar as you hover.");
    this.segmented(c, [
      { value: "tooltip", label: "Tooltip only" }, { value: "both", label: "Tooltip + panel" }, { value: "panel", label: "Panel only" },
    ], this.s.display.referenceClickBehavior, async v => { this.s.display.referenceClickBehavior = v; await this.save(); });

    c = this.row(sec, "Hover delay", "How long to rest on a reference before it opens.");
    this.range(c, 100, 1000, 50, this.s.hoverSettings.triggerDelayMs, " ms", () => {}, async v => { this.s.hoverSettings.triggerDelayMs = v; await this.save(); });

    c = this.row(sec, "Translation", "KJV and the Greek Septuagint are built in and work offline. The others are public-domain texts loaded from bible-api.com. ESV, NIV and other copyrighted translations can't be shown here; the version menu opens them on BibleGateway.");
    const versions: Record<string, string> = {};
    for (const t of TRANSLATIONS) versions[t.id] = `${t.id} · ${t.name}${t.api ? " (online)" : ""}${t.note ? ` · ${t.note}` : ""}`;
    this.select(c, versions, this.s.primaryTranslation, async v => { this.s.primaryTranslation = v; await this.save(); });
  }

  // ── 2. Look: fonts, highlights and book colors, with a live preview ─────────

  private renderLook(root: HTMLElement): void {
    const sec = this.section(root, "Look", "Lamp-burning-suppoert", "Look", "Everything here updates the preview as you change it.");
    const preview = sec.createDiv({ cls: "ss-preview" });
    const head = preview.createDiv({ cls: "ss-pv-head" });
    const book = head.createSpan({ cls: "ss-pv-book", text: "ROMANS · 8" });
    const pill = head.createSpan({ cls: "ss-pv-pill", text: "KJV ▾" });
    const text = preview.createDiv({ cls: "ss-pv-text" });
    const legend = preview.createDiv({ cls: "ss-pv-legend" });
    legend.createSpan({ text: "Highlighted verses are cited in your notes; each note has its own color, and a verse cited by several blends them." });

    const draw = (opacity = this.s.vaultHighlight.opacity, size = this.s.bibleText.fontSize, fontKey = this.s.bibleText.fontFamily) => {
      const pal = contrastSafePalette(getBookPalette(45, this.s.display.useBookColors !== false));
      book.style.color = pal.base;
      pill.style.background = pal.base;
      pill.style.color = pal.textOnVivid;
      loadGFont(fontKey);
      text.style.fontFamily = FONT_FLAT_LIST.find(f => f.key === fontKey)?.css ?? "inherit";
      text.style.fontSize = `${size}px`;
      setVaultHighlightSettings(opacity, this.s.vaultHighlight.textColor);
      text.empty();
      for (const verse of SAMPLE_PASSAGE) {
        const sup = text.createEl("sup", { text: String(verse.v) });
        sup.style.color = pal.base;
        const span = text.createSpan({ text: verse.text });
        if (verse.notes.length) {
          span.addClass("ss-pv-hl");
          span.style.background = buildVerseHighlightStyle(verse.notes).background;
          span.style.color = getVaultHighlightTextColor();
        }
        text.appendText(" ");
      }
    };
    draw();

    let c = this.row(sec, "Bible font", "", true);
    const fonts = c.createDiv({ cls: "ss-fonts" });
    for (const font of FONT_FLAT_LIST) {
      loadGFont(font.key);
      const b = fonts.createEl("button", { text: font.display, cls: font.key === this.s.bibleText.fontFamily ? "on" : "" });
      b.style.fontFamily = font.css;
      b.addEventListener("click", async () => {
        fonts.querySelectorAll("button").forEach(x => x.toggleClass("on", x === b));
        this.s.bibleText.fontFamily = font.key;
        draw();
        await this.save();
      });
    }

    c = this.row(sec, "Text size", "Bible mode and the reading panel.");
    this.range(c, 11, 26, 1, this.s.bibleText.fontSize, " px", v => draw(undefined, v), async v => { this.s.bibleText.fontSize = v; await this.save(); });

    c = this.row(sec, "Highlight strength", "How vivid the note highlights are in Bible mode.");
    this.range(c, 10, 100, 1, this.s.vaultHighlight.opacity, "%", v => draw(v), async v => { this.s.vaultHighlight.opacity = v; draw(); await this.save(); });

    c = this.row(sec, "Text on highlights", "Auto keeps dark text on the bright highlight colors.");
    const textColor = (["auto", "dark", "light"] as const).includes(this.s.vaultHighlight.textColor) ? this.s.vaultHighlight.textColor : "auto";
    this.segmented(c, [{ value: "auto", label: "Auto" }, { value: "dark", label: "Dark" }, { value: "light", label: "Light" }], textColor,
      async v => { this.s.vaultHighlight.textColor = v; draw(); await this.save(); });

    c = this.row(sec, "Book colors", "Each part of the Bible gets its own accent color. Off uses purple everywhere.");
    this.toggle(c, this.s.display.useBookColors !== false, async v => {
      this.s.display.useBookColors = v;
      await this.save();
      this.refreshPalettes();
      draw();
      this.redrawWords();
    });
  }

  // ── 3. Card Mode ─────────────────────────────────────────────────────────────

  private renderCards(root: HTMLElement): void {
    const plugin = this.plugin;
    const pluginDir = plugin.manifest.dir!;
    const sec = this.section(root, "Cards", "open-scroll", "Card Mode", "Full-screen verse cards for preaching, teaching and recording. Turn it on under “When you hover a verse”, or with the Toggle Card Mode command.");

    let c = this.row(sec, "Skin", "Each skin is an HTML file in the plugin's skins folder.");
    const skinRow = c;
    listSkins(plugin.app.vault.adapter, pluginDir).then(files => {
      const options: Record<string, string> = { "": BUILTIN_SKIN_LABEL };
      for (const f of files) options[f] = f.replace(/\.html?$/i, "");
      const current = this.s.display.cardSkin;
      if (current && !options[current]) options[current] = `${current} (missing, using built-in)`;
      this.select(skinRow, options, current, async v => {
        this.s.display.cardSkin = v;
        await this.save();
        plugin.tooltip.card?.reloadSkin();
        plugin.tooltip.card?.warm();
      });
      this.button(skinRow, "Preview", () => {
        const card = plugin.tooltip.card;
        if (!card) return;
        card.reloadSkin();
        card.show({
          key: "preview", reference: "John 3:16", version: "KJV", book: "John", testament: "nt",
          text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
          palette: { base: "#7c5cff", light: "#e4dcff", mid: "#a995ff", dark: "#3a2a99" },
        });
        setTimeout(() => card.hide(), 4500);
      }, true);
    });

    c = this.row(sec, "Show cards", "Every hover, or only while you hold a key (otherwise you get the tooltip).");
    this.segmented(c, [{ value: "always", label: "Always" }, { value: "shift", label: "Hold Shift" }, { value: "ctrl", label: "Hold Ctrl" }],
      this.s.display.cardTrigger ?? "always", async v => { this.s.display.cardTrigger = v; await this.save(); });

    c = this.row(sec, "Hide the mouse pointer", "Keeps the pointer out of your recording while a card is up.");
    this.toggle(c, this.s.display.cardHideCursor !== false, async v => { this.s.display.cardHideCursor = v; await this.save(); });

    c = this.row(sec, "Make your own skin", "Copy the design guide, give it to any AI with the look you want, and save the HTML it returns into the skins folder.");
    this.button(c, "Copy AI guide", () => copyToast(SKIN_GUIDE_TEXT, "Skin guide"));
    this.button(c, "Open skins folder", () => {
      try { (plugin.app as any).showInFolder(`${skinsFolderPath(pluginDir)}/SKIN-GUIDE.md`); }
      catch { new Notice(`Skins folder: ${skinsFolderPath(pluginDir)}`, 6000); }
    });
  }

  // ── 4. Word study: interlinear cards and Strong's definitions ───────────────

  private redrawWords: () => void = () => {};

  private renderStudy(root: HTMLElement): void {
    const sec = this.section(root, "Study", "interliniar", "Word study", "Interlinear word cards and Strong's definitions. Tap a color family to check how each part of the Bible reads.");
    const preview = sec.createDiv({ cls: "ss-preview" });
    const families = preview.createDiv({ cls: "ss-seg" });
    families.style.marginBottom = "10px";
    const words = preview.createDiv({ cls: "ss-words" });
    const def = preview.createDiv({ cls: "ss-def" });
    let family = 41;

    const draw = () => {
      const pal = contrastSafePalette(getBookPalette(family, this.s.display.useBookColors !== false));
      const d = this.s.display;
      words.empty();
      SAMPLE_WORDS.forEach((w, i) => {
        const selected = i === 1;
        const card = words.createDiv({ cls: "ss-wc" });
        if (selected) { card.style.background = pal.light; card.style.borderColor = pal.base; card.style.boxShadow = `0 2px 12px ${pal.base}55`; }
        if (d.cardShowEnglish !== false) card.createDiv({ cls: "ss-wc-e", text: w.english }).style.color = selected ? "#1a1a2e" : "";
        card.createDiv({ cls: "ss-wc-o", text: w.original }).style.color = selected ? pal.textOnLight : pal.mid;
        if (d.cardShowTranslit !== false) card.createDiv({ cls: "ss-wc-t", text: w.translit }).style.color = selected ? "#55526a" : "";
        if (d.cardShowStrongs !== false) card.createDiv({ cls: "ss-wc-s", text: w.strongs }).style.color = selected ? pal.textOnLight : pal.mid;
        if (this.s.morphology.enabled) card.createDiv({ cls: "ss-wc-m", text: w.morph }).style.color = selected ? pal.textOnLight : pal.mid;
      });
      def.empty();
      def.style.background = pal.light;
      def.style.border = `1px solid ${pal.mid}`;
      def.createDiv({ cls: "ss-def-h", text: "G2098 · gospel · εὐαγγέλιον" }).style.color = pal.textOnLight;
      def.createDiv({ text: this.s.morphology.uiMode === "advanced"
        ? "εὐαγγέλιον, -ου, τό (εὐάγγελος), [in LXX for בְּשׂרָה ;] 1. in cl., a reward for good tidings. 2. later, the good tidings…"
        : "good news, the gospel: the message of salvation." }).style.color = "#1a1a2e";
      if (this.s.morphology.enabled) {
        const m = def.createDiv({ cls: "ss-def-m" });
        m.createEl("b", { text: "noun · accusative · singular · neuter" }).style.color = pal.textOnLight;
        m.createSpan({ text: "person/place/thing · direct object · one" });
      }
    };
    for (const f of COLOR_FAMILIES) {
      const b = families.createEl("button", { text: f.label, cls: f.id === family ? "on" : "" });
      b.addEventListener("click", () => { family = f.id; families.querySelectorAll("button").forEach(x => x.toggleClass("on", x === b)); draw(); });
    }
    this.redrawWords = draw;
    draw();

    let c = this.row(sec, "Definitions", "Simple shows plain-English meanings; Advanced shows the full lexicon entry and raw grammar codes.");
    this.segmented(c, [{ value: "simple", label: "Simple" }, { value: "advanced", label: "Advanced" }], this.s.morphology.uiMode,
      async v => { this.s.morphology.uiMode = v; setDefAdvanced(v === "advanced"); draw(); await this.save(); });

    c = this.row(sec, "On each word card", "", true);
    const checks = c.createDiv({ cls: "ss-checks" });
    const check = (label: string, value: boolean, onChange: (v: boolean) => void) => {
      const l = checks.createEl("label");
      const cb = l.createEl("input", { type: "checkbox" });
      cb.checked = value;
      l.appendText(label);
      cb.addEventListener("change", async () => { onChange(cb.checked); draw(); await this.save(); });
    };
    check("English gloss", this.s.display.cardShowEnglish !== false, v => this.s.display.cardShowEnglish = v);
    check("Transliteration", this.s.display.cardShowTranslit !== false, v => this.s.display.cardShowTranslit = v);
    check("Strong's number", this.s.display.cardShowStrongs !== false, v => this.s.display.cardShowStrongs = v);
    check("Grammar (morphology)", this.s.morphology.enabled, v => this.s.morphology.enabled = v);

    c = this.row(sec, "Teaching notes", "Short 💡 notes on why a grammatical form matters.");
    this.toggle(c, this.s.morphology.showTeachingNotes, async v => { this.s.morphology.showTeachingNotes = v; await this.save(); });

    c = this.row(sec, "Cross-references shown", "How many appear before “show all”.");
    this.segmented(c, [{ value: "3", label: "3" }, { value: "5", label: "5" }], String(this.s.crossRefs.showLessCount) as "3" | "5",
      async v => { this.s.crossRefs.showLessCount = Number(v) as 3 | 5; await this.save(); });
  }

  // ── 5. Writing & embeds ─────────────────────────────────────────────────────

  private renderWriting(root: HTMLElement): void {
    const sec = this.section(root, "Writing", "embed-text-white-qwill", "Writing & embeds", "What the Embed button writes into your note, and how citations are copied.");
    let c = this.row(sec, "Embed style", "Used by the Embed button and Embed All.");
    this.segmented(c, [{ value: "quote", label: "❝ Quote block" }, { value: "tooltip", label: "Footnote" }, { value: "link", label: "Link" }],
      this.s.embedding.defaultStyle, async v => { this.s.embedding.defaultStyle = v; await this.save(); });

    c = this.row(sec, "Add the version to embeds", "Appends “KJV” (or the version in use).");
    this.toggle(c, this.s.embedding.includeVersionBadge, async v => { this.s.embedding.includeVersionBadge = v; await this.save(); });

    c = this.row(sec, "Citation format", "Used by Copy as Citation.");
    this.select(c, { plain: "Plain", apa: "APA (7th)", chicago: "Chicago (17th)", turabian: "Turabian", mla: "MLA (9th)" }, this.s.citation.format,
      async v => { this.s.citation.format = v as any; await this.save(); });
    c = this.row(sec, "Add the version to citations", "");
    this.toggle(c, this.s.citation.includeVersion, async v => { this.s.citation.includeVersion = v; await this.save(); });

    c = this.row(sec, "Verse of the Day", "A daily verse in the reading panel when nothing else is open.");
    this.toggle(c, this.s.verseOfTheDay.enabled, async v => { this.s.verseOfTheDay.enabled = v; await this.save(); });
    c = this.row(sec, "Verse of the Day picks", "Shared gives everyone the same verse each day.");
    this.segmented(c, [{ value: "deterministic", label: "Shared" }, { value: "random", label: "Random" }], this.s.verseOfTheDay.algorithm,
      async v => { this.s.verseOfTheDay.algorithm = v; await this.save(); });
    c = this.row(sec, "Show it when Obsidian opens", "");
    this.toggle(c, this.s.verseOfTheDay.showOnStartup, async v => { this.s.verseOfTheDay.showOnStartup = v; await this.save(); });
  }

  // ── 6. Setup: set once and forget ──────────────────────────────────────────

  private renderSetup(root: HTMLElement): void {
    const sec = this.section(root, "Setup", "shepards-hook", "Setup", "Set once when you start; rarely touched after.", true);
    let c = this.row(sec, "Show the KJV when a translation can't load", "Offline or busy: show the built-in KJV, clearly labelled as KJV. Off shows a message instead.");
    this.toggle(c, this.s.offlineFallback, async v => { this.s.offlineFallback = v; await this.save(); });

    c = this.row(sec, "Folders to ignore", "ScriptureScribe won't highlight references in these folders. One path per line.", true);
    this.textInput(c, this.s.excludedFolders.join("\n"), 3, async v => { this.s.excludedFolders = v.split("\n").map(x => x.trim()).filter(Boolean); await this.save(); });

    c = this.row(sec, "Leave ignored folders out of Bible mode", "Notes in those folders won't color verses or appear under “In your notes”.");
    this.toggle(c, this.s.vaultScan.useGlobalExclusions, async v => { this.s.vaultScan.useGlobalExclusions = v; await this.save(); });

    c = this.row(sec, "Also leave out of Bible mode", "Extra folders to skip only when finding notes for each verse. One path per line.", true);
    this.textInput(c, this.s.vaultScan.additionalExclusions.join("\n"), 2, async v => { this.s.vaultScan.additionalExclusions = v.split("\n").map(x => x.trim()).filter(Boolean); await this.save(); });

    c = this.row(sec, "Rescan notes", "Re-read every note for verse references now.");
    this.button(c, "Scan now", () => this.plugin.startVaultScan(true));

    c = this.row(sec, "Clear saved verses", "Forget online verses and chapters fetched this session, so they load fresh.");
    this.button(c, "Clear", () => { clearScriptureCache(); new Notice("ScriptureScribe: saved online verses cleared."); });
  }

  // ── 7. Community & support ─────────────────────────────────────────────────

  private renderSupport(root: HTMLElement): void {
    const sec = this.section(root, "Support", "olive-branch-give", "Community & support", "ScriptureScribe is free. Say hello, share feedback, or support the work.", true);
    const pill = (parent: HTMLElement, label: string, bg: string, icon: string, onClick: () => void) => {
      const b = parent.createEl("button", { cls: "ss-brand" });
      b.style.background = bg;
      b.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14">${icon}</svg>`;
      b.appendText(label);
      b.addEventListener("click", e => { e.stopPropagation(); onClick(); });
    };
    sec.createDiv({ cls: "ss-label", text: "COMMUNITY · @joyraptor" });
    let row = sec.createDiv({ cls: "ss-pills" });
    pill(row, "Discord", "#5865F2", BRAND_ICONS.discord, () => window.open("https://discord.com/users/joyraptor"));
    pill(row, "Twitter / X", "#000000", BRAND_ICONS.twitter, () => window.open("https://x.com/joyraptor"));
    pill(row, "YouTube", "#FF0000", BRAND_ICONS.youtube, () => window.open("https://youtube.com/@joyraptor"));
    pill(row, "GitHub", "#24292f", "", () => window.open("https://github.com/JoyRaptor/ScriptureScribe"));

    sec.createDiv({ cls: "ss-label", text: "GIVE · click to copy" });
    row = sec.createDiv({ cls: "ss-pills" });
    pill(row, "PayPal", "#003087", BRAND_ICONS.paypal, () => window.open("https://paypal.me/joyraptor"));
    pill(row, "Venmo", "#3D95CE", BRAND_ICONS.venmo, () => copyToast("@scott-vigil", "Venmo handle"));
    pill(row, "Zelle", "#6D1ED4", BRAND_ICONS.zelle, () => copyToast("@scott-vigil", "Zelle handle"));
    pill(row, "Bitcoin", "#F7931A", BRAND_ICONS.bitcoin, () => copyToast("bc1qqrexm09npkns55l7k5z88hwm2en98nsv5ct9je", "Bitcoin address"));
    pill(row, "Ethereum", "#627EEA", BRAND_ICONS.ethereum, () => copyToast("0xf3Af7973bc6ce0179A1fC2D7e7805D260225cBD6", "Ethereum address"));
    pill(row, "Litecoin", "#8a8a8a", BRAND_ICONS.litecoin, () => copyToast("LW9uQNm3DPXdbT4dXCiw9YE5HFU5nn8BFU", "Litecoin address"));
    pill(row, "Dogecoin", "#c2a633", BRAND_ICONS.dogecoin, () => copyToast("DDJYAXCzoyd35xMYuYRHKEg5jeMwVJKthQ", "Dogecoin address"));
    pill(row, "DERO", "#1717dc", BRAND_ICONS.dero, () => copyToast("joyraptor", "DERO address"));
    sec.createDiv({ attr: { style: "height:10px" } });
  }

  hide(): void {
    super.hide();
    // Previews push their values into the highlight module; restore the saved ones on close.
    setVaultHighlightSettings(this.s.vaultHighlight.opacity, this.s.vaultHighlight.textColor);
  }
}
