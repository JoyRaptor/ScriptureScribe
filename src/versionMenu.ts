import { TRANSLATIONS, EXTERNAL_TRANSLATIONS, VERSION_CODES } from "./settings";
import { ScriptureRef, refToUrlParam } from "./parser";

/**
 * The translation menu shared by the tooltip and the reading panel. Only translations that really
 * load can be chosen; copyrighted ones (ESV, NIV, TLV…) are links that open the passage on
 * BibleGateway in the browser, since no free source may serve their text.
 */
export function fillVersionMenu(
  dd: HTMLElement,
  current: string,
  onPick: (id: string) => void,
  currentRef: () => ScriptureRef | null,
): void {
  dd.innerHTML = "";
  dd.style.maxHeight = "60vh";
  dd.style.overflowY = "auto";
  dd.style.minWidth = "210px";

  const heading = (text: string) => {
    const h = dd.createDiv({ text });
    h.style.cssText = "padding:7px 12px 3px; font-size:9px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--text-faint);";
  };
  const item = (id: string, sub: string, selected: boolean, onClick: () => void, title = "") => {
    const row = dd.createDiv();
    row.style.cssText = `display:flex; align-items:baseline; gap:8px; padding:6px 12px; cursor:pointer; font-size:12px;
      color:var(--text-normal); ${selected ? "font-weight:700; background:var(--background-modifier-hover);" : ""}`;
    row.createSpan({ text: id }).style.cssText = "min-width:44px;";
    row.createSpan({ text: sub }).style.cssText = "font-size:10.5px; color:var(--text-muted); white-space:nowrap;";
    if (title) row.title = title;
    row.addEventListener("mouseenter", () => { if (!selected) row.style.background = "var(--background-modifier-hover)"; });
    row.addEventListener("mouseleave", () => { if (!selected) row.style.background = ""; });
    row.addEventListener("click", e => { e.stopPropagation(); onClick(); });
  };

  heading("Built in · offline");
  for (const t of TRANSLATIONS.filter(t => !t.api)) {
    item(t.id, t.note ? `${t.name} · ${t.note}` : t.name, t.id === current, () => onPick(t.id));
  }
  heading("Online · public domain");
  for (const t of TRANSLATIONS.filter(t => t.api)) {
    item(t.id, t.note ? `${t.name} · ${t.note}` : t.name, t.id === current, () => onPick(t.id),
      "Loaded from bible-api.com. Needs internet; if it can't load, the KJV is shown and labelled as KJV.");
  }
  heading("Open on BibleGateway ↗");
  for (const id of EXTERNAL_TRANSLATIONS) {
    item(id, "copyrighted · opens in browser", false, () => {
      const ref = currentRef();
      const search = ref ? refToUrlParam(ref) : "John+3%3A16";
      window.open(`https://www.biblegateway.com/passage/?search=${search}&version=${VERSION_CODES[id] ?? id}`, "_blank", "noopener");
      dd.style.display = "none";
    }, `${id} is copyrighted, so ScriptureScribe can't display it. Opens this passage on biblegateway.com.`);
  }
}
