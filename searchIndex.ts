/**
 * searchIndex.ts
 *
 * Three search modes, all auto-detected from the query:
 *
 *   Strong's number  — "G25" "H7225" "g0025"
 *     Exact match on Strong's number field (s).
 *
 *   Original word    — any non-Latin string, e.g. "ἀγάπη" or "אָהַב"
 *     Substring match on the original-language field (o).
 *
 *   English gloss    — anything else, e.g. "love" "grace" "shepherd"
 *     Case-insensitive substring match on the English gloss field (e).
 *
 * All modes return up to `limit` SearchResult objects with a reference
 * and a short KJV preview. The index is built lazily on first call.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SearchResult {
  reference: string;
  preview:   string;
  /** Matched word info shown in the result row */
  matchedWord?: { original: string; gloss: string; strongs: string };
  isSemantic?: boolean;
  score?: number;
  source?: "Exact" | "Keyword" | "Vector" | "Link" | "Morph" | "Phrase";
}

export type SearchMode = "strongs" | "original" | "english" | "phrase" | "boolean" | "semantic" | "morph";

// SearchMode is declared in the Query classification section below.

// ── Module state ──────────────────────────────────────────────────────────────

export interface WordEntry {
  e: string;
  o: string;
  s: string;
  m?: string;
}

// Full compact stores — kept as reference after buildSearchIndex is called
let greekStore:  Record<string, Array<WordEntry>> = {};
let hebrewStore: Record<string, Array<WordEntry>> = {};
let lxxStore:    Record<string, Array<WordEntry>> = {};

/** Strong's number → array of "Book Ch:V" strings (for fast Strong's lookup) */
let strongsIndex: Map<string, string[]> | null = null;

/**
 * Morphological index: morph pattern → array of {ref, strongs, morph} entries.
 * Keyed two ways for flexible lookup:
 *   "G4100|V-AAI3S"  — specific lemma + morph (Strong's + code)
 *   "V-AAI3S"        — morph only (any lemma)
 * Both sets are populated for every word that has both strongs and morph data.
 */
interface MorphEntry { ref: string; strongs: string; morph: string; }
let morphIndex: Map<string, MorphEntry[]> | null = null;

/** KJV verse text for previews */
let kjvStore: Record<string, string> = {};

export function setKJVStoreRef(data: Record<string, string>): void {
  kjvStore = data;
  kjvLowerCache = null;
  kjvTokenCache = null;
}

/**
 * [ref, lowercasedText] pairs, built once per KJV load (~5MB) and shared by
 * every full-corpus scanner so no search lowercases 31k verses again.
 */
let kjvLowerCache: Array<[string, string]> | null = null;

function kjvLowerEntries(): Array<[string, string]> {
  if (!kjvLowerCache) {
    kjvLowerCache = Object.entries(kjvStore).map(([k, v]) => [k, v.toLowerCase()]);
  }
  return kjvLowerCache;
}

/**
 * [ref, lowercasedText, tokens] triples — tokens computed once per KJV load.
 */
let kjvTokenCache: Array<[string, string, string[]]> | null = null;

function kjvTokenEntries(): Array<[string, string, string[]]> {
  if (!kjvTokenCache) {
    kjvTokenCache = kjvLowerEntries().map(([k, lc]) =>
      [k, lc, lc.replace(/[^a-z\s]/g, "").split(/\s+/)]
    );
  }
  return kjvTokenCache;
}

/** Get full verse text for a "Book Ch:V" key */
export function getKJVText(verseKey: string): string {
  return kjvStore[verseKey] ?? "";
}

// ── Index builder ─────────────────────────────────────────────────────────────

export async function buildSearchIndex(
  greek:  Record<string, Array<WordEntry>>,
  hebrew: Record<string, Array<WordEntry>>,
  lxx:    Record<string, Array<WordEntry>>,
): Promise<void> {
  if (strongsIndex !== null) return; // already built

  greekStore   = greek;
  hebrewStore  = hebrew;
  lxxStore     = lxx;
  strongsIndex = new Map();
  morphIndex   = new Map();

  const addToMorphIndex = (key: string, entry: MorphEntry) => {
    let list = morphIndex!.get(key);
    if (!list) { list = []; morphIndex!.set(key, list); }
    list.push(entry);
  };

  const addStore = async (store: typeof greekStore) => {
    let count = 0;
    let sliceStart = Date.now();
    for (const [verseKey, words] of Object.entries(store)) {
      count++;
      // Yield only when a 12ms work budget is spent — fixed 10ms sleeps every
      // 500 verses added over a second of pure waiting to every index build.
      if ((count & 511) === 0 && Date.now() - sliceStart > 12) {
        await new Promise<void>(r => setTimeout(r, 0));
        sliceStart = Date.now();
      }
      for (const word of words) {
        // ── Strong's index ────────────────────────────────────────────────
        if (word.s) {
          const num = normalizeStrongs(word.s);
          if (num) {
            let list = strongsIndex!.get(num);
            if (!list) { list = []; strongsIndex!.set(num, list); }
            // Words arrive grouped verse-by-verse, so a duplicate ref can only
            // be the most recent push — checking the last element replaces an
            // O(n) includes() scan that went quadratic on frequent lemmas.
            if (list[list.length - 1] !== verseKey) list.push(verseKey);
          }
        }
        // ── Morph index ───────────────────────────────────────────────────
        if (word.m && word.s) {
          const num  = normalizeStrongs(word.s) ?? word.s;
          const morph = word.m.trim();
          const entry: MorphEntry = { ref: verseKey, strongs: num, morph };
          // Key 1: specific lemma + morph ("G4100|V-AAI3S")
          addToMorphIndex(`${num}|${morph}`, entry);
          // Key 2: morph only — for "find all aorist indicatives regardless of lemma"
          addToMorphIndex(morph, entry);
        }
      }
    }
  };

  await addStore(greek);
  await addStore(hebrew);
  await addStore(lxx);

  console.log(
    `ScriptureScribe: search index built — ${strongsIndex.size} Strong's entries,` +
    ` ${morphIndex.size} morph patterns`
  );
  if (morphIndex.size === 0) {
    console.warn("ScriptureScribe: No morphology data found in interlinear files. Morph search (Ω) will return 0 results. Check your strongs-greek.json for 'm' fields.");
  }
}

export function isIndexBuilt(): boolean {
  return strongsIndex !== null;
}

// ── Query classification ──────────────────────────────────────────────────────

import { semanticVerseSearch } from "./semanticSearch";

export function classifyQuery(raw: string): SearchMode {
  const trimmed = raw.trim();
  if (trimmed.startsWith("semantic:")) return "semantic";
  if (trimmed.startsWith("morph:"))    return "morph";
  if (/^[GgHh]\d+$/.test(trimmed)) return "strongs";
  if (/[^\x00-\x7F]/.test(trimmed)) return "original";
  // Boolean: contains AND / OR / + / | operators
  if (/\bAND\b|\bOR\b|\bNOT\b|\+|\|/.test(trimmed)) return "boolean";
  // Phrase: 3+ space-separated words (quoted or not)
  if (trimmed.replace(/^"|"$/g, "").split(/\s+/).length >= 3) return "phrase";
  return "english";
}

// ── Search entry point ────────────────────────────────────────────────────────

/**
 * Auto-detect search mode and return results.
 * Returns up to `limit` results (default 200).
 *
 * Modes:
 *   Strong's   — G25, H7225
 *   Original   — non-Latin chars (Greek/Hebrew)
 *   Boolean    — AND/OR/NOT/+/| operators  e.g. "faith AND works", "faith|grace"
 *   Phrase     — 3+ words searched as proximity phrase  e.g. "leads me beside still"
 *   English    — single/double word gloss search with stemming fallback
 */
/** Standard 66 books in order to determine OT/NT split */
import { BIBLE_BOOKS_NAMES, OT_BOOKS, NT_BOOKS } from "./interlinear";

export async function search(raw: string, limit = 200): Promise<{ results: SearchResult[]; mode: SearchMode }> {
  if (!strongsIndex) return { results: [], mode: "english" };

  let query = raw.trim();

  // ── Testament Filtering (NT/OT) ─────────────────────────────────────────────
  let testamentFilter: "ot" | "nt" | null = null;
  const ntMatch = query.match(/\bnt\b/i);
  const otMatch = query.match(/\bot\b/i);
  if (ntMatch) {
    testamentFilter = "nt";
    query = query.replace(/\bnt\b/i, "").trim();
  } else if (otMatch) {
    testamentFilter = "ot";
    query = query.replace(/\bot\b/i, "").trim();
  }

  const doFilter = (res: SearchResult[]) => {
    if (!testamentFilter) return res;
    return res.filter(r => {
      // Extract book name from e.g. "John 3:16" or "1 John 1:1"
      const parts = r.reference.split(" ");
      if (parts.length < 2) return true;
      const lastPart = parts[parts.length - 1]; // "3:16"
      const bookName = r.reference.slice(0, r.reference.length - lastPart.length).trim();
      
      if (testamentFilter === "ot") return OT_BOOKS.has(bookName);
      if (testamentFilter === "nt") return NT_BOOKS.has(bookName);
      return true;
    });
  };

  let mode = classifyQuery(query);
  if (mode === "semantic" || raw.toLowerCase().startsWith("semantic:")) {
     mode = "semantic";
     query = query.replace(/^semantic:/i, "").trim();
  }

  let results: SearchResult[] = [];

  switch (mode) {
    case "strongs":  results = searchStrongs(query, limit); break;
    case "original": results = searchOriginal(query, limit); break;
    case "boolean":  results = await searchBoolean(query, limit); break;
    case "phrase":   results = await searchPhrase(query, limit); break;
    case "english":  results = await searchEnglish(query, limit); break;
    case "morph": {
      // Query format: "morph:G4100|V-A*" or "morph:V-A*" (lemma optional)
      const morphQuery = query.replace(/^morph:/i, "").trim();
      results = searchMorph(morphQuery, limit);
      return { results, mode };  // no semantic fallback for morph queries
    }
    case "semantic":
      const sem = await semanticVerseSearch(query, limit);
      return {
        results: sem.map(s => ({
          reference: s.ref,
          preview: makePreview(kjvStore[s.ref] ?? ""),
          isSemantic: true,
          score: s.score
        })),
        mode
      };
  }

  // ── Fall-through to Semantic Search ─────────────────────────────────────
  // For phrase queries (paraphrases), always run semantic in parallel so
  // conceptual matches surface even when exact-word results are plentiful.
  // For other modes, only trigger when result count is low.
  const isPhraseQuery = mode === "phrase";
  const tokenCount = query.trim().split(/\s+/).length;
  const alwaysRunSemantic = isPhraseQuery && tokenCount >= 3;
  const semanticThreshold = isPhraseQuery ? 30 : 5;

  if ((results.length < semanticThreshold || alwaysRunSemantic) && mode !== "strongs" && mode !== "original") {
    const sem = await semanticVerseSearch(query, limit);
    const seen = new Set(results.map(r => r.reference));
    for (const s of sem) {
      if (seen.has(s.ref)) {
        // Boost existing result's score with semantic score
        const existing = results.find(r => r.reference === s.ref);
        if (existing) existing.score = Math.max(existing.score ?? 0, s.score * 0.9);
        continue;
      }
      seen.add(s.ref);
      results.push({
        reference: s.ref,
        preview:   makePreview(kjvStore[s.ref] ?? ""),
        isSemantic: true,
        score:     s.score * (alwaysRunSemantic ? 0.85 : 1.0),
        source:    s.source,
      });
      if (results.length >= limit) break;
    }
  }

  return { results: doFilter(results), mode };
}

// ── Strong's search ───────────────────────────────────────────────────────────

function searchStrongs(raw: string, limit: number): SearchResult[] {
  const num = normalizeStrongs(raw.trim());
  if (!num) return [];

  const refs = strongsIndex!.get(num) ?? [];
  return refs.slice(0, limit).map(ref => ({
    reference:   ref,
    preview:     makePreview(kjvStore[ref] ?? ""),
    source:      "Exact"
  }));
}

// ── Morphological search ──────────────────────────────────────────────────────
//
// Query formats (all case-insensitive):
//   "V-A*"           → all verbs matching V-A* morph pattern (any lemma)
//   "G4100|V-A*"     → G4100 (pisteuō) in any aorist form
//   "G4100|V-PPI*"   → pisteuō, present passive indicative
//   "*"              → all entries for a given strongs ("G4100|*")
//
// Wildcards: * matches any sequence of characters in the morph code field.
// The separator | divides strongs from morph pattern.
//
// Returns deduplicated verse results with morph info in matchedWord.

function morphPatternToRegex(pattern: string): RegExp {
  // Escape special regex chars except * which becomes .*
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp("^" + escaped + "$", "i");
}

function searchMorph(query: string, limit: number): SearchResult[] {
  if (!morphIndex) return [];

  // Parse "STRONGS|MORPHPAT" or just "MORPHPAT"
  let strongsFilter: string | null = null;
  let morphPattern  = query.trim();

  if (query.includes("|")) {
    const [left, right] = query.split("|", 2);
    const norm = normalizeStrongs(left.trim());
    if (norm) { strongsFilter = norm; morphPattern = right.trim(); }
  }

  const morphRe = morphPatternToRegex(morphPattern || "*");

  // Collect matching entries
  const seen    = new Set<string>();
  const results: SearchResult[] = [];

  // If we have a specific strongs, scan only that lemma's entries from the index.
  // Otherwise scan all morph keys for pattern match (heavier but still fast).
  if (strongsFilter) {
    // Iterate all morph keys for this strongs: "G4100|*"
    for (const [key, entries] of morphIndex.entries()) {
      if (!key.startsWith(strongsFilter + "|")) continue;
      const morphCode = key.slice(strongsFilter.length + 1);
      if (!morphRe.test(morphCode)) continue;
      for (const entry of entries) {
        if (seen.has(entry.ref)) continue;
        seen.add(entry.ref);
        results.push({
          reference:   entry.ref,
          preview:     makePreview(kjvStore[entry.ref] ?? ""),
          matchedWord: { original: "", gloss: entry.morph, strongs: entry.strongs },
          source:      "Morph"
        });
        if (results.length >= limit) return results;
      }
    }
  } else {
    // Morph-only: scan morph-only keys (no "|" in key)
    for (const [key, entries] of morphIndex.entries()) {
      if (key.includes("|")) continue; // skip strongs-keyed entries
      if (!morphRe.test(key)) continue;
      for (const entry of entries) {
        if (seen.has(entry.ref)) continue;
        seen.add(entry.ref);
        results.push({
          reference:   entry.ref,
          preview:     makePreview(kjvStore[entry.ref] ?? ""),
          matchedWord: { original: "", gloss: entry.morph, strongs: entry.strongs },
          source:      "Morph"
        });
        if (results.length >= limit) return results;
      }
    }
  }

  return results;
}

/**
 * Public API: search by morph pattern + optional Strong's filter.
 * Called directly by the morph search UI panel (bypasses classifyQuery).
 *
 * @param strongsNum  e.g. "G4100"  — leave empty for any lemma
 * @param morphPat    e.g. "V-A*"   — wildcard pattern against the morph code
 * @param limit       max results (default 200)
 */
export function morphSearch(
  strongsNum: string,
  morphPat:   string,
  limit = 200,
): SearchResult[] {
  if (!morphIndex) return [];
  const query = strongsNum ? `${strongsNum}|${morphPat}` : morphPat;
  return searchMorph(query, limit);
}

/** Returns true if the morph index has been built */
export function isMorphIndexBuilt(): boolean { return morphIndex !== null; }

// ── Original-language search ──────────────────────────────────────────────────

function searchOriginal(raw: string, limit: number): SearchResult[] {
  const needle = stripDiacritics(raw.trim());
  return wordSearch(
    (word) => stripDiacritics(word.o).includes(needle),
    (word) => ({ original: word.o, gloss: word.e, strongs: normalizeStrongs(word.s) ?? word.s }),
    limit,
  );
}

/** 
 * Strips Hebrew vowels/accents and Greek diacritics for "fuzzy" matching 
 */
function stripDiacritics(text: string): string {
  if (!text) return "";
  return text
    // Greek: remove combining diacritics
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Hebrew: remove points, accents, and punctuation (U+0591 to U+05C7)
    .replace(/[\u0591-\u05C7]/g, "");
}

// ── English gloss search ──────────────────────────────────────────────────────

async function searchEnglish(raw: string, limit: number): Promise<SearchResult[]> {
  const needle = raw.trim().toLowerCase();
  const needleStem = stem(needle);

  // First pass: exact substring in gloss
  const exact = wordSearch(
    (word) => word.e.toLowerCase().includes(needle),
    (word) => ({ original: word.o, gloss: word.e, strongs: normalizeStrongs(word.s) ?? word.s }),
    limit,
  );
  if (exact.length >= 5) return exact;

  // Second pass: also search KJV verse text directly (catches "eternal life" etc.)
  const kvResults: SearchResult[] = [];
  const seen = new Set(exact.map(r => r.reference));
  const entries = kjvLowerEntries();
  let sliceStart = Date.now();
  for (let ei = 0; ei < entries.length; ei++) {
    if (kvResults.length + exact.length >= limit) break;
    if ((ei & 1023) === 0 && Date.now() - sliceStart > 12) {
      await new Promise<void>(r => setTimeout(r, 0));
      sliceStart = Date.now();
    }
    const [verseKey, lc] = entries[ei];
    if (seen.has(verseKey)) continue;
    if (lc.includes(needle)) {
      seen.add(verseKey);
      kvResults.push({
        reference: verseKey,
        preview:   makePreview(kjvStore[verseKey] ?? ""),
        source:    "Keyword",
      });
    }
  }
  if (exact.length + kvResults.length >= 5) return [...exact, ...kvResults];

  // Third pass: stemmed fallback on gloss
  const stemmed = wordSearch(
    (word) => stem(word.e.toLowerCase()) === needleStem,
    (word) => ({ original: word.o, gloss: word.e, strongs: normalizeStrongs(word.s) ?? word.s }),
    limit - exact.length - kvResults.length,
  ).filter(r => !seen.has(r.reference));

  return [...exact, ...kvResults, ...stemmed];
}

// ── Shared word-level scanner ─────────────────────────────────────────────────

function wordSearch(
  predicate:  (word: WordEntry) => boolean,
  matchInfo:  (word: WordEntry) => SearchResult["matchedWord"],
  limit:      number,
): SearchResult[] {
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  const scanStore = (store: typeof greekStore) => {
    for (const [verseKey, words] of Object.entries(store)) {
      if (seen.has(verseKey)) continue;
      for (const word of words) {
        if (predicate(word)) {
          seen.add(verseKey);
          results.push({
            reference:   verseKey,
            preview:     makePreview(kjvStore[verseKey] ?? ""),
            matchedWord: matchInfo(word),
            source:      "Keyword",
          });
          break; // one match per verse is enough
        }
      }
      if (results.length >= limit) return;
    }
  };

  scanStore(greekStore);  // NT Greek
  if (results.length < limit) scanStore(lxxStore);    // OT Greek
  if (results.length < limit) scanStore(hebrewStore); // OT Hebrew

  return results;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Phrase search ─────────────────────────────────────────────────────────────
// Scans KJV verse text for all query words appearing in order within a sliding
// window of ±5 words. This catches paraphrased memories and word-order variants
// like "leads me beside still" matching "leadeth me beside the still".

async function searchPhrase(raw: string, limit: number): Promise<SearchResult[]> {
  const query   = raw.trim().replace(/^"|"$/g, "").toLowerCase();
  const tokens  = query.split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];

  // Pre-stem all tokens once
  const stemmedTokens = tokens.map(stem);

  const scored: Array<{ ref: string; score: number }> = [];

  const entries = kjvTokenEntries();
  let sliceStart = Date.now();
  for (let ei = 0; ei < entries.length; ei++) {
    // Yield on a 12ms budget — this scan used to hold the UI thread for the
    // whole corpus pass.
    if ((ei & 1023) === 0 && Date.now() - sliceStart > 12) {
      await new Promise<void>(r => setTimeout(r, 0));
      sliceStart = Date.now();
    }
    const [verseKey, lc, words] = entries[ei];

    // ── Tier 1: exact substring (score 1.0) ──────────────────────────────────
    if (lc.includes(query)) {
      scored.push({ ref: verseKey, score: 1.0 });
      continue;
    }

    // ── Tier 2: proximity — all tokens in order within window (score 0.85) ───
    let ti = 0;
    for (let wi = 0; wi < words.length && ti < tokens.length; wi++) {
      if (wordMatches(words[wi], tokens[ti])) ti++;
      if (wi - (words.length - tokens.length) > tokens.length * 3) break;
    }
    if (ti === tokens.length) {
      scored.push({ ref: verseKey, score: 0.85 });
      continue;
    }

    // ── Tier 3: stemmed proximity (score 0.70) ───────────────────────────────
    ti = 0;
    for (let wi = 0; wi < words.length && ti < stemmedTokens.length; wi++) {
      if (wordMatches(stem(words[wi]), stemmedTokens[ti])) ti++;
    }
    if (ti === stemmedTokens.length) {
      scored.push({ ref: verseKey, score: 0.70 });
      continue;
    }

    // ── Tier 4: partial match — count how many tokens appear (any order) ─────
    // Only count if ≥ 60% of (non-trivial) tokens are found
    const STOP = new Set(["the","a","an","of","in","and","to","is","was","be","are","for","with","at"]);
    const meaningful = tokens.filter(t => t.length > 2 && !STOP.has(t));
    if (meaningful.length >= 2) {
      let hits = 0;
      for (const mt of meaningful) {
        const ms = stem(mt);
        if (words.some(w => wordMatches(stem(w), ms))) hits++;
      }
      const ratio = hits / meaningful.length;
      if (ratio >= 0.6) {
        scored.push({ ref: verseKey, score: 0.3 + ratio * 0.35 }); // 0.48 – 0.65
        continue;
      }
    }
  }

  // Sort by score descending, then canonical order
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ ref, score }) => ({
    reference: ref,
    preview:   makePreview(kjvStore[ref] ?? ""),
    source:    "Phrase",
    score,
  }));
}

// ── Boolean search ────────────────────────────────────────────────────────────
// Parses simple boolean expressions:
//   AND / +  → all terms must appear in the verse
//   OR  / |  → any term must appear in the verse
//   NOT / -  → term must NOT appear in the verse
// Precedence: all ANDs are evaluated before ORs (standard IR convention).
// Single-word terms are stem-searched; quoted phrases are exact.

async function searchBoolean(raw: string, limit: number): Promise<SearchResult[]> {
  // Normalise operators
  const q = raw.trim()
    .replace(/\bAND\b/gi, " AND ")
    .replace(/\bOR\b/gi, " OR ")
    .replace(/\bNOT\b/gi, " NOT ")
    .replace(/\|/g, " OR ")
    .replace(/\+/g, " AND ");

  // Split into OR clauses first, then AND within each
  const orClauses = q.split(/\s+OR\s+/i).map(s => s.trim()).filter(Boolean).map(clause => {
    return clause.split(/\s+AND\s+/i).map(s => s.trim()).filter(Boolean).map(term => {
      const negate = term.startsWith("NOT ") || term.startsWith("-");
      const word   = term.replace(/^NOT\s+|-/, "").replace(/^"|"$/g, "").toLowerCase();
      return { negate, word, wordStem: stem(word) };
    });
  });

  const results: SearchResult[] = [];

  const entries = kjvTokenEntries();
  let sliceStart = Date.now();
  for (let ei = 0; ei < entries.length; ei++) {
    if (results.length >= limit) break;
    if ((ei & 1023) === 0 && Date.now() - sliceStart > 12) {
      await new Promise<void>(r => setTimeout(r, 0));
      sliceStart = Date.now();
    }
    const [verseKey, lc, words] = entries[ei];

    // Verse matches if ANY or-clause is satisfied
    const matches = orClauses.some(terms => {
      return terms.every(t => {
        const found  = lc.includes(t.word) ||
          words.some(w => stem(w) === t.wordStem);
        return t.negate ? !found : found;
      });
    });

    if (matches) results.push({ reference: verseKey, preview: makePreview(kjvStore[verseKey] ?? "") });
  }
  return results;
}

// ── Word matching with optional stemming ──────────────────────────────────────

function wordMatches(word: string, token: string): boolean {
  return word === token || word.startsWith(token) || stem(word) === stem(token);
}

// ── Porter-lite stemmer ───────────────────────────────────────────────────────
// A minimal English stemmer covering the most common suffixes in KJV.
// Enough to match "leadeth" → "lead", "walked" → "walk", "loves" → "love".

// KJV vocabulary is ~14k distinct words; memoizing turns the 12-regex chain
// into a Map hit for every repeat word. Size-capped so pathological input
// (e.g. pasted foreign text) can't grow the cache without bound.
const STEM_CACHE = new Map<string, string>();

function stem(word: string): string {
  const cached = STEM_CACHE.get(word);
  if (cached !== undefined) return cached;
  const s = stemRaw(word);
  if (STEM_CACHE.size < 65536) STEM_CACHE.set(word, s);
  return s;
}

function stemRaw(word: string): string {
  return word
    .replace(/eth$/, (m, o) => o >= 3 ? "" : m)       // leadeth → lead
    .replace(/est$/, (m, o) => o >= 3 ? "" : m)       // goest → go
    .replace(/ness$/, (m, o) => o >= 3 ? "" : m)      // goodness → good
    .replace(/tion$/, (m, o) => o >= 3 ? "t" : m)     // salvation → salvat (close enough)
    .replace(/ing$/, (m, o) => o >= 3 ? "" : m)       // running → runn (handles doubling)
    .replace(/ied$/, (m, o) => o >= 3 ? "y" : m)      // glorified → glory
    .replace(/ies$/, (m, o) => o >= 3 ? "y" : m)      // glorifies → glory
    .replace(/ed$/, (m, o) => o >= 3 ? "" : m)        // walked → walk
    .replace(/es$/, (m, o) => o >= 3 ? "" : m)        // loves → love
    .replace(/s$/, (m, o) => o >= 3 ? "" : m)         // kings → king
    .replace(/er$/, (m, o) => o >= 4 ? "" : m)        // brighter → bright (Peter stays Peter)
    .replace(/ly$/, (m, o) => o >= 4 ? "" : m);       // rightfully → rightful
}

function normalizeStrongs(raw: string): string | null {
  const s = raw.trim().toUpperCase()
    .replace(/^([GH])0+/, "$1")   // strip leading zeros
    .replace(/([GH]\d+)[A-Za-z]$/, "$1"); // strip disambiguation letter
  return s.match(/^[GH]\d+$/) ? s : null;
}

function makePreview(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 80 ? clean.slice(0, 77) + "…" : clean;
}
