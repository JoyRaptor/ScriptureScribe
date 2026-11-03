/**
 * diagnose-stepbible.mjs
 * ──────────────────────
 * Scans the STEPBible files and prints the first 10 lines that contain
 * a tab AND look like they might be actual data (not pure headers).
 * Run this, paste the output, and the real converter can be fixed.
 *
 * Usage:  node diagnose-stepbible.mjs
 */

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));

function diagnose(prefix) {
  const files = readdirSync(__dir)
    .filter(f => f.startsWith(prefix) && f.endsWith(".txt"))
    .sort();

  if (files.length === 0) { console.log(`No ${prefix}*.txt files found.`); return; }

  // Just use the first file
  const filePath = join(__dir, files[0]);
  console.log(`\n=== ${files[0]} ===`);
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  // Print first 5 lines unconditionally so we see the header format
  console.log("--- First 5 lines (raw) ---");
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    console.log(`  [${i}] ${JSON.stringify(lines[i].slice(0, 200))}`);
  }

  // Print first 10 lines that contain a tab AND have content in col 0
  console.log("--- First 10 tab-containing lines ---");
  let shown = 0;
  for (const line of lines) {
    if (!line.includes("\t")) continue;
    if (shown >= 10) break;
    console.log(`  ${JSON.stringify(line.slice(0, 200))}`);
    shown++;
  }

  // Also show lines 50-60 (likely past the header block)
  console.log("--- Lines 50-60 ---");
  for (let i = 50; i < Math.min(60, lines.length); i++) {
    console.log(`  [${i}] ${JSON.stringify(lines[i].slice(0, 200))}`);
  }
}

diagnose("TAGNT");
diagnose("TAHOT");
