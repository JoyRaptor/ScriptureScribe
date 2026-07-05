import { ScriptureRef, refToString, parseScriptureRefs } from "./parser";
import { mapToSwete } from "./versification";
import { ScriptureScribeSettings } from "./settings";
import { setKJVStoreRef } from "./searchIndex";

export interface VerseResult {
  reference: string;
  text: string;
  version: string;
  source: "local" | "api" | "cache";
  offline?: boolean;
}

const CACHE = new Map<string, { result: VerseResult; exp: number }>();
const TTL   = 24 * 60 * 60 * 1000;
let kjvData: Record<string, string> = {};
let sweteData: Record<string, any> = {};

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
}

export function getKJVData(): Record<string, string> { return kjvData; }

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

function toCache(r: VerseResult) {
  CACHE.set(cacheKey(r.reference, r.version), { result: r, exp: Date.now() + TTL });
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

/**
 * Map English (MT/Hebrew) Psalm chapter to its LXX chapter number.
 *
 * MT Psalms 1–8   → LXX 1–8   (same)
 * MT Psalm 9+10   → LXX 9     (merged; simplify: MT 9→9, MT 10→9)
 * MT Psalms 11–113→ LXX 10–112 (shift −1)
 * MT Psalms 114–115→ LXX 113  (merged; simplify: both→113)
 * MT Psalm 116    → LXX 114+115 (split; simplify: →114)
 * MT Psalms 117–146→ LXX 116–145 (shift −1)
 * MT Psalm 147    → LXX 146+147 (split; simplify: →146)
 * MT Psalms 148–150→ LXX 148–150 (same)
 */
function mapPsalmMTtoLXX(chapter: number): number {
  if (chapter <= 8)          return chapter;
  if (chapter === 9)         return 9;
  if (chapter === 10)        return 9;   // merged into LXX 9
  if (chapter <= 113)        return chapter - 1;
  if (chapter <= 115)        return 113; // MT 114–115 merged into LXX 113
  if (chapter === 116)       return 114;
  if (chapter <= 146)        return chapter - 1;
  if (chapter === 147)       return 146;
  return chapter; // 148–150 same
}

function lookupSwete(engRef: ScriptureRef): VerseResult {
  let ref = mapToSwete(engRef);
  const refStr = refToString(engRef);

  // Apply Psalm MT→LXX chapter offset (versification.ts handles complex cases;
  // this handles the universal Psalm numbering shift which the mapping JSON can't
  // express via simple individual-verse keys).
  if (ref.book === "Psalms") {
    const lxxChapter = mapPsalmMTtoLXX(ref.chapter);
    if (lxxChapter !== ref.chapter) {
      ref = { ...ref, chapter: lxxChapter };
    }
  }

  const sweteBook = SWETE_BOOK_MAP[ref.book];
  if (!sweteBook || !sweteData[sweteBook]) {
     return { reference: refStr, text: `[${refStr} — not found in LXX data]`, version: "LXX", source: "local" };
  }

  const pairs: string[] = [];
  const end = ref.verseEnd ?? ref.verseStart;
  for (let v = ref.verseStart; v <= end; v++) {
    const txt = sweteData[sweteBook]?.[ref.chapter]?.[v];
    if (txt) pairs.push(txt);
  }
  
  for (const v of ref.additionalVerses ?? []) {
    const txt = sweteData[sweteBook]?.[ref.chapter]?.[v];
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

  // Collect [verseNumber, text] pairs so we can detect gaps
  const pairs: Array<{ v: number; text: string }> = [];

  // Resolve which key prefix actually has data in the loaded kjv.json.
  // This handles both normalized and un-normalized kjv.json builds.
  const bookName = resolveBookName(ref.book, ref.chapter);

  // Range: verseStart–verseEnd
  const end = ref.verseEnd ?? ref.verseStart;
  for (let v = ref.verseStart; v <= end; v++) {
    const text = kjvData[`${bookName} ${ref.chapter}:${v}`];
    if (text) pairs.push({ v, text });
  }

  // Comma-list: additionalVerses
  for (const v of ref.additionalVerses ?? []) {
    const text = kjvData[`${bookName} ${ref.chapter}:${v}`];
    if (text) pairs.push({ v, text });
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
    return { reference: refStr, text: combined, version: "KJV", source: "local" };
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
  let query = `${ref.book} ${ref.chapter}:${ref.verseStart}`;
  if (ref.verseEnd && ref.verseEnd !== ref.verseStart) {
    query += `-${ref.verseEnd}`;
  }

  const fetchOne = async (q: string): Promise<string | null> => {
    const url = `https://bible-api.com/${encodeURIComponent(q)}?translation=${apiVer}`;
    try {
      const ctrl  = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const res   = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.text) return null;
      if (Array.isArray(data.verses) && data.verses.length > 1) {
        return data.verses.map((v: any) => v.text.trim()).join(" ");
      }
      return data.text.trim().replace(/\n/g, " ");
    } catch { return null; }
  };

  try {
    const parts: string[] = [];
    const primary = await fetchOne(query);
    if (!primary) return null;
    parts.push(primary);

    // Fetch additional comma-list verses
    if (ref.additionalVerses && ref.additionalVerses.length > 0) {
      const extras = await Promise.all(
        ref.additionalVerses.map(v => fetchOne(`${ref.book} ${ref.chapter}:${v}`))
      );
      for (const extra of extras) {
        if (extra) parts.push(extra);
      }
    }

    const displayVer = (version !== "KJV" && version !== "WEB" && apiVer === "web") ? `${version} (WEB text)` : (version === "NKJV" ? "NKJV (KJV text)" : version);
    return { reference: refToString(ref), text: parts.join(" "), version: displayVer, source: "api" };
  } catch { return null; }
}

export async function getScripture(ref: ScriptureRef, settings: ScriptureScribeSettings): Promise<VerseResult> {
  const ver    = settings.primaryTranslation;
  const refStr = refToString(ref);

  const cached = fromCache(refStr, ver);
  if (cached) return cached;

  if (ver === "KJV" || ver === "LXX") {
    const r = lookupLocal(ref, ver);
    // Only cache successful hits — never cache a miss.
    if (!r.text.startsWith("[")) toCache(r);
    return r;
  }

  const api = await fetchAPI(ref, ver, 3000);
  if (api) { toCache(api); return api; }

  // Fallback to local KJV
  const fallback = lookupLocal(ref);
  return { ...fallback, offline: true };
}
