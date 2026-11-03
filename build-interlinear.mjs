/**
 * ScriptureScribe — Interlinear Data Converter
 * =============================================
 * Converts STEPBible TBESG / TBESH TSV files into the compact JSON format
 * used by the plugin for offline interlinear lookup.
 *
 * USAGE
 * -----
 *   node build-interlinear.mjs
 *
 * INPUT FILES  (place in the same folder as this script, or adjust paths below)
 * -----------
 *   TBESG.txt  — Greek NT word data  (STEPBible-Data, CC BY 4.0)
 *   TBESH.txt  — Hebrew OT word data (STEPBible-Data, CC BY 4.0)
 *
 * Download from:
 *   https://github.com/STEPBible/STEPBible-Data/tree/master/Tagged-Bibles
 *   Exact files:
 *     TBESG - Translators Brief lexicon of Extended Strongs for Greek.txt
 *     TBESH - Translators Brief lexicon of Extended Strongs for Hebrew.txt
 *
 * OUTPUT FILES  (written to same folder — copy into your plugin directory)
 * ------------
 *   strongs-greek.json   (~2 MB)
 *   strongs-hebrew.json  (~2 MB)
 *
 * JSON FORMAT
 * -----------
 * {
 *   "John 3:16": [
 *     { "e": "For/thus", "o": "Οὕτως", "t": "Houtōs",   "s": "G3779" },
 *     { "e": "indeed",   "o": "γάρ",   "t": "gar",       "s": "G1063" },
 *     ...
 *   ],
 *   ...
 * }
 *
 * Compact single-char keys keep file size ~2 MB instead of ~6 MB.
 *   e = english gloss
 *   o = original language word
 *   t = transliteration
 *   s = Strong's number (e.g. "G3779" or "H7225")
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────

const FILES = [
  {
    input:    join(__dir, "TBESG.txt"),
    output:   join(__dir, "strongs-greek.json"),
    language: "greek",
    prefix:   "G",
  },
  {
    input:    join(__dir, "TBESH.txt"),
    output:   join(__dir, "strongs-hebrew.json"),
    language: "hebrew",
    prefix:   "H",
  },
];

// ── STEPBible book abbreviation → canonical plugin name ───────────────────────
// STEPBible uses SBL-style abbreviations in the Ref column (e.g. "Mat", "1Co").

const BOOK_NAME = {
  // OT
  Gen:"Genesis", Exod:"Exodus", Lev:"Leviticus", Num:"Numbers", Deut:"Deuteronomy",
  Josh:"Joshua", Judg:"Judges", Ruth:"Ruth",
  "1Sam":"1 Samuel", "2Sam":"2 Samuel", "1Kgs":"1 Kings", "2Kgs":"2 Kings",
  "1Chr":"1 Chronicles", "2Chr":"2 Chronicles",
  Ezra:"Ezra", Neh:"Nehemiah", Esth:"Esther", Job:"Job",
  Ps:"Psalms", Prov:"Proverbs", Eccl:"Ecclesiastes", Song:"Song of Solomon",
  Isa:"Isaiah", Jer:"Jeremiah", Lam:"Lamentations", Ezek:"Ezekiel", Dan:"Daniel",
  Hos:"Hosea", Joel:"Joel", Amos:"Amos", Obad:"Obadiah", Jonah:"Jonah",
  Mic:"Micah", Nah:"Nahum", Hab:"Habakkuk", Zeph:"Zephaniah", Hag:"Haggai",
  Zech:"Zechariah", Mal:"Malachi",
  // NT
  Matt:"Matthew", Mark:"Mark", Luke:"Luke", John:"John", Acts:"Acts",
  Rom:"Romans", "1Cor":"1 Corinthians", "2Cor":"2 Corinthians", Gal:"Galatians",
  Eph:"Ephesians", Phil:"Philippians", Col:"Colossians",
  "1Thess":"1 Thessalonians", "2Thess":"2 Thessalonians",
  "1Tim":"1 Timothy", "2Tim":"2 Timothy", Titus:"Titus", Phlm:"Philemon",
  Heb:"Hebrews", Jas:"James", "1Pet":"1 Peter", "2Pet":"2 Peter",
  "1John":"1 John", "2John":"2 John", "3John":"3 John", Jude:"Jude", Rev:"Revelation",
};

// ── Parser ────────────────────────────────────────────────────────────────────

/**
 * Parse one STEPBible TSV file and return a map of
 *   "Canonical Book Ch:V" → array of compact word objects
 */
function parseTSV(filePath, prefix) {
  const raw   = readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  const out   = {};
  let skipped = 0;

  for (const line of lines) {
    // Skip blank lines and comment/header lines
    if (!line || line.startsWith("#") || line.startsWith("Ref\t")) continue;

    const cols = line.split("\t");
    // Need at least 6 columns: Ref, Original, Translit, Parsing, Strongs, Gloss
    if (cols.length < 6) continue;

    const [refRaw, original, translit, , strongsRaw, gloss] = cols;
    // English contextual gloss is col 6 if present, otherwise fall back to col 5
    const english = (cols[6] ?? gloss ?? "").trim() || gloss.trim();

    // Parse ref:  e.g. "Mat.1.1#01"  →  book="Mat", ch=1, v=1
    const refMatch = refRaw.match(/^([^.]+)\.(\d+)\.(\d+)/);
    if (!refMatch) { skipped++; continue; }

    const [, bookAbbr, chStr, vStr] = refMatch;
    const canonicalBook = BOOK_NAME[bookAbbr];
    if (!canonicalBook) { skipped++; continue; }

    const verseKey = `${canonicalBook} ${parseInt(chStr, 10)}:${parseInt(vStr, 10)}`;

    // Normalise Strong's number:  "G0976" → "G976",  "H07225" → "H7225"
    // STEPBible sometimes zero-pads to 4 digits; strip leading zeros after prefix.
    const rawNum  = strongsRaw.trim();
    let strongsNum = "";
    if (rawNum) {
      // Extract the letter prefix and numeric part separately
      const sMatch = rawNum.match(/^([A-Za-z]+)0*(\d+)/);
      if (sMatch) {
        // Use the file's own prefix letter if present, else use our prefix param
        const letter = sMatch[1].toUpperCase() || prefix;
        strongsNum = `${letter}${sMatch[2]}`;
      }
    }

    const word = {
      e: english.trim(),
      o: original.trim(),
      t: translit.trim(),
      s: strongsNum,
    };

    if (!out[verseKey]) out[verseKey] = [];
    out[verseKey].push(word);
  }

  if (skipped > 0) {
    console.log(`  (skipped ${skipped} unparseable lines)`);
  }

  return out;
}

// ── Main ──────────────────────────────────────────────────────────────────────

for (const { input, output, language, prefix } of FILES) {
  console.log(`\nProcessing ${language}…`);

  if (!existsSync(input)) {
    console.error(`  ✗ Input file not found: ${input}`);
    console.error(`    Download it from https://github.com/STEPBible/STEPBible-Data/tree/master/Tagged-Bibles`);
    continue;
  }

  console.log(`  Reading ${input}…`);
  const data      = parseTSV(input, prefix);
  const verseCount = Object.keys(data).length;
  const wordCount  = Object.values(data).reduce((n, arr) => n + arr.length, 0);
  console.log(`  Parsed ${verseCount.toLocaleString()} verses, ${wordCount.toLocaleString()} words`);

  const json = JSON.stringify(data);
  writeFileSync(output, json, "utf8");
  const kb = Math.round(json.length / 1024);
  console.log(`  ✓ Written ${output}  (${kb} KB)`);
}

console.log("\nDone. Copy strongs-greek.json and strongs-hebrew.json into your plugin folder.");
