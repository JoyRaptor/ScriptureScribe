/**
 * build-strongs-definitions.mjs
 * ─────────────────────────────
 * Converts STEPBible TBESH + TBESG lexicon files into a single
 * strongs-definitions.json used by the plugin for offline Strong's popups.
 *
 * INPUT FILES  (download from STEPBible-Data on GitHub — you already have these)
 * ─────────────
 *   TBESH.txt   "TBESH - Translators Brief lexicon of Extended Strongs for Hebrew"
 *   TBESG.txt   "TBESG - Translators Brief lexicon of Extended Strongs for Greek"
 *
 * OUTPUT
 * ─────────────
 *   strongs-definitions.json  (~3 MB)
 *   → copy into .obsidian/plugins/scripture-scribe/
 *
 * FORMAT
 * ─────────────
 * {
 *   "H0001": { "o": "אָב",  "t": "av",    "g": "father",  "d": "1) father of an individual..." },
 *   "G0001": { "o": "α",    "t": "Alpha", "g": "Alpha",   "d": "alpha, the first letter..." },
 *   ...
 * }
 * Keys: o=original, t=transliteration, g=gloss, d=definition
 *
 * ACTUAL FILE COLUMNS (tab-separated, confirmed from file header):
 *   0: eStrong#       e.g. "H0001"
 *   1: dStrong        e.g. "H0001G ="   (ignore)
 *   2: uStrong        e.g. "H0001G"     (ignore)
 *   3: Hebrew/Greek   e.g. "אָב"
 *   4: Transliteration e.g. "av"
 *   5: Morph          e.g. "H:N-M"     (ignore)
 *   6: Gloss          e.g. "father"
 *   7: Meaning        e.g. "1) father..."
 *
 * Lines that are headers/comments:
 *   - Blank lines
 *   - Lines starting with a letter that isn't H or G in col 0
 *   - Lines starting with whitespace (continuation / section header)
 *   - The actual data header line: "eStrong#\tdStrong\t..."
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));

const INPUT_FILES = [
  { path: join(__dir, "TBESH.txt"), lang: "H" },
  { path: join(__dir, "TBESG.txt"), lang: "G" },
];
const OUTPUT = join(__dir, "strongs-definitions.json");

// Strip HTML tags from definition text for clean display
function stripHtml(s) {
  return s
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Normalise a Strong's number: "H0001" → "H1", "G0976" → "G976"
// We keep the letter prefix but strip leading zeros from the number.
function normaliseStrongs(raw) {
  const m = raw.trim().match(/^([HG])0*(\d+)/i);
  if (!m) return null;
  return `${m[1].toUpperCase()}${m[2]}`;
}

const result = {};
let total = 0;
let skipped = 0;

for (const { path: filePath, lang } of INPUT_FILES) {
  if (!existsSync(filePath)) {
    console.error(`✗ Not found: ${filePath}`);
    console.error(`  Download from: https://github.com/STEPBible/STEPBible-Data/tree/master/Lexicons`);
    continue;
  }

  console.log(`\nReading ${filePath}…`);
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  let fileCount = 0;

  for (const line of lines) {
    // Skip blank lines and lines that start with whitespace (headers/continuations)
    if (!line.trim()) continue;
    if (/^\s/.test(line)) continue;

    const cols = line.split("\t");
    // Col 0 must look like H#### or G#### (with optional leading zeros)
    const rawStrongs = cols[0]?.trim() ?? "";
    if (!/^[HG]\d{4}/i.test(rawStrongs)) { skipped++; continue; }

    const strongsKey = normaliseStrongs(rawStrongs);
    if (!strongsKey) { skipped++; continue; }

    // Skip if we already have an entry for this number (eStrong has duplicate
    // rows for disambiguated entries — first row is the primary one)
    if (result[strongsKey]) continue;

    const original       = (cols[3] ?? "").trim();
    const transliteration = (cols[4] ?? "").trim();
    const gloss          = (cols[6] ?? "").trim();
    const meaningRaw     = (cols[7] ?? "").trim();
    const definition     = stripHtml(meaningRaw) || gloss;

    if (!original && !gloss) { skipped++; continue; }

    result[strongsKey] = {
      o: original,
      t: transliteration,
      g: gloss,
      d: definition,
    };

    fileCount++;
    total++;
  }

  console.log(`  → ${fileCount.toLocaleString()} entries parsed`);
}

console.log(`\nTotal: ${total.toLocaleString()} entries  (${skipped} lines skipped)`);

const json = JSON.stringify(result);
writeFileSync(OUTPUT, json, "utf8");
console.log(`✓ Written: ${OUTPUT}  (${Math.round(json.length / 1024)} KB)`);
console.log(`\nCopy strongs-definitions.json into your plugin folder.`);
