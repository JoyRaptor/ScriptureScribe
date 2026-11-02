import { App, PluginSettingTab, Notice } from "obsidian";
import type ScriptureScribePlugin from "./main";
import { VERSION_CODES } from "./settings";
import { DEFAULT_PALETTE } from "./bookColorUtils";
import { getIcon } from "./iconRegistry";
import { listSkins, skinsFolderPath, BUILTIN_SKIN_LABEL, SKIN_GUIDE_TEXT } from "./verseCardSkins";

// ── Constants & SVGs ─────────────────────────────────────────────────────────
// Always use the default purple palette in settings UI (no per-book theming here)
const P  = DEFAULT_PALETTE.base;
const PL = DEFAULT_PALETTE.light;
const PM = DEFAULT_PALETTE.mid;

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

// ── Design System & Theme Engine ─────────────────────────────────────────────
class DesignSystem {
  static inject(container: HTMLElement) {
    if (document.getElementById("ss-design-system")) return;

    const style = document.createElement("style");
    style.id = "ss-design-system";
    style.textContent = `
      .ss-settings-wrap {
        --ss-accent: #534AB7;
        --ss-accent-light: #EEEDFE;
        --ss-accent-glow: rgba(83, 74, 183, 0.4);
        --ss-glass-bg: var(--background-secondary-alt);
        --ss-glass-border: var(--background-modifier-border);
        --ss-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
        --ss-ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
        display: flex; gap: 24px; height: 100%; max-width: 1000px; margin: 0 auto; padding: 12px 0;
      }
      .theme-dark .ss-settings-wrap {
        --ss-glass-bg: rgba(30, 30, 30, 0.4);
        --ss-glass-border: rgba(255, 255, 255, 0.08);
      }
      
      /* Invert text color logic depending on system theme */
      .theme-dark .ss-text-inverted { color: #1a1a1a !important; }
      .theme-light .ss-text-inverted { color: #f0f0f0 !important; }
      .ss-text-auto { color: var(--text-normal) !important; }

      @media (max-width: 768px) {
        .ss-settings-wrap { flex-direction: column; gap: 16px; }
        .ss-sidebar { width: 100% !important; flex-direction: row !important; overflow-x: auto; padding-bottom: 8px; }
        .ss-nav-pill { white-space: nowrap; }
      }
      .ss-sidebar { display: flex; flex-direction: column; gap: 6px; width: 220px; flex-shrink: 0; }
      .ss-nav-pill {
        padding: 10px 16px; border-radius: 8px; color: var(--text-muted); font-weight: 600; font-size: 13px;
        cursor: pointer; transition: all 0.2s var(--ss-ease-smooth); border: 1px solid transparent; background: transparent; text-align: left;
      }
      .ss-nav-pill:hover { background: var(--background-modifier-hover); color: var(--text-normal); }
      .ss-nav-pill.active { background: var(--ss-accent-light); color: var(--ss-accent); border-color: var(--ss-accent-glow); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      .theme-dark .ss-nav-pill.active { background: rgba(83, 74, 183, 0.15); }
      .ss-content-pane { flex: 1; overflow-y: auto; padding-right: 12px; padding-bottom: 40px; }
      .ss-glass-card {
        background: var(--ss-glass-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
        border: 1px solid var(--ss-glass-border); border-radius: 12px; padding: 20px; margin-bottom: 24px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04); animation: ss-fade-up 0.4s var(--ss-ease-smooth) both;
      }
      .ss-card-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ss-accent); margin-bottom: 16px; }
      .ss-setting-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--background-modifier-border); }
      .ss-setting-row:last-child { border-bottom: none; padding-bottom: 0; }
      .ss-setting-row.ss-vertical { flex-direction: column; align-items: flex-start; gap: 12px; }
      .ss-setting-info { display: flex; flex-direction: column; gap: 4px; padding-right: 20px; flex: 1; }
      .ss-setting-name { font-size: 14px; font-weight: 600; color: var(--text-normal); }
      .ss-setting-desc { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
      .ss-setting-control { flex-shrink: 0; }
      
      /* Slider */
      .ss-slider { -webkit-appearance: none; width: 120px; height: 4px; background: var(--background-modifier-border); border-radius: 2px; outline: none; }
      .ss-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: var(--ss-accent); cursor: pointer; box-shadow: 0 2px 6px var(--ss-accent-glow); transition: transform 0.2s var(--ss-ease-spring); }
      .ss-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
      
      /* Toggle */
      .ss-toggle { position: relative; display: inline-block; width: 44px; height: 24px; }
      .ss-toggle input { opacity: 0; width: 0; height: 0; }
      .ss-toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--background-modifier-border); transition: .3s; border-radius: 24px; }
      .ss-toggle-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s var(--ss-ease-spring); border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
      .ss-toggle input:checked + .ss-toggle-slider { background-color: var(--ss-accent); }
      .ss-toggle input:checked + .ss-toggle-slider:before { transform: translateX(20px); }
      .ss-toggle input:disabled + .ss-toggle-slider { opacity: 0.5; cursor: not-allowed; }
      
      /* Dropdown */
      .ss-select { background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 6px 12px; color: var(--text-normal); font-size: 13px; cursor: pointer; outline: none; }
      .ss-select:focus { border-color: var(--ss-accent); box-shadow: 0 0 0 2px var(--ss-accent-glow); }
      
      /* Text Input / Area */
      .ss-input, .ss-textarea { width: 100%; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 8px 12px; color: var(--text-normal); font-size: 13px; outline: none; transition: border-color 0.2s; font-family: var(--font-monospace); }
      .ss-input:focus, .ss-textarea:focus { border-color: var(--ss-accent); box-shadow: 0 0 0 2px var(--ss-accent-glow); }
      
      /* Button */
      .ss-btn { background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 6px 14px; color: var(--text-normal); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s var(--ss-ease-smooth); }
      .ss-btn:hover { background: var(--background-modifier-hover); }
      .ss-btn.ss-primary { background: var(--ss-accent); color: white; border-color: var(--ss-accent); }
      .ss-btn.ss-primary:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 12px var(--ss-accent-glow); }
      
      /* Brand Pill */
      .ss-brand-pill { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border: none; border-radius: 20px; color: white; cursor: pointer; font-size: 12px; font-weight: 700; white-space: nowrap; transition: transform 0.15s, opacity 0.15s; }
      .ss-brand-pill:hover { transform: scale(1.05); opacity: 0.92; }

      @keyframes ss-fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
  }
}

// ── UI Factory ───────────────────────────────────────────────────────────────
class UIFactory {
  static createCard(parent: HTMLElement, title: string, iconSvg?: string): HTMLElement {
    const card = parent.createEl("div", { cls: "ss-glass-card" });
    if (title || iconSvg) {
      const titleEl = card.createEl("div", { cls: "ss-card-title" });
      if (iconSvg) {
        titleEl.style.display = "flex";
        titleEl.style.alignItems = "center";
        titleEl.style.gap = "8px";
        titleEl.innerHTML = `${iconSvg} <span>${title}</span>`;
      } else {
        titleEl.textContent = title;
      }
    }
    return card;
  }

  static createRow(card: HTMLElement, name: string, desc: string, vertical = false): HTMLElement {
    const row = card.createEl("div", { cls: `ss-setting-row ${vertical ? 'ss-vertical' : ''}` });
    const info = row.createEl("div", { cls: "ss-setting-info" });
    info.createEl("div", { cls: "ss-setting-name", text: name });
    if (desc) info.createEl("div", { cls: "ss-setting-desc", text: desc });
    return row.createEl("div", { cls: "ss-setting-control" });
  }

  static buildSlider(card: HTMLElement, name: string, desc: string, min: number, max: number, value: number, onInput: (val: number) => void, onChange: (val: number) => void) {
    const control = this.createRow(card, name, desc);
    const slider = control.createEl("input", { cls: "ss-slider" });
    slider.type = "range"; slider.min = String(min); slider.max = String(max); slider.value = String(value);
    slider.addEventListener("input", (e) => onInput(Number((e.target as HTMLInputElement).value)));
    slider.addEventListener("change", (e) => onChange(Number((e.target as HTMLInputElement).value)));
  }

  static buildToggle(card: HTMLElement, name: string, desc: string, value: boolean, onChange: (val: boolean) => void, disabled = false) {
    const control = this.createRow(card, name, desc);
    const label = control.createEl("label", { cls: "ss-toggle" });
    const input = label.createEl("input");
    input.type = "checkbox"; input.checked = value; input.disabled = disabled;
    label.createEl("span", { cls: "ss-toggle-slider" });
    input.addEventListener("change", () => onChange(input.checked));
  }

  static buildDropdown(card: HTMLElement, name: string, desc: string, options: Record<string, string>, value: string, onChange: (val: string) => void) {
    const control = this.createRow(card, name, desc);
    const select = control.createEl("select", { cls: "ss-select" });
    for (const [key, label] of Object.entries(options)) {
      const opt = select.createEl("option", { text: label });
      opt.value = key;
    }
    select.value = value;
    select.addEventListener("change", () => onChange(select.value));
  }

  static buildText(card: HTMLElement, name: string, desc: string, value: string, onChange: (val: string) => void) {
    const control = this.createRow(card, name, desc, true);
    control.style.width = "100%";
    const input = control.createEl("input", { cls: "ss-input" });
    input.type = "text"; input.value = value;
    input.addEventListener("change", () => onChange(input.value));
  }

  static buildTextArea(card: HTMLElement, name: string, desc: string, value: string, rows: number, onChange: (val: string) => void) {
    const control = this.createRow(card, name, desc, true);
    control.style.width = "100%";
    const textarea = control.createEl("textarea", { cls: "ss-textarea" });
    textarea.rows = rows; textarea.value = value;
    textarea.addEventListener("change", () => onChange(textarea.value));
  }

  static buildButton(card: HTMLElement, name: string, desc: string, btnText: string, onClick: () => void, primary = false) {
    const control = this.createRow(card, name, desc);
    const btn = control.createEl("button", { cls: `ss-btn ${primary ? 'ss-primary' : ''}`, text: btnText });
    btn.addEventListener("click", onClick);
  }

  static buildBrandPill(parent: HTMLElement, label: string, bgColor: string, iconSvg: string, onClick: () => void) {
    const btn = parent.createEl("button", { cls: "ss-brand-pill" });
    btn.style.background = bgColor;
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" style="flex-shrink:0;">${iconSvg}</svg>${label}`;
    btn.addEventListener("click", (e) => { e.stopPropagation(); onClick(); });
  }
}

// ── Preview Helpers ──────────────────────────────────────────────────────────
function buildWordCardPreview(container: HTMLElement, showEnglish: boolean, showTranslit: boolean, showStrongs: boolean): void {
  container.empty();
  container.classList.add("ss-preview-wrap");
  const sample = [
    { english: "love", original: "ἀγάπη", translit: "agapē", strongs: "G26" },
    { english: "God", original: "θεός", translit: "theos", strongs: "G2316" },
  ];
  for (const w of sample) {
    const card = container.createEl("div", { cls: "ss-preview-word-card" });
    if (showEnglish) {
      const el = card.createEl("div", { cls: "ss-preview-english", text: w.english });
    }
    const orig = card.createEl("div", { cls: "ss-preview-original", text: w.original });
    orig.style.color = PM;
    if (showTranslit) {
      const el = card.createEl("div", { cls: "ss-preview-translit", text: w.translit });
    }
    if (showStrongs) {
      const el = card.createEl("div", { cls: "ss-preview-strongs", text: w.strongs });
      el.style.color = PM;
    }
  }
}

// ── Main Settings Tab ────────────────────────────────────────────────────────
export class ScriptureScribeSettingTab extends PluginSettingTab {
  plugin: ScriptureScribePlugin;
  private contentPane!: HTMLElement;
  private navPills: Map<string, HTMLElement> = new Map();

  constructor(app: App, plugin: ScriptureScribePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    DesignSystem.inject(containerEl);

    // Build Hero
    const hero = containerEl.createEl("div", { cls: "ss-hero" });
    const icon = hero.createEl("div", { cls: "ss-hero-icon" });
    icon.innerHTML = getIcon("Open-Bible-app-icon", 120);
    const text = hero.createEl("div", { cls: "ss-hero-text" });
    text.createEl("div", { text: "ScriptureScribe", attr: { style: "font-size: 32px; font-weight: 800; letter-spacing: -1px; margin-bottom: 4px;" } });
    text.createEl("div", { text: "Cinematic study environment.", attr: { style: "color: var(--text-muted); font-size: 16px;" } });

    // Layout
    const wrap = containerEl.createEl("div", { cls: "ss-settings-wrap" });
    const sidebar = wrap.createEl("div", { cls: "ss-sidebar" });
    this.contentPane = wrap.createEl("div", { cls: "ss-content-pane" });

    // Tabs
    const tabs = [
      { id: "general", label: "General & Engine", icon: getIcon("open-scroll", 27) },
      { id: "appearance", label: "Reader Appearance", icon: getIcon("verticle-page", 27) },
      { id: "embeds", label: "Embeds & Notes", icon: getIcon("embed-settings-tablets", 27) },
      { id: "scholar", label: "Scholar & Intelligence", icon: getIcon("Lamp-burning-suppoert", 27) },
      { id: "community", label: "Community & Support", icon: getIcon("dove-send", 27) }
    ];

    tabs.forEach(tab => {
      const pill = sidebar.createEl("button", { cls: "ss-nav-pill" });
      pill.innerHTML = `<div style="display:flex;align-items:center;gap:8px;">${tab.icon} <span>${tab.label}</span></div>`;
      this.navPills.set(tab.id, pill);
      pill.addEventListener("click", () => this.switchTab(tab.id));
    });

    this.switchTab("general");
  }

  private switchTab(tabId: string) {
    this.navPills.forEach((pill, id) => pill.classList.toggle("active", id === tabId));
    this.contentPane.empty();

    switch (tabId) {
      case "general": this.renderGeneralTab(); break;
      case "appearance": this.renderAppearanceTab(); break;
      case "embeds": this.renderEmbedsTab(); break;
      case "scholar": this.renderScholarTab(); break;
      case "community": this.renderCommunityTab(); break;
    }
  }

  // ── Tab Renderers ──────────────────────────────────────────────────────────

  private renderGeneralTab() {
    // Translation Card
    const trCard = UIFactory.createCard(this.contentPane, "Translation Settings", getIcon("hand-holding-bible-version", 36));
    const verOptions: Record<string, string> = {};
    Object.keys(VERSION_CODES).forEach(v => verOptions[v] = v);
    UIFactory.buildDropdown(trCard, "Primary Translation", "Default version shown in tooltips and reading panel.", verOptions, this.plugin.settings.primaryTranslation, async (val) => { this.plugin.settings.primaryTranslation = val; await this.plugin.saveSettings(); });
    UIFactory.buildToggle(trCard, "Offline Fallback", "Show local KJV text if the API is unreachable.", this.plugin.settings.offlineFallback, async (val) => { this.plugin.settings.offlineFallback = val; await this.plugin.saveSettings(); });
    UIFactory.buildText(trCard, "Favorite Translations", "Comma-separated versions in the version dropdown (e.g. KJV,ESV,NIV).", this.plugin.settings.favoriteTranslations.join(","), async (val) => { this.plugin.settings.favoriteTranslations = val.split(",").map(s => s.trim()).filter(Boolean); await this.plugin.saveSettings(); });

    // Vault Scan Card
    const vsCard = UIFactory.createCard(this.contentPane, "Vault Scan Engine", getIcon("Search-vault", 36));
    UIFactory.buildToggle(vsCard, "Use Global Exclusions", "Skip standard excluded folders when scanning notes.", this.plugin.settings.vaultScan.useGlobalExclusions, async (val) => { this.plugin.settings.vaultScan.useGlobalExclusions = val; await this.plugin.saveSettings(); });
    UIFactory.buildTextArea(vsCard, "Additional Scan Exclusions", "Extra folders to skip only during vault note scan (one path per line).", this.plugin.settings.vaultScan.additionalExclusions.join("\n"), 3, async (val) => { this.plugin.settings.vaultScan.additionalExclusions = val.split("\n").map(s => s.trim()).filter(Boolean); await this.plugin.saveSettings(); });
    UIFactory.buildButton(vsCard, "Force Re-scan", "Force a fresh scan of all notes immediately.", "Scan Vault Now", () => this.plugin.startVaultScan(), true);

    // Tools & Cache Card
    const cacheCard = UIFactory.createCard(this.contentPane, "Cache & Tools", getIcon("shepards-hook", 36));
    UIFactory.buildTextArea(cacheCard, "Excluded Folders", "ScriptureScribe will not activate in these folders.", this.plugin.settings.excludedFolders.join("\n"), 3, async (val) => { this.plugin.settings.excludedFolders = val.split("\n").map(s => s.trim()).filter(Boolean); await this.plugin.saveSettings(); });
    UIFactory.buildButton(cacheCard, "Clear Verse Cache", "Force all scripture data to be re-fetched.", "Clear Cache", () => new Notice("ScriptureScribe: Reload Obsidian to fully clear the cache."));
  }

  private renderCardModeCard() {
    const plugin = this.plugin;
    const pluginDir = plugin.manifest.dir!;
    const adapter = plugin.app.vault.adapter;
    const card = UIFactory.createCard(this.contentPane, "Verse Card Mode (for video)", getIcon("open-scroll", 36));

    UIFactory.buildToggle(
      card,
      "🎬 Full-screen verse cards",
      "Hovering a reference fades in a full-screen card instead of the tooltip, and fades out when you move away. Also available as a command: “Toggle Card Mode” (assign it a hotkey).",
      plugin.settings.display.cardMode === true,
      async (val) => { await plugin.tooltip.setCardMode(val); },
    );

    UIFactory.buildDropdown(
      card,
      "Card Trigger",
      "When Card Mode is on: show cards for every hover, or only while you hold a key (otherwise you get the normal tooltip). Pressing the key while already hovering also works.",
      { always: "Always", shift: "Hold Shift", ctrl: "Hold Ctrl" },
      plugin.settings.display.cardTrigger ?? "always",
      async (val) => { plugin.settings.display.cardTrigger = val as any; await plugin.saveSettings(); },
    );

    UIFactory.buildToggle(
      card,
      "Hide mouse pointer on card",
      "Hides the pointer while a card is showing, so it never appears in your recording. It returns the moment you move off the verse.",
      plugin.settings.display.cardHideCursor !== false,
      async (val) => { plugin.settings.display.cardHideCursor = val; await plugin.saveSettings(); },
    );

    // Skins are read from disk, so the picker fills in once the folder is listed.
    listSkins(adapter, pluginDir).then((files) => {
      const options: Record<string, string> = { "": BUILTIN_SKIN_LABEL };
      for (const f of files) options[f] = f.replace(/\.html?$/i, "");
      const current = plugin.settings.display.cardSkin;
      if (current && !options[current]) options[current] = `${current} (missing — using built-in)`;

      UIFactory.buildDropdown(card, "Card Skin", "The look of the card. Each skin is a complete HTML page in the plugin's skins folder.", options, current, async (val) => {
        plugin.settings.display.cardSkin = val;
        await plugin.saveSettings();
        plugin.tooltip.card?.reloadSkin();
        plugin.tooltip.card?.warm();
      });

      UIFactory.buildButton(card, "Preview", "Show the current skin for a few seconds.", "Preview Card", () => {
        const c = plugin.tooltip.card;
        if (!c) return;
        c.reloadSkin();
        c.show({
          key: "preview",
          reference: "John 3:16",
          text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
          version: "KJV", book: "John", testament: "nt",
          palette: { base: "#7c5cff", light: "#e4dcff", mid: "#a995ff", dark: "#3a2a99" },
        });
        setTimeout(() => c.hide(), 4500);
      }, true);

      UIFactory.buildButton(card, "Make your own skin", "Copy the design guide, paste it to any AI with a description of the look you want, then save the HTML it gives you into the skins folder.", "Copy AI Guide", () => copyToast(SKIN_GUIDE_TEXT, "Skin guide"));

      UIFactory.buildButton(card, "Skins folder", skinsFolderPath(pluginDir), "Open Folder", () => {
        try { (plugin.app as any).showInFolder(`${skinsFolderPath(pluginDir)}/SKIN-GUIDE.md`); }
        catch { new Notice(`Skins folder: ${skinsFolderPath(pluginDir)}`, 6000); }
      });
    });
  }

  private renderAppearanceTab() {
    // Reading Panel Settings
    const rpCard = UIFactory.createCard(this.contentPane, "Panel & Hover Behavior", getIcon("verticle-page", 36));
    // ── Book Color Themes toggle ─────────────────────────────────────────────
    UIFactory.buildToggle(
      rpCard,
      "📖 Colorful Book Themes",
      "Each book of the Bible colors the UI with its genre accent color. Disable for uniform purple.",
      this.plugin.settings.display.useBookColors ?? true,
      async (val) => {
        this.plugin.settings.display.useBookColors = val;
        await this.plugin.saveSettings();
        // Propagate to open views immediately
        const { workspace } = this.plugin.app;
        // Update reading panel
        workspace.getLeavesOfType("scripture-scribe-panel").forEach(leaf => {
          const view = leaf.view as any;
          if (view?.refreshPalette) view.refreshPalette();
        });
        // Update tooltip
        if ((this.plugin as any).tooltip?.refreshPalette) {
          (this.plugin as any).tooltip.refreshPalette();
        }
        // Update bible mode view (inside reading panel)
        workspace.getLeavesOfType("scripture-scribe-panel").forEach(leaf => {
          const view = leaf.view as any;
          if (view?.bibleModeView?.refreshPalette) view.bibleModeView.refreshPalette();
        });
      }
    );

    UIFactory.buildDropdown(rpCard, "Click Behavior", "What appears when you interact with a highlighted scripture.", { tooltip: "Tooltip Only", panel: "Panel Only", both: "Both Tooltip & Panel" }, this.plugin.settings.display.referenceClickBehavior, async (val) => { this.plugin.settings.display.referenceClickBehavior = val as any; await this.plugin.saveSettings(); });
    UIFactory.buildDropdown(rpCard, "Tooltip Style", "Auto detects touch devices.", { auto: "Auto", hover: "Hover Tooltip", "bottom-sheet": "Bottom Sheet" }, this.plugin.settings.display.tooltipStyle, async (val) => { this.plugin.settings.display.tooltipStyle = val as any; await this.plugin.saveSettings(); });
    UIFactory.buildSlider(rpCard, "Hover Delay", "Milliseconds before tooltip appears.", 100, 1000, this.plugin.settings.hoverSettings.triggerDelayMs, (val) => { }, async (val) => { this.plugin.settings.hoverSettings.triggerDelayMs = val; await this.plugin.saveSettings(); });
    UIFactory.buildButton(rpCard, "Open Reader", "Launch the persistent reading sidebar.", "Open Reading Panel", () => (this.plugin as any).activatePanel?.(), true);

    this.renderCardModeCard();

    // Word Cards Restructured
    const wcCard = UIFactory.createCard(this.contentPane, "Interlinear Word Cards", getIcon("Search-word", 36));
    const grid = wcCard.createEl("div", { attr: { style: "display: grid; grid-template-columns: auto 1fr; gap: 24px; align-items: center; padding-top: 8px;" } });

    // Left: Toggles
    const toggleCol = grid.createEl("div", { attr: { style: "display: flex; flex-direction: column; gap: 16px;" } });
    const getCardPrefs = () => ({ eng: this.plugin.settings.display.cardShowEnglish !== false, translit: this.plugin.settings.display.cardShowTranslit !== false, strongs: this.plugin.settings.display.cardShowStrongs !== false });

    const makeCheck = (label: string, checked: boolean, onChange: (v: boolean) => void, disabled = false) => {
      const row = toggleCol.createEl("label", { attr: { style: `display: flex; align-items: center; gap: 8px; cursor: ${disabled ? 'not-allowed' : 'pointer'}; font-size: 13px; color: var(--text-normal); opacity: ${disabled ? '0.5' : '1'};` } });
      const cb = row.createEl("input"); cb.type = "checkbox"; cb.checked = checked; cb.disabled = disabled;
      row.appendText(label);
      cb.addEventListener("change", () => onChange(cb.checked));
    };

    const previewCol = grid.createEl("div");

    makeCheck("Original Language", true, () => { }, true);
    makeCheck("English Gloss", getCardPrefs().eng, async (v) => { this.plugin.settings.display.cardShowEnglish = v; await this.plugin.saveSettings(); buildWordCardPreview(previewCol, getCardPrefs().eng, getCardPrefs().translit, getCardPrefs().strongs); });
    makeCheck("Transliteration", getCardPrefs().translit, async (v) => { this.plugin.settings.display.cardShowTranslit = v; await this.plugin.saveSettings(); buildWordCardPreview(previewCol, getCardPrefs().eng, getCardPrefs().translit, getCardPrefs().strongs); });
    makeCheck("Strong's Number", getCardPrefs().strongs, async (v) => { this.plugin.settings.display.cardShowStrongs = v; await this.plugin.saveSettings(); buildWordCardPreview(previewCol, getCardPrefs().eng, getCardPrefs().translit, getCardPrefs().strongs); });

    buildWordCardPreview(previewCol, getCardPrefs().eng, getCardPrefs().translit, getCardPrefs().strongs);

    // Unified Typography & Highlights Card
    const uniCard = UIFactory.createCard(this.contentPane, "Typography & Highlights", getIcon("Lamp-burning-suppoert", 36));

    // Unified Preview Box
    const uniPreview = uniCard.createEl("div", { attr: { style: "padding: 16px 20px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 8px; line-height: 1.8; margin-bottom: 24px; transition: font-size 0.1s;" } });
    uniPreview.innerHTML = `In the beginning God created the heaven and the earth. <span id="ss-uni-hl" style="border-radius:4px; padding:0 4px; transition: background 0.1s, color 0.1s;">And the earth was without form, and void;</span> and darkness was upon the face of the deep.`;
    const hlSpan = uniPreview.querySelector("#ss-uni-hl") as HTMLElement;

    const hexToRgba = (hex: string, a: number) => {
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${a})`;
    };

    const updateUniPreview = (size: number, key: string, op: number, col: string) => {
      // Typography
      uniPreview.style.fontSize = `${size}px`;
      loadGFont(key);
      const font = FONT_FLAT_LIST.find(f => f.key === key);
      uniPreview.style.fontFamily = font ? font.css : "inherit";

      // Two-Tone Gradient Highlight
      const opacity = op / 100;
      hlSpan.style.background = `linear-gradient(to right, ${hexToRgba("#8CD2FE", opacity)} 0%, ${hexToRgba("#F392C1", opacity)} 100%)`;

      // Auto vs Inverted text color logic
      if (col === "inverted") {
        hlSpan.classList.add("ss-text-inverted");
        hlSpan.classList.remove("ss-text-auto");
      } else {
        hlSpan.classList.add("ss-text-auto");
        hlSpan.classList.remove("ss-text-inverted");
      }
    };

    // Initialize Preview
    updateUniPreview(
      this.plugin.settings.bibleText.fontSize,
      this.plugin.settings.bibleText.fontFamily,
      this.plugin.settings.vaultHighlight.opacity,
      this.plugin.settings.vaultHighlight.textColor
    );

    // Settings Controls Stacked Below Preview
    UIFactory.buildSlider(uniCard, "Highlight Opacity", "Intensity of the gradient glow on referenced verses.", 0, 100, this.plugin.settings.vaultHighlight.opacity,
      (val) => updateUniPreview(this.plugin.settings.bibleText.fontSize, this.plugin.settings.bibleText.fontFamily, val, this.plugin.settings.vaultHighlight.textColor),
      async (val) => { this.plugin.settings.vaultHighlight.opacity = val; await this.plugin.saveSettings(); }
    );

    // Auto / Inverted Dropdown
    UIFactory.buildDropdown(uniCard, "Highlight Text Color", "Inverted ensures contrast flips automatically with your theme.", { auto: "Auto", inverted: "Inverted" }, this.plugin.settings.vaultHighlight.textColor === "auto" ? "auto" : "inverted",
      async (val) => {
        this.plugin.settings.vaultHighlight.textColor = val as any;
        updateUniPreview(this.plugin.settings.bibleText.fontSize, this.plugin.settings.bibleText.fontFamily, this.plugin.settings.vaultHighlight.opacity, val);
        await this.plugin.saveSettings();
      }
    );

    // Live Scrub Slider
    UIFactory.buildSlider(uniCard, "Bible Text Size", "Base font size for the reader.", 11, 26, this.plugin.settings.bibleText.fontSize,
      (val) => updateUniPreview(val, this.plugin.settings.bibleText.fontFamily, this.plugin.settings.vaultHighlight.opacity, this.plugin.settings.vaultHighlight.textColor),
      async (val) => { this.plugin.settings.bibleText.fontSize = val; await this.plugin.saveSettings(); }
    );

    // Flat Font Grid
    uniCard.createEl("div", { cls: "ss-setting-name", text: "Bible Font", attr: { style: "margin: 20px 0 10px;" } });
    const fontGrid = uniCard.createEl("div", { attr: { style: "display: flex; flex-wrap: wrap; gap: 8px;" } });

    FONT_FLAT_LIST.forEach(font => {
      loadGFont(font.key); // ensure font is loaded to display properly on the button
      const btn = fontGrid.createEl("button", { text: font.display });
      const isActive = this.plugin.settings.bibleText.fontFamily === font.key;
      btn.classList.add("ss-font-btn");
      btn.style.border = `1px solid ${isActive ? P : 'var(--background-modifier-border)'}`;
      btn.style.background = isActive ? PL : 'var(--background-secondary)';
      btn.style.color = isActive ? P : 'var(--text-normal)';
      btn.style.fontFamily = font.css;
      btn.addEventListener("click", async () => {
        fontGrid.querySelectorAll("button").forEach(b => { b.style.borderColor = "var(--background-modifier-border)"; b.style.background = "var(--background-secondary)"; b.style.color = "var(--text-normal)"; });
        btn.style.borderColor = P; btn.style.background = PL; btn.style.color = P;
        this.plugin.settings.bibleText.fontFamily = font.key;
        updateUniPreview(this.plugin.settings.bibleText.fontSize, font.key, this.plugin.settings.vaultHighlight.opacity, this.plugin.settings.vaultHighlight.textColor);
        await this.plugin.saveSettings();
      });
    });
  }

  private renderScholarTab() {
    const P = "#8CD2FE"; // local color ref

    // ── Verse of the Day ─────────────────────────────────────────────────────
    const votdCard = UIFactory.createCard(this.contentPane, "Verse of the Day", getIcon("open-scroll", 36));
    UIFactory.buildToggle(votdCard, "Enable VOTD", "Show a daily curated verse when the reading panel is empty.", 
      this.plugin.settings.verseOfTheDay.enabled, async (v) => { this.plugin.settings.verseOfTheDay.enabled = v; await this.plugin.saveSettings(); });
    UIFactory.buildDropdown(votdCard, "Algorithm", "Deterministic = same for everyone. Random = your own path.", 
      { deterministic: "Deterministic", random: "Random" }, this.plugin.settings.verseOfTheDay.algorithm, 
      async (v) => { this.plugin.settings.verseOfTheDay.algorithm = v as any; await this.plugin.saveSettings(); });
    UIFactory.buildToggle(votdCard, "Show on Startup", "Automatically show today's verse when Obsidian opens.", 
      this.plugin.settings.verseOfTheDay.showOnStartup, async (v) => { this.plugin.settings.verseOfTheDay.showOnStartup = v; await this.plugin.saveSettings(); });

    // ── Citation Settings ────────────────────────────────────────────────────
    const citeCard = UIFactory.createCard(this.contentPane, "Citations & Export", getIcon("embed-text-white-qwill", 36));
    UIFactory.buildDropdown(citeCard, "Default Citation Format", "The style used when clicking 'Copy as Citation'.", 
      { apa: "APA (7th Ed.)", chicago: "Chicago (17th)", turabian: "Turabian", mla: "MLA (9th)", plain: "Plain / Everyday" }, 
      this.plugin.settings.citation.format, async (v) => { this.plugin.settings.citation.format = v as any; await this.plugin.saveSettings(); });
    UIFactory.buildToggle(citeCard, "Include Version Badge", "Append the translation code (e.g. KJV) to the citation.", 
      this.plugin.settings.citation.includeVersion, async (v) => { this.plugin.settings.citation.includeVersion = v; await this.plugin.saveSettings(); });

    // ── Morphology & Scholar Mode ─────────────────────────────────────────────
    const morphCard = UIFactory.createCard(this.contentPane, "Scholar Mode (Alpha)", getIcon("interliniar", 36));
    UIFactory.buildToggle(morphCard, "Enable Morphology", "Show grammatical parsing for Greek and Hebrew words.", 
      this.plugin.settings.morphology.enabled, async (v) => { this.plugin.settings.morphology.enabled = v; await this.plugin.saveSettings(); });
    UIFactory.buildDropdown(morphCard, "UI Presentation", "Simple = readable labels; Advanced = raw codes + search chips.", 
      { simple: "Simple (Plain English)", advanced: "Advanced (Technical)" }, 
      this.plugin.settings.morphology.uiMode, async (v) => { this.plugin.settings.morphology.uiMode = v as any; await this.plugin.saveSettings(); });
    UIFactory.buildToggle(morphCard, "Exegetical Teaching Notes", "Surface '💡' notes explaining the theological significance of grammar.", 
      this.plugin.settings.morphology.showTeachingNotes, async (v) => { this.plugin.settings.morphology.showTeachingNotes = v; await this.plugin.saveSettings(); });
  }

  private renderEmbedsTab() {
    const emCard = UIFactory.createCard(this.contentPane, "Embedding Styles", getIcon("embed-settings-tablets", 36));
    UIFactory.buildDropdown(emCard, "Default Embed Style", "How references format when injected.", { link: "🔗 URL Link", tooltip: "📎 MD Footnote", quote: "❝ Quote Block" }, this.plugin.settings.embedding.defaultStyle, async (val) => { this.plugin.settings.embedding.defaultStyle = val as any; await this.plugin.saveSettings(); });
    UIFactory.buildToggle(emCard, "Include Version Badge", "Append the translation abbreviation.", this.plugin.settings.embedding.includeVersionBadge, async (val) => { this.plugin.settings.embedding.includeVersionBadge = val; await this.plugin.saveSettings(); });

    const xrCard = UIFactory.createCard(this.contentPane, "Cross-References", getIcon("interliniar", 36));
    UIFactory.buildDropdown(xrCard, "Collapsed Count", "How many cross-references to show before 'show all'.", { "3": "3", "5": "5" }, String(this.plugin.settings.crossRefs.showLessCount), async (val) => { this.plugin.settings.crossRefs.showLessCount = Number(val) as any; await this.plugin.saveSettings(); });
  }

  private renderCommunityTab() {
    const socCard = UIFactory.createCard(this.contentPane, "Community Connect", getIcon("Harp-Media", 36));
    socCard.createEl("p", { text: "Find tutorials, share feedback, and connect with other users. All handles @joyraptor.", cls: "ss-setting-desc", attr: { style: "margin-bottom: 16px;" } });
    const socRow = socCard.createEl("div", { attr: { style: "display: flex; flex-wrap: wrap; gap: 8px;" } });
    UIFactory.buildBrandPill(socRow, "Discord", "#5865F2", BRAND_ICONS.discord, () => window.open("https://discord.com/users/joyraptor"));
    UIFactory.buildBrandPill(socRow, "Twitter / X", "#000000", BRAND_ICONS.twitter, () => window.open("https://x.com/joyraptor"));
    UIFactory.buildBrandPill(socRow, "YouTube", "#FF0000", BRAND_ICONS.youtube, () => window.open("https://youtube.com/@joyraptor"));

    const donCard = UIFactory.createCard(this.contentPane, "Support the Project", getIcon("olive-branch-give", 36));
    donCard.createEl("p", { text: "ScriptureScribe is free. If it enriches your study, consider supporting development. Click to copy address.", cls: "ss-setting-desc", attr: { style: "margin-bottom: 16px;" } });

    donCard.createEl("div", { text: "DIRECT PAYMENTS", attr: { style: "font-size:10px; font-weight:700; color:var(--text-muted); margin-bottom:8px;" } });
    const payRow = donCard.createEl("div", { attr: { style: "display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px;" } });
    UIFactory.buildBrandPill(payRow, "PayPal", "#003087", BRAND_ICONS.paypal, () => window.open("https://paypal.me/joyraptor"));
    UIFactory.buildBrandPill(payRow, "Venmo", "#3D95CE", BRAND_ICONS.venmo, () => copyToast("@scott-vigil", "Venmo handle"));
    UIFactory.buildBrandPill(payRow, "Zelle", "#6D1ED4", BRAND_ICONS.zelle, () => copyToast("@scott-vigil", "Zelle handle"));

    donCard.createEl("div", { text: "CRYPTOCURRENCY", attr: { style: "font-size:10px; font-weight:700; color:var(--text-muted); margin-bottom:8px;" } });
    const cryRow = donCard.createEl("div", { attr: { style: "display: flex; flex-wrap: wrap; gap: 8px;" } });
    UIFactory.buildBrandPill(cryRow, "Bitcoin", "#F7931A", BRAND_ICONS.bitcoin, () => copyToast("bc1qqrexm09npkns55l7k5z88hwm2en98nsv5ct9je", "Bitcoin address"));
    UIFactory.buildBrandPill(cryRow, "Ethereum", "#627EEA", BRAND_ICONS.ethereum, () => copyToast("0xf3Af7973bc6ce0179A1fC2D7e7805D260225cBD6", "Ethereum address"));
    UIFactory.buildBrandPill(cryRow, "Litecoin", "#BFBBBB", BRAND_ICONS.litecoin, () => copyToast("LW9uQNm3DPXdbT4dXCiw9YE5HFU5nn8BFU", "Litecoin address"));
    UIFactory.buildBrandPill(cryRow, "Dogecoin", "#f7d345ff", BRAND_ICONS.dogecoin, () => copyToast("DDJYAXCzoyd35xMYuYRHKEg5jeMwVJKthQ", "Dogecoin address"));
    UIFactory.buildBrandPill(cryRow, "DERO", "#1717dcff", BRAND_ICONS.dero, () => copyToast("joyraptor", "DERO address"));
  }
}