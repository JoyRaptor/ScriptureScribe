import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const prod = process.argv[2] === "production";

await Promise.all([esbuild.build({
  banner: { js: "/* ScriptureScribe Obsidian Plugin */" },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian","electron",
    "@codemirror/autocomplete","@codemirror/collab","@codemirror/commands",
    "@codemirror/language","@codemirror/lint","@codemirror/search",
    "@codemirror/state","@codemirror/view",
    "@lezer/common","@lezer/highlight","@lezer/lr",
  ],
  loader: { ".html": "text", ".md": "text" },
  format: "cjs",
  target: "es2020",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  minify: prod,
  pure: prod ? ["console.debug"] : [],
  define: {
    "import.meta.url": "import.meta.url",
  },
  outfile: "main.js",
}), esbuild.build({
  entryPoints: ["src/semanticRuntime.ts"],
  bundle: true,
  format: "cjs",
  target: "es2020",
  minify: prod,
  sourcemap: prod ? false : "inline",
  outfile: "semantic-runtime.js",
  logLevel: "info",
})]).catch(() => process.exit(1));
