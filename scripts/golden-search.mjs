// Golden-search harness — the safety net for AI-assisted changes.
//
//   node scripts/golden-search.mjs --update   capture current behavior as the baseline
//   node scripts/golden-search.mjs --check    verify behavior still matches the baseline
//
// It bundles the plugin's REAL search source (with obsidian and the ML
// runtime stubbed), loads the REAL data files, runs a fixed query set, and
// compares mode + result count + top-10 results per query. Any code change
// that alters search behavior fails --check loudly.
//
// Rule for AI helpers: run --check after EVERY change. If your task was not
// supposed to change search results and --check fails, revert your change.
// If your task legitimately changes results, say so and run --update, and
// commit goldens.json together with the change.

import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GOLDEN_PATH = path.join(__dirname, "goldens.json");
const BUNDLE_PATH = path.join(__dirname, ".golden-bundle.cjs");

// One query per search mode, plus normalization and filter edge cases.
const QUERIES = [
  "G25",                              // Strong's Greek
  "H7225",                            // Strong's Hebrew
  "g0025",                            // Strong's normalization (leading zeros)
  "ἀγάπη",                            // original language, Greek
  "אלהים",                            // original language, Hebrew
  "love",                             // English gloss, single word
  "shepherd",                         // English gloss
  "eternal life",                     // two-word English (KJV text pass)
  "faith AND works",                  // boolean AND
  "faith|grace",                      // boolean OR
  "love NOT world",                   // boolean NOT
  "leads me beside still waters",     // phrase, paraphrase
  "in the beginning God created",     // phrase, exact
  "morph:V-AAI*",                     // morphology, code only (wildcard — data codes are dashed, e.g. V-AAI-3S)
  "morph:G4100|V-A*",                 // morphology, lemma + wildcard
  "semantic:forgiveness of sins",     // semantic (TF-IDF tier in tests)
  "nt love",                          // testament filter NT
  "ot shepherd",                      // testament filter OT
];

async function buildBundle() {
  await esbuild.build({
    entryPoints: [path.join(__dirname, "golden-entry.mjs")],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "es2020",
    outfile: BUNDLE_PATH,
    logLevel: "silent",
    alias: {
      "obsidian": path.join(__dirname, "stubs", "obsidian.mjs"),
      "@xenova/transformers": path.join(__dirname, "stubs", "xenova.mjs"),
    },
  });
}

function comparable(results) {
  // ms is timing noise; strip it before diffing
  const out = {};
  for (const [q, r] of Object.entries(results)) {
    out[q] = { mode: r.mode, count: r.count, top: r.top };
  }
  return out;
}

async function main() {
  const flag = process.argv[2];
  if (flag !== "--update" && flag !== "--check") {
    console.log("Usage: node scripts/golden-search.mjs --update | --check");
    process.exit(2);
  }

  console.log("Bundling plugin search code…");
  await buildBundle();

  const require = createRequire(pathToFileURL(BUNDLE_PATH));
  const { runQueries } = require(BUNDLE_PATH);

  console.log("Loading data + building index (takes ~10-30s)…");
  const results = await runQueries(ROOT, QUERIES);

  for (const [q, r] of Object.entries(results)) {
    console.log(`  ${r.ms}ms  [${r.mode}] ${JSON.stringify(q)} → ${r.count} results`);
  }

  if (flag === "--update") {
    fs.writeFileSync(GOLDEN_PATH, JSON.stringify(results, null, 2));
    console.log(`\nGoldens written to ${GOLDEN_PATH}`);
    return;
  }

  // --check
  if (!fs.existsSync(GOLDEN_PATH)) {
    console.error("No goldens.json found — run with --update first.");
    process.exit(2);
  }
  const golden = comparable(JSON.parse(fs.readFileSync(GOLDEN_PATH, "utf8")));
  const actual = comparable(results);

  let failures = 0;
  for (const q of QUERIES) {
    const g = JSON.stringify(golden[q]);
    const a = JSON.stringify(actual[q]);
    if (g !== a) {
      failures++;
      console.error(`\nFAIL ${JSON.stringify(q)}`);
      console.error(`  expected: ${g?.slice(0, 300)}`);
      console.error(`  actual:   ${a?.slice(0, 300)}`);
    }
  }

  if (failures) {
    console.error(`\n${failures}/${QUERIES.length} queries changed behavior. If unintended, REVERT your change.`);
    process.exit(1);
  }
  console.log(`\nPASS — all ${QUERIES.length} queries match the golden baseline.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
