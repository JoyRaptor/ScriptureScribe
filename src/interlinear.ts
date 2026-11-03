import { ScriptureRef, refToString, expandRef } from "./parser";
import { InterlinearLanguage } from "./settings";
import { parseMorph, ParsedMorph } from "./morphParser";
import { ensureData } from "./dataLoader";
import { mapToSwete, ensureVersificationData } from "./versification";

// ── Public types ──────────────────────────────────────────────────────────────

export interface InterlinearWord {
  english: string;
  original: string;
  transliteration: string;
  strongsNum: string;        // e.g. "G3779" or "H7225"
  language: "greek" | "hebrew";
  morph?: string;            // e.g. "V-AAI3S"
}

export interface StrongsDefinition {
  number: string;
  original: string;
  transliteration: string;
  phonetic: string;
  definition: string;
  language: "greek" | "hebrew";
}

// ── Compact word type stored in JSON data files ───────────────────────────────
// Single-char keys keep each file ~2 MB instead of ~6 MB.
interface CompactWord { e: string; o: string; t: string; s: string; m?: string; }

// Compact definition type stored in strongs-definitions.json
interface CompactDef  { o: string; t: string; g: string; d: string; }

// ── Data stores — populated by main.ts on startup ─────────────────────────────
let greekData:   Record<string, CompactWord[]> = {};
let hebrewData:  Record<string, CompactWord[]> = {};
let lxxData:     Record<string, CompactWord[]> = {}; // Offline OT Greek (LXX) interlinear
let strongsDefs: Record<string, CompactDef>    = {};
let lxxDefs:     Record<string, CompactDef>    = {}; // STEPBible TBESG (separate from KJV strongs)
let lsjDefs:     Record<string, string>        = {};
let morphCodes:  Record<string, string>        = {};

// ── Lazy per-book loading (for mobile memory optimization) ────────────────────
import { normalizePath, Platform } from "obsidian";
let _pluginDir: string = "";
let _vaultAdapter: any = null;

/** Called by main.ts once during startup to provide file-reading context. */
export function initLazyLoader(pluginDir: string, adapter: any): void {
  _pluginDir = pluginDir;
  _vaultAdapter = adapter;
  lazyBooks.clear();
  lazyLoading.clear();
}

/** A small shared LRU bounds original-language memory on every device. */
const lazyBooks = new Map<string, Record<string, CompactWord[]>>();
const lazyLoading = new Map<string, Promise<Record<string, CompactWord[]> | null>>();
async function getLazyBook(subdir: string, bookName: string): Promise<Record<string, CompactWord[]> | null> {
  const key = `${subdir}:${bookName}`;
  const cached = lazyBooks.get(key);
  if (cached) { lazyBooks.delete(key); lazyBooks.set(key, cached); return cached; }
  const pending = lazyLoading.get(key);
  if (pending) return pending;
  if (!_vaultAdapter || !_pluginDir) return null;
  const path = normalizePath(`${_pluginDir}/${subdir}/${bookName.replace(/[/:*?"<>|]/g, "_")}.json`);
  const task = _vaultAdapter.read(path).then((raw: string) => {
    const data = normalizeKeys(JSON.parse(raw)) as Record<string, CompactWord[]>;
    if (lazyBooks.size >= 3) lazyBooks.delete(lazyBooks.keys().next().value);
    lazyBooks.set(key, data);
    return data;
  }).catch(() => null).finally(() => lazyLoading.delete(key));
  lazyLoading.set(key, task);
  return task;
}

import { normalizeBookName } from "./bibleData";

// ── Roman-numeral key normalizer (shared with fetcher pattern) ────────────────
const ROMAN_PREFIX: Array<[string, string]> = [
  ["III ", "3 "], ["II ", "2 "], ["I ", "1 "],  // longest first to avoid partial match
];
function normalizeKeys<T>(data: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [key, val] of Object.entries(data)) {
    let k = key;

    // 1. Roman numeral prefix (e.g. "II Peter 1:1" → "2 Peter 1:1")
    for (const [roman, arabic] of ROMAN_PREFIX) {
      if (k.startsWith(roman)) { k = arabic + k.slice(roman.length); break; }
    }

    // 2. Book name normalization (e.g. "Est 1:10" → "Esther 1:10")
    // Detect "BookName Ch:V" pattern
    const match = k.match(/^(.+?)\s+(\d+:\d+.*)$/);
    if (match) {
      const normBook = normalizeBookName(match[1]);
      if (normBook) k = `${normBook} ${match[2]}`;
    }

    out[k] = val;
  }
  return out;
}

let hasGreek = false, hasHebrew = false, hasLXX = false;

export function setGreekData(data: Record<string, CompactWord[]>):   void { greekData   = normalizeKeys(data); hasGreek = true; INTERLINEAR_CACHE.clear(); }
export function setHebrewData(data: Record<string, CompactWord[]>):  void { hebrewData  = normalizeKeys(data); hasHebrew = true; INTERLINEAR_CACHE.clear(); }
export function setLXXData(data: Record<string, CompactWord[]>):     void { lxxData     = normalizeKeys(data); hasLXX = true; INTERLINEAR_CACHE.clear(); }
export function setStrongsData(data: Record<string, CompactDef>):    void { strongsDefs = data; }
export function setLXXDefsData(data: Record<string, CompactDef>):    void { lxxDefs     = data; }
export function setLSJData(data: Record<string, string>):            void { lsjDefs     = data; }
export function setMorphData(data: Record<string, string>):          void { morphCodes  = data; }

/** 
 * Returns human-readable morphology expansion (e.g. "Verb, Aorist, Active...")
 * for a code like "V-AAI3S".
 */
export function expandMorphCode(code: string): string {
  const parsed = parseMorph(code);
  return parsed ? parsed.techLine : (morphCodes[code] || code);
}

/** Returns the full parsed morph object for detailed UI rendering */
export function getDetailedMorph(code: string): ParsedMorph | null {
  return parseMorph(code);
}

/** Expose raw stores for the search index builder */
export function getGreekData():  Record<string, CompactWord[]> { return greekData;  }
export function getHebrewData(): Record<string, CompactWord[]> { return hebrewData; }
export function getLXXData():    Record<string, CompactWord[]> { return lxxData;    }

// ── Runtime caches ────────────────────────────────────────────────────────────
const INTERLINEAR_CACHE = new Map<string, InterlinearWord[]>();
const STRONGS_CACHE     = new Map<string, StrongsDefinition>();
const FETCH_TIMEOUT_MS  = 6000;

// ── Active interlinear state — written by tooltip, read by embedEngine ────────
let _activeWords: InterlinearWord[] | null = null;
let _activeRef:   string | null            = null;

/** Called by ScriptureTooltip after it loads words for a verse. */
export function setActiveInterlinear(ref: string, words: InterlinearWord[]): void {
  _activeRef   = ref;
  _activeWords = words;
}

/** Called by ScriptureTooltip when the panel closes or a new verse loads. */
export function clearActiveInterlinear(): void {
  _activeRef   = null;
  _activeWords = null;
}

/**
 * Returns the interlinear word grid currently displayed in the tooltip, plus
 * the ref string it belongs to — or null if the interlinear panel is not open.
 */
export function getActiveInterlinear(): { ref: string; words: InterlinearWord[] } | null {
  if (!_activeRef || !_activeWords) return null;
  return { ref: _activeRef, words: _activeWords };
}

// ── bolls.life book IDs (online fallback only) ────────────────────────────────
const BOLLS_BOOK_ID: Record<string, number> = {
  "Genesis":1,"Exodus":2,"Leviticus":3,"Numbers":4,"Deuteronomy":5,
  "Joshua":6,"Judges":7,"Ruth":8,"1 Samuel":9,"2 Samuel":10,
  "1 Kings":11,"2 Kings":12,"1 Chronicles":13,"2 Chronicles":14,
  "Ezra":15,"Nehemiah":16,"Esther":17,"Job":18,"Psalms":19,"Proverbs":20,
  "Ecclesiastes":21,"Song of Solomon":22,"Isaiah":23,"Jeremiah":24,
  "Lamentations":25,"Ezekiel":26,"Daniel":27,"Hosea":28,"Joel":29,
  "Amos":30,"Obadiah":31,"Jonah":32,"Micah":33,"Nahum":34,"Habakkuk":35,
  "Zephaniah":36,"Haggai":37,"Zechariah":38,"Malachi":39,
  "Matthew":40,"Mark":41,"Luke":42,"John":43,"Acts":44,"Romans":45,
  "1 Corinthians":46,"2 Corinthians":47,"Galatians":48,"Ephesians":49,
  "Philippians":50,"Colossians":51,"1 Thessalonians":52,"2 Thessalonians":53,
  "1 Timothy":54,"2 Timothy":55,"Titus":56,"Philemon":57,"Hebrews":58,
  "James":59,"1 Peter":60,"2 Peter":61,"1 John":62,"2 John":63,
  "3 John":64,"Jude":65,"Revelation":66,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fetchWithTimeout(url: string, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

function compactToWord(w: CompactWord, lang: "greek" | "hebrew"): InterlinearWord {
  return { english: w.e, original: w.o, transliteration: w.t, strongsNum: w.s, morph: w.m, language: lang };
}

// ── fetchInterlinear ──────────────────────────────────────────────────────────

/**
 * Returns interlinear word array for a verse (or range).
 * Priority: offline JSON → bolls.life API → built-in samples
 */
export async function fetchInterlinear(
  ref: ScriptureRef,
  language: InterlinearLanguage,
  version: string = "KJV",
  isFallback: boolean = false
): Promise<InterlinearWord[]> {
  const selected = expandRef(ref);
  if (selected.length > 1) {
    const result: InterlinearWord[] = [];
    for (const {chapter, verse} of selected) {
      result.push(...await fetchInterlinear({...ref, chapter, verseStart: verse,
        verseEnd: undefined, chapterEnd: undefined, chapterOnly: false, additionalVerses: undefined}, language, version, isFallback));
    }
    return result;
  }
  if (version === "LXX") await ensureVersificationData();
  const isLXX = version === "LXX";
  const isOT  = OT_BOOKS.has(ref.book);
  const lang: "greek" | "hebrew" = (isOT && !isLXX) ? "hebrew" : "greek";

  const cacheKey = `${refToString(ref)}|${language}|${version}`;
  if (INTERLINEAR_CACHE.has(cacheKey)) {
    console.debug(`ScriptureScribe interlinear: cache hit for "${cacheKey}"`);
    return INTERLINEAR_CACHE.get(cacheKey)!;
  }

  // ── 1. Offline JSON files ─────────────────────────────────────────────────
  const useLXX = isOT && isLXX;
  const store = useLXX ? lxxData : (lang === "greek" ? greekData : hebrewData);
  const hasData = useLXX ? hasLXX : (lang === "greek" ? hasGreek : hasHebrew);

  let lookupRef = ref;
  if (useLXX) {
    lookupRef = mapToSwete(ref);
    console.debug(`ScriptureScribe: LXX Mapping ${refToString(ref)} -> ${refToString(lookupRef)}`);
  }

  console.debug(`ScriptureScribe interlinear: lang=${lang} isLXX=${isLXX} hasData=${hasData} ref="${refToString(lookupRef)}"`);
  if (hasData) {
    const words = lookupOffline(lookupRef, store, lang);
    if (words.length > 0 && words[0].original !== "—") {
      if (INTERLINEAR_CACHE.size >= 128) INTERLINEAR_CACHE.delete(INTERLINEAR_CACHE.keys().next().value);
      INTERLINEAR_CACHE.set(cacheKey, words);
      return words;
    }
  }

  // ── 1b. Lazy per-book files (mobile-optimized) ─────────────────────────
  if (_vaultAdapter) {
    const bookData = useLXX
      ? await getLazyBook("lxx-books", lookupRef.book)
      : (lang === "hebrew" ? await getLazyBook("hebrew-books", lookupRef.book) : await getLazyBook("greek-books", lookupRef.book));
    if (bookData) {
      const words = lookupOffline(lookupRef, bookData, lang);
      if (words.length > 0 && words[0].original !== "—") {
        if (INTERLINEAR_CACHE.size >= 128) INTERLINEAR_CACHE.delete(INTERLINEAR_CACHE.keys().next().value);
      INTERLINEAR_CACHE.set(cacheKey, words);
        return words;
      }
    }
  }

  // ── 2. bolls.life API ─────────────────────────────────────────────────────
  try {
    const end      = ref.verseEnd ?? ref.verseStart;
    const allWords: InterlinearWord[] = [];
    for (let v = ref.verseStart; v <= end; v++) {
      allWords.push(...await fetchBollsVerse(ref.book, ref.chapter, v, lang, version));
    }
    if (allWords.length > 0) {
      INTERLINEAR_CACHE.set(cacheKey, allWords);
      return allWords;
    }
  } catch (e) {
    console.warn("ScriptureScribe: online interlinear fetch failed", e);
  }

  // ── 3. Built-in samples ───────────────────────────────────────────────────
  let fallback = getSampleInterlinear(ref, lang);
  
  // ── 4. Cross-language Fallback ────────────────────────────────────────────
  // If no actual data was found (and it's not just returning a fallback dummy array),
  // try the other language for this book.
  const hasRealData = fallback.length > 0 && fallback[0].original !== "—";
  if (!hasRealData && !isFallback) {
    const altLang = language === "hebrew" ? "greek" : "hebrew";
    const altVer  = altLang === "greek" && isOT ? "LXX" : "KJV";
    // We only fallback if it makes sense (e.g. NT has no Hebrew, so don't bother if isOT is false and we want hebrew)
    if (!(altLang === "hebrew" && !isOT)) {
      const altWords = await fetchInterlinear(ref, altLang, altVer, true);
      if (altWords.length > 0 && altWords[0].original !== "—") {
        return altWords;
      }
    }
  }

  INTERLINEAR_CACHE.set(cacheKey, fallback);
  return fallback;
}

function lookupOffline(
  ref: ScriptureRef,
  store: Record<string, CompactWord[]>,
  lang: "greek" | "hebrew"
): InterlinearWord[] {
  const end   = ref.verseEnd ?? ref.verseStart;
  const words: InterlinearWord[] = [];

  // Range
  for (let v = ref.verseStart; v <= end; v++) {
    const key     = `${ref.book} ${ref.chapter}:${v}`;
    const compact = store[key];
    if (!compact) {
      const sample = Object.keys(store).slice(0, 10).join(", ");
      console.debug(`ScriptureScribe interlinear miss for "${key}". Store has ${Object.keys(store).length} entries. Sample keys: ${sample}`);
    }
    if (compact) for (const w of compact) words.push(compactToWord(w, lang));
  }

  // Comma-list additional verses
  for (const v of ref.additionalVerses ?? []) {
    const compact = store[`${ref.book} ${ref.chapter}:${v}`];
    if (compact) for (const w of compact) words.push(compactToWord(w, lang));
  }

  if (words.length === 0) {
    words.push({ english:"(no interlinear data for this verse)", original:"—",
                 transliteration:"", strongsNum:"", language: lang });
  }
  return words;
}

// ── bolls.life online fetch ───────────────────────────────────────────────────

async function fetchBollsVerse(
  book: string, chapter: number, verse: number,
  lang: "greek" | "hebrew",
  version: string = "KJV"
): Promise<InterlinearWord[]> {
  const bookId = BOLLS_BOOK_ID[book];
  if (!bookId) return [];
  // THGNT = Tyndale House Greek NT (NT only)
  // LXXM  = Septuagint with morphology (bolls.life OT Greek)
  // OSMHB = Open Scriptures Morphological Hebrew Bible
  let translation: string;
  if (lang === "hebrew") {
    translation = "OSMHB";
  } else if (version === "LXX" || OT_BOOKS.has(book)) {
    translation = "LXXM";   // LXX Septuagint for OT Greek
  } else {
    translation = "THGNT";  // Greek NT
  }
  const res = await fetchWithTimeout(
    `https://bolls.life/get-text/${translation}/${bookId}/${chapter}/${verse}/`
  );
  if (!res.ok) return [];
  return parseBollsResponse(await res.json(), lang);
}

function parseBollsResponse(raw: any, lang: "greek" | "hebrew"): InterlinearWord[] {
  const words: InterlinearWord[] = [];
  try {
    for (const verseObj of (Array.isArray(raw) ? raw : [raw])) {
      const tokens = verseObj?.text;
      if (!Array.isArray(tokens)) continue;
      for (const token of tokens) {
        if (typeof token === "string" || !token) continue;

        const original = String(token.text ?? token.word ?? "").trim();
        if (!original) continue;

        // English gloss — try all known field names; filter empty strings
        const englishRaw = [
          token.gloss, token.english, token.word_english,
          token.lemma_gloss, token.translation, token.kjv_def
        ].find(v => v && String(v).trim().length > 0);
        const english = englishRaw ? String(englishRaw).trim() : "";

        // Transliteration
        const translit = String(token.transliteration ?? token.translit ?? "").trim();

        // Strong's number
        const rawStrongs = String(
          token.strongs ?? token.strong ?? token.strongs_number ?? ""
        );
        const digits = rawStrongs.replace(/[^0-9]/g, "");
        const prefix = lang === "greek" ? "G" : "H";
        const normDigits = digits ? String(parseInt(digits, 10)) : "";
        const strongsNum = normDigits ? `${prefix}${normDigits}` : "";

        // Morphology
        const morph = String(token.morph ?? token.parsing_info ?? "").trim();

        words.push({ english, original, transliteration: translit, strongsNum, language: lang, morph });
      }
    }
  } catch (e) { console.warn("ScriptureScribe: bolls.life parse error", e); }
  return words;
}

// ── fetchStrongsDefinition ────────────────────────────────────────────────────

/**
 * Returns a Strong's definition.
 * Priority: offline strongs-definitions.json → openscriptures CDN → bolls.life
 */
export async function fetchStrongsDefinition(
  strongsNum: string
): Promise<StrongsDefinition | null> {
  if (!strongsNum) return null;
  const normalized = strongsNum.toUpperCase().match(/^([GH])0*(\d+)(?:[A-Z])?$/);
  if (!normalized) return null;
  strongsNum = `${normalized[1]}${Number(normalized[2])}`;
  if (STRONGS_CACHE.has(strongsNum)) return STRONGS_CACHE.get(strongsNum)!;
  const shard = `${normalized[1]}${Math.floor(Number(normalized[2]) / 100)}`;
  await ensureData(`definitions/strongs-${shard}.json`, data => Object.assign(strongsDefs, data));
  if (strongsNum.startsWith("G")) {
    await ensureData(`definitions/lxx-${shard}.json`, data => Object.assign(lxxDefs, data));
    await ensureData(`definitions/lsj-${shard}.json`, data => Object.assign(lsjDefs, data));
  }

  const isGreek = strongsNum.startsWith("G");
  const lang: "greek" | "hebrew" = isGreek ? "greek" : "hebrew";

  // ── 1a. LXX-specific definitions (STEPBible TBESG) — checked first for Greek ──
  const lxxEntry = lxxDefs[strongsNum];
  if (lxxEntry) {
    const lsj = lsjDefs[strongsNum];
    const def: StrongsDefinition = {
      number:          strongsNum,
      original:        lxxEntry.o,
      transliteration: lxxEntry.t,
      phonetic:        "",
      definition:      lsj ? lsj : (lxxEntry.g + (lxxEntry.d ? "\n\n" + lxxEntry.d : "")),
      language:        lang,
    };
    if (STRONGS_CACHE.size >= 256) STRONGS_CACHE.delete(STRONGS_CACHE.keys().next().value);
    STRONGS_CACHE.set(strongsNum, def);
    return def;
  }

  // ── 1b. Offline strongs-definitions.json ─────────────────────────────────
  const localEntry = strongsDefs[strongsNum];
  if (localEntry) {
    const lsj = lsjDefs[strongsNum];
    const def: StrongsDefinition = {
      number:          strongsNum,
      original:        localEntry.o,
      transliteration: localEntry.t,
      phonetic:        localEntry.g ?? "",
      definition:      lsj ? lsj : (localEntry.d ?? "Definition unavailable."),
      language:        lang,
    };
    if (STRONGS_CACHE.size >= 256) STRONGS_CACHE.delete(STRONGS_CACHE.keys().next().value);
    STRONGS_CACHE.set(strongsNum, def);
    return def;
  }

  // ── 2. openscriptures/strongs CDN ─────────────────────────────────────────
  try {
    const langPath = isGreek ? "greek" : "hebrew";
    const padded   = strongsNum.replace(/\D/g, "").padStart(4, "0");
    const res      = await fetchWithTimeout(
      `https://cdn.jsdelivr.net/gh/openscriptures/strongs@master/dict/${langPath}/${padded}.json`,
      4000
    );
    if (res.ok) {
      const data = await res.json();
      const def: StrongsDefinition = {
        number:          strongsNum,
        original:        String(data.lemma       ?? data.word      ?? "").trim(),
        transliteration: String(data.xlit        ?? data.translit  ?? "").trim(),
        phonetic:        String(data.pron         ?? data.pronounce ?? "").trim(),
        definition:      String(data.strongs_def ?? data.kjv_def   ?? data.derivation ?? "Definition unavailable.").trim(),
        language:        lang,
      };
      if (STRONGS_CACHE.size >= 256) STRONGS_CACHE.delete(STRONGS_CACHE.keys().next().value);
    STRONGS_CACHE.set(strongsNum, def);
      return def;
    }
  } catch (e) { console.warn(`ScriptureScribe: openscriptures CDN failed for ${strongsNum}`, e); }

  // ── 3. bolls.life /strongs/ ───────────────────────────────────────────────
  try {
    const res = await fetchWithTimeout(`https://bolls.life/strongs/${strongsNum}/`, 4000);
    if (res.ok) {
      const data = await res.json();
      const def: StrongsDefinition = {
        number:          strongsNum,
        original:        String(data.original_word   ?? data.lemma        ?? "").trim(),
        transliteration: String(data.transliteration ?? data.xlit         ?? "").trim(),
        phonetic:        String(data.phonetic         ?? data.pronunciation ?? "").trim(),
        definition:      String(data.strongs_def ?? data.definition ?? data.short_def ?? "Definition unavailable.").trim(),
        language:        lang,
      };
      if (STRONGS_CACHE.size >= 256) STRONGS_CACHE.delete(STRONGS_CACHE.keys().next().value);
    STRONGS_CACHE.set(strongsNum, def);
      return def;
    }
  } catch (e) { console.warn(`ScriptureScribe: bolls.life strongs failed for ${strongsNum}`, e); }

  return null;
}

// ── Built-in sample data ──────────────────────────────────────────────────────
// Used only when offline files are absent AND network is unreachable.

function getSampleInterlinear(ref: ScriptureRef, language: "greek" | "hebrew"): InterlinearWord[] {
  const key = refToString(ref);
  if (language === "greek"  && SAMPLE_GREEK[key])  return SAMPLE_GREEK[key];
  if (language === "hebrew" && SAMPLE_HEBREW[key]) return SAMPLE_HEBREW[key];
  return [{
    english:"Add strongs-greek.json / strongs-hebrew.json to plugin folder for offline interlinear.",
    original:"—", transliteration:"", strongsNum:"", language,
  }];
}

const SAMPLE_GREEK: Record<string, InterlinearWord[]> = {
  "John 3:16": [
    { english:"For/thus",      original:"Οὕτως",       transliteration:"Houtōs",      strongsNum:"G3779", language:"greek" },
    { english:"indeed",        original:"γὰρ",          transliteration:"gar",         strongsNum:"G1063", language:"greek" },
    { english:"loved",         original:"ἠγάπησεν",    transliteration:"ēgapēsen",    strongsNum:"G25",   language:"greek" },
    { english:"God",           original:"ὁ θεὸς",      transliteration:"ho theos",    strongsNum:"G2316", language:"greek" },
    { english:"the world",     original:"τὸν κόσμον",  transliteration:"ton kosmon",  strongsNum:"G2889", language:"greek" },
    { english:"only begotten", original:"μονογενῆ",    transliteration:"monogenē",    strongsNum:"G3439", language:"greek" },
    { english:"Son",           original:"υἱόν",         transliteration:"huion",       strongsNum:"G5207", language:"greek" },
    { english:"believing",     original:"πιστεύων",    transliteration:"pisteuōn",    strongsNum:"G4100", language:"greek" },
    { english:"perish",        original:"ἀπόληται",    transliteration:"apolētai",    strongsNum:"G622",  language:"greek" },
    { english:"eternal",       original:"αἰώνιον",     transliteration:"aiōnion",     strongsNum:"G166",  language:"greek" },
    { english:"life",          original:"ζωήν",         transliteration:"zōēn",        strongsNum:"G2222", language:"greek" },
  ],
  "Romans 3:23": [
    { english:"all",           original:"πάντες",       transliteration:"pantes",      strongsNum:"G3956", language:"greek" },
    { english:"sinned",        original:"ἥμαρτον",     transliteration:"hēmarton",    strongsNum:"G264",  language:"greek" },
    { english:"fall short of", original:"ὑστεροῦνται", transliteration:"husterountai",strongsNum:"G5302", language:"greek" },
    { english:"the glory",     original:"δόξης",        transliteration:"doxēs",       strongsNum:"G1391", language:"greek" },
    { english:"of God",        original:"θεοῦ",         transliteration:"theou",       strongsNum:"G2316", language:"greek" },
  ],
};

// ── Bible Structure Metadata ────────────────────────────────────────────────
export const BIBLE_BOOKS_NAMES = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", 
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", 
  "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", 
  "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", 
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", 
  "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation",
  "Tobit", "Judith", "1 Maccabees", "2 Maccabees", "3 Maccabees", "4 Maccabees", "Wisdom", "Sirach", "Baruch",
  "1 Esdras", "Epistle of Jeremiah", "Susanna", "Bel and the Dragon", "1 Enoch", "Psalms of Solomon", "Odes",
  "Sirach Prologue", "Tobit (S)", "Daniel (Th)", "Susanna (Th)", "Bel (Th)"
];
// Apocrypha are treated as OT books so they trigger the LXX interlinear
export const OT_BOOKS = new Set([...BIBLE_BOOKS_NAMES.slice(0, 39), ...BIBLE_BOOKS_NAMES.slice(66)]);
export const NT_BOOKS = new Set(BIBLE_BOOKS_NAMES.slice(39, 66));

const SAMPLE_HEBREW: Record<string, InterlinearWord[]> = {
  "Genesis 1:1": [
    { english:"In the beginning", original:"בְּרֵאשִׁית",   transliteration:"bərēʾšît",    strongsNum:"H7225", language:"hebrew" },
    { english:"created",          original:"בָּרָא",          transliteration:"bārāʾ",       strongsNum:"H1254", language:"hebrew" },
    { english:"God",              original:"אֱלֹהִים",       transliteration:"ʾĕlōhîm",     strongsNum:"H430",  language:"hebrew" },
    { english:"the heavens",      original:"הַשָּׁמַיִם",     transliteration:"haššāmayim",  strongsNum:"H8064", language:"hebrew" },
    { english:"and the earth",    original:"וְאֵת הָאָרֶץ",  transliteration:"wəʾēt hāʾāreṣ",strongsNum:"H776", language:"hebrew" },
  ],
  "Psalms 23:1": [
    { english:"The LORD",         original:"יְהוָה",          transliteration:"YHWH",        strongsNum:"H3068", language:"hebrew" },
    { english:"shepherds me",     original:"רֹעִי",           transliteration:"rōʿî",        strongsNum:"H7462", language:"hebrew" },
    { english:"I shall not",      original:"לֹא",              transliteration:"lōʾ",         strongsNum:"H3808", language:"hebrew" },
    { english:"lack",             original:"אֶחְסָר",         transliteration:"ʾeḥsār",      strongsNum:"H2637", language:"hebrew" },
  ],
};