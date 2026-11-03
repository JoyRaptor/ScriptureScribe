// scripts/generateVectors.ts
// Runs at build time. Generates verse-vectors.bin.
// Optimized for Float16 as requested.
// Requires: npm install @xenova/transformers

import { pipeline } from "@xenova/transformers";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Fix for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust path as kjv.json was moved to src/data/
const KJV_PATH = path.resolve(__dirname, "../src/data/kjv.json");
const OUT_PATH = path.resolve(__dirname, "../verse-vectors.bin");

const MODEL = "Xenova/all-MiniLM-L6-v2"; // 25MB, 384-dim, open license
const DIMS = 384;

/**
 * Encodes a Float32 number into a Float16 (Half-precision) bits.
 */
function encodeFloat16(f32: number): number {
  const buf = new DataView(new ArrayBuffer(4));
  buf.setFloat32(0, f32);
  const f32Bits = buf.getUint32(0);

  const sign = (f32Bits >> 31) & 0x1;
  let exp = (f32Bits >> 23) & 0xff;
  let mant = f32Bits & 0x7fffff;

  let f16: number;

  if (exp === 0xff) {
    // Nan or Infinity
    f16 = (sign << 15) | 0x7c00 | (mant !== 0 ? 0x200 : 0);
  } else {
    exp = exp - 127 + 15;
    if (exp >= 31) {
      // Overflow to Infinity
      f16 = (sign << 15) | 0x7c00;
    } else if (exp <= 0) {
      // Underflow to zero or denormal
      f16 = (sign << 15);
    } else {
      f16 = (sign << 15) | (exp << 10) | (mant >> 13);
    }
  }
  return f16;
}

async function main() {
  console.log(`Checking path: ${KJV_PATH}`);
  if (!fs.existsSync(KJV_PATH)) {
    console.error(`KJV data not found at ${KJV_PATH}`);
    process.exit(1);
  }

  const kjvData = JSON.parse(fs.readFileSync(KJV_PATH, "utf8"));
  const embedder = await pipeline("feature-extraction", MODEL);

  const verses: { ref: string; text: string }[] = [];
  for (const [key, text] of Object.entries(kjvData)) {
    verses.push({ ref: key, text: text as string });
  }

  console.log(`ScriptureScribe: Embedding ${verses.length} verses (Float16)...`);

  const BATCH = 64;
  const allVectorsF16 = new Uint16Array(verses.length * DIMS);

  for (let i = 0; i < verses.length; i += BATCH) {
    const batch = verses.slice(i, i + BATCH);
    const texts = batch.map(v => v.text);
    const output = await embedder(texts, { pooling: "mean", normalize: true });
    const outputList = output.tolist();
    
    for (let j = 0; j < batch.length; j++) {
      const vecF32 = outputList[j];
      for (let d = 0; d < DIMS; d++) {
        allVectorsF16[(i + j) * DIMS + d] = encodeFloat16(vecF32[d]);
      }
    }

    if (i % 1000 === 0) console.log(`  Progress: ${i}/${verses.length}`);
  }

  const refsJson = JSON.stringify(verses.map(v => v.ref));
  let refsBuffer = Buffer.from(refsJson, "utf8");
  // Ensure the next chunk (vectors) starts at an even offset for Uint16Array alignment
  if (refsBuffer.length % 2 !== 0) {
    refsBuffer = Buffer.concat([refsBuffer, Buffer.from(" ")]);
  }

  const header = Buffer.alloc(12);
  header.writeUInt32LE(verses.length, 0);
  header.writeUInt32LE(DIMS, 4);
  header.writeUInt32LE(refsBuffer.length, 8);

  const vectorBuffer = Buffer.from(allVectorsF16.buffer);

  const out = Buffer.concat([header, refsBuffer, vectorBuffer]);
  fs.writeFileSync(OUT_PATH, out);

  console.log(`ScriptureScribe Build Done.`);
  console.log(`Output: ${OUT_PATH}`);
  console.log(`Size: ${(out.length / 1024 / 1024).toFixed(1)}MB`);
}

main().catch(console.error);
