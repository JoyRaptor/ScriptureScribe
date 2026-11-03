# T4 — Migrate inline styles to styles.css (multi-session, incremental)

Nearly every element in the UI is styled with `el.style.cssText = ...`
strings in TypeScript. This bloats the bundle, blocks Obsidian theming, and
makes styling unmaintainable. Migrate to CSS classes in `styles.css`.

**This is a marathon: do it ONE region per session, in this order.** Never
attempt the whole file at once.

Session order:
1. `src/settingsTab.ts` (lowest risk — settings UI)
2. `src/tooltip.ts`
3. `src/readingPanel.ts` — search bar + results list only
4. `src/readingPanel.ts` — morph panel
5. `src/readingPanel.ts` — reader content area
6. `src/bibleMode.ts` (multiple sessions, top to bottom)

## Rules

- For each `el.style.cssText = \`...\`` block: create a class named
  `ss-<area>-<element>` (e.g. `ss-search-pill`, `ss-morph-row`) in
  `styles.css`, move the declarations there verbatim, and replace the
  assignment with `el.addClass("ss-search-pill")` (Obsidian's helper) or
  `el.classList.add(...)`.
- Styles that interpolate runtime values (colors from `this.P`, computed
  percentages, user settings) must NOT move to CSS. Leave those as inline
  `el.style.setProperty(...)` for just the dynamic property, and move only
  the static declarations to the class.
- Do not change any selector's visual result. Copy declarations exactly —
  including odd ones. No "cleanup" of the CSS values themselves.
- After each session, deploy BOTH `main.js` AND `styles.css` to the plugin
  folder (styles.css must be copied too):

```
copy main.js C:\ObsidianBrain\.obsidian\plugins\scripture-scribe\main.js
copy styles.css C:\ObsidianBrain\.obsidian\plugins\scripture-scribe\styles.css
```

## Verification

- tsc + build + `npm run golden` must PASS unchanged (styling cannot affect
  search results — if golden fails you edited something you shouldn't have).
- The owner must visually compare the migrated region against the previous
  build before you commit. Tell her exactly which screen/panel to look at.

## Files you may edit

- The single .ts file assigned for the session
- `styles.css`
