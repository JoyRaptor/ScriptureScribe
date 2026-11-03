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

// src/bibleData.ts
var bibleData_exports = {};
__export(bibleData_exports, {
  BIBLE_BOOKS: () => BIBLE_BOOKS,
  BOOK_LOOKUP: () => BOOK_LOOKUP,
  normalizeBookName: () => normalizeBookName
});
module.exports = __toCommonJS(bibleData_exports);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BIBLE_BOOKS,
  BOOK_LOOKUP,
  normalizeBookName
});
