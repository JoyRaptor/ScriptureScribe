# T2 — Load versification mapping at runtime (−710KB bundle)

`src/versification.ts` statically imports `src/books/versification-mapping.json`
(710KB), which gets compiled into main.js. Convert it to runtime loading with
graceful degradation, following this exact design (do not invent another):

## Design (already decided — implement as written)

1. In `versification.ts`: remove the static JSON import. Add:

```ts
let mappingData: Record<string, any> | null = null;

/** Called once from main.ts after the file is read from the plugin folder. */
export function setVersificationData(data: Record<string, any>): void {
  mappingData = data;
}
```

2. Every function in `versification.ts` that used the imported JSON now reads
   `mappingData` instead. If `mappingData` is null (not loaded yet), the
   mapping functions must return the input reference unchanged (identity
   mapping) — never throw.

3. In `main.ts`, inside the existing `Promise.all([...])` data-loading block,
   add a loader following the exact pattern of `loadCrossRefData()` (try /
   catch, `console.info` on absence):
   - reads `versification-mapping.json` from `this.manifest.dir`
   - `JSON.parse` it and call `setVersificationData(data)`

4. Copy the data file into the plugin folder so the runtime load finds it:

```
copy C:\+Projects\Scripture-scribe\src\books\versification-mapping.json C:\ObsidianBrain\.obsidian\plugins\scripture-scribe\versification-mapping.json
```

## Verification

- All three handbook checks. Golden tests: must PASS **unchanged** (search
  never calls the mapping; only LXX interlinear display does).
- Report the new main.js size — it should shrink by roughly 700KB.
- Ask the owner to hover an Old Testament verse with LXX interlinear enabled
  (e.g. Psalms 23:1) and confirm Greek words still appear.

## Files you may edit

- `src/versification.ts`
- `src/main.ts`

Nothing else. Do not touch `interlinear.ts` even though it calls `mapToSwete`.
