import { ScriptureRef } from './parser';

let mappingData: Record<string, any> | null = null;

/** Called once from main.ts after the file is read from the plugin folder. */
export function setVersificationData(data: Record<string, any>): void {
  mappingData = data;
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

  if (!mappingData) return ref;

  const key = `${abbr}.${ref.chapter}:${ref.verseStart}`;
  const mapped = (mappingData as any).eng2grk[key];
  
  if (!mapped || mapped.includes("NotExist") || mapped.includes("Absent")) {
    return ref;
  }

  // Parse "Gen.2:25" or "Acd. [3:1a]" or "Nec. [31b]"
  // The mapping data is a bit complex. For simplicity, we try to extract chapter and verse.
  // Example "Gen.2:25" -> book=Gen, chapter=2, verse=25
  const match = mapped.match(/^([A-Z][a-z]{2})\.(\d+):(\d+)/);
  if (match) {
    const origRange = ref.verseEnd ? ref.verseEnd - ref.verseStart : 0;
    return {
      ...ref,
      book: ABBR_TO_BOOK[match[1]] || ref.book,
      chapter: parseInt(match[2], 10),
      verseStart: parseInt(match[3], 10),
      verseEnd: origRange > 0 ? parseInt(match[3], 10) + origRange : undefined
    };
  }

  // If it's a relative mapping like "Acd. [3:1a]", we might need more logic.
  // For now, if it doesn't match the simple pattern, return original to avoid breaks.
  return ref;
}
