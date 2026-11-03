import { ScriptureRef } from './parser';
import { ensureData } from "./dataLoader";

const rangeMappings: Array<{book: string; chapter: number; first: number; last: number; toBook: string; toChapter: number; toVerse: number}> = [];
let mappingData: Record<string, any> | null = null;

/** Called once from main.ts after the file is read from the plugin folder. */
export function setVersificationData(data: Record<string, any>): void {
  mappingData = data;
  rangeMappings.length = 0;
  // Range declarations carry the actual coordinate change. Individual Nec./Acd.
  // annotations describe textual differences and must not override that change.
  for (const [key, value] of Object.entries(data.eng2grk ?? {}) as Array<[string, string]>) {
    const a = key.match(/^([A-Za-z0-9]+)\.(\d+):(\d+)-(\d+)$/);
    const b = value.match(/^([A-Za-z0-9]+)\.(\d+):(\d+)-(\d+)$/);
    if (a && b) rangeMappings.push({book: a[1], chapter: +a[2], first: +a[3], last: +a[4], toBook: b[1], toChapter: +b[2], toVerse: +b[3]});
  }
}

export function ensureVersificationData(): Promise<void> {
  return ensureData("versification-mapping.json", setVersificationData);
}

// Simple mapping for book names to abbreviations used in the JSON
const BOOK_TO_ABBR: Record<string, string> = {
  "Genesis": "Gen", "Exodus": "Exo", "Leviticus": "Lev", "Numbers": "Num", "Deuteronomy": "Deu",
  "Joshua": "Jos", "Judges": "Jdg", "Ruth": "Rth", "1 Samuel": "1Sa", "2 Samuel": "2Sa",
  "1 Kings": "1Ki", "2 Kings": "2Ki", "1 Chronicles": "1Ch", "2 Chronicles": "2Ch",
  "Ezra": "Ezr", "Nehemiah": "Neh", "Esther": "Est", "Job": "Job", "Psalms": "Psa", "Proverbs": "Pro",
  "Ecclesiastes": "Ecc", "Song of Solomon": "Sol", "Isaiah": "Isa", "Jeremiah": "Jer", "Lamentations": "Lam",
  "Ezekiel": "Eze", "Daniel": "Dan", "Hosea": "Hos", "Joel": "Joe", "Amos": "Amo", "Obadiah": "Oba",
  "Jonah": "Jon", "Micah": "Mic", "Nahum": "Nah", "Habakkuk": "Hab", "Zephaniah": "Zep",
  "Haggai": "Hag", "Zechariah": "Zec", "Malachi": "Mal"
};

const ABBR_TO_BOOK: Record<string, string> = Object.fromEntries(
  Object.entries(BOOK_TO_ABBR).map(([k, v]) => [v, k])
);

/**
 * Maps an English ScriptureRef to its Swete LXX equivalent.
 */
export function mapToSwete(ref: ScriptureRef): ScriptureRef {
  const abbr = BOOK_TO_ABBR[ref.book];
  if (!abbr) return ref;

  // Guard the table, not just the object: the missing-file fallback injects
  // {} and a bare .eng2grk[key] access would throw on every LXX lookup.
  const table = (mappingData as any)?.eng2grk;
  if (!table) return ref;

  const key = `${abbr}.${ref.chapter}:${ref.verseStart}`;
  const range = rangeMappings.find(r => r.book === abbr && r.chapter === ref.chapter && r.first <= ref.verseStart && r.last >= ref.verseStart)
    ?? (ref.book === "Psalms" ? rangeMappings.find(r => r.book === abbr && r.chapter === ref.chapter && r.first <= 3 && ref.verseStart < r.first) : undefined);
  if (range) return {...ref, book: ABBR_TO_BOOK[range.toBook] ?? ref.book,
    chapter: range.toChapter, verseStart: range.toVerse + ref.verseStart - range.first};
  const mapped = table[key];
  const direct = typeof mapped === "string" ? mapped.match(/^([A-Za-z0-9]+)\.(\d+):(\d+)$/) : null;
  if (direct) return {...ref, book: ABBR_TO_BOOK[direct[1]] ?? ref.book, chapter: +direct[2], verseStart: +direct[3]};
  // Normal Psalm numbering between the explicitly split/merged ranges.
  if (ref.book === "Psalms") {
    const c = ref.chapter;
    if (c >= 11 && c <= 113 || c >= 117 && c <= 146) return {...ref, chapter: c - 1};
  }
  // Shipped Swete Joel/Malachi use the English chapter divisions.
  // Hebrew native chapter labels are handled separately by mapToHebrew.

  // If it's a relative mapping like "Acd. [3:1a]", we might need more logic.
  // For now, if it doesn't match the simple pattern, return original to avoid breaks.
  return ref;
}

/** Native Hebrew coordinate changes relative to the English chapter numbers. */
export function mapToHebrew(ref: ScriptureRef): ScriptureRef {
  if (ref.book === "Joel") {
    if (ref.chapter === 2 && ref.verseStart >= 28) return {...ref, chapter: 3, verseStart: ref.verseStart - 27};
    if (ref.chapter === 3) return {...ref, chapter: 4};
  }
  if (ref.book === "Malachi" && ref.chapter === 4) return {...ref, chapter: 3, verseStart: ref.verseStart + 18};
  return ref;
}
