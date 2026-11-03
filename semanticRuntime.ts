import { pipeline, env } from "@xenova/transformers";

/** Loaded only for an explicit concept search; preserves the mobile WASM path. */
export async function createEmbeddingPipeline(): Promise<any> {
  const backends = (env as any).backends;
  if (backends?.onnx) {
    backends.onnx.logLevel = "error";
    if (backends.onnx.wasm) {
      backends.onnx.wasm.proxy = false;
      backends.onnx.wasm.numThreads = 1;
      backends.onnx.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.0/dist/";
    }
  }
  return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {quantized: true});
}
