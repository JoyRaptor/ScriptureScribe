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
  BIBLE_BOOKS_NAMES: () => BIBLE_BOOKS_NAMES,
  NT_BOOKS: () => NT_BOOKS,
  OT_BOOKS: () => OT_BOOKS,
  buildSearchIndex: () => buildSearchIndex,
  classifyQuery: () => classifyQuery,
  clearActiveInterlinear: () => clearActiveInterlinear,
  configureSearchLoader: () => configureSearchLoader,
  ensureKJVData: () => ensureKJVData,
  ensureSearchIndex: () => ensureSearchIndex,
  expandMorphCode: () => expandMorphCode,
  fetchInterlinear: () => fetchInterlinear,
  fetchStrongsDefinition: () => fetchStrongsDefinition,
  getActiveInterlinear: () => getActiveInterlinear,
  getDetailedMorph: () => getDetailedMorph,
  getFormattedKJV: () => getFormattedKJV,
  getGreekData: () => getGreekData,
  getHebrewData: () => getHebrewData,
  getKJVData: () => getKJVData,
  getKJVText: () => getKJVText,
  getLXXData: () => getLXXData,
  getScripture: () => getScripture,
  initLazyLoader: () => initLazyLoader,
  isIndexBuilt: () => isIndexBuilt,
  isMorphIndexBuilt: () => isMorphIndexBuilt,
  morphSearch: () => morphSearch,
  search: () => search,
  setActiveInterlinear: () => setActiveInterlinear,
  setGreekData: () => setGreekData,
  setHebrewData: () => setHebrewData,
  setKJVData: () => setKJVData,
  setKJVStoreRef: () => setKJVStoreRef,
  setLSJData: () => setLSJData,
  setLXXData: () => setLXXData,
  setLXXDefsData: () => setLXXDefsData,
  setMorphData: () => setMorphData,
  setStrongsData: () => setStrongsData,
  setSweteData: () => setSweteData
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
function normalizeBookName(raw) {
  const key = raw.trim().toLowerCase().replace(/\s+/g, "");
  return BOOK_LOOKUP.get(key) ?? null;
}

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
function verseCount(book, chapter) {
  return book === "Psalms" && chapter === 151 ? 7 : counts[book]?.[chapter - 1] ?? 0;
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

// scripts/stubs/obsidian.mjs
var normalizePath = (p) => p;

// src/dataLoader.ts
var directory = "";
var adapter = null;
var generation = 0;
var pending = /* @__PURE__ */ new Map();
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

// src/morphParser.ts
var GR_FUNCTION = {
  "V": { tech: "Verb", plain: "action word" },
  "N": { tech: "Noun", plain: "person/place/thing" },
  "A": { tech: "Adjective", plain: "describing word" },
  "ADV": { tech: "Adverb", plain: "describes how/when" },
  "PREP": { tech: "Preposition", plain: "relationship (in/with/by)" },
  "CONJ": { tech: "Conjunction", plain: "connecting word (and/but)" },
  "T": { tech: "Article", plain: "the" },
  "P": { tech: "Pronoun", plain: "proxy (he/she/it/they)" },
  "I": { tech: "Interjection", plain: "expression" },
  "X": { tech: "Particle", plain: "grammatical marker" }
};
var GR_TENSE = {
  "P": { tech: "Present", plain: "ongoing action" },
  "I": { tech: "Imperfect", plain: "ongoing action in the past" },
  "F": { tech: "Future", plain: "action yet to happen" },
  "A": { tech: "Aorist", plain: "completed action (snapshot)" },
  "R": { tech: "Perfect", plain: "completed with ongoing effect" },
  "L": { tech: "Pluperfect", plain: "had already been completed" }
};
var GR_VOICE = {
  "A": { tech: "Active", plain: "subject does the action" },
  "M": { tech: "Middle", plain: "subject acts on/for self" },
  "P": { tech: "Passive", plain: "subject receives the action" },
  "D": { tech: "Deponent", plain: "passive form, active meaning" }
};
var GR_MOOD = {
  "I": { tech: "Indicative", plain: "stated as fact" },
  "S": { tech: "Subjunctive", plain: "possibility/purpose" },
  "O": { tech: "Optative", plain: "wish/remote possibility" },
  "M": { tech: "Imperative", plain: "command" },
  "N": { tech: "Infinitive", plain: "to [act]" },
  "P": { tech: "Participle", plain: "action used as description" }
};
var GR_CASE = {
  "N": { tech: "Nominative", plain: "subject" },
  "G": { tech: "Genitive", plain: "possessive (of/from)" },
  "D": { tech: "Dative", plain: "indirect object (to/for/by)" },
  "A": { tech: "Accusative", plain: "direct object" },
  "V": { tech: "Vocative", plain: "direct address" }
};
var GR_PERSON = {
  "1": { tech: "1st Person", plain: "I/we" },
  "2": { tech: "2nd Person", plain: "you" },
  "3": { tech: "3rd Person", plain: "he/she/it/they" }
};
var GR_NUMBER = {
  "S": { tech: "Singular", plain: "one" },
  "P": { tech: "Plural", plain: "many" }
};
var GR_GENDER = {
  "M": { tech: "Masculine", plain: "masc." },
  "F": { tech: "Feminine", plain: "fem." },
  "N": { tech: "Neuter", plain: "neut." }
};
var HB_POS = {
  "V": { tech: "Verb", plain: "action word" },
  "N": { tech: "Noun", plain: "person/place/thing" },
  "A": { tech: "Adjective", plain: "describing word" },
  "P": { tech: "Pronoun", plain: "proxy (he/she/it)" },
  "R": { tech: "Preposition", plain: "relationship" },
  "C": { tech: "Conjunction", plain: "connecting word" },
  "T": { tech: "Particle", plain: "marker" },
  "D": { tech: "Adverb", plain: "describes action" }
};
var HB_STEM = {
  "q": { tech: "Qal", plain: "simple action" },
  "N": { tech: "Niphal", plain: "simple passive/reflexive" },
  "p": { tech: "Piel", plain: "intensive action" },
  "P": { tech: "Pual", plain: "intensive passive" },
  "h": { tech: "Hiphil", plain: "causing action" },
  "H": { tech: "Hophal", plain: "caused action (passive)" },
  "t": { tech: "Hithpael", plain: "intensive reflexive" }
};
var HB_ASPECT = {
  "p": { tech: "Perfect", plain: "completed action" },
  "i": { tech: "Imperfect", plain: "ongoing/future action" },
  "w": { tech: "Waw-consecutive", plain: "sequential (narrative)" },
  "j": { tech: "Jussive", plain: "wish/command" },
  "v": { tech: "Imperative", plain: "command" },
  "r": { tech: "Inf. Construct", plain: "to [act]" },
  "s": { tech: "Inf. Absolute", plain: "absolute/emphatic" },
  "a": { tech: "Part. Active", plain: "one doing the action" },
  "o": { tech: "Part. Passive", plain: "one receiving it" }
};
var TEACHING_NOTES = [
  {
    match: /Verb.*Perfect.*Active.*Indicative/,
    note: "Perfect tense: the action is complete, but its effects continue into the present."
  },
  {
    match: /Verb.*Imperfect/,
    note: "Imperfect tense: an ongoing action in the past \u2014 something that was continually happening."
  },
  {
    match: /Verb.*Aorist.*Passive/,
    note: "Aorist Passive: the subject received a completed action \u2014 often used for divine intervention."
  },
  {
    match: /Verb.*Present.*Active.*Indicative/,
    note: "Present Indicative: ongoing, continuous action \u2014 something happening right now, repeatedly."
  },
  {
    match: /Verb.*Imperative/i,
    note: "Imperative mood: a command or urgent request."
  },
  {
    match: /Hiphil/,
    note: "Hiphil stem: causative \u2014 the subject is making or causing something else to happen."
  },
  {
    match: /Waw-consecutive/,
    note: "Waw-consecutive: sequential narrative \u2014 'and then...' drives the story forward."
  }
];
function parseMorph(code) {
  if (!code)
    return null;
  const isGreek = code.includes("-") || code.match(/^[A-Z][A-Z\d]/);
  return isGreek ? parseGreek(code) : parseHebrew(code);
}
function parseGreek(code) {
  const parts = code.split("-");
  const base = parts[Part.Func] || "";
  const morph = parts[Part.Morph] || "";
  const components = [];
  if (GR_FUNCTION[base])
    components.push(GR_FUNCTION[base]);
  if (base === "V") {
    if (morph[0] && GR_TENSE[morph[0]])
      components.push(GR_TENSE[morph[0]]);
    if (morph[1] && GR_VOICE[morph[1]])
      components.push(GR_VOICE[morph[1]]);
    if (morph[2] && GR_MOOD[morph[2]])
      components.push(GR_MOOD[morph[2]]);
    if (morph[3] && GR_PERSON[morph[3]])
      components.push(GR_PERSON[morph[3]]);
    if (morph[4] && GR_NUMBER[morph[4]])
      components.push(GR_NUMBER[morph[4]]);
  } else if (["N", "A", "P", "T"].includes(base)) {
    if (morph[0] && GR_CASE[morph[0]])
      components.push(GR_CASE[morph[0]]);
    if (morph[1] && GR_NUMBER[morph[1]])
      components.push(GR_NUMBER[morph[1]]);
    if (morph[2] && GR_GENDER[morph[2]])
      components.push(GR_GENDER[morph[2]]);
  }
  const techLine = components.map((c) => c.tech).join(" \xB7 ");
  const plainLine = components.map((c) => c.plain).join(" \xB7 ");
  const note = TEACHING_NOTES.find((n) => n.match.test(techLine))?.note;
  return {
    raw: code,
    language: "greek",
    components,
    techLine,
    plainLine,
    isSignificant: !!note,
    note
  };
}
function parseHebrew(code) {
  const components = [];
  const pos = code[0];
  if (HB_POS[pos])
    components.push(HB_POS[pos]);
  if (pos === "V") {
    if (code[1] && HB_STEM[code[1]])
      components.push(HB_STEM[code[1]]);
    if (code[2] && HB_ASPECT[code[2]])
      components.push(HB_ASPECT[code[2]]);
    if (code[3] && GR_PERSON[code[3]])
      components.push(GR_PERSON[code[3]]);
    if (code[4] && GR_GENDER[code[4]])
      components.push(GR_GENDER[code[4]]);
    if (code[5] && GR_NUMBER[code[5]])
      components.push(GR_NUMBER[code[5]]);
  } else {
    if (code[1] && GR_GENDER[code[1]])
      components.push(GR_GENDER[code[1]]);
    if (code[2] && GR_NUMBER[code[2]])
      components.push(GR_NUMBER[code[2]]);
  }
  const techLine = components.map((c) => c.tech).join(" \xB7 ");
  const plainLine = components.map((c) => c.plain).join(" \xB7 ");
  const note = TEACHING_NOTES.find((n) => n.match.test(techLine))?.note;
  return {
    raw: code,
    language: "hebrew",
    components,
    techLine,
    plainLine,
    isSignificant: !!note,
    note
  };
}
var Part = /* @__PURE__ */ ((Part2) => {
  Part2[Part2["Func"] = 0] = "Func";
  Part2[Part2["Morph"] = 1] = "Morph";
  return Part2;
})(Part || {});

// src/interlinear.ts
var greekData = {};
var hebrewData = {};
var lxxData = {};
var strongsDefs = {};
var lxxDefs = {};
var lsjDefs = {};
var morphCodes = {};
var _pluginDir = "";
var _vaultAdapter = null;
function initLazyLoader(pluginDir, adapter2) {
  _pluginDir = pluginDir;
  _vaultAdapter = adapter2;
  lazyBooks.clear();
  lazyLoading.clear();
}
var lazyBooks = /* @__PURE__ */ new Map();
var lazyLoading = /* @__PURE__ */ new Map();
async function getLazyBook(subdir, bookName) {
  const key = `${subdir}:${bookName}`;
  const cached = lazyBooks.get(key);
  if (cached) {
    lazyBooks.delete(key);
    lazyBooks.set(key, cached);
    return cached;
  }
  const pending2 = lazyLoading.get(key);
  if (pending2)
    return pending2;
  if (!_vaultAdapter || !_pluginDir)
    return null;
  const path = normalizePath(`${_pluginDir}/${subdir}/${bookName.replace(/[/:*?"<>|]/g, "_")}.json`);
  const task = _vaultAdapter.read(path).then((raw) => {
    const data = normalizeKeys(JSON.parse(raw));
    if (lazyBooks.size >= 3)
      lazyBooks.delete(lazyBooks.keys().next().value);
    lazyBooks.set(key, data);
    return data;
  }).catch(() => null).finally(() => lazyLoading.delete(key));
  lazyLoading.set(key, task);
  return task;
}
var ROMAN_PREFIX = [
  ["III ", "3 "],
  ["II ", "2 "],
  ["I ", "1 "]
  // longest first to avoid partial match
];
function normalizeKeys(data) {
  const out = {};
  for (const [key, val] of Object.entries(data)) {
    let k = key;
    for (const [roman, arabic] of ROMAN_PREFIX) {
      if (k.startsWith(roman)) {
        k = arabic + k.slice(roman.length);
        break;
      }
    }
    const match = k.match(/^(.+?)\s+(\d+:\d+.*)$/);
    if (match) {
      const normBook = normalizeBookName(match[1]);
      if (normBook)
        k = `${normBook} ${match[2]}`;
    }
    out[k] = val;
  }
  return out;
}
var hasGreek = false;
var hasHebrew = false;
var hasLXX = false;
function setGreekData(data) {
  greekData = normalizeKeys(data);
  hasGreek = true;
  INTERLINEAR_CACHE.clear();
}
function setHebrewData(data) {
  hebrewData = normalizeKeys(data);
  hasHebrew = true;
  INTERLINEAR_CACHE.clear();
}
function setLXXData(data) {
  lxxData = normalizeKeys(data);
  hasLXX = true;
  INTERLINEAR_CACHE.clear();
}
function setStrongsData(data) {
  strongsDefs = data;
}
function setLXXDefsData(data) {
  lxxDefs = data;
}
function setLSJData(data) {
  lsjDefs = data;
}
function setMorphData(data) {
  morphCodes = data;
}
function expandMorphCode(code) {
  const parsed = parseMorph(code);
  return parsed ? parsed.techLine : morphCodes[code] || code;
}
function getDetailedMorph(code) {
  return parseMorph(code);
}
function getGreekData() {
  return greekData;
}
function getHebrewData() {
  return hebrewData;
}
function getLXXData() {
  return lxxData;
}
var INTERLINEAR_CACHE = /* @__PURE__ */ new Map();
var STRONGS_CACHE = /* @__PURE__ */ new Map();
var FETCH_TIMEOUT_MS = 6e3;
var _activeWords = null;
var _activeRef = null;
function setActiveInterlinear(ref, words) {
  _activeRef = ref;
  _activeWords = words;
}
function clearActiveInterlinear() {
  _activeRef = null;
  _activeWords = null;
}
function getActiveInterlinear() {
  if (!_activeRef || !_activeWords)
    return null;
  return { ref: _activeRef, words: _activeWords };
}
var BOLLS_BOOK_ID = {
  "Genesis": 1,
  "Exodus": 2,
  "Leviticus": 3,
  "Numbers": 4,
  "Deuteronomy": 5,
  "Joshua": 6,
  "Judges": 7,
  "Ruth": 8,
  "1 Samuel": 9,
  "2 Samuel": 10,
  "1 Kings": 11,
  "2 Kings": 12,
  "1 Chronicles": 13,
  "2 Chronicles": 14,
  "Ezra": 15,
  "Nehemiah": 16,
  "Esther": 17,
  "Job": 18,
  "Psalms": 19,
  "Proverbs": 20,
  "Ecclesiastes": 21,
  "Song of Solomon": 22,
  "Isaiah": 23,
  "Jeremiah": 24,
  "Lamentations": 25,
  "Ezekiel": 26,
  "Daniel": 27,
  "Hosea": 28,
  "Joel": 29,
  "Amos": 30,
  "Obadiah": 31,
  "Jonah": 32,
  "Micah": 33,
  "Nahum": 34,
  "Habakkuk": 35,
  "Zephaniah": 36,
  "Haggai": 37,
  "Zechariah": 38,
  "Malachi": 39,
  "Matthew": 40,
  "Mark": 41,
  "Luke": 42,
  "John": 43,
  "Acts": 44,
  "Romans": 45,
  "1 Corinthians": 46,
  "2 Corinthians": 47,
  "Galatians": 48,
  "Ephesians": 49,
  "Philippians": 50,
  "Colossians": 51,
  "1 Thessalonians": 52,
  "2 Thessalonians": 53,
  "1 Timothy": 54,
  "2 Timothy": 55,
  "Titus": 56,
  "Philemon": 57,
  "Hebrews": 58,
  "James": 59,
  "1 Peter": 60,
  "2 Peter": 61,
  "1 John": 62,
  "2 John": 63,
  "3 John": 64,
  "Jude": 65,
  "Revelation": 66
};
function fetchWithTimeout(url, ms = FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}
function compactToWord(w, lang) {
  return { english: w.e, original: w.o, transliteration: w.t, strongsNum: w.s, morph: w.m, language: lang };
}
async function fetchInterlinear(ref, language, version = "KJV", isFallback = false) {
  const selected = expandRef(ref);
  if (selected.length > 1) {
    const result = [];
    for (const { chapter, verse } of selected) {
      result.push(...await fetchInterlinear({
        ...ref,
        chapter,
        verseStart: verse,
        verseEnd: void 0,
        chapterEnd: void 0,
        chapterOnly: false,
        additionalVerses: void 0
      }, language, version, isFallback));
    }
    return result;
  }
  if (version === "LXX")
    await ensureVersificationData();
  const isLXX = version === "LXX";
  const isOT = OT_BOOKS.has(ref.book);
  const lang = isOT && !isLXX ? "hebrew" : "greek";
  const cacheKey2 = `${refToString(ref)}|${language}|${version}`;
  if (INTERLINEAR_CACHE.has(cacheKey2)) {
    console.debug(`ScriptureScribe interlinear: cache hit for "${cacheKey2}"`);
    return INTERLINEAR_CACHE.get(cacheKey2);
  }
  const useLXX = isOT && isLXX;
  const store = useLXX ? lxxData : lang === "greek" ? greekData : hebrewData;
  const hasData = useLXX ? hasLXX : lang === "greek" ? hasGreek : hasHebrew;
  let lookupRef = ref;
  if (useLXX) {
    lookupRef = mapToSwete(ref);
    console.debug(`ScriptureScribe: LXX Mapping ${refToString(ref)} -> ${refToString(lookupRef)}`);
  }
  console.debug(`ScriptureScribe interlinear: lang=${lang} isLXX=${isLXX} hasData=${hasData} ref="${refToString(lookupRef)}"`);
  if (hasData) {
    const words = lookupOffline(lookupRef, store, lang);
    if (words.length > 0 && words[0].original !== "\u2014") {
      if (INTERLINEAR_CACHE.size >= 128)
        INTERLINEAR_CACHE.delete(INTERLINEAR_CACHE.keys().next().value);
      INTERLINEAR_CACHE.set(cacheKey2, words);
      return words;
    }
  }
  if (_vaultAdapter) {
    const bookData = useLXX ? await getLazyBook("lxx-books", lookupRef.book) : lang === "hebrew" ? await getLazyBook("hebrew-books", lookupRef.book) : await getLazyBook("greek-books", lookupRef.book);
    if (bookData) {
      const words = lookupOffline(lookupRef, bookData, lang);
      if (words.length > 0 && words[0].original !== "\u2014") {
        if (INTERLINEAR_CACHE.size >= 128)
          INTERLINEAR_CACHE.delete(INTERLINEAR_CACHE.keys().next().value);
        INTERLINEAR_CACHE.set(cacheKey2, words);
        return words;
      }
    }
  }
  try {
    const end = ref.verseEnd ?? ref.verseStart;
    const allWords = [];
    for (let v = ref.verseStart; v <= end; v++) {
      allWords.push(...await fetchBollsVerse(ref.book, ref.chapter, v, lang, version));
    }
    if (allWords.length > 0) {
      INTERLINEAR_CACHE.set(cacheKey2, allWords);
      return allWords;
    }
  } catch (e) {
    console.warn("ScriptureScribe: online interlinear fetch failed", e);
  }
  let fallback = getSampleInterlinear(ref, lang);
  const hasRealData = fallback.length > 0 && fallback[0].original !== "\u2014";
  if (!hasRealData && !isFallback) {
    const altLang = language === "hebrew" ? "greek" : "hebrew";
    const altVer = altLang === "greek" && isOT ? "LXX" : "KJV";
    if (!(altLang === "hebrew" && !isOT)) {
      const altWords = await fetchInterlinear(ref, altLang, altVer, true);
      if (altWords.length > 0 && altWords[0].original !== "\u2014") {
        return altWords;
      }
    }
  }
  INTERLINEAR_CACHE.set(cacheKey2, fallback);
  return fallback;
}
function lookupOffline(ref, store, lang) {
  const end = ref.verseEnd ?? ref.verseStart;
  const words = [];
  for (let v = ref.verseStart; v <= end; v++) {
    const key = `${ref.book} ${ref.chapter}:${v}`;
    const compact = store[key];
    if (!compact) {
      const sample = Object.keys(store).slice(0, 10).join(", ");
      console.debug(`ScriptureScribe interlinear miss for "${key}". Store has ${Object.keys(store).length} entries. Sample keys: ${sample}`);
    }
    if (compact)
      for (const w of compact)
        words.push(compactToWord(w, lang));
  }
  for (const v of ref.additionalVerses ?? []) {
    const compact = store[`${ref.book} ${ref.chapter}:${v}`];
    if (compact)
      for (const w of compact)
        words.push(compactToWord(w, lang));
  }
  if (words.length === 0) {
    words.push({
      english: "(no interlinear data for this verse)",
      original: "\u2014",
      transliteration: "",
      strongsNum: "",
      language: lang
    });
  }
  return words;
}
async function fetchBollsVerse(book, chapter, verse, lang, version = "KJV") {
  const bookId = BOLLS_BOOK_ID[book];
  if (!bookId)
    return [];
  let translation;
  if (lang === "hebrew") {
    translation = "OSMHB";
  } else if (version === "LXX" || OT_BOOKS.has(book)) {
    translation = "LXXM";
  } else {
    translation = "THGNT";
  }
  const res = await fetchWithTimeout(
    `https://bolls.life/get-text/${translation}/${bookId}/${chapter}/${verse}/`
  );
  if (!res.ok)
    return [];
  return parseBollsResponse(await res.json(), lang);
}
function parseBollsResponse(raw, lang) {
  const words = [];
  try {
    for (const verseObj of Array.isArray(raw) ? raw : [raw]) {
      const tokens = verseObj?.text;
      if (!Array.isArray(tokens))
        continue;
      for (const token of tokens) {
        if (typeof token === "string" || !token)
          continue;
        const original = String(token.text ?? token.word ?? "").trim();
        if (!original)
          continue;
        const englishRaw = [
          token.gloss,
          token.english,
          token.word_english,
          token.lemma_gloss,
          token.translation,
          token.kjv_def
        ].find((v) => v && String(v).trim().length > 0);
        const english = englishRaw ? String(englishRaw).trim() : "";
        const translit = String(token.transliteration ?? token.translit ?? "").trim();
        const rawStrongs = String(
          token.strongs ?? token.strong ?? token.strongs_number ?? ""
        );
        const digits = rawStrongs.replace(/[^0-9]/g, "");
        const prefix = lang === "greek" ? "G" : "H";
        const normDigits = digits ? String(parseInt(digits, 10)) : "";
        const strongsNum = normDigits ? `${prefix}${normDigits}` : "";
        const morph = String(token.morph ?? token.parsing_info ?? "").trim();
        words.push({ english, original, transliteration: translit, strongsNum, language: lang, morph });
      }
    }
  } catch (e) {
    console.warn("ScriptureScribe: bolls.life parse error", e);
  }
  return words;
}
async function fetchStrongsDefinition(strongsNum) {
  if (!strongsNum)
    return null;
  const normalized = strongsNum.toUpperCase().match(/^([GH])0*(\d+)(?:[A-Z])?$/);
  if (!normalized)
    return null;
  strongsNum = `${normalized[1]}${Number(normalized[2])}`;
  if (STRONGS_CACHE.has(strongsNum))
    return STRONGS_CACHE.get(strongsNum);
  const shard = `${normalized[1]}${Math.floor(Number(normalized[2]) / 100)}`;
  await ensureData(`definitions/strongs-${shard}.json`, (data) => Object.assign(strongsDefs, data));
  if (strongsNum.startsWith("G")) {
    await ensureData(`definitions/lxx-${shard}.json`, (data) => Object.assign(lxxDefs, data));
    await ensureData(`definitions/lsj-${shard}.json`, (data) => Object.assign(lsjDefs, data));
  }
  const isGreek = strongsNum.startsWith("G");
  const lang = isGreek ? "greek" : "hebrew";
  const lxxEntry = lxxDefs[strongsNum];
  if (lxxEntry) {
    const lsj = lsjDefs[strongsNum];
    const def = {
      number: strongsNum,
      original: lxxEntry.o,
      transliteration: lxxEntry.t,
      phonetic: "",
      definition: lsj ? lsj : lxxEntry.g + (lxxEntry.d ? "\n\n" + lxxEntry.d : ""),
      language: lang
    };
    if (STRONGS_CACHE.size >= 256)
      STRONGS_CACHE.delete(STRONGS_CACHE.keys().next().value);
    STRONGS_CACHE.set(strongsNum, def);
    return def;
  }
  const localEntry = strongsDefs[strongsNum];
  if (localEntry) {
    const lsj = lsjDefs[strongsNum];
    const def = {
      number: strongsNum,
      original: localEntry.o,
      transliteration: localEntry.t,
      phonetic: localEntry.g ?? "",
      definition: lsj ? lsj : localEntry.d ?? "Definition unavailable.",
      language: lang
    };
    if (STRONGS_CACHE.size >= 256)
      STRONGS_CACHE.delete(STRONGS_CACHE.keys().next().value);
    STRONGS_CACHE.set(strongsNum, def);
    return def;
  }
  try {
    const langPath = isGreek ? "greek" : "hebrew";
    const padded = strongsNum.replace(/\D/g, "").padStart(4, "0");
    const res = await fetchWithTimeout(
      `https://cdn.jsdelivr.net/gh/openscriptures/strongs@master/dict/${langPath}/${padded}.json`,
      4e3
    );
    if (res.ok) {
      const data = await res.json();
      const def = {
        number: strongsNum,
        original: String(data.lemma ?? data.word ?? "").trim(),
        transliteration: String(data.xlit ?? data.translit ?? "").trim(),
        phonetic: String(data.pron ?? data.pronounce ?? "").trim(),
        definition: String(data.strongs_def ?? data.kjv_def ?? data.derivation ?? "Definition unavailable.").trim(),
        language: lang
      };
      if (STRONGS_CACHE.size >= 256)
        STRONGS_CACHE.delete(STRONGS_CACHE.keys().next().value);
      STRONGS_CACHE.set(strongsNum, def);
      return def;
    }
  } catch (e) {
    console.warn(`ScriptureScribe: openscriptures CDN failed for ${strongsNum}`, e);
  }
  try {
    const res = await fetchWithTimeout(`https://bolls.life/strongs/${strongsNum}/`, 4e3);
    if (res.ok) {
      const data = await res.json();
      const def = {
        number: strongsNum,
        original: String(data.original_word ?? data.lemma ?? "").trim(),
        transliteration: String(data.transliteration ?? data.xlit ?? "").trim(),
        phonetic: String(data.phonetic ?? data.pronunciation ?? "").trim(),
        definition: String(data.strongs_def ?? data.definition ?? data.short_def ?? "Definition unavailable.").trim(),
        language: lang
      };
      if (STRONGS_CACHE.size >= 256)
        STRONGS_CACHE.delete(STRONGS_CACHE.keys().next().value);
      STRONGS_CACHE.set(strongsNum, def);
      return def;
    }
  } catch (e) {
    console.warn(`ScriptureScribe: bolls.life strongs failed for ${strongsNum}`, e);
  }
  return null;
}
function getSampleInterlinear(ref, language) {
  const key = refToString(ref);
  if (language === "greek" && SAMPLE_GREEK[key])
    return SAMPLE_GREEK[key];
  if (language === "hebrew" && SAMPLE_HEBREW[key])
    return SAMPLE_HEBREW[key];
  return [{
    english: "Add strongs-greek.json / strongs-hebrew.json to plugin folder for offline interlinear.",
    original: "\u2014",
    transliteration: "",
    strongsNum: "",
    language
  }];
}
var SAMPLE_GREEK = {
  "John 3:16": [
    { english: "For/thus", original: "\u039F\u1F55\u03C4\u03C9\u03C2", transliteration: "Hout\u014Ds", strongsNum: "G3779", language: "greek" },
    { english: "indeed", original: "\u03B3\u1F70\u03C1", transliteration: "gar", strongsNum: "G1063", language: "greek" },
    { english: "loved", original: "\u1F20\u03B3\u03AC\u03C0\u03B7\u03C3\u03B5\u03BD", transliteration: "\u0113gap\u0113sen", strongsNum: "G25", language: "greek" },
    { english: "God", original: "\u1F41 \u03B8\u03B5\u1F78\u03C2", transliteration: "ho theos", strongsNum: "G2316", language: "greek" },
    { english: "the world", original: "\u03C4\u1F78\u03BD \u03BA\u03CC\u03C3\u03BC\u03BF\u03BD", transliteration: "ton kosmon", strongsNum: "G2889", language: "greek" },
    { english: "only begotten", original: "\u03BC\u03BF\u03BD\u03BF\u03B3\u03B5\u03BD\u1FC6", transliteration: "monogen\u0113", strongsNum: "G3439", language: "greek" },
    { english: "Son", original: "\u03C5\u1F31\u03CC\u03BD", transliteration: "huion", strongsNum: "G5207", language: "greek" },
    { english: "believing", original: "\u03C0\u03B9\u03C3\u03C4\u03B5\u03CD\u03C9\u03BD", transliteration: "pisteu\u014Dn", strongsNum: "G4100", language: "greek" },
    { english: "perish", original: "\u1F00\u03C0\u03CC\u03BB\u03B7\u03C4\u03B1\u03B9", transliteration: "apol\u0113tai", strongsNum: "G622", language: "greek" },
    { english: "eternal", original: "\u03B1\u1F30\u03CE\u03BD\u03B9\u03BF\u03BD", transliteration: "ai\u014Dnion", strongsNum: "G166", language: "greek" },
    { english: "life", original: "\u03B6\u03C9\u03AE\u03BD", transliteration: "z\u014D\u0113n", strongsNum: "G2222", language: "greek" }
  ],
  "Romans 3:23": [
    { english: "all", original: "\u03C0\u03AC\u03BD\u03C4\u03B5\u03C2", transliteration: "pantes", strongsNum: "G3956", language: "greek" },
    { english: "sinned", original: "\u1F25\u03BC\u03B1\u03C1\u03C4\u03BF\u03BD", transliteration: "h\u0113marton", strongsNum: "G264", language: "greek" },
    { english: "fall short of", original: "\u1F51\u03C3\u03C4\u03B5\u03C1\u03BF\u1FE6\u03BD\u03C4\u03B1\u03B9", transliteration: "husterountai", strongsNum: "G5302", language: "greek" },
    { english: "the glory", original: "\u03B4\u03CC\u03BE\u03B7\u03C2", transliteration: "dox\u0113s", strongsNum: "G1391", language: "greek" },
    { english: "of God", original: "\u03B8\u03B5\u03BF\u1FE6", transliteration: "theou", strongsNum: "G2316", language: "greek" }
  ]
};
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
var SAMPLE_HEBREW = {
  "Genesis 1:1": [
    { english: "In the beginning", original: "\u05D1\u05B0\u05BC\u05E8\u05B5\u05D0\u05E9\u05B4\u05C1\u05D9\u05EA", transliteration: "b\u0259r\u0113\u02BE\u0161\xEEt", strongsNum: "H7225", language: "hebrew" },
    { english: "created", original: "\u05D1\u05B8\u05BC\u05E8\u05B8\u05D0", transliteration: "b\u0101r\u0101\u02BE", strongsNum: "H1254", language: "hebrew" },
    { english: "God", original: "\u05D0\u05B1\u05DC\u05B9\u05D4\u05B4\u05D9\u05DD", transliteration: "\u02BE\u0115l\u014Dh\xEEm", strongsNum: "H430", language: "hebrew" },
    { english: "the heavens", original: "\u05D4\u05B7\u05E9\u05B8\u05BC\u05C1\u05DE\u05B7\u05D9\u05B4\u05DD", transliteration: "ha\u0161\u0161\u0101mayim", strongsNum: "H8064", language: "hebrew" },
    { english: "and the earth", original: "\u05D5\u05B0\u05D0\u05B5\u05EA \u05D4\u05B8\u05D0\u05B8\u05E8\u05B6\u05E5", transliteration: "w\u0259\u02BE\u0113t h\u0101\u02BE\u0101re\u1E63", strongsNum: "H776", language: "hebrew" }
  ],
  "Psalms 23:1": [
    { english: "The LORD", original: "\u05D9\u05B0\u05D4\u05D5\u05B8\u05D4", transliteration: "YHWH", strongsNum: "H3068", language: "hebrew" },
    { english: "shepherds me", original: "\u05E8\u05B9\u05E2\u05B4\u05D9", transliteration: "r\u014D\u02BF\xEE", strongsNum: "H7462", language: "hebrew" },
    { english: "I shall not", original: "\u05DC\u05B9\u05D0", transliteration: "l\u014D\u02BE", strongsNum: "H3808", language: "hebrew" },
    { english: "lack", original: "\u05D0\u05B6\u05D7\u05B0\u05E1\u05B8\u05E8", transliteration: "\u02BEe\u1E25s\u0101r", strongsNum: "H2637", language: "hebrew" }
  ]
};

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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BIBLE_BOOKS_NAMES,
  NT_BOOKS,
  OT_BOOKS,
  buildSearchIndex,
  classifyQuery,
  clearActiveInterlinear,
  configureSearchLoader,
  ensureKJVData,
  ensureSearchIndex,
  expandMorphCode,
  fetchInterlinear,
  fetchStrongsDefinition,
  getActiveInterlinear,
  getDetailedMorph,
  getFormattedKJV,
  getGreekData,
  getHebrewData,
  getKJVData,
  getKJVText,
  getLXXData,
  getScripture,
  initLazyLoader,
  isIndexBuilt,
  isMorphIndexBuilt,
  morphSearch,
  search,
  setActiveInterlinear,
  setGreekData,
  setHebrewData,
  setKJVData,
  setKJVStoreRef,
  setLSJData,
  setLXXData,
  setLXXDefsData,
  setMorphData,
  setStrongsData,
  setSweteData
});
