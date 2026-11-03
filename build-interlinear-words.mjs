/**
 * build-interlinear-words.mjs
 * ───────────────────────────
 * Converts STEPBible TAGNT + TAHOT files into per-verse word JSON
 * for ScriptureScribe offline interlinear display.
 *
 * Drop all 6 files next to this script and run:
 *   node build-interlinear-words.mjs
 *
 * ── CONFIRMED COLUMN LAYOUTS ────────────────────────────────────────────────
 *
 * TAGNT (Greek NT) — confirmed from actual data rows:
 *   0: Ref+source    "Act.1.1#01=NKO"
 *   1: Word(Translit) "Τὸν (Ton)"        ← word and translit in one cell
 *   2: English       "The"
 *   3: Strongs=Gram  "G3588=T-ASM"       ← split on = to get G3588
 *   4: Lemma=gloss   "ὁ=the/this/who"   ← (ignored)
 *   5+: sources, variants (ignored)
 *
 * TAHOT (Hebrew OT) — confirmed from actual data rows (the snippet):
 *   0: Ref+source    "Jos.1.9#01=L"
 *   1: Hebrew(Translit) "הֲ/ל֤וֹא"       ← NO parens — translit is col 2
 *   2: Translit      "ha./Lo'"
 *   3: English       "¿/ not"
 *   4: Strongs       "H9008/{H3808}"     ← extract content of {}
 *   5: Grammar       "HTi/Tn"
 *   6+: (ignored)
 *
 * The two formats differ — we detect which we're in by file prefix.
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));

// ── Book abbreviations (confirmed from actual STEPBible files) ─────────────
const BOOK_NAME = {
  // OT
  Gen:"Genesis",   Exo:"Exodus",         Lev:"Leviticus",      Num:"Numbers",
  Deu:"Deuteronomy", Jos:"Joshua",        Jdg:"Judges",         Rut:"Ruth",
  "1Sa":"1 Samuel","2Sa":"2 Samuel",      "1Ki":"1 Kings",      "2Ki":"2 Kings",
  "1Ch":"1 Chronicles","2Ch":"2 Chronicles",
  Ezr:"Ezra",      Neh:"Nehemiah",        Est:"Esther",         Job:"Job",
  Psa:"Psalms",    Pro:"Proverbs",        Ecc:"Ecclesiastes",   Sng:"Song of Solomon",
  Isa:"Isaiah",    Jer:"Jeremiah",        Lam:"Lamentations",   Ezk:"Ezekiel",
  Dan:"Daniel",    Hos:"Hosea",           Jol:"Joel",           Amo:"Amos",
  Oba:"Obadiah",   Jon:"Jonah",           Mic:"Micah",          Nam:"Nahum",
  Hab:"Habakkuk",  Zep:"Zephaniah",       Hag:"Haggai",         Zec:"Zechariah",
  Mal:"Malachi",
  // NT
  Mat:"Matthew",   Mrk:"Mark",            Luk:"Luke",           Jhn:"John",
  Act:"Acts",      Rom:"Romans",
  "1Co":"1 Corinthians","2Co":"2 Corinthians",
  Gal:"Galatians", Eph:"Ephesians",       Php:"Philippians",    Col:"Colossians",
  "1Th":"1 Thessalonians","2Th":"2 Thessalonians",
  "1Ti":"1 Timothy","2Ti":"2 Timothy",    Tit:"Titus",          Phm:"Philemon",
  Heb:"Hebrews",   Jas:"James",
  "1Pe":"1 Peter", "2Pe":"2 Peter",
  "1Jn":"1 John",  "2Jn":"2 John",       "3Jn":"3 John",
  Jud:"Jude",      Rev:"Revelation",
};

const DATA_ROW = /^[1-3]?[A-Z][A-Za-z0-9]*\.\d+\.\d+#\d+/i;

function parseRef(raw) {
  const m = raw.match(/^([1-3]?[A-Z][A-Za-z0-9]*)\.(\d+)\.(\d+)/i);
  if (!m) return null;
  const book = BOOK_NAME[m[1]];
  if (!book) return null;
  return `${book} ${parseInt(m[2], 10)}:${parseInt(m[3], 10)}`;
}

// ── TAGNT: col 1 is "Word (Translit)" — split on last "(" ────────────────────
function parseWordTranslit(raw) {
  const m = raw.match(/^(.+?)\s+\(([^)]+)\)\s*$/);
  if (m) return { word: m[1].trim(), translit: m[2].trim() };
  return { word: raw.trim(), translit: "" };
}

// ── TAGNT: col 3 is "G3588=T-ASM" — take everything before = ────────────────
function extractStrongsTagnt(raw) {
  if (!raw) return "";
  const base = raw.split("=")[0].trim();
  // Strip trailing disambiguator letter from Hebrew (H2388G→H2388)
  // but not from Greek (G is the language prefix, never a suffix here)
  const m = base.match(/^([HG])0*(\d+)/i);
  if (!m) return "";
  return `${m[1].toUpperCase()}${m[2]}`;
}

// ── TAGNT: col 3 morph extraction — everything after = ──────────────────────
// "G0976=N-NSF" → "N-NSF",  "G2424G=N-GSM-P" → "N-GSM-P"
function extractMorphTagnt(raw) {
  if (!raw) return "";
  const eqIdx = raw.indexOf("=");
  if (eqIdx < 0) return "";
  return raw.slice(eqIdx + 1).trim();
}

// ── TAHOT: col 5 morph extraction ─────────────────────────────────────────────
function extractMorphTahot(raw) {
  if (!raw) return "";
  return raw.trim();
}

// ── TAHOT: col 4 is "H9008/{H3808}" — extract content of {} ─────────────────
function extractStrongsTahot(raw) {
  if (!raw) return "";
  const braced = raw.match(/\{([HG][^}]+)\}/);
  const token  = braced ? braced[1] : raw.split(/[/\\,|& ]/)[0];
  const m = token.trim().match(/^([HG])0*(\d+)/i);
  if (!m) return "";
  return `${m[1].toUpperCase()}${m[2]}`;
}

// ── TAHOT: strip prefix slashes from word and translit ───────────────────────
function cleanTahot(raw) {
  if (!raw) return "";
  // "הֲ/ל֤וֹא" → take longest segment (the root)
  const parts = raw.split("/").map(p => p.trim()).filter(Boolean);
  if (parts.length <= 1) return raw.trim();
  return parts.reduce((a, b) => b.length > a.length ? b : a);
}

// ── Clean English gloss ───────────────────────────────────────────────────────
function cleanEnglish(raw) {
  if (!raw) return "";
  return raw
    .replace(/^[¿?]\s*\/\s*/,"")  // strip "¿/ " prefix on compound words
    .replace(/^\/ /,"")
    .replace(/\[is\] /g,"")
    // TAGNT lemma field sometimes bleeds in — strip "word=gloss" format
    .replace(/^[^\s=]+=/, "")
    .trim();
}

// ── Process one file ──────────────────────────────────────────────────────────
function processFile(filePath, out, isGreek, unknownBooks) {
  console.log(`  Reading ${filePath.split(/[/\\]/).pop()}…`);
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  let words = 0;

  for (const line of lines) {
    const cols = line.split("\t");
    const ref0 = (cols[0] ?? "").trim();
    if (!DATA_ROW.test(ref0)) continue;

    const verseKey = parseRef(ref0);
    if (!verseKey) {
      const abbr = ref0.split(".")[0];
      if (!unknownBooks.has(abbr)) {
        unknownBooks.add(abbr);
        console.warn(`    Unknown abbreviation: "${abbr}" — please report`);
      }
      continue;
    }

    let original, translit, english, strongsNum, morphCode;

    if (isGreek) {
      // TAGNT columns: 0=Ref  1=Word(Translit)  2=English  3=Strongs=Grammar
      const wt = parseWordTranslit(cols[1] ?? "");
      original   = wt.word;
      translit   = wt.translit;
      english    = cleanEnglish(cols[2] ?? "");
      strongsNum = extractStrongsTagnt(cols[3] ?? "");
      morphCode  = extractMorphTagnt(cols[3] ?? "");
    } else {
      // TAHOT columns: 0=Ref  1=Hebrew  2=Translit  3=English  4=Strongs  5=Grammar
      original   = cleanTahot(cols[1] ?? "");
      translit   = (cols[2] ?? "").replace(/\//g,"").trim();
      english    = cleanEnglish(cols[3] ?? "");
      strongsNum = extractStrongsTahot(cols[4] ?? "");
      morphCode  = extractMorphTahot(cols[5] ?? "");
    }

    if (!original) continue;

    const word = { e: english, o: original, t: translit, s: strongsNum };
    if (morphCode) word.m = morphCode;

    if (!out[verseKey]) out[verseKey] = [];
    out[verseKey].push(word);
    words++;
  }

  console.log(`    → ${words.toLocaleString()} words`);
  return words;
}

// ── Main ──────────────────────────────────────────────────────────────────────
for (const { prefix, output, label, isGreek } of [
  { prefix:"TAGNT", output:join(__dir,"strongs-greek.json"),  label:"Greek NT",  isGreek:true  },
  { prefix:"TAHOT", output:join(__dir,"strongs-hebrew.json"), label:"Hebrew OT", isGreek:false },
]) {
  console.log(`\nProcessing ${label}…`);

  const files = readdirSync(__dir)
    .filter(f => f.startsWith(prefix) && f.endsWith(".txt"))
    .map(f => join(__dir, f))
    .sort();

  if (files.length === 0) {
    console.error(`  ✗ No ${prefix}*.txt files found.`);
    continue;
  }

  console.log(`  Found ${files.length} file(s):`);
  const out = {};
  const unknownBooks = new Set();
  let totalWords = 0;

  for (const f of files) totalWords += processFile(f, out, isGreek, unknownBooks);

  const verseCount = Object.keys(out).length;
  console.log(`  Total: ${verseCount.toLocaleString()} verses, ${totalWords.toLocaleString()} words`);

  if (totalWords === 0) {
    console.error(`  ✗ Still 0 — dumping 3 raw data-looking lines:`);
    const lines = readFileSync(files[0], "utf8").split(/\r?\n/);
    let n = 0;
    for (const l of lines) {
      if (DATA_ROW.test((l.split("\t")[0] ?? "").trim()) && n++ < 3)
        console.error(`    ${JSON.stringify(l.slice(0,200))}`);
    }
    continue;
  }

  const json = JSON.stringify(out);
  writeFileSync(output, json, "utf8");
  console.log(`  ✓ Written: ${output}  (${Math.round(json.length/1024)} KB)`);
}

console.log("\nDone. Copy strongs-greek.json and strongs-hebrew.json into your plugin folder.");
