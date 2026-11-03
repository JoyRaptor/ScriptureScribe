# T5 — Split readingPanel.ts into modules (STRONG MODEL ONLY)

`src/readingPanel.ts` is ~4,000 lines / one class. Split it along the seams
below, ONE seam per session. **Do not attempt this with a small/fast model.**
If you are a small model reading this: stop, report "T5 requires a stronger
model", and do nothing.

## Ground rules

- Pure code movement. Zero behavior change. Golden tests must PASS unchanged
  after every seam.
- Each extracted module receives what it needs via constructor/function
  params — no new globals, no singletons.
- The panel class keeps its public API (`setRef`, `focusSearch`,
  `showVerseOfTheDay`, `onVaultIndexReady`, view lifecycle) — internals move
  out, signatures stay.
- One seam = one session = one commit. Deploy and have the owner click
  through the affected area before starting the next seam.

## Seam map (extract in this order)

1. **searchUi.ts** — search bar construction (`buildSearchBar`), the animated
   icon start/stop helpers (`_startSearchAnim` / `_stopSearchAnim`), and the
   results list rendering (`buildSearchResults`, `showSearchResults`,
   `exitSearch`). The panel keeps `runSearch` as a thin method that calls
   into this module.
2. **morphPanel.ts** — everything with `morph` in the name: the grammar
   search panel DOM, its inputs, dropdowns, and `runMorphSearch`.
3. **navStack.ts** — the navigation history (`pushNav`, back/forward, the
   `{ type: "research" | "search" | ... }` union). Small, self-contained,
   good warm-up seam if 1 feels risky.
4. **verseRenderer.ts** — the research-mode verse/chapter content rendering
   and backlinks section.
5. What remains in `readingPanel.ts`: view lifecycle, leaf/side persistence,
   settings plumbing, and thin delegating methods.

## Per-seam procedure

1. `grep -n "methodName" src/readingPanel.ts` to find every use of the
   methods you're moving. List them BEFORE moving anything.
2. Move the methods verbatim into the new file as functions or a small class
   taking `(app, settings, callbacks)` — whatever the methods actually touch.
3. Replace originals with delegating calls. Compile. Fix imports only.
4. Run all three verification commands. Golden must PASS unchanged.
5. Deploy; owner smoke-tests the moved area (search, morph panel, back
   button, or verse display respectively).

## Files you may edit

- `src/readingPanel.ts`
- The ONE new file for the current seam
