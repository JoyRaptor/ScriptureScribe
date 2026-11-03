// Prints every scripture address ScriptureScribe would link in a Markdown file, the way the
// editor parses it, plus near-misses: address-shaped text it would NOT link, for review.
//
//   node scripts/check-addresses.mjs "path/to/note.md" [--misses-only] [--json]
import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
if (!file) { console.error('usage: node scripts/check-addresses.mjs <note.md> [--misses-only] [--json]'); process.exit(2); }
const missesOnly = args.includes('--misses-only'), asJson = args.includes('--json');

const out = path.join(root, 'scripts/.check-addresses.cjs');
await esbuild.build({stdin: {contents: `export * from './src/parser';`, resolveDir: root}, bundle: true, platform: 'node',
  format: 'cjs', outfile: out, alias: {obsidian: path.join(root, 'scripts/stubs/obsidian.mjs')}, logLevel: 'silent'});
const {parseScriptureRefs, refToString, maskMarkdown} = createRequire(import.meta.url)(out);

const text = fs.readFileSync(file, 'utf8');
const lineStarts = [0];
for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1);
const lineOf = off => { let lo = 0, hi = lineStarts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= off) lo = mid; else hi = mid - 1; } return lo + 1; };

const refs = parseScriptureRefs(text);
const linked = refs.map(r => ({line: lineOf(r.start), text: r.raw, address: refToString(r)}));

// Near-misses: "Word 12:3", "Word 12.3", "1 Word 2:3" or "v12" in prose that no linked address covers.
const scan = maskMarkdown(text);
const shapes = /(?:\b[1-4]\s?)?\b[A-Z][A-Za-z]{1,15}\.?\s?\d{1,3}[:.]\d{1,3}(?:[-–]\d{1,3})?|\bvv?\.?\s?\d{1,3}\b/g;
const misses = [];
for (const m of scan.matchAll(shapes)) {
  const start = m.index, end = start + m[0].length;
  if (refs.some(r => r.start < end && r.end > start)) continue;
  // "Steelman v2": a version suffix on a capitalized name, not a verse marker.
  if (/^v/i.test(m[0]) && /[A-Z][\w-]*[ \t]$/.test(scan.slice(Math.max(0, start - 30), start))) continue;
  misses.push({line: lineOf(start), text: m[0]});
}

if (asJson) console.log(JSON.stringify({file, linked: missesOnly ? undefined : linked, misses}, null, 1));
else {
  if (!missesOnly) for (const l of linked) console.log(`L${l.line}\t${l.text}\t→ ${l.address}`);
  console.log(`\n${linked.length} linked addresses, ${misses.length} near-misses (address-shaped text that is NOT linked):`);
  for (const m of misses) console.log(`L${m.line}\t${m.text}`);
}
