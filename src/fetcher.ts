import { ScriptureRef, refToString, parseScriptureRefs, expandRef } from "./parser";
import { mapToSwete } from "./versification";
import { ScriptureScribeSettings } from "./settings";
import { setKJVStoreRef } from "./searchIndex";
import { ensureData } from "./dataLoader";
import { ensureVersificationData } from "./versification";
import { setVerseRefs } from "./semanticSearch";

export interface VerseResult {
  reference: string;
  text: string;
  version: string;
  source: "local" | "api" | "cache";
  offline?: boolean;
  /** Markdown emphasis from a checked source; text remains plain for search. */
  formattedText?: string;
}

const CACHE = new Map<string, { result: VerseResult; exp: number }>();
const TTL   = 24 * 60 * 60 * 1000;
let kjvData: Record<string, string> = {};
let sweteData: Record<string, any> = {};
let formattedKJV: Record<string, string> = {};
let enochSupplement: Record<string, string> = {};

export function getFormattedKJV(key: string): string | undefined { return formattedKJV[key]; }

export function setSweteData(data: Record<string, any>): void {
  sweteData = data;
}

export function setKJVData(data: Record<string, string>): void {
  // Normalize variant book names and Roman-numeral prefixes so lookups
  // always match the canonical names used by the parser.
  const BOOK_ALIASES: Record<string, string> = {
    "Revelation of John": "Revelation",
    "Song of Songs":      "Song of Solomon",
    "Psalms":             "Psalms",   // already canonical, no-op
  };
  const ROMAN: Record<string, string> = {
    "III ": "3 ", "II ": "2 ", "I ": "1 ",  // longest first
  };

  const normalized: Record<string, string> = {};
  for (const [key, val] of Object.entries(data)) {
    let k = key;

    // Roman numeral prefix (e.g. "II Peter 1:1" → "2 Peter 1:1")
    for (const [roman, arabic] of Object.entries(ROMAN)) {
      if (k.startsWith(roman)) { k = arabic + k.slice(roman.length); break; }
    }

    // Long book aliases (e.g. "Revelation of John 1:1" → "Revelation 1:1")
    for (const [alias, canonical] of Object.entries(BOOK_ALIASES)) {
      if (k.startsWith(alias + " ")) {
        k = canonical + k.slice(alias.length);
        break;
      }
    }

    // Some KJV builds omit the space between digit and book name:
    //   "1Samuel 1:1" → "1 Samuel 1:1"
    //   "1Kings 1:1"  → "1 Kings 1:1"
    // This regex inserts the missing space so all variants land under the
    // same canonical key that the parser and BOOK_LOOKUP produce.
    k = k.replace(/^([123])([A-Z][a-z])/, "$1 $2");

    normalized[k] = val;
  }
  kjvData = normalized;
  setKJVStoreRef(kjvData);
  setVerseRefs(Object.keys(kjvData));
  CACHE.clear();
}

export function getKJVData(): Record<string, string> { return kjvData; }

export async function ensureKJVData(): Promise<void> {
  await ensureData("kjv.json", setKJVData);
  await ensureData("kjv-formatted.json", data => { formattedKJV = data; });
}

function cacheKey(ref: string, ver: string) { return `${ref}|${ver}`; }

function fromCache(ref: string, ver: string): VerseResult | null {
  const key = cacheKey(ref, ver);
  const e = CACHE.get(key);
  if (!e) return null;
  if (Date.now() > e.exp) {
    CACHE.delete(key);
    return null;
  }
  return { ...e.result, source: "cache" };
}

function toCache(r: VerseResult, requestedVersion = r.version) {
  if (CACHE.size >= 256) CACHE.delete(CACHE.keys().next().value);
  CACHE.set(cacheKey(r.reference, requestedVersion), { result: r, exp: Date.now() + TTL });
}

// ── Book-name resolution ───────────────────────────────────────────────────────
//
// Mirrors bibleMode's resolveBookName exactly:
//   1. Probe verse :1 of the chapter with the canonical name.
//      Using :1 (not the requested verse) matches bibleMode and is reliable even
//      for chapters where verse numbering starts at 1 unconditionally.
//      Strict `!== undefined` avoids falsy-string edge cases.
//   2. If not found, try the KJV_ALIASES map (handles kjv.json builds that use
//      "Revelation of John" / "Song of Songs" instead of canonical names,
//      even when setKJVData's normalization pass didn't catch every variant).
//   3. Fall back to the original name — will produce a miss, not a crash.
//
// This is intentionally a separate, self-contained helper so it can be called
// on every lookup without depending on the normalization state of setKJVData.

const KJV_LOOKUP_ALIASES: Record<string, string> = {
  // Some KJV JSON builds use these long-form or alternate names
  "Revelation":        "Revelation of John",
  "Song of Solomon":   "Song of Songs",
  // Roman-numeral fallbacks for KJV JSON builds where setKJVData
  // normalization may not have caught every variant
  "1 Samuel":          "I Samuel",      "2 Samuel":          "II Samuel",
  "1 Kings":           "I Kings",       "2 Kings":           "II Kings",
  "1 Chronicles":      "I Chronicles",  "2 Chronicles":      "II Chronicles",
  "1 Corinthians":     "I Corinthians", "2 Corinthians":     "II Corinthians",
  "1 Thessalonians":   "I Thessalonians","2 Thessalonians":  "II Thessalonians",
  "1 Timothy":         "I Timothy",     "2 Timothy":         "II Timothy",
  "1 Peter":           "I Peter",       "2 Peter":           "II Peter",
  "1 John":            "I John",        "2 John":            "II John",
  "3 John":            "III John",
};

function resolveBookName(book: string, chapter: number): string {
  if (kjvData[`${book} ${chapter}:1`] !== undefined) return book;
  const alt = KJV_LOOKUP_ALIASES[book];
  if (alt !== undefined && kjvData[`${alt} ${chapter}:1`] !== undefined) return alt;
  // Last resort: try without space e.g. "1Kings" for un-normalised builds
  const glued = book.replace(/^([123]) /, "$1");
  if (glued !== book && kjvData[`${glued} ${chapter}:1`] !== undefined) return glued;
  return book;
}


/** Map canonical book names to Swete JSON's 3-letter keys */
const SWETE_BOOK_MAP: Record<string, string> = {
  // ── Canonical OT ──────────────────────────────────────────────────────────
  "Genesis":"Gen","Exodus":"Exo","Leviticus":"Lev","Numbers":"Num","Deuteronomy":"Deu",
  "Joshua":"Jos","Judges":"Jdg","Ruth":"Rut",
  "1 Samuel":"1Sa","2 Samuel":"2Sa",
  "1 Kings":"1Ki","2 Kings":"2Ki","1 Chronicles":"1Ch","2 Chronicles":"2Ch",
  "Ezra":"Ezr","Nehemiah":"Neh","Esther":"Est","Job":"Job","Psalms":"Psa","Proverbs":"Pro",
  "Ecclesiastes":"Ecc","Song of Solomon":"Sol","Isaiah":"Isa","Jeremiah":"Jer","Lamentations":"Lam",
  "Ezekiel":"Eze","Daniel":"Dan","Hosea":"Hos","Joel":"Joe","Amos":"Amo","Obadiah":"Oba",
  "Jonah":"Jon","Micah":"Mic","Nahum":"Nah","Habakkuk":"Hab","Zephaniah":"Zep",
  "Haggai":"Hag","Zechariah":"Zec","Malachi":"Mal",
  // ── Apocrypha / Deuterocanonical ──────────────────────────────────────────
  "1 Esdras":"1Es",
  "Tobit":"Tob","Tobit (S)":"Tbs",
  "Judith":"Jdt",
  "Wisdom":"Wis",
  "Sirach":"Sir","Sirach Prologue":"Sip",
  "Baruch":"Bar",
  "Epistle of Jeremiah":"Epj",
  "Daniel (Th)":"Dat",
  "Susanna":"Sus","Susanna (Th)":"Sut",
  "Bel and the Dragon":"Bel","Bel (Th)":"Bet",
  "1 Maccabees":"1Ma","2 Maccabees":"2Ma","3 Maccabees":"3Ma","4 Maccabees":"4Ma",
  "Psalms of Solomon":"Pss",
  "1 Enoch":"1En",
  "Odes":"Ode",
};

function lookupSwete(engRef: ScriptureRef): VerseResult {
  const refStr = refToString(engRef);
  const pairs: string[] = [];
  for (const { chapter, verse } of expandRef(engRef)) {
    const ref = mapToSwete({ ...engRef, chapter, verseStart: verse, verseEnd: undefined,
      chapterEnd: undefined, chapterOnly: false, additionalVerses: undefined });
    const sweteBook = SWETE_BOOK_MAP[ref.book];
    const txt = sweteData[sweteBook]?.[ref.chapter]?.[ref.verseStart];
    if (txt) pairs.push(txt);
  }

  if (pairs.length === 0) {
    return { reference: refStr, text: `[${refStr} — verse not in LXX data]`, version: "LXX", source: "local" };
  }
  return { reference: refStr, text: pairs.join(" "), version: "LXX", source: "local" };
}

/** Build verse text for a ref, joining multiple verses for ranges or comma-lists */
function lookupLocal(ref: ScriptureRef, version = "KJV"): VerseResult {
  if (version === "LXX") return lookupSwete(ref);

  const pairs: Array<{ v: number; text: string; formatted: string }> = [];
  let supplementUsed = false;
  for (const { chapter, verse } of expandRef(ref)) {
    const bookName = resolveBookName(ref.book, chapter);
    const key = `${bookName} ${chapter}:${verse}`;
    const text = kjvData[key] ?? enochSupplement[key];
    if (!kjvData[key] && text) supplementUsed = true;
    if (text) pairs.push({ v: chapter * 1000 + verse, text, formatted: formattedKJV[key] ?? text });
  }

  const refStr = refToString(ref);
  if (pairs.length > 0) {
    // Join with a space for adjacent verses, ellipsis for gaps
    let combined = pairs[0].text;
    for (let i = 1; i < pairs.length; i++) {
      const gap = pairs[i].v - pairs[i - 1].v;
      combined += gap === 1 ? " " : " \u2026 ";
      combined += pairs[i].text;
    }
    const numbered = pairs.length > 1;
    const formattedText = pairs.map(p => `${numbered ? `[${Math.floor(p.v / 1000)}:${p.v % 1000}] ` : ""}${p.formatted}`).join(" ");
    return { reference: refStr, text: combined, formattedText,
      version: ref.book === "1 Enoch" ? (supplementUsed ? "1 Enoch · Charles 1917 supplement" : "1 Enoch · vault text") : "KJV", source: "local" };
  }

  // Graceful fallback for Apocrypha/Pseudepigrapha (like 1 Enoch) that lack English text
  const lxxFallback = lookupSwete(ref);
  if (!lxxFallback.text.includes("not found") && !lxxFallback.text.includes("not in LXX data")) {
    return {
      reference: refStr,
      text: `[English translation unavailable offline. Displaying Greek LXX:] ${lxxFallback.text}`,
      version: "LXX",
      source: "local",
    };
  }

  return {
    reference: refStr,
    text: `[${refStr} — not in offline data. Connect to internet for full access.]`,
    version: "KJV",
    source: "local",
  };
}

async function fetchAPI(ref: ScriptureRef, version: string, timeoutMs: number): Promise<VerseResult | null> {
  const vMap: Record<string, string> = {
    KJV:"kjv", ESV:"web", NIV:"web", NASB:"web",
    NKJV:"kjv", NLT:"web", CSB:"web", AMP:"web", MSG:"web", NRSV:"web",
  };
  const apiVer = vMap[version] ?? "kjv";

  // Build query — handle ranges e.g. "Luke 21:35-36"
  // For comma-lists, fetch the first verse then append extras separately
  const query = refToString(ref);

  const fetchOne = async (q: string): Promise<string | null> => {
    const url = `https://bible-api.com/${encodeURIComponent(q)}?translation=${apiVer}`;
    try {
      const ctrl = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
      timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const res   = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.text) return null;
      if (Array.isArray(data.verses) && data.verses.length > 1) {
        return data.verses.map((v: any) => v.text.trim()).join(" ");
      }
      return data.text.trim().replace(/\n/g, " ");
      } finally { if (timer) clearTimeout(timer); }
    } catch { return null; }
  };

  try {
    const parts: string[] = [];
    const primary = await fetchOne(query);
    if (!primary) return null;
    parts.push(primary);

    const displayVer = (version !== "KJV" && version !== "WEB" && apiVer === "web") ? `${version} (WEB text)` : (version === "NKJV" ? "NKJV (KJV text)" : version);
    return { reference: refToString(ref), text: parts.join(" "), version: displayVer, source: "api" };
  } catch { return null; }
}

export async function getScripture(ref: ScriptureRef, settings: ScriptureScribeSettings): Promise<VerseResult> {
  await ensureKJVData();
  if (ref.book === "1 Enoch") await ensureData("enoch-charles.json", data => { enochSupplement = data; });
  if (settings.primaryTranslation === "LXX" || !kjvData[`${ref.book} ${ref.chapter}:${ref.verseStart}`] && ref.book !== "1 Enoch") {
    await ensureVersificationData();
    await ensureData("swete-lxx.json", setSweteData);
  }
  const ver    = settings.primaryTranslation;
  const refStr = refToString(ref);

  const cached = fromCache(refStr, ver);
  if (cached) return cached;

  if (ver === "KJV" || ver === "LXX") {
    const r = lookupLocal(ref, ver);
    // Only cache successful hits — never cache a miss.
    if (!r.text.startsWith("[")) toCache(r, ver);
    return r;
  }

  const api = await fetchAPI(ref, ver, 3000);
  if (api) { toCache(api, ver); return api; }

  if (!settings.offlineFallback) return {reference: refStr, text: `[${ver} unavailable; offline fallback is disabled.]`, version: ver, source: "api", offline: true};
  // Fallback to local KJV
  const fallback = lookupLocal(ref);
  return { ...fallback, offline: true };
}
