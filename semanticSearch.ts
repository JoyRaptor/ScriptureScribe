// src/semanticSearch.ts
//
// Three-tier semantic search — no API key required, works fully offline.
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ Tier 1 — Pre-shipped verse vectors (verse-vectors.bin)                  │
// │   31k KJV verses pre-embedded with all-MiniLM-L6-v2 at build time,     │
// │   stored as float16 in a compact binary. The query is embedded at       │
// │   runtime using the same model via Xenova/transformers WASM.            │
// │                                                                         │
// │ Tier 2 — Smart Connections bridge (if installed)                        │
// │   Smart Connections ships its own embedded ONNX runtime. When SC is     │
// │   present, we borrow its pipeline to embed the query — same model,      │
// │   zero extra download, no WASM pathing fights.                          │
// │                                                                         │
// │ Tier 3 — TF-IDF (always available, zero dependencies)                   │
// │   Weighted keyword scoring with stop-word filter, proximity bonus,      │
// │   and phrase detection. Works offline on every device, always.          │
// └─────────────────────────────────────────────────────────────────────────┘

import { App } from "obsidian";
import { getKJVText } from "./searchIndex";

// ── State ─────────────────────────────────────────────────────────────────────

let verseRefs:    string[]     | null = null;
let verseVectors: Float32Array | null = null;
let dims = 384;
let semanticApp: App | undefined;
let semanticDir = "";
let vectorsTask: Promise<void> | null = null;
export function configureSemanticSearch(app: App, dir: string): void {
  semanticApp = app;
  semanticDir = dir;
}


// Runtime embedding pipeline — one function that wraps whichever backend loads
let embeddingPipeline: ((text: string) => Promise<Float32Array>) | null = null;
let pipelineSource: "xenova" | "smart-connections" | "none" = "none";
let pipelineLoadAttempted = false;
import { SearchResult } from "./searchIndex";

export interface SemanticResult {
  ref:   string;
  score: number;
  source: "Vector" | "Link" | "Keyword";
}

// ── Ref normaliser ────────────────────────────────────────────────────────────
// verse-vectors.bin was built from a KJV JSON that uses Roman-numeral book
// names ("I Samuel", "II Kings", "III John") and "Revelation of John".
// The kjvStore populated by fetcher.setKJVData normalises to Arabic-numeral
// canonical forms ("1 Samuel", "2 Kings", "3 John", "Revelation").
// We must re-normalise here so getKJVText() and parseScriptureRefs() both work.
const _ROMAN_TO_ARABIC: Array<[RegExp, string]> = [
  [/^III\s+/, "3 "],
  [/^II\s+/,  "2 "],
  [/^I\s+/,   "1 "],
];
const _LONG_ALIASES: Array<[RegExp, string]> = [
  [/^Revelation of John\s/, "Revelation "],
  [/^Song of Songs\s/,      "Song of Solomon "],
];

function normalizeVerseRef(ref: string): string {
  let r = ref;
  for (const [re, rep] of _LONG_ALIASES) { if (re.test(r)) { r = r.replace(re, rep); break; } }
  for (const [re, rep] of _ROMAN_TO_ARABIC) { if (re.test(r)) { r = r.replace(re, rep); break; } }
  return r;
}


// ── Float16 decoder ───────────────────────────────────────────────────────────
// All 65,536 possible float16 values are precomputed into one table so bulk
// decode is a single array lookup per element instead of bit math + Math.pow.

let F16_LUT: Float32Array | null = null;

function buildF16Lut(): Float32Array {
  const lut = new Float32Array(65536);
  for (let f16 = 0; f16 < 65536; f16++) {
    const sign = (f16 >> 15) & 0x1;
    const exp  = (f16 >> 10) & 0x1f;
    const mant =  f16        & 0x3ff;
    if (exp === 0)       lut[f16] = (sign ? -1 : 1) * Math.pow(2, -14) * (mant / 1024);
    else if (exp === 31) lut[f16] = mant ? NaN : (sign ? -Infinity : Infinity);
    else                 lut[f16] = (sign ? -1 : 1) * Math.pow(2, exp - 15) * (1 + mant / 1024);
  }
  return lut;
}

// Raw float16 payload. Decoding to Float32 costs ~48MB of RAM and only pays
// off once an embedding pipeline exists (never, on most mobile devices), so
// the decode is deferred until the first actual vector search.
let verseVectorsF16: Uint16Array | null = null;

function ensureVectorsDecoded(): void {
  if (verseVectors || !verseVectorsF16) return;
  const lut = F16_LUT ?? (F16_LUT = buildF16Lut());
  const f16 = verseVectorsF16;
  const out = new Float32Array(f16.length);
  for (let i = 0; i < f16.length; i++) out[i] = lut[f16[i]];
  verseVectors    = out;
  verseVectorsF16 = null;
  console.log(`ScriptureScribe: decoded ${out.length / dims} verse vectors (${dims}d float16→f32)`);
}

// ── Load pre-shipped verse vectors ────────────────────────────────────────────

export async function loadVerseVectors(app: App, pluginDir: string): Promise<void> {
  if (verseVectors || verseVectorsF16) return;
  try {
    const binPath = `${pluginDir}/verse-vectors.bin`;
    if (!await app.vault.adapter.exists(binPath)) {
      console.warn("ScriptureScribe: verse-vectors.bin not found — semantic search falls back to TF-IDF.");
      return;
    }
    const buf = await app.vault.adapter.readBinary(binPath);
    const dv  = new DataView(buf);
    const verseCount  = dv.getUint32(0, true);
    dims              = dv.getUint32(4, true);
    const refsLen     = dv.getUint32(8, true);
    const rawRefs: string[] = JSON.parse(new TextDecoder().decode(buf.slice(12, 12 + refsLen)));
    // Normalize refs once at load: the bin uses Roman-numeral book names
    // ("I Samuel") while kjvStore keys are Arabic ("1 Samuel"). Every
    // downstream getKJVText() lookup depends on these matching.
    verseRefs = rawRefs.map(normalizeVerseRef);
    const vectorStart = 12 + refsLen;
    // buf.slice copies to a fresh 2-byte-aligned buffer; a Uint16Array view
    // directly onto buf throws whenever refsLen is odd.
    verseVectorsF16 = new Uint16Array(buf.slice(vectorStart));
    console.log(`ScriptureScribe: loaded ${verseCount} verse vector refs (${dims}d, decode deferred)`);
  } catch (e) {
    console.warn("ScriptureScribe: verse vector load failed", e);
  }
}

// ── Cosine similarity search against loaded vectors ───────────────────────────

async function vectorSearch(query: string, topK: number): Promise<SemanticResult[] | null> {
  if ((!verseVectors && !verseVectorsF16) || !verseRefs || !embeddingPipeline) return null;
  try {
    ensureVectorsDecoded();
    if (!verseVectors) return null;
    const queryVec = await embeddingPipeline(query);
    if (!queryVec || queryVec.length !== dims) return null;

    const N = verseRefs.length;
    const scoreArr = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      let dot = 0;
      const off = i * dims;
      for (let d = 0; d < dims; d++) dot += queryVec[d] * verseVectors[off + d];
      scoreArr[i] = dot;
    }

    const indices = Array.from({ length: N }, (_, i) => i);
    indices.sort((a, b) => scoreArr[b] - scoreArr[a]);
    return indices.slice(0, topK).map(i => ({
      ref:   verseRefs![i],
      score: scoreArr[i],
      source: "Vector" as const,
    }));
  } catch (e) {
    console.warn("ScriptureScribe: vector search error", e);
    return null;
  }
}

// ── Smart Connections bridge ──────────────────────────────────────────────────
//
// SC ships and manages its own ONNX runtime, which already works inside
// Obsidian's environment. We borrow its embed_model rather than loading
// a second copy of transformers.
//
// SC ≥ 2.x exposes: app.plugins.plugins["smart-connections"].env.embed_model

async function trySmartConnectionsPipeline(app: App): Promise<boolean> {
  try {
    const sc = (app as any).plugins?.plugins?.["smart-connections"];
    if (!sc) return false;

    const env = sc.env ?? sc.smart_env;
    if (!env) return false;

    // Different SC versions expose the model under different property names
    const embedModel =
      env.embed_model      ??
      env.embeddings_model ??
      env.embedding_model  ??
      env.model;

    if (!embedModel || typeof embedModel.embed !== "function") return false;

    // verse-vectors.bin was built with all-MiniLM-L6-v2. A different model
    // with the SAME dimension count (SC's default bge-micro-v2 is also 384d)
    // passes any dims check yet produces meaningless cosine scores, so the
    // model identity must match — not just the shape.
    const modelId = String(
      embedModel.model_key ?? embedModel.opts?.model_key ??
      embedModel.model_config?.model_key ?? embedModel.config?.model_key ?? ""
    ).toLowerCase();
    if (!modelId.includes("minilm-l6")) {
      console.info(
        `ScriptureScribe: Smart Connections model "${modelId || "unknown"}" is not ` +
        `all-MiniLM-L6-v2 — bridge skipped so cosine scores stay valid.`
      );
      return false;
    }

    // Sanity check — actually embed something
    const testVec = await embedModel.embed("test");
    const testArr = testVec instanceof Float32Array ? testVec : new Float32Array(testVec ?? []);
    if (testArr.length === 0) return false;

    // Belt-and-braces dims check on top of the identity check above.
    if ((verseVectors || verseVectorsF16) && testArr.length !== dims) {
      console.info(
        `ScriptureScribe: Smart Connections model (${testArr.length}d) ≠ ` +
        `verse-vectors.bin (${dims}d). Cosine search disabled; TF-IDF active.`
      );
      verseVectors    = null;
      verseVectorsF16 = null;
    }

    embeddingPipeline = async (text: string) => {
      const v = await embedModel.embed(text);
      return v instanceof Float32Array ? v : new Float32Array(v);
    };
    pipelineSource = "smart-connections";
    console.log("ScriptureScribe: using Smart Connections embedding model for semantic search");
    return true;
  } catch (e) {
    console.info("ScriptureScribe: Smart Connections bridge failed —", (e as Error).message);
    return false;
  }
}

// ── Xenova/transformers — primary standalone runtime ──────────────────────────
//
// Works on desktop Obsidian when the plugin has network access for the initial
// WASM + model download. Uses jsDelivr CDN for WASM runtime so no local file
// serving is required. Mobile Obsidian often blocks this due to sandbox
// restrictions — SC bridge or TF-IDF handles those cases.

async function tryXenovaPipeline(): Promise<boolean> {
  try {
    if (!semanticApp || !semanticDir) return false;
    // This is our own locally installed, compiled plugin code. Loading it the
    // same way as Obsidian loads main.js also works with mobile vault adapters.
    const code = await semanticApp.vault.adapter.read(`${semanticDir}/semantic-runtime.js`);
    const runtimeModule = {exports: {} as any};
    new Function("require", "module", "exports", code)(require, runtimeModule, runtimeModule.exports);
    const pipe = await runtimeModule.exports.createEmbeddingPipeline();

    // Confirm the model actually works before committing
    const testOut = await pipe("test", { pooling: "mean", normalize: true });
    if (!testOut?.data || testOut.data.length === 0) throw new Error("empty test output");

    embeddingPipeline = async (text: string) => {
      const out = await pipe(text, { pooling: "mean", normalize: true });
      return out.data as Float32Array;
    };
    pipelineSource = "xenova";
    console.log("ScriptureScribe: Xenova/transformers embedding model loaded");
    return true;
  } catch (e) {
    console.info(
      "ScriptureScribe: Xenova/transformers unavailable (V4-patch) —",
      (e as Error).message
    );
    return false;
  }
}

// ── Pipeline loader: try sources in order ────────────────────────────────────

export async function loadEmbeddingPipeline(app?: App): Promise<void> {
  // If we already have a high-quality pipeline, don't re-probe
  if (pipelineSource === "xenova" || pipelineSource === "smart-connections") return;

  // 1. Smart Connections — already running, no download, no WASM fight
  if (app && await trySmartConnectionsPipeline(app)) return;

  // Only try Xenova once to avoid repeated crashes
  if (pipelineLoadAttempted) return;
  pipelineLoadAttempted = true;

  // 2. Xenova/transformers — standalone, needs CDN on first use
  if (await tryXenovaPipeline()) return;

  // 3. TF-IDF — no pipeline; handled directly in semanticVerseSearch
  pipelineSource = "none";
  console.info("ScriptureScribe: no embedding runtime available — TF-IDF active for concept search.");
}

/** Called from main.ts after KJV data loads so TF-IDF always has verse refs */
export function setVerseRefs(refs: string[]): void {
  // Ignore empty lists: if this fires before the KJV finishes loading, an
  // accepted [] would lock TF-IDF into zero results for the whole session.
  if ((!verseRefs || verseRefs.length === 0) && refs.length > 0) verseRefs = refs;
}

/** Returns active pipeline source — useful for Settings UI status display */
export function getEmbeddingSource(): "xenova" | "smart-connections" | "none" {
  return pipelineSource;
}

// ── Tier 3: TF-IDF keyword search ────────────────────────────────────────────

const STOP = new Set([
  "the","and","for","are","but","not","you","all","can","her","was","one",
  "our","out","day","get","has","him","his","how","its","let","men","new",
  "now","old","see","two","way","who","did","may","thy","thee","thou",
  "hath","doth","that","this","with","from","they","have","been","will",
  "said","unto","into","upon","shall","them","then","when","were","your",
  "also","even","which","there","these","those","their","about","after",
  "over","such","more","like","than","only","just","what","both","some",
  "very","much","come","came","went","give","take","made","make","know",
  "through","without","before","against","between","because","therefore",
]);

async function tfidfSearch(query: string, topK: number): Promise<SemanticResult[]> {
  const queryWords = query
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w));

  if (!queryWords.length) return [];

  // Use verseRefs from vectors bin if available, otherwise we have no list.
  // In the no-vectors case, tfidfSearch won't be called unless verseRefs was
  // populated via setVerseRefs() from main.ts.
  const refs = verseRefs;
  if (!refs || refs.length === 0) return [];

  // Regexes compiled once per query word — never inside the verse loop.
  const wordRes = queryWords.map(w => new RegExp(`\\b${w.replace(/'/g, "\\'")}`, "g"));

  const scores: Array<[string, number]> = [];

  let sliceStart = Date.now();
  for (let ri = 0; ri < refs.length; ri++) {
    // Yield to the event loop on a time budget so long scans can't freeze the UI.
    if ((ri & 2047) === 0 && Date.now() - sliceStart > 12) {
      await new Promise<void>(r => setTimeout(r, 0));
      sliceStart = Date.now();
    }
    const ref  = refs[ri];
    const text = getKJVText(ref);
    if (!text) continue;
    const lower = text.toLowerCase();
    let score = 0;

    for (let qi = 0; qi < queryWords.length; qi++) {
      if (lower.includes(queryWords[qi])) {
        score += 1.0;
        const m = lower.match(wordRes[qi]);
        if (m) score += m.length * 0.4;
      }
    }

    if (queryWords.length >= 2) {
      if (queryWords.every(w => lower.includes(w))) score *= 1.6;
      if (score > 0) {
        const positions = queryWords.map(w => lower.indexOf(w)).filter(p => p >= 0);
        if (positions.length >= 2) {
          const span = Math.max(...positions) - Math.min(...positions);
          if (span < 80) score *= 1.3;
        }
      }
    }

    if (score > 0) scores.push([ref, score]);
  }

  scores.sort((a, b) => b[1] - a[1]);
  const max = scores[0]?.[1] ?? 1;
  return scores.slice(0, topK).map(([ref, score]) => ({
    ref,
    score: score / max,
    source: "Keyword" as const
  }));
}

// ── Public search entry point ─────────────────────────────────────────────────

export async function semanticVerseSearch(
  query: string,
  topK  = 10,
  app?: App,
  explicit = false,
): Promise<SemanticResult[]> {
  // Ensure we've tried to load a pipeline (allows lazy-loading SC bridge)
  const context = app ?? semanticApp;
  if ((explicit || app) && context) {
    await loadEmbeddingPipeline(context);
    if (embeddingPipeline && semanticDir) await (vectorsTask ??= loadVerseVectors(context, semanticDir));
  }

  // Tier 1 + 2: vector cosine (requires pre-shipped vectors + working pipeline)
  if (embeddingPipeline && (verseVectors || verseVectorsF16)) {
    const vResults = await vectorSearch(query, topK);
    if (vResults && vResults.length > 0) return vResults;
  }

  // Tier 3: TF-IDF keyword scoring (always works)
  return tfidfSearch(query, topK);
}
