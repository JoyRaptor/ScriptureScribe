from pathlib import Path
p=Path('src/semanticSearch.ts');s=p.read_text('utf8');a=s.index('    const mod = await import("@xenova/transformers");');b=s.index('    // Confirm the model',a)
old=s[a:b]
# Isolate the optional ML dependency so neither desktop nor mobile parses it during startup.
runtime='''import { pipeline, env } from "@xenova/transformers";

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
'''
Path('src/semanticRuntime.ts').write_text(runtime,encoding='utf8')
s=s[:a]+'''    if (!semanticApp || !semanticDir) return false;
    // This is our own locally installed, compiled plugin code. Loading it the
    // same way as Obsidian loads main.js also works with mobile vault adapters.
    const code = await semanticApp.vault.adapter.read(`${semanticDir}/semantic-runtime.js`);
    const runtimeModule = {exports: {} as any};
    new Function("require", "module", "exports", code)(require, runtimeModule, runtimeModule.exports);
    const pipe = await runtimeModule.exports.createEmbeddingPipeline();

'''+s[b:]
p.write_text(s,encoding='utf8')
p=Path('esbuild.config.mjs');s=p.read_text('utf-8-sig');s=s.replace('esbuild.build({','await Promise.all([esbuild.build({',1);s=s.replace('}).catch(() => process.exit(1));','''}), esbuild.build({
  entryPoints: ["src/semanticRuntime.ts"],
  bundle: true,
  format: "cjs",
  target: "es2020",
  minify: prod,
  sourcemap: prod ? false : "inline",
  outfile: "semantic-runtime.js",
  logLevel: "info",
})]).catch(() => process.exit(1));''');p.write_text(s,encoding='utf8')
# Replace early-ref polling with one queued reference flushed when onOpen finishes.
p=Path('src/readingPanel.ts');s=p.read_text('utf8');s=s.replace('  async onOpen(): Promise<void> {','  private pendingRef: {ref: ScriptureRef; editor: Editor | null} | null = null;\n\n  async onOpen(): Promise<void> {')
s=s.replace('    this.bibleModeEl.style.cssText = "display:none; flex:1; overflow:hidden; min-height:0;";', '    this.bibleModeEl.style.cssText = "display:none; flex:1; overflow:hidden; min-height:0;";\n    const pending = this.pendingRef; this.pendingRef = null;\n    if (pending) void this.setRef(pending.ref, pending.editor);')
s=s.replace('        console.warn("ScriptureScribe panel: setRef called before DOM ready, retrying in 100ms");\n        setTimeout(() => this.setRef(ref, editor), 100);', '        this.pendingRef = {ref, editor};')
s=s.replace('    this.loadingSeq++;\n    this.bibleModeView?.destroy();', '    this.loadingSeq++;\n    this.pendingRef = null;\n    this.bibleModeView?.destroy();')
p.write_text(s,encoding='utf8')
