# T6 — Product roadmap (NOT a task file — frontier-model work, in order)

Reserved items for a future Claude Fable/Opus session (or equivalent).
Small models: read-only. Owner: bring this file to the next big-model
session and say "do the next roadmap item."

## 1. First-run data downloader  ← biggest product blocker

The plugin folder is ~280MB of data. Obsidian community plugins cannot ship
that; users must get data on demand:

- Host the data files as a versioned GitHub Release on the plugin's repo.
- On first load (or via a Settings button "Download offline data"), fetch a
  small `data-manifest.json` (file list, sizes, sha256, license notices),
  then download files with a progress bar into the plugin folder.
- Let the user choose tiers: Minimal (KJV + Greek NT, ~16MB) / Standard
  (+Hebrew, vectors, ~65MB) / Complete (+LXX, LSJ lexicon, ~200MB).
- Mobile default = Minimal; per-book folders instead of monoliths.
- Until data exists, every feature must degrade gracefully (they mostly
  already do — verify each).

## 2. Web Worker search core

Move index building, corpus scans, and Xenova embedding into one Worker.
Design constraints discovered in the 2026-07-05 analysis session:

- The Smart Connections bridge CANNOT move into the worker (SC lives on the
  main thread) — keep bridge embedding main-thread, ship only the cosine
  loop the worker's way, or drop the bridge entirely.
- Build the worker as a separate esbuild entry, inline it into main.js as a
  string, instantiate via `new Worker(URL.createObjectURL(new Blob([...])))`.
- iOS webview may refuse blob workers → feature-detect; the current
  time-sliced async scans remain as the fallback path (do not delete them).
- Transfer Float32Array buffers, don't copy. Support cancelling an in-flight
  search when a new one starts.

## 3. Precomputed indexes at build time

`strongsIndex` + `morphIndex` are rebuilt from ~1M words every launch and
morph entries dominate memory. Serialize both at build time
(scripts/), ship as compact JSON/binary, load directly. Also fixes the
**mobile coverage gap**: mobile skips the Hebrew/LXX monoliths, so Strong's
and morph search silently cover only the Greek NT on phones today. Shipped
prebuilt indexes are small enough to load everywhere.

## 4. License & attribution audit (required before selling)

- STEPBible TAHOT/TAGNT/TBESG data: **CC BY 4.0** — attribution screen and
  README credits required; check their commercial-use notes.
- KJV text: public domain (note UK Crown patent quirk if selling in UK).
- LSJ lexicon (lexicon-lsj.json): verify source; Perseus LSJ is
  **CC BY-SA** — share-alike may constrain how you license the bundled data.
- bolls.life + jsDelivr/HuggingFace endpoints: check ToS for use inside a
  paid product; add offline-only mode toggle.
- all-MiniLM-L6-v2 model: Apache-2.0 — fine, attribute.
- Rename check: "ScriptureScribe" trademark/plugin-name collision search.

## 5. Obsidian community release engineering

- `versions.json`, semver bumps, GitHub Actions release workflow, README
  with screenshots, `fundingUrl` in manifest.
- Community plugin review guidelines compliance pass: no `innerHTML` with
  remote data, no hardcoded styles where themes should win (T4 helps),
  `isDesktopOnly` accuracy, load-time budget (data loads are already
  deferred — keep it that way).

## 6. Optional: replace bundled transformers.js (~1.4MB)

Only worth it after #2. Hand-rolled WordPiece tokenizer + onnxruntime-web
session in the worker ≈ 400KB total and removes the fragile env patches at
the top of semanticSearch.ts.
