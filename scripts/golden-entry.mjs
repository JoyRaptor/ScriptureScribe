// Bundled by golden-search.mjs with the real plugin source. Loads the same
// data files the plugin ships, builds the search index through the same
// code paths main.ts uses, then runs each query through search().
import * as fs from "fs";
import * as path from "path";
import { setKJVData, getKJVData } from "../src/fetcher";
import {
  setGreekData, setHebrewData, setLXXData,
  getGreekData, getHebrewData, getLXXData,
} from "../src/interlinear";
import { buildSearchIndex, search } from "../src/searchIndex";
import { setVerseRefs } from "../src/semanticSearch";

export async function runQueries(dataDir, queries) {
  const readJson = (f) =>
    JSON.parse(fs.readFileSync(path.join(dataDir, f), "utf8"));

  setKJVData(readJson("kjv.json"));
  setGreekData(readJson("strongs-greek.json"));
  setHebrewData(readJson("strongs-hebrew.json"));
  setLXXData(readJson("strongs-lxx.json"));
  // Mirrors main.ts: gives TF-IDF its verse list when no vectors are loaded.
  setVerseRefs(Object.keys(getKJVData()));

  await buildSearchIndex(getGreekData(), getHebrewData(), getLXXData());

  const out = {};
  for (const q of queries) {
    const t0 = Date.now();
    const { results, mode } = await search(q);
    out[q] = {
      mode,
      count: results.length,
      ms: Date.now() - t0, // informational only — excluded from comparison
      top: results.slice(0, 10).map((r) => ({
        ref: r.reference,
        src: r.source ?? null,
        score: r.score != null ? Math.round(r.score * 1000) / 1000 : null,
      })),
    };
  }
  return out;
}
