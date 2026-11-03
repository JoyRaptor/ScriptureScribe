var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// <stdin>
var stdin_exports = {};
__export(stdin_exports, {
  DEFAULT_SETTINGS: () => DEFAULT_SETTINGS,
  VERSION_CODES: () => VERSION_CODES,
  buildInterlinearTable: () => buildInterlinearTable,
  buildLink: () => buildLink,
  buildQuoteBlock: () => buildQuoteBlock,
  buildSearchIndex: () => buildSearchIndex,
  buildTooltipRef: () => buildTooltipRef,
  buildVaultIndex: () => buildVaultIndex,
  buildVerseHighlightStyle: () => buildVerseHighlightStyle,
  classifyQuery: () => classifyQuery,
  clearCachedCursorOffset: () => clearCachedCursorOffset,
  clearDataLoader: () => clearDataLoader,
  configureDataLoader: () => configureDataLoader,
  configureSearchLoader: () => configureSearchLoader,
  embedAllRefs: () => embedAllRefs,
  embedAtCursor: () => embedAtCursor,
  embedInterlinear: () => embedInterlinear,
  embedSingleRef: () => embedSingleRef,
  ensureData: () => ensureData,
  ensureKJVData: () => ensureKJVData,
  ensureSearchIndex: () => ensureSearchIndex,
  ensureVersificationData: () => ensureVersificationData,
  expandRef: () => expandRef,
  getFormattedKJV: () => getFormattedKJV,
  getGlobalEmbedStyle: () => getGlobalEmbedStyle,
  getKJVData: () => getKJVData,
  getKJVText: () => getKJVText,
  getNotePathsForVerse: () => getNotePathsForVerse,
  getNotesForVerse: () => getNotesForVerse,
  getScripture: () => getScripture,
  getVaultHighlightTextColor: () => getVaultHighlightTextColor,
  getVaultIndex: () => getVaultIndex,
  isIndexBuilt: () => isIndexBuilt,
  isMorphIndexBuilt: () => isMorphIndexBuilt,
  isVaultIndexReady: () => isVaultIndexReady,
  isVaultIndexScanning: () => isVaultIndexScanning,
  mapToHebrew: () => mapToHebrew,
  mapToSwete: () => mapToSwete,
  maskMarkdown: () => maskMarkdown,
  morphSearch: () => morphSearch,
  notePathToColor: () => notePathToColor,
  onVaultIndexReady: () => onVaultIndexReady,
  parseScriptureRefs: () => parseScriptureRefs,
  refToString: () => refToString,
  refToUrlParam: () => refToUrlParam,
  removeVaultIndexFile: () => removeVaultIndexFile,
  search: () => search,
  setCachedCursorOffset: () => setCachedCursorOffset,
  setGlobalEmbedStyle: () => setGlobalEmbedStyle,
  setKJVData: () => setKJVData,
  setKJVStoreRef: () => setKJVStoreRef,
  setSweteData: () => setSweteData,
  setVaultHighlightSettings: () => setVaultHighlightSettings,
  setVersificationData: () => setVersificationData,
  stopVaultIndex: () => stopVaultIndex,
  updateVaultIndexForFile: () => updateVaultIndexForFile,
  verseCount: () => verseCount
});
module.exports = __toCommonJS(stdin_exports);

// src/bibleData.ts
var BIBLE_BOOKS = [
  { id: 1, name: "Genesis", abbrevs: ["Gen", "Ge", "Gn"], chapters: 50 },
  { id: 2, name: "Exodus", abbrevs: ["Ex", "Exo", "Exod"], chapters: 40 },
  { id: 3, name: "Leviticus", abbrevs: ["Lev", "Le", "Lv"], chapters: 27 },
  { id: 4, name: "Numbers", abbrevs: ["Num", "Nu", "Nm", "Nb"], chapters: 36 },
  { id: 5, name: "Deuteronomy", abbrevs: ["Deut", "De", "Dt"], chapters: 34 },
  { id: 6, name: "Joshua", abbrevs: ["Josh", "Jos", "Jsh"], chapters: 24 },
  { id: 7, name: "Judges", abbrevs: ["Judg", "Jdg", "Jg", "Jdgs"], chapters: 21 },
  { id: 8, name: "Ruth", abbrevs: ["Rth", "Ru"], chapters: 4 },
  { id: 9, name: "1 Samuel", abbrevs: ["1Sam", "1Sa", "1S", "1Sm"], chapters: 31 },
  { id: 10, name: "2 Samuel", abbrevs: ["2Sam", "2Sa", "2S", "2Sm"], chapters: 24 },
  { id: 11, name: "1 Kings", abbrevs: ["1Kgs", "1Ki", "1K"], chapters: 22 },
  { id: 12, name: "2 Kings", abbrevs: ["2Kgs", "2Ki", "2K"], chapters: 25 },
  { id: 13, name: "1 Chronicles", abbrevs: ["1Chr", "1Ch", "1Chron"], chapters: 29 },
  { id: 14, name: "2 Chronicles", abbrevs: ["2Chr", "2Ch", "2Chron"], chapters: 36 },
  { id: 15, name: "Ezra", abbrevs: ["Ezra", "Ezr"], chapters: 10 },
  { id: 16, name: "Nehemiah", abbrevs: ["Neh", "Ne"], chapters: 13 },
  { id: 17, name: "Esther", abbrevs: ["Esth", "Est", "Es"], chapters: 10 },
  { id: 18, name: "Job", abbrevs: ["Job", "Jb"], chapters: 42 },
  { id: 19, name: "Psalms", abbrevs: ["Psalm", "Ps", "Psa", "Psm", "Pss"], chapters: 150 },
  { id: 20, name: "Proverbs", abbrevs: ["Prov", "Pro", "Pr", "Prv"], chapters: 31 },
  { id: 21, name: "Ecclesiastes", abbrevs: ["Eccles", "Eccl", "Ecc", "Ec"], chapters: 12 },
  { id: 22, name: "Song of Solomon", abbrevs: ["Song", "So", "SOS", "Sg"], chapters: 8 },
  { id: 23, name: "Isaiah", abbrevs: ["Isa", "Is"], chapters: 66 },
  { id: 24, name: "Jeremiah", abbrevs: ["Jer", "Je", "Jr"], chapters: 52 },
  { id: 25, name: "Lamentations", abbrevs: ["Lam", "La"], chapters: 5 },
  { id: 26, name: "Ezekiel", abbrevs: ["Ezek", "Eze", "Ezk"], chapters: 48 },
  { id: 27, name: "Daniel", abbrevs: ["Dan", "Da", "Dn"], chapters: 12 },
  { id: 28, name: "Hosea", abbrevs: ["Hos", "Ho"], chapters: 14 },
  { id: 29, name: "Joel", abbrevs: ["Joel", "Joe", "Jl"], chapters: 3 },
  { id: 30, name: "Amos", abbrevs: ["Amos", "Am"], chapters: 9 },
  { id: 31, name: "Obadiah", abbrevs: ["Obad", "Ob"], chapters: 1 },
  { id: 32, name: "Jonah", abbrevs: ["Jonah", "Jon", "Jnh"], chapters: 4 },
  { id: 33, name: "Micah", abbrevs: ["Mic", "Mc"], chapters: 7 },
  { id: 34, name: "Nahum", abbrevs: ["Nah", "Na"], chapters: 3 },
  { id: 35, name: "Habakkuk", abbrevs: ["Hab", "Hb"], chapters: 3 },
  { id: 36, name: "Zephaniah", abbrevs: ["Zeph", "Zep", "Zp"], chapters: 3 },
  { id: 37, name: "Haggai", abbrevs: ["Hag", "Hg"], chapters: 2 },
  { id: 38, name: "Zechariah", abbrevs: ["Zech", "Zec", "Zc"], chapters: 14 },
  { id: 39, name: "Malachi", abbrevs: ["Mal", "Ml"], chapters: 4 },
  { id: 40, name: "Matthew", abbrevs: ["Matt", "Mt"], chapters: 28 },
  { id: 41, name: "Mark", abbrevs: ["Mark", "Mk", "Mr"], chapters: 16 },
  { id: 42, name: "Luke", abbrevs: ["Luke", "Lk", "Lu"], chapters: 24 },
  { id: 43, name: "John", abbrevs: ["John", "Jn", "Jhn"], chapters: 21 },
  { id: 44, name: "Acts", abbrevs: ["Acts", "Ac"], chapters: 28 },
  { id: 45, name: "Romans", abbrevs: ["Rom", "Ro", "Rm"], chapters: 16 },
  { id: 46, name: "1 Corinthians", abbrevs: ["1Cor", "1Co", "1C"], chapters: 16 },
  { id: 47, name: "2 Corinthians", abbrevs: ["2Cor", "2Co", "2C"], chapters: 13 },
  { id: 48, name: "Galatians", abbrevs: ["Gal", "Ga"], chapters: 6 },
  { id: 49, name: "Ephesians", abbrevs: ["Eph", "Ep"], chapters: 6 },
  { id: 50, name: "Philippians", abbrevs: ["Phil", "Php", "Pp"], chapters: 4 },
  { id: 51, name: "Colossians", abbrevs: ["Col", "Co"], chapters: 4 },
  { id: 52, name: "1 Thessalonians", abbrevs: ["1Thess", "1Th"], chapters: 5 },
  { id: 53, name: "2 Thessalonians", abbrevs: ["2Thess", "2Th"], chapters: 3 },
  { id: 54, name: "1 Timothy", abbrevs: ["1Tim", "1Ti", "1Tm"], chapters: 6 },
  { id: 55, name: "2 Timothy", abbrevs: ["2Tim", "2Ti", "2Tm"], chapters: 4 },
  { id: 56, name: "Titus", abbrevs: ["Titus", "Tit", "Ti"], chapters: 3 },
  { id: 57, name: "Philemon", abbrevs: ["Philem", "Phm", "Pm"], chapters: 1 },
  { id: 58, name: "Hebrews", abbrevs: ["Heb", "He"], chapters: 13 },
  { id: 59, name: "James", abbrevs: ["Jas", "Jm"], chapters: 5 },
  { id: 60, name: "1 Peter", abbrevs: ["1Pet", "1Pe", "1P"], chapters: 5 },
  { id: 61, name: "2 Peter", abbrevs: ["2Pet", "2Pe", "2P"], chapters: 3 },
  { id: 62, name: "1 John", abbrevs: ["1John", "1Jn", "1Jhn"], chapters: 5 },
  { id: 63, name: "2 John", abbrevs: ["2John", "2Jn", "2Jhn"], chapters: 1 },
  { id: 64, name: "3 John", abbrevs: ["3John", "3Jn", "3Jhn"], chapters: 1 },
  { id: 65, name: "Jude", abbrevs: ["Jude", "Jud"], chapters: 1 },
  { id: 66, name: "Revelation", abbrevs: ["Rev", "Re", "Rv"], chapters: 22 },
  // ── Apocrypha / Deuterocanonical (LXX) ────────────────────────────────────
  { id: 67, name: "Tobit", abbrevs: ["Tob", "Tb"], chapters: 14 },
  { id: 68, name: "Judith", abbrevs: ["Jdt", "Jth"], chapters: 16 },
  { id: 69, name: "1 Maccabees", abbrevs: ["1Mac", "1Ma", "1Macc"], chapters: 16 },
  { id: 70, name: "2 Maccabees", abbrevs: ["2Mac", "2Ma", "2Macc"], chapters: 15 },
  { id: 71, name: "3 Maccabees", abbrevs: ["3Mac", "3Ma", "3Macc"], chapters: 7 },
  { id: 72, name: "4 Maccabees", abbrevs: ["4Mac", "4Ma", "4Macc"], chapters: 18 },
  { id: 73, name: "Wisdom", abbrevs: ["Wis", "Ws"], chapters: 19 },
  { id: 74, name: "Sirach", abbrevs: ["Sir", "Sira", "Ecclus"], chapters: 51 },
  { id: 75, name: "Baruch", abbrevs: ["Bar", "Ba"], chapters: 5 },
  { id: 76, name: "1 Esdras", abbrevs: ["1Esd", "1Es"], chapters: 9 },
  { id: 77, name: "Epistle of Jeremiah", abbrevs: ["EpJer", "Epj"], chapters: 1 },
  { id: 78, name: "Susanna", abbrevs: ["Sus", "Suz"], chapters: 1 },
  { id: 79, name: "Bel and the Dragon", abbrevs: ["Bel", "BelDr"], chapters: 1 },
  { id: 80, name: "1 Enoch", abbrevs: ["1En", "1Enoch"], chapters: 108 },
  { id: 81, name: "Psalms of Solomon", abbrevs: ["PsSol"], chapters: 18 },
  { id: 82, name: "Odes", abbrevs: ["Ode", "Odes"], chapters: 14 },
  { id: 83, name: "Sirach Prologue", abbrevs: ["SirPro", "Sip"], chapters: 1 },
  { id: 84, name: "Tobit (S)", abbrevs: ["TobS", "Tbs"], chapters: 14 },
  { id: 85, name: "Daniel (Th)", abbrevs: ["DanTh", "Dat"], chapters: 12 },
  { id: 86, name: "Susanna (Th)", abbrevs: ["SusTh", "Sut"], chapters: 1 },
  { id: 87, name: "Bel (Th)", abbrevs: ["BelTh", "Bet"], chapters: 1 }
];
var BOOK_LOOKUP = /* @__PURE__ */ new Map();
for (const book of BIBLE_BOOKS) {
  BOOK_LOOKUP.set(book.name.toLowerCase().replace(/\s+/g, ""), book.name);
  BOOK_LOOKUP.set(book.name.toLowerCase(), book.name);
  for (const abbr of book.abbrevs) {
    BOOK_LOOKUP.set(abbr.toLowerCase(), book.name);
  }
  const romanMatch = book.name.match(/^([123])\s+(.+)$/);
  if (romanMatch) {
    const roman = ["", "I", "II", "III"][parseInt(romanMatch[1])];
    if (roman) {
      BOOK_LOOKUP.set(`${roman} ${romanMatch[2]}`.toLowerCase(), book.name);
      BOOK_LOOKUP.set(`${roman}${romanMatch[2]}`.toLowerCase().replace(/\s+/g, ""), book.name);
    }
  }
}
BOOK_LOOKUP.set("revelation of john", "Revelation");
BOOK_LOOKUP.set("revelationofjohn", "Revelation");
BOOK_LOOKUP.set("the revelation of john", "Revelation");

// src/verseCounts.json
var verseCounts_default = { Genesis: [31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18, 34, 24, 20, 67, 34, 35, 46, 22, 35, 43, 55, 32, 20, 31, 29, 43, 36, 30, 23, 23, 57, 38, 34, 34, 28, 34, 31, 22, 33, 26], Exodus: [22, 25, 22, 31, 23, 30, 25, 32, 35, 29, 10, 51, 22, 31, 27, 36, 16, 27, 25, 26, 36, 31, 33, 18, 40, 37, 21, 43, 46, 38, 18, 35, 23, 35, 35, 38, 29, 31, 43, 38], Leviticus: [17, 16, 17, 35, 19, 30, 38, 36, 24, 20, 47, 8, 59, 57, 33, 34, 16, 30, 37, 27, 24, 33, 44, 23, 55, 46, 34], Numbers: [54, 34, 51, 49, 31, 27, 89, 26, 23, 36, 35, 16, 33, 45, 41, 50, 13, 32, 22, 29, 35, 41, 30, 25, 18, 65, 23, 31, 40, 16, 54, 42, 56, 29, 34, 13], Deuteronomy: [46, 37, 29, 49, 33, 25, 26, 20, 29, 22, 32, 32, 18, 29, 23, 22, 20, 22, 21, 20, 23, 30, 25, 22, 19, 19, 26, 68, 29, 20, 30, 52, 29, 12], Joshua: [18, 24, 17, 24, 15, 27, 26, 35, 27, 43, 23, 24, 33, 15, 63, 10, 18, 28, 51, 9, 45, 34, 16, 33], Judges: [36, 23, 31, 24, 31, 40, 25, 35, 57, 18, 40, 15, 25, 20, 20, 31, 13, 31, 30, 48, 25], Ruth: [22, 23, 18, 22], "1 Samuel": [28, 36, 21, 22, 12, 21, 17, 22, 27, 27, 15, 25, 23, 52, 35, 23, 58, 30, 24, 42, 15, 23, 29, 22, 44, 25, 12, 25, 11, 31, 13], "2 Samuel": [27, 32, 39, 12, 25, 23, 29, 18, 13, 19, 27, 31, 39, 33, 37, 23, 29, 33, 43, 26, 22, 51, 39, 25], "1 Kings": [53, 46, 28, 34, 18, 38, 51, 66, 28, 29, 43, 33, 34, 31, 34, 34, 24, 46, 21, 43, 29, 53], "2 Kings": [18, 25, 27, 44, 27, 33, 20, 29, 37, 36, 21, 21, 25, 29, 38, 20, 41, 37, 37, 21, 26, 20, 37, 20, 30], "1 Chronicles": [54, 55, 24, 43, 26, 81, 40, 40, 44, 14, 47, 40, 14, 17, 29, 43, 27, 17, 19, 8, 30, 19, 32, 31, 31, 32, 34, 21, 30], "2 Chronicles": [17, 18, 17, 22, 14, 42, 22, 18, 31, 19, 23, 16, 22, 15, 19, 14, 19, 34, 11, 37, 20, 12, 21, 27, 28, 23, 9, 27, 36, 27, 21, 33, 25, 33, 27, 23], Ezra: [11, 70, 13, 24, 17, 22, 28, 36, 15, 44], Nehemiah: [11, 20, 32, 23, 19, 19, 73, 18, 38, 39, 36, 47, 31], Esther: [22, 23, 15, 17, 14, 14, 10, 17, 32, 3], Job: [22, 13, 26, 21, 27, 30, 21, 22, 35, 22, 20, 25, 28, 22, 35, 22, 16, 21, 29, 29, 34, 30, 17, 25, 6, 14, 23, 28, 25, 31, 40, 22, 33, 37, 16, 33, 24, 41, 30, 24, 34, 17], Psalms: [6, 12, 8, 8, 12, 10, 17, 9, 20, 18, 7, 8, 6, 7, 5, 11, 15, 50, 14, 9, 13, 31, 6, 10, 22, 12, 14, 9, 11, 12, 24, 11, 22, 22, 28, 12, 40, 22, 13, 17, 13, 11, 5, 26, 17, 11, 9, 14, 20, 23, 19, 9, 6, 7, 23, 13, 11, 11, 17, 12, 8, 12, 11, 10, 13, 20, 7, 35, 36, 5, 24, 20, 28, 23, 10, 12, 20, 72, 13, 19, 16, 8, 18, 12, 13, 17, 7, 18, 52, 17, 16, 15, 5, 23, 11, 13, 12, 9, 9, 5, 8, 28, 22, 35, 45, 48, 43, 13, 31, 7, 10, 10, 9, 8, 18, 19, 2, 29, 176, 7, 8, 9, 4, 8, 5, 6, 5, 6, 8, 8, 3, 18, 3, 3, 21, 26, 9, 8, 24, 13, 10, 7, 12, 15, 21, 10, 20, 14, 9, 6], Proverbs: [33, 22, 35, 27, 23, 35, 27, 36, 18, 32, 31, 28, 25, 35, 33, 33, 28, 24, 29, 30, 31, 29, 35, 34, 28, 28, 27, 28, 27, 33, 31], Ecclesiastes: [18, 26, 22, 16, 20, 12, 29, 17, 18, 20, 10, 14], "Song of Solomon": [17, 17, 11, 16, 16, 13, 13, 14], Isaiah: [31, 22, 26, 6, 30, 13, 25, 22, 21, 34, 16, 6, 22, 32, 9, 14, 14, 7, 25, 6, 17, 25, 18, 23, 12, 21, 13, 29, 24, 33, 9, 20, 24, 17, 10, 22, 38, 22, 8, 31, 29, 25, 28, 28, 25, 13, 15, 22, 26, 11, 23, 15, 12, 17, 13, 12, 21, 14, 21, 22, 11, 12, 19, 12, 25, 24], Jeremiah: [19, 37, 25, 31, 31, 30, 34, 22, 26, 25, 23, 17, 27, 22, 21, 21, 27, 23, 15, 18, 14, 30, 40, 10, 38, 24, 22, 17, 32, 24, 40, 44, 26, 22, 19, 32, 21, 28, 18, 16, 18, 22, 13, 30, 5, 28, 7, 47, 39, 46, 64, 34], Lamentations: [22, 22, 66, 22, 22], Ezekiel: [28, 10, 27, 17, 17, 14, 27, 18, 11, 22, 25, 28, 23, 23, 8, 63, 24, 32, 14, 49, 32, 31, 49, 27, 17, 21, 36, 26, 21, 26, 18, 32, 33, 31, 15, 38, 28, 23, 29, 49, 26, 20, 27, 31, 25, 24, 23, 35], Daniel: [21, 49, 30, 37, 31, 28, 28, 27, 27, 21, 45, 13], Hosea: [11, 23, 5, 19, 15, 11, 16, 14, 17, 15, 12, 14, 16, 9], Joel: [20, 32, 21], Amos: [15, 16, 15, 13, 27, 14, 17, 14, 15], Obadiah: [21], Jonah: [17, 10, 10, 11], Micah: [16, 13, 12, 13, 15, 16, 20], Nahum: [15, 13, 19], Habakkuk: [17, 20, 19], Zephaniah: [18, 15, 20], Haggai: [15, 23], Zechariah: [21, 13, 10, 14, 11, 15, 14, 23, 17, 12, 17, 14, 9, 21], Malachi: [14, 17, 18, 6], Matthew: [25, 23, 17, 25, 48, 34, 29, 34, 38, 42, 30, 50, 58, 36, 39, 28, 27, 35, 30, 34, 46, 46, 39, 51, 46, 75, 66, 20], Mark: [45, 28, 35, 41, 43, 56, 37, 38, 50, 52, 33, 44, 37, 72, 47, 20], Luke: [80, 52, 38, 44, 39, 49, 50, 56, 62, 42, 54, 59, 35, 35, 32, 31, 37, 43, 48, 47, 38, 71, 56, 53], John: [51, 25, 36, 54, 47, 71, 53, 59, 41, 42, 57, 50, 38, 31, 27, 33, 26, 40, 42, 31, 25], Acts: [26, 47, 26, 37, 42, 15, 60, 40, 43, 48, 30, 25, 52, 28, 41, 40, 34, 28, 41, 38, 40, 30, 35, 27, 27, 32, 44, 31], Romans: [32, 29, 31, 25, 21, 23, 25, 39, 33, 21, 36, 21, 14, 23, 33, 27], "1 Corinthians": [31, 16, 23, 21, 13, 20, 40, 13, 27, 33, 34, 31, 13, 40, 58, 24], "2 Corinthians": [24, 17, 18, 18, 21, 18, 16, 24, 15, 18, 33, 21, 14], Galatians: [24, 21, 29, 31, 26, 18], Ephesians: [23, 22, 21, 32, 33, 24], Philippians: [30, 30, 21, 23], Colossians: [29, 23, 25, 18], "1 Thessalonians": [10, 20, 13, 18, 28], "2 Thessalonians": [12, 17, 18], "1 Timothy": [20, 15, 16, 16, 25, 21], "2 Timothy": [18, 26, 17, 22], Titus: [16, 15, 15], Philemon: [25], Hebrews: [14, 18, 19, 16, 14, 20, 28, 13, 28, 39, 40, 29, 25], James: [27, 26, 18, 17, 20], "1 Peter": [25, 25, 22, 19, 14], "2 Peter": [21, 22, 18], "1 John": [10, 29, 24, 21, 21], "2 John": [13], "3 John": [14], Jude: [25], Revelation: [20, 29, 22, 11, 14, 17, 17, 13, 21, 11, 19, 17, 18, 20, 8, 21, 18, 24, 21, 15, 27, 21], Tobit: [22, 14, 17, 21, 22, 17, 18, 21, 6, 12, 19, 22, 18, 15], Judith: [16, 28, 10, 15, 24, 21, 32, 36, 14, 23, 23, 20, 20, 19, 13, 25], Wisdom: [16, 24, 19, 20, 23, 25, 30, 21, 18, 21, 26, 27, 19, 31, 19, 29, 21, 25, 22], Sirach: [30, 18, 31, 31, 15, 37, 36, 19, 18, 31, 34, 18, 26, 27, 20, 30, 32, 33, 30, 32, 28, 27, 28, 34, 26, 29, 30, 26, 28, 25, 31, 24, 31, 26, 20, 26, 31, 34, 35, 30, 24, 25, 33, 23, 26, 20, 25, 25, 16, 29, 30], Baruch: [22, 35, 37, 37, 9, 73], "Song of Three Youths": [68], Susanna: [64], "Bel and the Dragon": [42], "1 Maccabees": [64, 70, 60, 61, 68, 63, 50, 32, 73, 89, 74, 53, 53, 49, 41, 24], "2 Maccabees": [36, 32, 40, 50, 27, 31, 42, 36, 29, 38, 38, 45, 26, 46, 39], "1 Esdras": [58, 30, 24, 63, 73, 34, 15, 96, 55], "Prayer of Manasseh": [15], "2 Esdras": [40, 48, 36, 52, 56, 59, 70, 63, 47, 59, 46, 51, 58, 48, 63, 78], "Additions to Esther": [0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 12, 6, 18, 19, 16, 24], "3 Maccabees": [29, 33, 30, 21, 51, 41, 23], "4 Maccabees": [35, 24, 21, 26, 38, 35, 25, 28, 32, 21, 27, 20, 27, 20, 32, 25, 24, 24], "1 Enoch": [9, 3, 1, 1, 9, 8, 6, 4, 11, 22, 2, 6, 10, 25, 12, 4, 7, 16, 3, 7, 10, 14, 4, 6, 7, 6, 5, 3, 3, 3, 3, 6, 4, 3, 1, 4, 5, 6, 13, 10, 9, 3, 4, 1, 6, 8, 4, 10, 4, 5, 5, 9, 7, 10, 4, 8, 3, 6, 3, 25, 13, 16, 12, 2, 12, 3, 13, 5, 29, 4, 17, 37, 8, 17, 8, 14, 8, 17, 6, 7, 10, 20, 11, 5, 10, 6, 4, 2, 77, 42, 11, 5, 19, 11, 7, 8, 10, 15, 16, 13, 9, 11, 15, 13, 2, 19, 3, 15] };

// src/parser.ts
var counts = verseCounts_default;
var metadata = new Map(BIBLE_BOOKS.map((b) => [b.name, b]));
var DASH = "[-\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE63\uFF0D]";
var address = `(\\d{1,3})(?:[:.](\\d{1,3})(?:[abc]|ff?)?)?(?:[ \\t]*${DASH}[ \\t]*(\\d{1,3})(?:[:.](\\d{1,3}))?(?:[abc]|ff?)?)?(?![\\w:])`;
var escapeRE = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
var names = new Map(BOOK_LOOKUP);
for (const [alias, book] of BOOK_LOOKUP) {
  const m = alias.match(/^([1234])\s*(.+)$/);
  if (!m)
    continue;
  const n = Number(m[1]);
  names.set(`${n} ${m[2]}`, book);
  for (const prefix of [["", "I", "II", "III", "IV"][n], ["", "First", "Second", "Third", "Fourth"][n], `${n}${["", "st", "nd", "rd", "th"][n]}`]) {
    names.set(`${prefix.toLowerCase()} ${m[2]}`, book);
  }
}
var bookPattern = [...names.keys()].sort((a, b) => b.length - a.length).map((n) => escapeRE(n).replace(/\s+/g, "[ \\t]+")).join("|");
var primaryRE = new RegExp(`\\b(${bookPattern})\\.?([ \\t]*)${address}`, "gi");
var continuationRE = new RegExp(`^[ \\t]*;[ \\t]*${address}`, "i");
var markerRE = new RegExp(`\\b(?:vv?\\.?|ver\\.?|verses?)[ \\t]*(\\d{1,3})(?:[abc]|ff?)?(?:[ \\t]*${DASH}[ \\t]*(\\d{1,3})(?:[abc]|ff?)?)?(?!\\w)`, "g");
function maskMarkdown(text) {
  const blank = (s) => s.replace(/[^\r\n]/g, " ");
  let masked = text.replace(/^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[^\S\r\n]*(?:\r?\n|$)/, blank);
  masked = masked.replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\1[^\n]*(?:\n|$)|(?![\s\S]))/gm, blank);
  masked = masked.replace(/(`+)[\s\S]*?\1/g, blank);
  masked = masked.replace(/!?\[\[[\s\S]*?\]\]/g, blank);
  masked = masked.replace(/!?\[(?:\\.|[^\]\\])*\]\((?:\\.|[^()\n]|\([^()\n]*\))*\)/g, blank);
  masked = masked.replace(/!?\[(?:\\.|[^\]\\])*\]\[[^\]\n]*\]|^ {0,3}\[[^\]\n]+\]:[^\n]*|<https?:\/\/[^>]+>/gm, blank);
  return masked;
}
function verseCount(book, chapter) {
  return book === "Psalms" && chapter === 151 ? 7 : counts[book]?.[chapter - 1] ?? 0;
}
function valid(ref, translation) {
  const max = metadata.get(ref.book)?.chapters ?? 0;
  const lxxPsalm = translation === "LXX" && ref.book === "Psalms" && ref.chapter === 151;
  if (ref.chapter < 1 || ref.chapter > max && !lxxPsalm)
    return false;
  const endChapter = ref.chapterEnd ?? ref.chapter;
  if (endChapter < ref.chapter || endChapter > (lxxPsalm ? 151 : max))
    return false;
  if (ref.chapterOnly)
    return true;
  const end = ref.verseEnd ?? ref.verseStart;
  if (ref.verseStart < 1 || end < 1 || endChapter === ref.chapter && end < ref.verseStart)
    return false;
  const startMax = lxxPsalm ? 7 : verseCount(ref.book, ref.chapter);
  const endMax = lxxPsalm ? 7 : verseCount(ref.book, endChapter);
  return (!startMax || ref.verseStart <= startMax) && (!endMax || end <= endMax) && !(ref.additionalVerses ?? []).some((v) => v < 1 || startMax > 0 && v > startMax);
}
function makeRef(book, a, start, end, text) {
  const loneVerse = metadata.get(book)?.chapters === 1 && !a[1];
  return {
    book,
    chapter: loneVerse ? 1 : Number(a[0]),
    verseStart: loneVerse ? Number(a[0]) : Number(a[1] ?? 1),
    chapterOnly: !a[1] && !loneVerse,
    chapterEnd: a[3] || !a[1] && !loneVerse && a[2] ? Number(a[2]) : void 0,
    verseEnd: a[2] && (a[1] || loneVerse) ? Number(a[3] ?? a[2]) : void 0,
    start,
    end,
    raw: text.slice(start, end)
  };
}
function parseScriptureRefs(text, translation = "KJV") {
  const scan = maskMarkdown(text);
  const results = [];
  primaryRE.lastIndex = 0;
  let m;
  while (m = primaryRE.exec(scan)) {
    const book = names.get(m[1].toLowerCase().replace(/\s+/g, " "));
    if (/\b(?:[1-4]|I{1,3}|IV|First|Second|Third|Fourth|[1-4](?:st|nd|rd|th))[ \t]+$/i.test(scan.slice(Math.max(0, m.index - 14), m.index)))
      continue;
    if (!m[2] && !m[4])
      continue;
    const ref = makeRef(book, m.slice(3, 7), m.index, primaryRE.lastIndex, text);
    if (!valid(ref, translation))
      continue;
    if (!ref.chapterOnly && !ref.chapterEnd) {
      let cm2;
      while (cm2 = /^[ \t]*,[ \t]*(\d{1,3})(?=[ \t]*(?:[,;\])}.!?]|$|\r?$))/m.exec(scan.slice(ref.end))) {
        const v = Number(cm2[1]);
        if (v < 1 || verseCount(book, ref.chapter) && v > verseCount(book, ref.chapter))
          break;
        (ref.additionalVerses ?? (ref.additionalVerses = [])).push(v);
        ref.end += cm2[0].length;
      }
      ref.raw = text.slice(ref.start, ref.end);
    }
    results.push(ref);
    let cursor = ref.end;
    let cm;
    while (cm = continuationRE.exec(scan.slice(cursor))) {
      const next = makeRef(book, cm.slice(1, 5), cursor + cm[0].search(/\d/), cursor + cm[0].length, text);
      if (!valid(next, translation))
        break;
      results.push(next);
      cursor = next.end;
    }
    primaryRE.lastIndex = cursor;
  }
  const anchors = results.slice();
  let anchor;
  let i = 0;
  markerRE.lastIndex = 0;
  while (m = markerRE.exec(scan)) {
    while (i < anchors.length && anchors[i].end <= m.index)
      anchor = anchors[i++];
    if (!anchor || anchors.some((r) => r.start <= m.index && r.end > m.index))
      continue;
    const gap = scan.slice(anchor.end, m.index);
    const anchorLine = scan.slice(scan.lastIndexOf("\n", anchor.start) + 1, anchor.start);
    if (/\n[ \t]*\r?\n|(?:^|\n)[ \t]*#{1,6}[ \t]/.test(gap) || /\n/.test(gap) && /^\s*#{1,6}\s/.test(anchorLine))
      continue;
    const ref = {
      book: anchor.book,
      chapter: anchor.chapterEnd ?? anchor.chapter,
      verseStart: Number(m[1]),
      verseEnd: m[2] ? Number(m[2]) : void 0,
      raw: m[0],
      start: m.index,
      end: markerRE.lastIndex
    };
    if (valid(ref, translation))
      results.push(ref);
  }
  return results.sort((a, b) => a.start - b.start);
}
function expandRef(ref) {
  const verses = [];
  const endChapter = ref.chapterEnd ?? ref.chapter;
  for (let chapter = ref.chapter; chapter <= endChapter; chapter++) {
    const start = ref.chapterOnly || chapter > ref.chapter ? 1 : ref.verseStart;
    const end = ref.chapterOnly || chapter < endChapter ? verseCount(ref.book, chapter) : ref.verseEnd ?? ref.verseStart;
    for (let verse = start; verse <= end && verses.length < 5e3; verse++)
      verses.push({ chapter, verse });
  }
  for (const verse of ref.additionalVerses ?? [])
    if (!verses.some((v) => v.chapter === ref.chapter && v.verse === verse))
      verses.push({ chapter: ref.chapter, verse });
  return verses;
}
function refToString(ref) {
  let s = `${ref.book} ${ref.chapter}`;
  if (ref.chapterOnly && ref.chapterEnd)
    s += `-${ref.chapterEnd}`;
  if (!ref.chapterOnly && ref.verseStart) {
    s += `:${ref.verseStart}`;
    if (ref.verseEnd)
      s += `-${ref.chapterEnd ? `${ref.chapterEnd}:` : ""}${ref.verseEnd}`;
    if (ref.additionalVerses?.length)
      s += `,${ref.additionalVerses.join(",")}`;
  }
  return s;
}
function refToUrlParam(ref) {
  return encodeURIComponent(refToString(ref)).replace(/%20/g, "+");
}

// scripts/stubs/obsidian.mjs
var normalizePath = (p) => p;
var Notice = class {
};
var TFile = class {
};

// src/dataLoader.ts
var directory = "";
var adapter = null;
var generation = 0;
var pending = /* @__PURE__ */ new Map();
function configureDataLoader(dir, vaultAdapter) {
  directory = dir;
  adapter = vaultAdapter;
  generation++;
  pending.clear();
}
function ensureData(file, setter) {
  if (!adapter)
    return Promise.resolve();
  const existing = pending.get(file);
  if (existing)
    return existing;
  const current = generation;
  const task = adapter.read(normalizePath(`${directory}/${file}`)).then((raw) => {
    if (current === generation)
      setter(JSON.parse(raw));
  }).catch((error) => {
    pending.delete(file);
    console.warn(`ScriptureScribe: could not load ${file}`, error);
  });
  pending.set(file, task);
  return task;
}
function clearDataLoader() {
  adapter = null;
  generation++;
  pending.clear();
}

// src/versification.ts
var rangeMappings = [];
var mappingData = null;
function setVersificationData(data) {
  mappingData = data;
  rangeMappings.length = 0;
  for (const [key, value] of Object.entries(data.eng2grk ?? {})) {
    const a = key.match(/^([A-Za-z0-9]+)\.(\d+):(\d+)-(\d+)$/);
    const b = value.match(/^([A-Za-z0-9]+)\.(\d+):(\d+)-(\d+)$/);
    if (a && b)
      rangeMappings.push({ book: a[1], chapter: +a[2], first: +a[3], last: +a[4], toBook: b[1], toChapter: +b[2], toVerse: +b[3] });
  }
}
function ensureVersificationData() {
  return ensureData("versification-mapping.json", setVersificationData);
}
var BOOK_TO_ABBR = {
  "Genesis": "Gen",
  "Exodus": "Exo",
  "Leviticus": "Lev",
  "Numbers": "Num",
  "Deuteronomy": "Deu",
  "Joshua": "Jos",
  "Judges": "Jdg",
  "Ruth": "Rth",
  "1 Samuel": "1Sa",
  "2 Samuel": "2Sa",
  "1 Kings": "1Ki",
  "2 Kings": "2Ki",
  "1 Chronicles": "1Ch",
  "2 Chronicles": "2Ch",
  "Ezra": "Ezr",
  "Nehemiah": "Neh",
  "Esther": "Est",
  "Job": "Job",
  "Psalms": "Psa",
  "Proverbs": "Pro",
  "Ecclesiastes": "Ecc",
  "Song of Solomon": "Sol",
  "Isaiah": "Isa",
  "Jeremiah": "Jer",
  "Lamentations": "Lam",
  "Ezekiel": "Eze",
  "Daniel": "Dan",
  "Hosea": "Hos",
  "Joel": "Joe",
  "Amos": "Amo",
  "Obadiah": "Oba",
  "Jonah": "Jon",
  "Micah": "Mic",
  "Nahum": "Nah",
  "Habakkuk": "Hab",
  "Zephaniah": "Zep",
  "Haggai": "Hag",
  "Zechariah": "Zec",
  "Malachi": "Mal"
};
var ABBR_TO_BOOK = Object.fromEntries(
  Object.entries(BOOK_TO_ABBR).map(([k, v]) => [v, k])
);
function mapToSwete(ref) {
  const abbr = BOOK_TO_ABBR[ref.book];
  if (!abbr)
    return ref;
  const table = mappingData?.eng2grk;
  if (!table)
    return ref;
  const key = `${abbr}.${ref.chapter}:${ref.verseStart}`;
  const range = rangeMappings.find((r) => r.book === abbr && r.chapter === ref.chapter && r.first <= ref.verseStart && r.last >= ref.verseStart) ?? (ref.book === "Psalms" ? rangeMappings.find((r) => r.book === abbr && r.chapter === ref.chapter && r.first <= 3 && ref.verseStart < r.first) : void 0);
  if (range)
    return {
      ...ref,
      book: ABBR_TO_BOOK[range.toBook] ?? ref.book,
      chapter: range.toChapter,
      verseStart: range.toVerse + ref.verseStart - range.first
    };
  const mapped = table[key];
  const direct = typeof mapped === "string" ? mapped.match(/^([A-Za-z0-9]+)\.(\d+):(\d+)$/) : null;
  if (direct)
    return { ...ref, book: ABBR_TO_BOOK[direct[1]] ?? ref.book, chapter: +direct[2], verseStart: +direct[3] };
  if (ref.book === "Psalms") {
    const c = ref.chapter;
    if (c >= 11 && c <= 113 || c >= 117 && c <= 146)
      return { ...ref, chapter: c - 1 };
  }
  return ref;
}
function mapToHebrew(ref) {
  if (ref.book === "Joel") {
    if (ref.chapter === 2 && ref.verseStart >= 28)
      return { ...ref, chapter: 3, verseStart: ref.verseStart - 27 };
    if (ref.chapter === 3)
      return { ...ref, chapter: 4 };
  }
  if (ref.book === "Malachi" && ref.chapter === 4)
    return { ...ref, chapter: 3, verseStart: ref.verseStart + 18 };
  return ref;
}

// src/semanticSearch.ts
var verseRefs = null;
var verseVectors = null;
var dims = 384;
var semanticApp;
var semanticDir = "";
var vectorsTask = null;
var embeddingPipeline = null;
var pipelineSource = "none";
var pipelineLoadAttempted = false;
var _ROMAN_TO_ARABIC = [
  [/^III\s+/, "3 "],
  [/^II\s+/, "2 "],
  [/^I\s+/, "1 "]
];
var _LONG_ALIASES = [
  [/^Revelation of John\s/, "Revelation "],
  [/^Song of Songs\s/, "Song of Solomon "]
];
function normalizeVerseRef(ref) {
  let r = ref;
  for (const [re, rep] of _LONG_ALIASES) {
    if (re.test(r)) {
      r = r.replace(re, rep);
      break;
    }
  }
  for (const [re, rep] of _ROMAN_TO_ARABIC) {
    if (re.test(r)) {
      r = r.replace(re, rep);
      break;
    }
  }
  return r;
}
var F16_LUT = null;
function buildF16Lut() {
  const lut = new Float32Array(65536);
  for (let f16 = 0; f16 < 65536; f16++) {
    const sign = f16 >> 15 & 1;
    const exp = f16 >> 10 & 31;
    const mant = f16 & 1023;
    if (exp === 0)
      lut[f16] = (sign ? -1 : 1) * Math.pow(2, -14) * (mant / 1024);
    else if (exp === 31)
      lut[f16] = mant ? NaN : sign ? -Infinity : Infinity;
    else
      lut[f16] = (sign ? -1 : 1) * Math.pow(2, exp - 15) * (1 + mant / 1024);
  }
  return lut;
}
var verseVectorsF16 = null;
function ensureVectorsDecoded() {
  if (verseVectors || !verseVectorsF16)
    return;
  const lut = F16_LUT ?? (F16_LUT = buildF16Lut());
  const f16 = verseVectorsF16;
  const out = new Float32Array(f16.length);
  for (let i = 0; i < f16.length; i++)
    out[i] = lut[f16[i]];
  verseVectors = out;
  verseVectorsF16 = null;
  console.log(`ScriptureScribe: decoded ${out.length / dims} verse vectors (${dims}d float16\u2192f32)`);
}
async function loadVerseVectors(app, pluginDir) {
  if (verseVectors || verseVectorsF16)
    return;
  try {
    const binPath = `${pluginDir}/verse-vectors.bin`;
    if (!await app.vault.adapter.exists(binPath)) {
      console.warn("ScriptureScribe: verse-vectors.bin not found \u2014 semantic search falls back to TF-IDF.");
      return;
    }
    const buf = await app.vault.adapter.readBinary(binPath);
    const dv = new DataView(buf);
    const verseCount2 = dv.getUint32(0, true);
    dims = dv.getUint32(4, true);
    const refsLen = dv.getUint32(8, true);
    const rawRefs = JSON.parse(new TextDecoder().decode(buf.slice(12, 12 + refsLen)));
    verseRefs = rawRefs.map(normalizeVerseRef);
    const vectorStart = 12 + refsLen;
    verseVectorsF16 = new Uint16Array(buf.slice(vectorStart));
    console.log(`ScriptureScribe: loaded ${verseCount2} verse vector refs (${dims}d, decode deferred)`);
  } catch (e) {
    console.warn("ScriptureScribe: verse vector load failed", e);
  }
}
async function vectorSearch(query, topK) {
  if (!verseVectors && !verseVectorsF16 || !verseRefs || !embeddingPipeline)
    return null;
  try {
    ensureVectorsDecoded();
    if (!verseVectors)
      return null;
    const queryVec = await embeddingPipeline(query);
    if (!queryVec || queryVec.length !== dims)
      return null;
    const N = verseRefs.length;
    const scoreArr = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      let dot = 0;
      const off = i * dims;
      for (let d = 0; d < dims; d++)
        dot += queryVec[d] * verseVectors[off + d];
      scoreArr[i] = dot;
    }
    const indices = Array.from({ length: N }, (_, i) => i);
    indices.sort((a, b) => scoreArr[b] - scoreArr[a]);
    return indices.slice(0, topK).map((i) => ({
      ref: verseRefs[i],
      score: scoreArr[i],
      source: "Vector"
    }));
  } catch (e) {
    console.warn("ScriptureScribe: vector search error", e);
    return null;
  }
}
async function trySmartConnectionsPipeline(app) {
  try {
    const sc = app.plugins?.plugins?.["smart-connections"];
    if (!sc)
      return false;
    const env = sc.env ?? sc.smart_env;
    if (!env)
      return false;
    const embedModel = env.embed_model ?? env.embeddings_model ?? env.embedding_model ?? env.model;
    if (!embedModel || typeof embedModel.embed !== "function")
      return false;
    const modelId = String(
      embedModel.model_key ?? embedModel.opts?.model_key ?? embedModel.model_config?.model_key ?? embedModel.config?.model_key ?? ""
    ).toLowerCase();
    if (!modelId.includes("minilm-l6")) {
      console.info(
        `ScriptureScribe: Smart Connections model "${modelId || "unknown"}" is not all-MiniLM-L6-v2 \u2014 bridge skipped so cosine scores stay valid.`
      );
      return false;
    }
    const testVec = await embedModel.embed("test");
    const testArr = testVec instanceof Float32Array ? testVec : new Float32Array(testVec ?? []);
    if (testArr.length === 0)
      return false;
    if ((verseVectors || verseVectorsF16) && testArr.length !== dims) {
      console.info(
        `ScriptureScribe: Smart Connections model (${testArr.length}d) \u2260 verse-vectors.bin (${dims}d). Cosine search disabled; TF-IDF active.`
      );
      verseVectors = null;
      verseVectorsF16 = null;
    }
    embeddingPipeline = async (text) => {
      const v = await embedModel.embed(text);
      return v instanceof Float32Array ? v : new Float32Array(v);
    };
    pipelineSource = "smart-connections";
    console.log("ScriptureScribe: using Smart Connections embedding model for semantic search");
    return true;
  } catch (e) {
    console.info("ScriptureScribe: Smart Connections bridge failed \u2014", e.message);
    return false;
  }
}
async function tryXenovaPipeline() {
  try {
    if (!semanticApp || !semanticDir)
      return false;
    const code = await semanticApp.vault.adapter.read(`${semanticDir}/semantic-runtime.js`);
    const runtimeModule = { exports: {} };
    new Function("require", "module", "exports", code)(require, runtimeModule, runtimeModule.exports);
    const pipe = await runtimeModule.exports.createEmbeddingPipeline();
    const testOut = await pipe("test", { pooling: "mean", normalize: true });
    if (!testOut?.data || testOut.data.length === 0)
      throw new Error("empty test output");
    embeddingPipeline = async (text) => {
      const out = await pipe(text, { pooling: "mean", normalize: true });
      return out.data;
    };
    pipelineSource = "xenova";
    console.log("ScriptureScribe: Xenova/transformers embedding model loaded");
    return true;
  } catch (e) {
    console.info(
      "ScriptureScribe: Xenova/transformers unavailable (V4-patch) \u2014",
      e.message
    );
    return false;
  }
}
async function loadEmbeddingPipeline(app) {
  if (pipelineSource === "xenova" || pipelineSource === "smart-connections")
    return;
  if (app && await trySmartConnectionsPipeline(app))
    return;
  if (pipelineLoadAttempted)
    return;
  pipelineLoadAttempted = true;
  if (await tryXenovaPipeline())
    return;
  pipelineSource = "none";
  console.info("ScriptureScribe: no embedding runtime available \u2014 TF-IDF active for concept search.");
}
function setVerseRefs(refs) {
  if ((!verseRefs || verseRefs.length === 0) && refs.length > 0)
    verseRefs = refs;
}
var STOP = /* @__PURE__ */ new Set([
  "the",
  "and",
  "for",
  "are",
  "but",
  "not",
  "you",
  "all",
  "can",
  "her",
  "was",
  "one",
  "our",
  "out",
  "day",
  "get",
  "has",
  "him",
  "his",
  "how",
  "its",
  "let",
  "men",
  "new",
  "now",
  "old",
  "see",
  "two",
  "way",
  "who",
  "did",
  "may",
  "thy",
  "thee",
  "thou",
  "hath",
  "doth",
  "that",
  "this",
  "with",
  "from",
  "they",
  "have",
  "been",
  "will",
  "said",
  "unto",
  "into",
  "upon",
  "shall",
  "them",
  "then",
  "when",
  "were",
  "your",
  "also",
  "even",
  "which",
  "there",
  "these",
  "those",
  "their",
  "about",
  "after",
  "over",
  "such",
  "more",
  "like",
  "than",
  "only",
  "just",
  "what",
  "both",
  "some",
  "very",
  "much",
  "come",
  "came",
  "went",
  "give",
  "take",
  "made",
  "make",
  "know",
  "through",
  "without",
  "before",
  "against",
  "between",
  "because",
  "therefore"
]);
async function tfidfSearch(query, topK) {
  const queryWords = query.toLowerCase().replace(/[^a-z\s'-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  if (!queryWords.length)
    return [];
  const refs = verseRefs;
  if (!refs || refs.length === 0)
    return [];
  const wordRes = queryWords.map((w) => new RegExp(`\\b${w.replace(/'/g, "\\'")}`, "g"));
  const scores = [];
  let sliceStart = Date.now();
  for (let ri = 0; ri < refs.length; ri++) {
    if ((ri & 2047) === 0 && Date.now() - sliceStart > 12) {
      await new Promise((r) => setTimeout(r, 0));
      sliceStart = Date.now();
    }
    const ref = refs[ri];
    const text = getKJVText(ref);
    if (!text)
      continue;
    const lower = text.toLowerCase();
    let score = 0;
    for (let qi = 0; qi < queryWords.length; qi++) {
      if (lower.includes(queryWords[qi])) {
        score += 1;
        const m = lower.match(wordRes[qi]);
        if (m)
          score += m.length * 0.4;
      }
    }
    if (queryWords.length >= 2) {
      if (queryWords.every((w) => lower.includes(w)))
        score *= 1.6;
      if (score > 0) {
        const positions = queryWords.map((w) => lower.indexOf(w)).filter((p) => p >= 0);
        if (positions.length >= 2) {
          const span = Math.max(...positions) - Math.min(...positions);
          if (span < 80)
            score *= 1.3;
        }
      }
    }
    if (score > 0)
      scores.push([ref, score]);
  }
  scores.sort((a, b) => b[1] - a[1]);
  const max = scores[0]?.[1] ?? 1;
  return scores.slice(0, topK).map(([ref, score]) => ({
    ref,
    score: score / max,
    source: "Keyword"
  }));
}
async function semanticVerseSearch(query, topK = 10, app, explicit = false) {
  const context = app ?? semanticApp;
  if ((explicit || app) && context) {
    await loadEmbeddingPipeline(context);
    if (embeddingPipeline && semanticDir)
      await (vectorsTask ?? (vectorsTask = loadVerseVectors(context, semanticDir)));
  }
  if (embeddingPipeline && (verseVectors || verseVectorsF16)) {
    const vResults = await vectorSearch(query, topK);
    if (vResults && vResults.length > 0)
      return vResults;
  }
  return tfidfSearch(query, topK);
}

// src/interlinear.ts
var greekData = {};
var hebrewData = {};
var lxxData = {};
function getGreekData() {
  return greekData;
}
function getHebrewData() {
  return hebrewData;
}
function getLXXData() {
  return lxxData;
}
var _activeWords = null;
var _activeRef = null;
function getActiveInterlinear() {
  if (!_activeRef || !_activeWords)
    return null;
  return { ref: _activeRef, words: _activeWords };
}
var BIBLE_BOOKS_NAMES = [
  "Genesis",
  "Exodus",
  "Leviticus",
  "Numbers",
  "Deuteronomy",
  "Joshua",
  "Judges",
  "Ruth",
  "1 Samuel",
  "2 Samuel",
  "1 Kings",
  "2 Kings",
  "1 Chronicles",
  "2 Chronicles",
  "Ezra",
  "Nehemiah",
  "Esther",
  "Job",
  "Psalms",
  "Proverbs",
  "Ecclesiastes",
  "Song of Solomon",
  "Isaiah",
  "Jeremiah",
  "Lamentations",
  "Ezekiel",
  "Daniel",
  "Hosea",
  "Joel",
  "Amos",
  "Obadiah",
  "Jonah",
  "Micah",
  "Nahum",
  "Habakkuk",
  "Zephaniah",
  "Haggai",
  "Zechariah",
  "Malachi",
  "Matthew",
  "Mark",
  "Luke",
  "John",
  "Acts",
  "Romans",
  "1 Corinthians",
  "2 Corinthians",
  "Galatians",
  "Ephesians",
  "Philippians",
  "Colossians",
  "1 Thessalonians",
  "2 Thessalonians",
  "1 Timothy",
  "2 Timothy",
  "Titus",
  "Philemon",
  "Hebrews",
  "James",
  "1 Peter",
  "2 Peter",
  "1 John",
  "2 John",
  "3 John",
  "Jude",
  "Revelation",
  "Tobit",
  "Judith",
  "1 Maccabees",
  "2 Maccabees",
  "3 Maccabees",
  "4 Maccabees",
  "Wisdom",
  "Sirach",
  "Baruch",
  "1 Esdras",
  "Epistle of Jeremiah",
  "Susanna",
  "Bel and the Dragon",
  "1 Enoch",
  "Psalms of Solomon",
  "Odes",
  "Sirach Prologue",
  "Tobit (S)",
  "Daniel (Th)",
  "Susanna (Th)",
  "Bel (Th)"
];
var OT_BOOKS = /* @__PURE__ */ new Set([...BIBLE_BOOKS_NAMES.slice(0, 39), ...BIBLE_BOOKS_NAMES.slice(66)]);
var NT_BOOKS = new Set(BIBLE_BOOKS_NAMES.slice(39, 66));

// src/searchIndex.ts
var greekStore = {};
var hebrewStore = {};
var lxxStore = {};
var strongsIndex = null;
var morphIndex = null;
var kjvStore = {};
function setKJVStoreRef(data) {
  kjvStore = data;
  kjvLowerCache = null;
  kjvTokenCache = null;
}
var kjvLowerCache = null;
function kjvLowerEntries() {
  if (!kjvLowerCache) {
    kjvLowerCache = Object.entries(kjvStore).map(([k, v]) => [k, v.toLowerCase()]);
  }
  return kjvLowerCache;
}
var kjvTokenCache = null;
function kjvTokenEntries() {
  if (!kjvTokenCache) {
    kjvTokenCache = kjvLowerEntries().map(
      ([k, lc]) => [k, lc, lc.replace(/[^a-z\s]/g, "").split(/\s+/)]
    );
  }
  return kjvTokenCache;
}
function getKJVText(verseKey) {
  return kjvStore[verseKey] ?? "";
}
var indexBuild = null;
var indexReady = false;
var searchLoad = null;
var loadSearchData = null;
function configureSearchLoader(loader) {
  loadSearchData = loader;
  searchLoad = null;
}
async function ensureSearchIndex() {
  if (indexReady)
    return;
  if (loadSearchData) {
    const stores = await (searchLoad ?? (searchLoad = loadSearchData().catch((error) => {
      searchLoad = null;
      throw error;
    })));
    await buildSearchIndex(stores.greek, stores.hebrew, stores.lxx);
  } else
    await buildSearchIndex(getGreekData(), getHebrewData(), getLXXData());
}
function buildSearchIndex(greek, hebrew, lxx) {
  return indexBuild ?? (indexBuild = buildIndex(greek, hebrew, lxx).catch((error) => {
    indexBuild = null;
    strongsIndex = null;
    morphIndex = null;
    throw error;
  }));
}
async function buildIndex(greek, hebrew, lxx) {
  if (strongsIndex !== null)
    return;
  greekStore = greek;
  hebrewStore = hebrew;
  lxxStore = lxx;
  strongsIndex = /* @__PURE__ */ new Map();
  morphIndex = /* @__PURE__ */ new Map();
  const addToMorphIndex = (key, entry) => {
    let list = morphIndex.get(key);
    if (!list) {
      list = [];
      morphIndex.set(key, list);
    }
    list.push(entry);
  };
  const addStore = async (store) => {
    let count = 0;
    let sliceStart = Date.now();
    for (const [verseKey, words] of Object.entries(store)) {
      count++;
      if ((count & 511) === 0 && Date.now() - sliceStart > 12) {
        await new Promise((r) => setTimeout(r, 0));
        sliceStart = Date.now();
      }
      for (const word of words) {
        if (word.s) {
          const num = normalizeStrongs(word.s);
          if (num) {
            let list = strongsIndex.get(num);
            if (!list) {
              list = [];
              strongsIndex.set(num, list);
            }
            if (list[list.length - 1] !== verseKey)
              list.push(verseKey);
          }
        }
        if (word.m && word.s) {
          const num = normalizeStrongs(word.s) ?? word.s;
          const morph = word.m.trim();
          const entry = { ref: verseKey, strongs: num, morph };
          addToMorphIndex(`${num}|${morph}`, entry);
          addToMorphIndex(morph, entry);
        }
      }
    }
  };
  await addStore(greek);
  await addStore(hebrew);
  await addStore(lxx);
  indexReady = true;
  console.log(
    `ScriptureScribe: search index built \u2014 ${strongsIndex.size} Strong's entries, ${morphIndex.size} morph patterns`
  );
  if (morphIndex.size === 0) {
    console.warn("ScriptureScribe: No morphology data found in interlinear files. Morph search (\u03A9) will return 0 results. Check your strongs-greek.json for 'm' fields.");
  }
}
function isIndexBuilt() {
  return indexReady;
}
function classifyQuery(raw) {
  const trimmed = raw.trim();
  if (trimmed.toLowerCase().startsWith("semantic:"))
    return "semantic";
  if (trimmed.toLowerCase().startsWith("morph:"))
    return "morph";
  if (/^[GgHh]\d+$/.test(trimmed))
    return "strongs";
  if (/[^\x00-\x7F]/.test(trimmed))
    return "original";
  if (/\bAND\b|\bOR\b|\bNOT\b|\+|\|/.test(trimmed))
    return "boolean";
  if (trimmed.replace(/^"|"$/g, "").split(/\s+/).length >= 3)
    return "phrase";
  return "english";
}
async function search(raw, limit = 200) {
  await ensureSearchIndex();
  let query = raw.trim();
  let testamentFilter = null;
  const ntMatch = query.match(/\bnt\b/i);
  const otMatch = query.match(/\bot\b/i);
  if (ntMatch) {
    testamentFilter = "nt";
    query = query.replace(/\bnt\b/i, "").trim();
  } else if (otMatch) {
    testamentFilter = "ot";
    query = query.replace(/\bot\b/i, "").trim();
  }
  const doFilter = (res) => {
    if (!testamentFilter)
      return res;
    return res.filter((r) => {
      const parts = r.reference.split(" ");
      if (parts.length < 2)
        return true;
      const lastPart = parts[parts.length - 1];
      const bookName = r.reference.slice(0, r.reference.length - lastPart.length).trim();
      if (testamentFilter === "ot")
        return OT_BOOKS.has(bookName);
      if (testamentFilter === "nt")
        return NT_BOOKS.has(bookName);
      return true;
    });
  };
  let mode = classifyQuery(query);
  if (mode === "semantic" || raw.toLowerCase().startsWith("semantic:")) {
    mode = "semantic";
    query = query.replace(/^semantic:/i, "").trim();
  }
  let results = [];
  switch (mode) {
    case "strongs":
      results = searchStrongs(query, limit);
      break;
    case "original":
      results = searchOriginal(query, limit);
      break;
    case "boolean":
      results = await searchBoolean(query, limit);
      break;
    case "phrase":
      results = await searchPhrase(query, limit);
      break;
    case "english":
      results = await searchEnglish(query, limit);
      break;
    case "morph": {
      const morphQuery = query.replace(/^morph:/i, "").trim();
      results = searchMorph(morphQuery, limit);
      return { results, mode };
    }
    case "semantic":
      const sem = await semanticVerseSearch(query, limit, void 0, true);
      return {
        results: sem.map((s) => ({
          reference: s.ref,
          preview: makePreview(kjvStore[s.ref] ?? ""),
          isSemantic: true,
          score: s.score
        })),
        mode
      };
  }
  const isPhraseQuery = mode === "phrase";
  const tokenCount = query.trim().split(/\s+/).length;
  const alwaysRunSemantic = isPhraseQuery && tokenCount >= 3;
  const semanticThreshold = isPhraseQuery ? 30 : 5;
  if ((results.length < semanticThreshold || alwaysRunSemantic) && mode !== "strongs" && mode !== "original") {
    const sem = await semanticVerseSearch(query, limit);
    const seen = new Set(results.map((r) => r.reference));
    for (const s of sem) {
      if (seen.has(s.ref)) {
        const existing = results.find((r) => r.reference === s.ref);
        if (existing)
          existing.score = Math.max(existing.score ?? 0, s.score * 0.9);
        continue;
      }
      seen.add(s.ref);
      results.push({
        reference: s.ref,
        preview: makePreview(kjvStore[s.ref] ?? ""),
        isSemantic: true,
        score: s.score * (alwaysRunSemantic ? 0.85 : 1),
        source: s.source
      });
      if (results.length >= limit)
        break;
    }
  }
  return { results: doFilter(results), mode };
}
function searchStrongs(raw, limit) {
  const num = normalizeStrongs(raw.trim());
  if (!num)
    return [];
  const refs = strongsIndex.get(num) ?? [];
  return refs.slice(0, limit).map((ref) => ({
    reference: ref,
    preview: makePreview(kjvStore[ref] ?? ""),
    source: "Exact"
  }));
}
function morphPatternToRegex(pattern) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp("^" + escaped + "$", "i");
}
function searchMorph(query, limit) {
  if (!morphIndex)
    return [];
  let strongsFilter = null;
  let morphPattern = query.trim();
  if (query.includes("|")) {
    const [left, right] = query.split("|", 2);
    const norm = normalizeStrongs(left.trim());
    if (norm) {
      strongsFilter = norm;
      morphPattern = right.trim();
    }
  }
  const morphRe = morphPatternToRegex(morphPattern || "*");
  const seen = /* @__PURE__ */ new Set();
  const results = [];
  if (strongsFilter) {
    for (const [key, entries] of morphIndex.entries()) {
      if (!key.startsWith(strongsFilter + "|"))
        continue;
      const morphCode = key.slice(strongsFilter.length + 1);
      if (!morphRe.test(morphCode))
        continue;
      for (const entry of entries) {
        if (seen.has(entry.ref))
          continue;
        seen.add(entry.ref);
        results.push({
          reference: entry.ref,
          preview: makePreview(kjvStore[entry.ref] ?? ""),
          matchedWord: { original: "", gloss: entry.morph, strongs: entry.strongs },
          source: "Morph"
        });
        if (results.length >= limit)
          return results;
      }
    }
  } else {
    for (const [key, entries] of morphIndex.entries()) {
      if (key.includes("|"))
        continue;
      if (!morphRe.test(key))
        continue;
      for (const entry of entries) {
        if (seen.has(entry.ref))
          continue;
        seen.add(entry.ref);
        results.push({
          reference: entry.ref,
          preview: makePreview(kjvStore[entry.ref] ?? ""),
          matchedWord: { original: "", gloss: entry.morph, strongs: entry.strongs },
          source: "Morph"
        });
        if (results.length >= limit)
          return results;
      }
    }
  }
  return results;
}
function morphSearch(strongsNum, morphPat, limit = 200) {
  if (!morphIndex)
    return [];
  const query = strongsNum ? `${strongsNum}|${morphPat}` : morphPat;
  return searchMorph(query, limit);
}
function isMorphIndexBuilt() {
  return indexReady && morphIndex !== null;
}
function searchOriginal(raw, limit) {
  const needle = stripDiacritics(raw.trim());
  return wordSearch(
    (word) => stripDiacritics(word.o).includes(needle),
    (word) => ({ original: word.o, gloss: word.e, strongs: normalizeStrongs(word.s) ?? word.s }),
    limit
  );
}
function stripDiacritics(text) {
  if (!text)
    return "";
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\u0591-\u05C7]/g, "");
}
async function searchEnglish(raw, limit) {
  const needle = raw.trim().toLowerCase();
  const needleStem = stem(needle);
  const exact = wordSearch(
    (word) => word.e.toLowerCase().includes(needle),
    (word) => ({ original: word.o, gloss: word.e, strongs: normalizeStrongs(word.s) ?? word.s }),
    limit
  );
  if (exact.length >= 5)
    return exact;
  const kvResults = [];
  const seen = new Set(exact.map((r) => r.reference));
  const entries = kjvLowerEntries();
  let sliceStart = Date.now();
  for (let ei = 0; ei < entries.length; ei++) {
    if (kvResults.length + exact.length >= limit)
      break;
    if ((ei & 1023) === 0 && Date.now() - sliceStart > 12) {
      await new Promise((r) => setTimeout(r, 0));
      sliceStart = Date.now();
    }
    const [verseKey, lc] = entries[ei];
    if (seen.has(verseKey))
      continue;
    if (lc.includes(needle)) {
      seen.add(verseKey);
      kvResults.push({
        reference: verseKey,
        preview: makePreview(kjvStore[verseKey] ?? ""),
        source: "Keyword"
      });
    }
  }
  if (exact.length + kvResults.length >= 5)
    return [...exact, ...kvResults];
  const stemmed = wordSearch(
    (word) => stem(word.e.toLowerCase()) === needleStem,
    (word) => ({ original: word.o, gloss: word.e, strongs: normalizeStrongs(word.s) ?? word.s }),
    limit - exact.length - kvResults.length
  ).filter((r) => !seen.has(r.reference));
  return [...exact, ...kvResults, ...stemmed];
}
function wordSearch(predicate, matchInfo, limit) {
  const results = [];
  const seen = /* @__PURE__ */ new Set();
  const scanStore = (store) => {
    for (const [verseKey, words] of Object.entries(store)) {
      if (seen.has(verseKey))
        continue;
      for (const word of words) {
        if (predicate(word)) {
          seen.add(verseKey);
          results.push({
            reference: verseKey,
            preview: makePreview(kjvStore[verseKey] ?? ""),
            matchedWord: matchInfo(word),
            source: "Keyword"
          });
          break;
        }
      }
      if (results.length >= limit)
        return;
    }
  };
  scanStore(greekStore);
  if (results.length < limit)
    scanStore(lxxStore);
  if (results.length < limit)
    scanStore(hebrewStore);
  return results;
}
async function searchPhrase(raw, limit) {
  const query = raw.trim().replace(/^"|"$/g, "").toLowerCase();
  const tokens = query.split(/\s+/).filter(Boolean);
  if (!tokens.length)
    return [];
  const stemmedTokens = tokens.map(stem);
  const scored = [];
  const entries = kjvTokenEntries();
  let sliceStart = Date.now();
  for (let ei = 0; ei < entries.length; ei++) {
    if ((ei & 1023) === 0 && Date.now() - sliceStart > 12) {
      await new Promise((r) => setTimeout(r, 0));
      sliceStart = Date.now();
    }
    const [verseKey, lc, words] = entries[ei];
    if (lc.includes(query)) {
      scored.push({ ref: verseKey, score: 1 });
      continue;
    }
    let ti = 0;
    for (let wi = 0; wi < words.length && ti < tokens.length; wi++) {
      if (wordMatches(words[wi], tokens[ti]))
        ti++;
      if (wi - (words.length - tokens.length) > tokens.length * 3)
        break;
    }
    if (ti === tokens.length) {
      scored.push({ ref: verseKey, score: 0.85 });
      continue;
    }
    ti = 0;
    for (let wi = 0; wi < words.length && ti < stemmedTokens.length; wi++) {
      if (wordMatches(stem(words[wi]), stemmedTokens[ti]))
        ti++;
    }
    if (ti === stemmedTokens.length) {
      scored.push({ ref: verseKey, score: 0.7 });
      continue;
    }
    const STOP2 = /* @__PURE__ */ new Set(["the", "a", "an", "of", "in", "and", "to", "is", "was", "be", "are", "for", "with", "at"]);
    const meaningful = tokens.filter((t) => t.length > 2 && !STOP2.has(t));
    if (meaningful.length >= 2) {
      let hits = 0;
      for (const mt of meaningful) {
        const ms = stem(mt);
        if (words.some((w) => wordMatches(stem(w), ms)))
          hits++;
      }
      const ratio = hits / meaningful.length;
      if (ratio >= 0.6) {
        scored.push({ ref: verseKey, score: 0.3 + ratio * 0.35 });
        continue;
      }
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ ref, score }) => ({
    reference: ref,
    preview: makePreview(kjvStore[ref] ?? ""),
    source: "Phrase",
    score
  }));
}
async function searchBoolean(raw, limit) {
  const q = raw.trim().replace(/\bAND\b/gi, " AND ").replace(/\bOR\b/gi, " OR ").replace(/\bNOT\b/gi, " NOT ").replace(/\|/g, " OR ").replace(/\+/g, " AND ");
  const orClauses = q.split(/\s+OR\s+/i).map((s) => s.trim()).filter(Boolean).map((clause) => {
    return clause.split(/\s+AND\s+/i).map((s) => s.trim()).filter(Boolean).map((term) => {
      const negate = term.startsWith("NOT ") || term.startsWith("-");
      const word = term.replace(/^NOT\s+|-/, "").replace(/^"|"$/g, "").toLowerCase();
      return { negate, word, wordStem: stem(word) };
    });
  });
  const results = [];
  const entries = kjvTokenEntries();
  let sliceStart = Date.now();
  for (let ei = 0; ei < entries.length; ei++) {
    if (results.length >= limit)
      break;
    if ((ei & 1023) === 0 && Date.now() - sliceStart > 12) {
      await new Promise((r) => setTimeout(r, 0));
      sliceStart = Date.now();
    }
    const [verseKey, lc, words] = entries[ei];
    const matches = orClauses.some((terms) => {
      return terms.every((t) => {
        const found = lc.includes(t.word) || words.some((w) => stem(w) === t.wordStem);
        return t.negate ? !found : found;
      });
    });
    if (matches)
      results.push({ reference: verseKey, preview: makePreview(kjvStore[verseKey] ?? "") });
  }
  return results;
}
function wordMatches(word, token) {
  return word === token || word.startsWith(token) || stem(word) === stem(token);
}
var STEM_CACHE = /* @__PURE__ */ new Map();
function stem(word) {
  const cached = STEM_CACHE.get(word);
  if (cached !== void 0)
    return cached;
  const s = stemRaw(word);
  if (STEM_CACHE.size < 65536)
    STEM_CACHE.set(word, s);
  return s;
}
function stemRaw(word) {
  return word.replace(/eth$/, (m, o) => o >= 3 ? "" : m).replace(/est$/, (m, o) => o >= 3 ? "" : m).replace(/ness$/, (m, o) => o >= 3 ? "" : m).replace(/tion$/, (m, o) => o >= 3 ? "t" : m).replace(/ing$/, (m, o) => o >= 3 ? "" : m).replace(/ied$/, (m, o) => o >= 3 ? "y" : m).replace(/ies$/, (m, o) => o >= 3 ? "y" : m).replace(/ed$/, (m, o) => o >= 3 ? "" : m).replace(/es$/, (m, o) => o >= 3 ? "" : m).replace(/s$/, (m, o) => o >= 3 ? "" : m).replace(/er$/, (m, o) => o >= 4 ? "" : m).replace(/ly$/, (m, o) => o >= 4 ? "" : m);
}
function normalizeStrongs(raw) {
  const s = raw.trim().toUpperCase().replace(/^([GH])0+/, "$1").replace(/([GH]\d+)[A-Za-z]$/, "$1");
  return s.match(/^[GH]\d+$/) ? s : null;
}
function makePreview(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 80 ? clean.slice(0, 77) + "\u2026" : clean;
}

// src/fetcher.ts
var CACHE = /* @__PURE__ */ new Map();
var TTL = 24 * 60 * 60 * 1e3;
var kjvData = {};
var sweteData = {};
var formattedKJV = {};
var enochSupplement = {};
function getFormattedKJV(key) {
  return formattedKJV[key];
}
function setSweteData(data) {
  sweteData = data;
}
function setKJVData(data) {
  const BOOK_ALIASES = {
    "Revelation of John": "Revelation",
    "Song of Songs": "Song of Solomon",
    "Psalms": "Psalms"
    // already canonical, no-op
  };
  const ROMAN = {
    "III ": "3 ",
    "II ": "2 ",
    "I ": "1 "
    // longest first
  };
  const normalized = {};
  for (const [key, val] of Object.entries(data)) {
    let k = key;
    for (const [roman, arabic] of Object.entries(ROMAN)) {
      if (k.startsWith(roman)) {
        k = arabic + k.slice(roman.length);
        break;
      }
    }
    for (const [alias, canonical] of Object.entries(BOOK_ALIASES)) {
      if (k.startsWith(alias + " ")) {
        k = canonical + k.slice(alias.length);
        break;
      }
    }
    k = k.replace(/^([123])([A-Z][a-z])/, "$1 $2");
    normalized[k] = val;
  }
  kjvData = normalized;
  setKJVStoreRef(kjvData);
  setVerseRefs(Object.keys(kjvData));
  CACHE.clear();
}
function getKJVData() {
  return kjvData;
}
async function ensureKJVData() {
  await ensureData("kjv.json", setKJVData);
  await ensureData("kjv-formatted.json", (data) => {
    formattedKJV = data;
  });
}
function cacheKey(ref, ver) {
  return `${ref}|${ver}`;
}
function fromCache(ref, ver) {
  const key = cacheKey(ref, ver);
  const e = CACHE.get(key);
  if (!e)
    return null;
  if (Date.now() > e.exp) {
    CACHE.delete(key);
    return null;
  }
  return { ...e.result, source: "cache" };
}
function toCache(r, requestedVersion = r.version) {
  if (CACHE.size >= 256)
    CACHE.delete(CACHE.keys().next().value);
  CACHE.set(cacheKey(r.reference, requestedVersion), { result: r, exp: Date.now() + TTL });
}
var KJV_LOOKUP_ALIASES = {
  // Some KJV JSON builds use these long-form or alternate names
  "Revelation": "Revelation of John",
  "Song of Solomon": "Song of Songs",
  // Roman-numeral fallbacks for KJV JSON builds where setKJVData
  // normalization may not have caught every variant
  "1 Samuel": "I Samuel",
  "2 Samuel": "II Samuel",
  "1 Kings": "I Kings",
  "2 Kings": "II Kings",
  "1 Chronicles": "I Chronicles",
  "2 Chronicles": "II Chronicles",
  "1 Corinthians": "I Corinthians",
  "2 Corinthians": "II Corinthians",
  "1 Thessalonians": "I Thessalonians",
  "2 Thessalonians": "II Thessalonians",
  "1 Timothy": "I Timothy",
  "2 Timothy": "II Timothy",
  "1 Peter": "I Peter",
  "2 Peter": "II Peter",
  "1 John": "I John",
  "2 John": "II John",
  "3 John": "III John"
};
function resolveBookName(book, chapter) {
  if (kjvData[`${book} ${chapter}:1`] !== void 0)
    return book;
  const alt = KJV_LOOKUP_ALIASES[book];
  if (alt !== void 0 && kjvData[`${alt} ${chapter}:1`] !== void 0)
    return alt;
  const glued = book.replace(/^([123]) /, "$1");
  if (glued !== book && kjvData[`${glued} ${chapter}:1`] !== void 0)
    return glued;
  return book;
}
var SWETE_BOOK_MAP = {
  // ── Canonical OT ──────────────────────────────────────────────────────────
  "Genesis": "Gen",
  "Exodus": "Exo",
  "Leviticus": "Lev",
  "Numbers": "Num",
  "Deuteronomy": "Deu",
  "Joshua": "Jos",
  "Judges": "Jdg",
  "Ruth": "Rut",
  "1 Samuel": "1Sa",
  "2 Samuel": "2Sa",
  "1 Kings": "1Ki",
  "2 Kings": "2Ki",
  "1 Chronicles": "1Ch",
  "2 Chronicles": "2Ch",
  "Ezra": "Ezr",
  "Nehemiah": "Neh",
  "Esther": "Est",
  "Job": "Job",
  "Psalms": "Psa",
  "Proverbs": "Pro",
  "Ecclesiastes": "Ecc",
  "Song of Solomon": "Sol",
  "Isaiah": "Isa",
  "Jeremiah": "Jer",
  "Lamentations": "Lam",
  "Ezekiel": "Eze",
  "Daniel": "Dan",
  "Hosea": "Hos",
  "Joel": "Joe",
  "Amos": "Amo",
  "Obadiah": "Oba",
  "Jonah": "Jon",
  "Micah": "Mic",
  "Nahum": "Nah",
  "Habakkuk": "Hab",
  "Zephaniah": "Zep",
  "Haggai": "Hag",
  "Zechariah": "Zec",
  "Malachi": "Mal",
  // ── Apocrypha / Deuterocanonical ──────────────────────────────────────────
  "1 Esdras": "1Es",
  "Tobit": "Tob",
  "Tobit (S)": "Tbs",
  "Judith": "Jdt",
  "Wisdom": "Wis",
  "Sirach": "Sir",
  "Sirach Prologue": "Sip",
  "Baruch": "Bar",
  "Epistle of Jeremiah": "Epj",
  "Daniel (Th)": "Dat",
  "Susanna": "Sus",
  "Susanna (Th)": "Sut",
  "Bel and the Dragon": "Bel",
  "Bel (Th)": "Bet",
  "1 Maccabees": "1Ma",
  "2 Maccabees": "2Ma",
  "3 Maccabees": "3Ma",
  "4 Maccabees": "4Ma",
  "Psalms of Solomon": "Pss",
  "1 Enoch": "1En",
  "Odes": "Ode"
};
function lookupSwete(engRef) {
  const refStr = refToString(engRef);
  const pairs = [];
  for (const { chapter, verse } of expandRef(engRef)) {
    const ref = mapToSwete({
      ...engRef,
      chapter,
      verseStart: verse,
      verseEnd: void 0,
      chapterEnd: void 0,
      chapterOnly: false,
      additionalVerses: void 0
    });
    const sweteBook = SWETE_BOOK_MAP[ref.book];
    const txt = sweteData[sweteBook]?.[ref.chapter]?.[ref.verseStart];
    if (txt)
      pairs.push(txt);
  }
  if (pairs.length === 0) {
    return { reference: refStr, text: `[${refStr} \u2014 verse not in LXX data]`, version: "LXX", source: "local" };
  }
  return { reference: refStr, text: pairs.join(" "), version: "LXX", source: "local" };
}
function lookupLocal(ref, version = "KJV") {
  if (version === "LXX")
    return lookupSwete(ref);
  const pairs = [];
  let supplementUsed = false;
  for (const { chapter, verse } of expandRef(ref)) {
    const bookName = resolveBookName(ref.book, chapter);
    const key = `${bookName} ${chapter}:${verse}`;
    const text = kjvData[key] ?? enochSupplement[key];
    if (!kjvData[key] && text)
      supplementUsed = true;
    if (text)
      pairs.push({ v: chapter * 1e3 + verse, text, formatted: formattedKJV[key] ?? text });
  }
  const refStr = refToString(ref);
  if (pairs.length > 0) {
    let combined = pairs[0].text;
    for (let i = 1; i < pairs.length; i++) {
      const gap = pairs[i].v - pairs[i - 1].v;
      combined += gap === 1 ? " " : " \u2026 ";
      combined += pairs[i].text;
    }
    const numbered = pairs.length > 1;
    const formattedText = pairs.map((p) => `${numbered ? `[${Math.floor(p.v / 1e3)}:${p.v % 1e3}] ` : ""}${p.formatted}`).join(" ");
    return {
      reference: refStr,
      text: combined,
      formattedText,
      version: ref.book === "1 Enoch" ? supplementUsed ? "1 Enoch \xB7 Charles 1917 supplement" : "1 Enoch \xB7 vault text" : "KJV",
      source: "local"
    };
  }
  const lxxFallback = lookupSwete(ref);
  if (!lxxFallback.text.includes("not found") && !lxxFallback.text.includes("not in LXX data")) {
    return {
      reference: refStr,
      text: `[English translation unavailable offline. Displaying Greek LXX:] ${lxxFallback.text}`,
      version: "LXX",
      source: "local"
    };
  }
  return {
    reference: refStr,
    text: `[${refStr} \u2014 not in offline data. Connect to internet for full access.]`,
    version: "KJV",
    source: "local"
  };
}
async function fetchAPI(ref, version, timeoutMs) {
  const vMap = {
    KJV: "kjv",
    ESV: "web",
    NIV: "web",
    NASB: "web",
    NKJV: "kjv",
    NLT: "web",
    CSB: "web",
    AMP: "web",
    MSG: "web",
    NRSV: "web"
  };
  const apiVer = vMap[version] ?? "kjv";
  const query = refToString(ref);
  const fetchOne = async (q) => {
    const url = `https://bible-api.com/${encodeURIComponent(q)}?translation=${apiVer}`;
    try {
      const ctrl = new AbortController();
      let timer;
      try {
        timer = setTimeout(() => ctrl.abort(), timeoutMs);
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok)
          return null;
        const data = await res.json();
        if (!data?.text)
          return null;
        if (Array.isArray(data.verses) && data.verses.length > 1) {
          return data.verses.map((v) => v.text.trim()).join(" ");
        }
        return data.text.trim().replace(/\n/g, " ");
      } finally {
        if (timer)
          clearTimeout(timer);
      }
    } catch {
      return null;
    }
  };
  try {
    const parts = [];
    const primary = await fetchOne(query);
    if (!primary)
      return null;
    parts.push(primary);
    const displayVer = version !== "KJV" && version !== "WEB" && apiVer === "web" ? `${version} (WEB text)` : version === "NKJV" ? "NKJV (KJV text)" : version;
    return { reference: refToString(ref), text: parts.join(" "), version: displayVer, source: "api" };
  } catch {
    return null;
  }
}
async function getScripture(ref, settings) {
  await ensureKJVData();
  if (ref.book === "1 Enoch")
    await ensureData("enoch-charles.json", (data) => {
      enochSupplement = data;
    });
  if (settings.primaryTranslation === "LXX" || !kjvData[`${ref.book} ${ref.chapter}:${ref.verseStart}`] && ref.book !== "1 Enoch") {
    await ensureVersificationData();
    await ensureData("swete-lxx.json", setSweteData);
  }
  const ver = settings.primaryTranslation;
  const refStr = refToString(ref);
  const cached = fromCache(refStr, ver);
  if (cached)
    return cached;
  if (ver === "KJV" || ver === "LXX") {
    const r = lookupLocal(ref, ver);
    if (!r.text.startsWith("["))
      toCache(r, ver);
    return r;
  }
  const api = await fetchAPI(ref, ver, 3e3);
  if (api) {
    toCache(api, ver);
    return api;
  }
  if (!settings.offlineFallback)
    return { reference: refStr, text: `[${ver} unavailable; offline fallback is disabled.]`, version: ver, source: "api", offline: true };
  const fallback = lookupLocal(ref);
  return { ...fallback, offline: true };
}

// src/settings.ts
var DEFAULT_SETTINGS = {
  primaryTranslation: "KJV",
  offlineFallback: true,
  favoriteTranslations: ["KJV", "LXX", "ESV", "NIV", "NASB", "NKJV"],
  hoverSettings: {
    showVersionToggle: true,
    showEmbedOptions: true,
    triggerDelayMs: 300
  },
  embedding: {
    defaultStyle: "quote",
    autoInsertCitation: true,
    includeVersionBadge: true
  },
  display: {
    tooltipStyle: "auto",
    interlinearDisplay: "auto",
    interlinearLanguage: "both",
    cardShowTranslit: true,
    cardShowEnglish: true,
    cardShowStrongs: true,
    referenceClickBehavior: "both",
    useBookColors: true,
    cardMode: false,
    cardSkin: "",
    cardTrigger: "always",
    cardHideCursor: true
  },
  readingPanel: {
    lastSide: "right"
  },
  crossRefs: {
    showLessCount: 3,
    expanded: false
  },
  apiKeys: {
    bibleGateway: ""
  },
  excludedFolders: [],
  vaultScan: {
    useGlobalExclusions: true,
    additionalExclusions: []
  },
  vaultHighlight: {
    opacity: 88,
    textColor: "auto"
  },
  bibleText: {
    fontSize: 15,
    fontFamily: "default"
  },
  verseOfTheDay: {
    enabled: true,
    algorithm: "deterministic",
    showOnStartup: true
  },
  citation: {
    format: "plain",
    includeVersion: true
  },
  morphology: {
    enabled: true,
    uiMode: "simple",
    showTeachingNotes: true
  }
};
var VERSION_CODES = {
  KJV: "KJV",
  LXX: "LXX",
  ESV: "ESV",
  NIV: "NIV",
  NASB: "NASB1995",
  NKJV: "NKJV",
  NLT: "NLT",
  CSB: "CSB",
  AMP: "AMP",
  MSG: "MSG",
  NRSV: "NRSV"
};

// src/embedEngine.ts
var _activeEmbedStyle = null;
var _cachedCursorOffset = null;
function setCachedCursorOffset(offset) {
  _cachedCursorOffset = offset;
}
function clearCachedCursorOffset() {
  _cachedCursorOffset = null;
}
function getGlobalEmbedStyle(settings) {
  return _activeEmbedStyle ?? settings.embedding.defaultStyle;
}
function setGlobalEmbedStyle(style, settings, save) {
  _activeEmbedStyle = style;
  settings.embedding.defaultStyle = style;
  save();
}
function findOccurrence(content, ref) {
  const key = refToString(ref);
  const candidates = parseScriptureRefs(content).filter((r) => refToString(r) === key);
  if (!candidates.length)
    return null;
  const near = _cachedCursorOffset ?? ref.start;
  return candidates.reduce((best, r) => Math.abs(r.start - near) < Math.abs(best.start - near) ? r : best);
}
function buildLink(ref, version) {
  const versionCode = VERSION_CODES[version] ?? version;
  const search2 = encodeURIComponent(refToString(ref));
  const url = `https://www.biblegateway.com/passage/?search=${search2}&version=${versionCode}`;
  return `[${refToString(ref)}](${url})`;
}
function buildTooltipRef(ref, verse, footnoteIndex) {
  const label = refToString(ref);
  const badge = verse.version ? ` (${verse.version})` : "";
  return {
    inline: `${label}[^ss${footnoteIndex}]`,
    footnote: `[^ss${footnoteIndex}]: ${verse.text}${badge}`
  };
}
function buildQuoteBlock(ref, verse) {
  const label = refToString(ref);
  const badge = verse.version ? `, ${verse.version}` : "";
  const text = verse.formattedText ?? verse.text;
  return `> "${text}"
> \u2014 ${label}${badge}`;
}
function buildInterlinearTable(ref, words) {
  const refLabel = refToString(ref);
  const esc = (s) => s.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
  const header = `| English | Original | Transliteration | Strong's |`;
  const separator = `| --- | --- | --- | --- |`;
  const rows = words.filter((w) => w.original && w.original !== "\u2014").map(
    (w) => `| ${esc(w.english)} | ${esc(w.original)} | ${esc(w.transliteration)} | ${esc(w.strongsNum)} |`
  );
  if (rows.length === 0)
    return `*No interlinear data for ${refLabel}.*`;
  return [`**${refLabel} \u2014 Interlinear**`, "", header, separator, ...rows].join("\n");
}
async function embedInterlinear(editor, ref, settings) {
  const active = getActiveInterlinear();
  if (!active || active.ref !== refToString(ref)) {
    await embedSingleRef(editor, ref, settings.embedding.defaultStyle, settings);
    return;
  }
  const table = buildInterlinearTable(ref, active.words);
  const content = editor.getValue();
  const occurrence = findOccurrence(content, ref);
  const pos = occurrence?.start ?? -1;
  if (pos !== -1) {
    const from = editor.offsetToPos(pos);
    const to = editor.offsetToPos(occurrence.end);
    editor.replaceRange("\n\n" + table + "\n", from, to);
  } else {
    const cursor = _cachedCursorOffset !== null ? editor.offsetToPos(_cachedCursorOffset) : editor.getCursor();
    editor.replaceRange("\n\n" + table + "\n", cursor);
  }
  clearCachedCursorOffset();
  new Notice(`ScriptureScribe: Interlinear table for ${refToString(ref)} embedded.`);
}
async function embedAtCursor(editor, ref, style, settings) {
  const verse = await getScripture(ref, settings);
  const cursor = _cachedCursorOffset !== null ? editor.offsetToPos(_cachedCursorOffset) : editor.getCursor();
  const lineText = editor.getLine(cursor.line) ?? "";
  const beforeCursor = lineText.slice(0, cursor.ch);
  const afterCursor = lineText.slice(cursor.ch);
  const isOnOwnLine = beforeCursor.trim().length === 0 && afterCursor.trim().length === 0;
  let text;
  if (style === "link") {
    text = buildLink(ref, settings.primaryTranslation);
  } else if (style === "tooltip") {
    const docText = editor.getValue();
    const existingFootnotes = (docText.match(/^\[\^ss\d+\]:/gm) ?? []).length;
    const idx = existingFootnotes + 1;
    const { inline, footnote } = buildTooltipRef(ref, verse, idx);
    text = inline;
    const endPos = editor.offsetToPos(docText.length);
    editor.replaceRange(`
${footnote}`, endPos);
  } else {
    if (isOnOwnLine) {
      text = buildQuoteBlock(ref, verse);
    } else {
      const badge = verse.version ? `, ${verse.version}` : "";
      text = `\u201C${verse.text}\u201D (${refToString(ref)}${badge})`;
    }
  }
  const prefix = !isOnOwnLine && beforeCursor.trim().length > 0 ? "\n\n" : "";
  const insertedText = prefix + text + "\n\n";
  editor.replaceRange(insertedText, cursor);
  const linesAdded = insertedText.split("\n").length - 1;
  const lastLineLength = insertedText.split("\n").pop().length;
  const newCursor = {
    line: cursor.line + linesAdded,
    ch: linesAdded > 0 ? lastLineLength : cursor.ch + lastLineLength
  };
  editor.setCursor(newCursor);
  clearCachedCursorOffset();
  new Notice(`ScriptureScribe: Embedded ${refToString(ref)}.`);
}
async function embedSingleRef(editor, ref, style, settings) {
  const verse = await getScripture(ref, settings);
  const content = editor.getValue();
  const occurrence = findOccurrence(content, ref);
  const pos = occurrence?.start ?? -1;
  if (pos === -1) {
    new Notice("ScriptureScribe: Could not locate reference in document.");
    clearCachedCursorOffset();
    return;
  }
  const from = editor.offsetToPos(pos);
  const to = editor.offsetToPos(occurrence.end);
  let replacement;
  if (style === "link") {
    replacement = buildLink(ref, settings.primaryTranslation);
  } else if (style === "tooltip") {
    const docText = editor.getValue();
    const existingFootnotes = (docText.match(/^\[\^ss\d+\]:/gm) ?? []).length;
    const idx = existingFootnotes + 1;
    const { inline, footnote } = buildTooltipRef(ref, verse, idx);
    replacement = inline;
    const endPos = editor.offsetToPos(docText.length);
    editor.replaceRange(`
${footnote}`, endPos);
  } else {
    const lineText = editor.getLine(from.line);
    const isAtStart = lineText.slice(0, from.ch).trim().length === 0;
    const isAtEnd = lineText.slice(to.ch).trim().length === 0;
    const isInline = !isAtStart || !isAtEnd;
    if (isInline) {
      const badge = verse.version ? `, ${verse.version}` : "";
      replacement = `\u201C${verse.text}\u201D (${refToString(ref)}${badge})`;
    } else {
      replacement = buildQuoteBlock(ref, verse);
    }
  }
  editor.replaceRange(replacement, from, to);
  clearCachedCursorOffset();
}
async function embedAllRefs(editor, style, settings, onProgress) {
  const content = editor.getValue();
  const refs = parseScriptureRefs(content);
  if (refs.length === 0) {
    new Notice("ScriptureScribe: No scripture references found in this document.");
    return;
  }
  const replacements = [];
  const footnotes = [];
  let footnoteBase = (content.match(/^\[\^ss\d+\]:/gm) ?? []).length;
  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i];
    onProgress?.(i + 1, refs.length);
    const verse = await getScripture(ref, settings);
    let replacement;
    if (style === "link") {
      replacement = buildLink(ref, settings.primaryTranslation);
    } else if (style === "tooltip") {
      const idx = footnoteBase + footnotes.length + 1;
      const { inline, footnote } = buildTooltipRef(ref, verse, idx);
      replacement = inline;
      footnotes.push(footnote);
    } else {
      const from = editor.offsetToPos(ref.start);
      const to = editor.offsetToPos(ref.end);
      const lineText = editor.getLine(from.line);
      const isAtStart = lineText.slice(0, from.ch).trim().length === 0;
      const isAtEnd = lineText.slice(to.ch).trim().length === 0;
      const isInline = !isAtStart || !isAtEnd;
      if (isInline) {
        const badge = verse.version ? `, ${verse.version}` : "";
        replacement = `\u201C${verse.text}\u201D (${refToString(ref)}${badge})`;
      } else {
        replacement = buildQuoteBlock(ref, verse);
      }
    }
    replacements.push({ start: ref.start, end: ref.end, replacement });
  }
  let updated = content;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { start, end, replacement } = replacements[i];
    updated = updated.slice(0, start) + replacement + updated.slice(end);
  }
  if (footnotes.length > 0) {
    updated += "\n\n" + footnotes.join("\n");
  }
  if (editor.getValue() !== content) {
    new Notice("ScriptureScribe: the note changed while passages loaded. Run Embed All again.");
    return;
  }
  editor.setValue(updated);
  new Notice(`ScriptureScribe: Embedded ${refs.length} reference${refs.length === 1 ? "" : "s"}.`);
}

// src/vaultIndex.ts
var _opacity = 88;
var _textColor = "auto";
function setVaultHighlightSettings(opacity, textColor) {
  _opacity = Math.max(0, Math.min(100, opacity));
  _textColor = textColor;
}
function getVaultHighlightTextColor() {
  if (_textColor === "light")
    return "#f0f0f0";
  if (_textColor === "dark")
    return "#1a1a1a";
  const isDark = typeof document !== "undefined" && document.body.classList.contains("theme-dark");
  return isDark ? "#1a1a1a" : "#1a1a1a";
}
var VAULT_PALETTE = [
  "#FF9269",
  // warm coral
  "#FFAF75",
  // peach
  "#FFCC85",
  // golden amber
  "#FFF8A8",
  // soft lemon
  "#CFEF96",
  // lime green
  "#ADE199",
  // sage
  "#90D59C",
  // mint
  "#8ED9D3",
  // aqua
  "#8CD2FE",
  // sky blue
  "#81A4E8",
  // cornflower
  "#8282D0",
  // periwinkle
  "#9E80C9",
  // lavender
  "#BC89C8",
  // orchid
  "#F392C1",
  // pink
  "#FF8590"
  // rose
];
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function notePathToColor(path) {
  let h = 5381;
  for (let i = 0; i < path.length; i++) {
    h = (h << 5) + h + path.charCodeAt(i) & 2147483647;
  }
  return VAULT_PALETTE[(h >>> 0) % VAULT_PALETTE.length];
}
function buildVerseHighlightStyle(notePaths) {
  if (!notePaths.length) {
    return { boxShadow: "none", background: "transparent", paddingLeft: "0" };
  }
  const colors = notePaths.slice(0, 5).map((p) => notePathToColor(p));
  const alpha = _opacity / 100;
  let background;
  if (colors.length === 1) {
    background = hexToRgba(colors[0], alpha);
  } else {
    const stops = colors.map((c, i) => {
      const pct = Math.round(i / (colors.length - 1) * 100);
      return `${hexToRgba(c, alpha)} ${pct}%`;
    });
    background = `linear-gradient(to right, ${stops.join(", ")})`;
  }
  return {
    boxShadow: "none",
    background,
    paddingLeft: "0"
  };
}
var _index = /* @__PURE__ */ new Map();
var _isReady = false;
var _isScanning = false;
var _fileCache = /* @__PURE__ */ new Map();
var _fileStats = /* @__PURE__ */ new Map();
var cachePath = "";
var cacheVault = null;
var saveTimer = null;
var fileJobs = /* @__PURE__ */ new Map();
function stopVaultIndex() {
  if (saveTimer)
    clearTimeout(saveTimer);
  saveTimer = null;
  cacheVault = null;
  _readyCbs.splice(0);
}
async function saveCache() {
  if (!cacheVault || !cachePath)
    return;
  const files = {};
  for (const [path, stat] of _fileStats) {
    const contexts = [];
    const lookup = /* @__PURE__ */ new Map();
    const entries = (_fileCache.get(path) ?? []).map((key) => {
      const context = _index.get(key)?.find((n) => n.filePath === path)?.context ?? "";
      let id = lookup.get(context);
      if (id === void 0) {
        id = contexts.length;
        contexts.push(context);
        lookup.set(context, id);
      }
      return [key, id];
    });
    files[path] = { ...stat, contexts, entries };
  }
  try {
    await cacheVault.adapter.write(cachePath, JSON.stringify({ version: 4, files }));
  } catch (error) {
    console.warn("ScriptureScribe: could not persist vault index", error);
  }
}
function scheduleCacheSave() {
  if (!cacheVault)
    return;
  if (saveTimer)
    clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void saveCache();
  }, 3e3);
}
var _fileByVerseSet = /* @__PURE__ */ new Map();
var _readyCbs = [];
function isVaultIndexReady() {
  return _isReady;
}
function isVaultIndexScanning() {
  return _isScanning;
}
function getVaultIndex() {
  return _index;
}
function onVaultIndexReady(cb) {
  if (_isReady) {
    cb();
    return;
  }
  _readyCbs.push(cb);
}
function getNotesForVerse(verseKey, excludePath) {
  const all = _index.get(verseKey) ?? [];
  return excludePath ? all.filter((n) => n.filePath !== excludePath) : all;
}
function getNotePathsForVerse(verseKey, excludePath) {
  return getNotesForVerse(verseKey, excludePath).map((n) => n.filePath);
}
function addVerseNote(verseKey, note) {
  let fileSet = _fileByVerseSet.get(verseKey);
  if (!fileSet) {
    fileSet = /* @__PURE__ */ new Set();
    _fileByVerseSet.set(verseKey, fileSet);
  }
  if (!fileSet.has(note.filePath)) {
    fileSet.add(note.filePath);
    const existing = _index.get(verseKey);
    if (existing) {
      existing.push(note);
    } else {
      _index.set(verseKey, [note]);
    }
  }
}
function removeFileFromIndex(filePath) {
  const keys = _fileCache.get(filePath) ?? [];
  for (const key of keys) {
    const arr = _index.get(key);
    if (!arr)
      continue;
    const filtered = arr.filter((n) => n.filePath !== filePath);
    if (filtered.length) {
      _index.set(key, filtered);
    } else {
      _index.delete(key);
      _fileByVerseSet.delete(key);
    }
    const s = _fileByVerseSet.get(key);
    if (s)
      s.delete(filePath);
  }
  _fileCache.delete(filePath);
  _fileStats.delete(filePath);
}
function extractContext(content, start, end) {
  const padBefore = 30;
  const padAfter = 40;
  const s = Math.max(0, start - padBefore);
  const e = Math.min(content.length, end + padAfter);
  let snippet = content.slice(s, e).replace(/\s+/g, " ").trim();
  if (s > 0)
    snippet = "\u2026" + snippet;
  if (e < content.length)
    snippet = snippet + "\u2026";
  return snippet;
}
async function indexFile(vault, file, exclusions) {
  if (exclusions.some((f) => file.path.startsWith(f.replace(/\/?$/, "/")))) {
    removeFileFromIndex(file.path);
    return;
  }
  const old = _fileStats.get(file.path);
  if (old?.mtime === file.stat.mtime && old.size === file.stat.size)
    return;
  const stat = { mtime: file.stat.mtime, size: file.stat.size };
  try {
    const content = await vault.cachedRead(file);
    const refs = parseScriptureRefs(content);
    const seen = /* @__PURE__ */ new Set();
    const newKeys = [];
    const noteMap = /* @__PURE__ */ new Map();
    for (const ref of refs) {
      const ctx = extractContext(content, ref.start, ref.end);
      for (const { chapter, verse } of expandRef(ref)) {
        const key = `${ref.book} ${chapter}:${verse}`;
        if (!seen.has(key)) {
          seen.add(key);
          newKeys.push(key);
          noteMap.set(key, { filePath: file.path, context: ctx });
        }
      }
    }
    if (vault.getAbstractFileByPath(file.path) !== file)
      return;
    removeFileFromIndex(file.path);
    _fileCache.set(file.path, newKeys);
    _fileStats.set(file.path, stat);
    for (const key of newKeys)
      addVerseNote(key, noteMap.get(key));
  } catch {
  }
}
var CHUNK_SIZE = 4;
async function buildVaultIndex(vault, exclusions = [], onProgress, pluginDir = "", cancelled = () => false, useCache = true, cacheIdentity = "") {
  _index = /* @__PURE__ */ new Map();
  _isReady = false;
  _isScanning = true;
  _fileCache.clear();
  _fileStats.clear();
  _fileByVerseSet.clear();
  cacheVault = vault;
  cachePath = pluginDir ? `${pluginDir}/vault-index-cache${cacheIdentity ? `-${cacheIdentity}` : ""}.json` : "";
  if (cachePath && useCache) {
    try {
      let raw;
      try {
        raw = await vault.adapter.read(cachePath);
      } catch {
        raw = await vault.adapter.read(`${pluginDir}/vault-index-cache.json`);
      }
      const cached = JSON.parse(raw);
      if (cached.version === 3 || cached.version === 4)
        for (const [path, record] of Object.entries(cached.files)) {
          const file = vault.getAbstractFileByPath(path);
          if (!(file instanceof TFile) || exclusions.some((f) => path.startsWith(f.replace(/\/?$/, "/"))))
            continue;
          if (file.stat.mtime !== record.mtime || file.stat.size !== record.size)
            continue;
          _fileStats.set(path, { mtime: record.mtime, size: record.size });
          _fileCache.set(path, record.entries.map((e) => e[0]));
          for (const [key, context] of record.entries)
            addVerseNote(key, {
              filePath: path,
              context: typeof context === "number" ? record.contexts[context] : context
            });
        }
    } catch {
    }
  }
  const allFiles = vault.getMarkdownFiles();
  const total = allFiles.length;
  const files = allFiles.filter((file) => {
    if (exclusions.some((f) => file.path.startsWith(f.replace(/\/?$/, "/"))))
      return false;
    const stat = _fileStats.get(file.path);
    return !stat || stat.mtime !== file.stat.mtime || stat.size !== file.stat.size;
  });
  const reused = total - files.length;
  for (let i = 0; i < files.length; i += CHUNK_SIZE) {
    if (cancelled()) {
      _isScanning = false;
      return _index;
    }
    const chunk = files.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map((f) => updateVaultIndexForFile(vault, f, exclusions)));
    onProgress?.(Math.min(reused + i + CHUNK_SIZE, total), total);
    await new Promise((res) => setTimeout(res, 0));
  }
  if (saveTimer)
    clearTimeout(saveTimer);
  saveTimer = null;
  if (!cancelled() && cachePath)
    await saveCache();
  _isScanning = false;
  _isReady = true;
  const cbs = _readyCbs.splice(0);
  for (const cb of cbs)
    cb();
  console.log(
    `ScriptureScribe: vault index ready \u2014 ${_index.size} unique verses cited across ${total} notes`
  );
  return _index;
}
async function updateVaultIndexForFile(vault, file, exclusions = []) {
  const prior = fileJobs.get(file.path) ?? Promise.resolve();
  const task = prior.catch(() => {
  }).then(() => indexFile(vault, file, exclusions));
  fileJobs.set(file.path, task);
  await task;
  if (fileJobs.get(file.path) === task)
    fileJobs.delete(file.path);
  if (!_isScanning)
    scheduleCacheSave();
}
function removeVaultIndexFile(filePath) {
  removeFileFromIndex(filePath);
  scheduleCacheSave();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_SETTINGS,
  VERSION_CODES,
  buildInterlinearTable,
  buildLink,
  buildQuoteBlock,
  buildSearchIndex,
  buildTooltipRef,
  buildVaultIndex,
  buildVerseHighlightStyle,
  classifyQuery,
  clearCachedCursorOffset,
  clearDataLoader,
  configureDataLoader,
  configureSearchLoader,
  embedAllRefs,
  embedAtCursor,
  embedInterlinear,
  embedSingleRef,
  ensureData,
  ensureKJVData,
  ensureSearchIndex,
  ensureVersificationData,
  expandRef,
  getFormattedKJV,
  getGlobalEmbedStyle,
  getKJVData,
  getKJVText,
  getNotePathsForVerse,
  getNotesForVerse,
  getScripture,
  getVaultHighlightTextColor,
  getVaultIndex,
  isIndexBuilt,
  isMorphIndexBuilt,
  isVaultIndexReady,
  isVaultIndexScanning,
  mapToHebrew,
  mapToSwete,
  maskMarkdown,
  morphSearch,
  notePathToColor,
  onVaultIndexReady,
  parseScriptureRefs,
  refToString,
  refToUrlParam,
  removeVaultIndexFile,
  search,
  setCachedCursorOffset,
  setGlobalEmbedStyle,
  setKJVData,
  setKJVStoreRef,
  setSweteData,
  setVaultHighlightSettings,
  setVersificationData,
  stopVaultIndex,
  updateVaultIndexForFile,
  verseCount
});
