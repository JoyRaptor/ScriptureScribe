import { normalizeBookName } from "./bibleData";

export interface ScriptureRef {
  /** Canonical book name, e.g. "John" */
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  /** Extra individual verses from a comma-list, e.g. 2 Peter 1:2,5,8 → [5,8] */
  additionalVerses?: number[];
  /** The original raw text that was matched */
  raw: string;
  /** Character offsets within the scanned string */
  start: number;
  end: number;
}

// ── Regexes ───────────────────────────────────────────────────────────────────

/**
 * Primary scripture reference regex.
 * Matches: Genesis 1:1 | Gen 1:1-3 | 1 Cor 13:4 | Jn 3:16 | Rev 22:21
 *
 * Groups:
 *   1 - optional numeric prefix (1/2/3) for numbered books
 *   2 - book name token
 *   3 - chapter
 *   4 - verse start  (optional)
 *   5 - verse end    (optional, range)
 */
const SCRIPTURE_REGEX =
  /\b((?:[123]\s?)?)([A-Z][a-zA-Z]+)\.?\s+(\d{1,3})(?::(\d{1,3})(?:-(\d{1,3}))?)?\b/g;

/**
 * Multi-word book regex — handles books whose names contain "of":
 *   Song of Solomon N:V  |  Song of Songs N:V  |  Song of Sol. N:V
 *
 * Groups:
 *   1 - full book name (e.g. "Song of Solomon")
 *   2 - chapter
 *   3 - verse start (optional)
 *   4 - verse end   (optional)
 */
const MULTIWORD_SCRIPTURE_RE =
  /\b(Song\s+of\s+(?:Solomon|Songs?|Sol\.?))\s+(\d{1,3})(?::(\d{1,3})(?:-(\d{1,3}))?)?\b/gi;

/**
 * No-space format: luke15:1  Luke15:1  lk15:1  1Cor13:4  1cor13:4  1Cor.13:4
 * The optional period handles abbreviated no-space refs like "1Cor.13:4".
 * Requires a colon (chapter:verse) to keep false-positive rates low.
 * Minimum 2 alpha chars so single-letter tokens don't match.
 *
 * Groups:
 *   1 - book token  (e.g. "luke", "1Cor", "lk")
 *   2 - chapter
 *   3 - verse start
 *   4 - verse end (optional)
 */
const NOSPACE_SCRIPTURE_RE =
  /\b([123]?[A-Za-z]{2,})\.?(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?\b/g;

/**
 * Walk comma-separated verse numbers after a primary match.
 * Matches one ", N" segment at a time. Must match contiguously.
 */
const SINGLE_COMMA_RE = /^\s*,\s*(\d{1,3})/;

/**
 * Inline verse marker: v2  v.2  v 2  (case-insensitive, word-bounded).
 * Used to anchor bare verse numbers to the last seen book+chapter.
 */
const INLINE_VERSE_RE = /\bv\.?\s*(\d{1,3})\b/gi;

// ── Main export ───────────────────────────────────────────────────────────────

export function parseScriptureRefs(text: string): ScriptureRef[] {
  const results: ScriptureRef[] = [];
  // Tracks character positions already claimed by a match so later passes
  // don't double-match the same text.
  const occupied = new Set<number>();

  // ── Pass 0: multi-word book names (Song of Solomon / Song of Songs) ──────
  // The primary regex only handles single-word book names; this pass catches
  // the full written-out names that contain "of".
  MULTIWORD_SCRIPTURE_RE.lastIndex = 0;
  let mw: RegExpExecArray | null;
  while ((mw = MULTIWORD_SCRIPTURE_RE.exec(text)) !== null) {
    const canonical = normalizeBookName(mw[1].trim());
    if (!canonical) continue;
    const chapter    = parseInt(mw[2], 10);
    const verseStart = mw[3] ? parseInt(mw[3], 10) : 1;
    const verseEnd   = mw[4] ? parseInt(mw[4], 10) : undefined;
    if (isNaN(chapter) || chapter < 1) continue;

    results.push({
      book: canonical, chapter, verseStart, verseEnd,
      raw:   mw[0],
      start: mw.index,
      end:   mw.index + mw[0].length,
    });
  }

  // Mark multiword results as occupied BEFORE nospace pass
  for (const r of results) {
    for (let i = r.start; i < r.end; i++) occupied.add(i);
  }

  // ── Pass 0.5: no-space refs (luke15:1, 1Cor13:4, Lk15:1) ────────────────
  //
  // Handles references where the book name and chapter are written without a
  // space between them. The colon before the verse number is required, which
  // keeps false-positive rates very low.
  NOSPACE_SCRIPTURE_RE.lastIndex = 0;
  while ((mw = NOSPACE_SCRIPTURE_RE.exec(text)) !== null) {
    if (occupied.has(mw.index)) continue; // already caught by Pass 0

    const bookToken   = mw[1];
    const chapter     = parseInt(mw[2], 10);
    const verseStart  = parseInt(mw[3], 10);
    const verseEnd    = mw[4] ? parseInt(mw[4], 10) : undefined;

    const canonical = normalizeBookName(bookToken);
    if (!canonical || isNaN(chapter) || chapter < 1) continue;

    const ref: ScriptureRef = {
      book: canonical, chapter, verseStart, verseEnd,
      raw:   mw[0],
      start: mw.index,
      end:   mw.index + mw[0].length,
    };
    results.push(ref);
    for (let i = ref.start; i < ref.end; i++) occupied.add(i);
  }

  // ── Pass 1: primary refs + comma-list continuations ──────────────────────
  SCRIPTURE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  // Re-seed occupied from all Pass 0 / 0.5 results before the main loop
  for (const r of results) {
    for (let i = r.start; i < r.end; i++) occupied.add(i);
  }

  while ((match = SCRIPTURE_REGEX.exec(text)) !== null) {
    // Skip if this position was already captured by Pass 0
    if (occupied.has(match.index)) continue;

    const prefix     = match[1]?.trim() ?? "";
    const bookRaw    = match[2];
    const chapter    = parseInt(match[3], 10);
    const verseStart = match[4] ? parseInt(match[4], 10) : 1;
    const verseEnd   = match[5] ? parseInt(match[5], 10) : undefined;

    const bookToken = prefix ? `${prefix}${bookRaw}` : bookRaw;
    const canonical = normalizeBookName(bookToken) ?? normalizeBookName(bookRaw);
    if (!canonical || isNaN(chapter) || chapter < 1) continue;

    const primaryRef: ScriptureRef = {
      book: canonical, chapter, verseStart, verseEnd,
      raw:   match[0],
      start: match.index,
      end:   match.index + match[0].length,
    };

    // ── Comma-list continuation: ",5,8" immediately after a versed ref ─────
    // Absorb the whole "2 Peter 1:2,5,8" into one ref so it highlights and
    // hovers as a unit. Extra verses go into additionalVerses[].
    if (match[4]) {
      const additional: number[] = [];
      let cursor = match.index + match[0].length;

      while (cursor < text.length) {
        const cm = SINGLE_COMMA_RE.exec(text.slice(cursor));
        if (!cm) break;
        const extraVerse = parseInt(cm[1], 10);
        if (isNaN(extraVerse)) break;
        additional.push(extraVerse);
        cursor += cm[0].length;
      }

      if (additional.length) {
        primaryRef.additionalVerses = additional;
        primaryRef.raw = text.slice(match.index, cursor);
        primaryRef.end = cursor;
        // Advance main regex past the consumed comma segments
        SCRIPTURE_REGEX.lastIndex = cursor;
      }
    }

    results.push(primaryRef);
  }

  // ── Pass 2: inline v# markers ────────────────────────────────────────────
  //
  // Walk the full text. Track the last canonical book+chapter seen (the
  // "context anchor"). Any v# token after an anchor — within the same
  // paragraph and not already covered — becomes a ScriptureRef for that
  // book+chapter.

  // Build occupied-position set from Pass 1 results (Pass 0 already seeded it)
  for (const r of results) {
    for (let i = r.start; i < r.end; i++) occupied.add(i);
  }

  // Collect anchor positions in document order from Pass 1 results
  // (the primary-ref entries already have canonical book+chapter+position)
  // We derive anchors by re-running the primary regex — lightweight since
  // no book-name normalization failures need handling here.
  const anchors: Array<{ pos: number; book: string; chapter: number }> = [];
  SCRIPTURE_REGEX.lastIndex = 0;
  while ((match = SCRIPTURE_REGEX.exec(text)) !== null) {
    const prefix    = match[1]?.trim() ?? "";
    const bookRaw   = match[2];
    const chapter   = parseInt(match[3], 10);
    const bookToken = prefix ? `${prefix}${bookRaw}` : bookRaw;
    const canonical = normalizeBookName(bookToken) ?? normalizeBookName(bookRaw);
    if (canonical && !isNaN(chapter) && chapter >= 1) {
      anchors.push({ pos: match.index, book: canonical, chapter });
    }
  }

  INLINE_VERSE_RE.lastIndex = 0;
  let anchorIdx = 0;
  let ctx: { book: string; chapter: number } | null = null;

  while ((match = INLINE_VERSE_RE.exec(text)) !== null) {
    const pos = match.index;

    // Advance anchor pointer to the latest anchor before this v# position
    while (anchorIdx < anchors.length && anchors[anchorIdx].pos < pos) {
      ctx = { book: anchors[anchorIdx].book, chapter: anchors[anchorIdx].chapter };
      anchorIdx++;
    }

    if (!ctx) continue;              // no anchor seen yet in document
    if (occupied.has(pos)) continue; // already covered by Pass 1

    const verse = parseInt(match[1], 10);
    if (isNaN(verse) || verse < 1) continue;

    results.push({
      book:       ctx.book,
      chapter:    ctx.chapter,
      verseStart: verse,
      raw:        match[0],
      start:      pos,
      end:        pos + match[0].length,
    });

    for (let i = pos; i < pos + match[0].length; i++) occupied.add(i);
  }

  // ── Sort by start position so CM6 and highlighters get ordered refs ───────
  results.sort((a, b) => a.start - b.start);

  return results;
}

// ── Utility exports ───────────────────────────────────────────────────────────

/** Build a URL-safe reference string, e.g. "John+3:16" */
export function refToUrlParam(ref: ScriptureRef): string {
  const book = encodeURIComponent(ref.book);
  let addr = `${book}+${ref.chapter}`;
  if (ref.verseStart) {
    addr += `%3A${ref.verseStart}`;
    if (ref.verseEnd) addr += `-${ref.verseEnd}`;
  }
  return addr;
}

/** Build a human-readable reference, e.g. "John 3:16" or "John 3:16-18" or "2 Peter 1:2,5,8" */
export function refToString(ref: ScriptureRef): string {
  let s = `${ref.book} ${ref.chapter}`;
  if (ref.verseStart) {
    s += `:${ref.verseStart}`;
    if (ref.verseEnd) {
      s += `-${ref.verseEnd}`;
    } else if (ref.additionalVerses?.length) {
      s += `,${ref.additionalVerses.join(",")}`;
    }
  }
  return s;
}
