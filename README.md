# ScriptureScribe — Obsidian Plugin

> Non-invasive scripture reference detection, hover tooltips, and smart embedding for Obsidian.

---

## Features

| Feature | Description |
|---|---|
| **Auto-Detection** | Highlights scripture references as you type (debounced, viewport-only) |
| **Hover Tooltip** | Shows verse text on hover with version switcher and embed controls |
| **Offline-First** | Bundled KJV data — works with no internet connection |
| **3 Embed Styles** | URL Link, Markdown Footnote, or Quote Block |
| **Embed All** | Replace every reference in the document in one undo-able action |
| **Multi-Translation** | Switch versions live in the tooltip (KJV, ESV, NIV, NASB, NKJV, NLT…) |

---

## Detected Reference Formats

The parser recognizes all of these patterns:

| Input | Canonical Output |
|---|---|
| `Genesis 1:1` | Genesis 1:1 |
| `Gen 1:1` | Genesis 1:1 |
| `Gn 1:1-3` | Genesis 1:1-3 |
| `1 Cor 13:4` | 1 Corinthians 13:4 |
| `Jn 3:16` | John 3:16 |
| `Rev 22:21` | Revelation 22:21 |
| `Ps 119:105` | Psalms 119:105 |
| `2Tim 3:16` | 2 Timothy 3:16 |

---

## Embedding Styles

### 🔗 URL Link
```
[John 3:16](https://www.biblegateway.com/passage/?search=John+3%3A16&version=KJV)
```

### 📎 MD Tooltip (Footnote)
```
John 3:16[^ss1]

[^ss1]: For God so loved the world... (KJV)
```

### ❝ Quote Block
```
> "For God so loved the world, that he gave his only begotten Son..."
> — John 3:16, KJV
```

---

## Installation

### Manual (Developer Mode)

1. Clone or download this repo
2. Run `npm install`
3. Run `npm run build` — this produces `main.js`
4. Copy `main.js`, `manifest.json`, and `styles.css` into:
   ```
   <your-vault>/.obsidian/plugins/scripture-scribe/
   ```
5. Enable the plugin in **Settings → Community Plugins**

### Via BRAT (Beta)
1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
2. Add this repo URL in BRAT settings

---

## Project Structure

```
scripture-scribe/
├── src/
│   ├── main.ts          # Plugin entry point & orchestration
│   ├── parser.ts        # Regex detection engine
│   ├── bibleData.ts     # All 66 books + abbreviation lookup map
│   ├── fetcher.ts       # Hybrid KJV-local / API fetcher with cache
│   ├── embedEngine.ts   # Solidification logic (3 embed styles)
│   ├── tooltip.ts       # Hover UI component
│   ├── settingsTab.ts   # Settings panel UI
│   └── settings.ts      # Types & defaults
├── styles.css           # Plugin stylesheet
├── manifest.json        # Obsidian plugin manifest
├── package.json
├── tsconfig.json
└── esbuild.config.mjs
```

---

## Data & API Strategy

### KJV (Local, Offline)
- The plugin ships with a `kjv.json` file containing all 31,102 KJV verses (~4MB compressed)
- Zero internet required for KJV lookups
- Sub-10ms lookup time (indexed by book/chapter/verse)

### Other Translations (API)
- Uses [bible-api.com](https://bible-api.com) — **free, no API key required**
- 24-hour client-side cache reduces redundant requests
- Falls back to local KJV + "⚠ Offline" badge if API is unreachable within 3 seconds

---

## Settings

| Key | Default | Description |
|---|---|---|
| `primaryTranslation` | `KJV` | Default translation for tooltips |
| `offlineFallback` | `true` | Show KJV if API is unavailable |
| `favoriteTranslations` | `[KJV, ESV, NIV, NASB, NKJV]` | Versions shown in tooltip dropdown |
| `hoverSettings.triggerDelayMs` | `300` | Delay before tooltip appears (ms) |
| `embedding.defaultStyle` | `quote` | Default embed style |
| `embedding.includeVersionBadge` | `true` | Show translation badge in embeds |
| `excludedFolders` | `[]` | Folders to skip scanning |

---

## Commands

All commands are accessible via the Obsidian Command Palette (`Ctrl+P` / `Cmd+P`):

- **ScriptureScribe: Embed All References as Links**
- **ScriptureScribe: Embed All References as Quote Blocks**
- **ScriptureScribe: Embed All References as Footnote Tooltips**
- **ScriptureScribe: Embed All References (default style)**

---

## Developer Notes

### Adding Full KJV Data
Replace the `KJV_SAMPLE` in `fetcher.ts` with a full JSON loader:

```typescript
// In fetcher.ts
import KJV_DATA from "../data/kjv.json";

async function lookupLocalKJV(ref: ScriptureRef): Promise<VerseResult> {
  const key = refToString(ref);
  const text = KJV_DATA[key];
  if (text) return { reference: key, text, version: "KJV", source: "local" };
  return { reference: key, text: `[Verse not found: ${key}]`, version: "KJV", source: "local" };
}
```

A properly formatted `kjv.json` looks like:
```json
{
  "Genesis 1:1": "In the beginning God created...",
  "Genesis 1:2": "And the earth was without form...",
  ...
}
```

### Performance Mandates (as specified in Design Bible)
1. **Debouncing**: All scans fire after a 300ms pause via `scheduleScan()`
2. **Viewport-only**: `scanViewport()` only processes the active leaf's DOM
3. **Cache layer**: `fetcher.ts` caches API results for 24h in-memory

---

## Test Cases

Reference formats that must be correctly parsed:

```
Genesis 1:1         ✓ Standard full reference
Gen 1:1             ✓ Standard abbreviation  
Gn 1:1              ✓ Short abbreviation
1 Cor 13:4-8        ✓ Numbered book + verse range
2Tim 3:16           ✓ No space before number
Ps 119:105          ✓ Three-digit chapter
Song 2:1            ✓ Song of Solomon short form
Rev 22              ✓ Chapter only (no verse)
Jn 3:16             ✓ Two-letter abbreviation
1Jn 4:8             ✓ No space in numbered book
Page 1:1            ✗ Should NOT match (not a Bible book)
Col 3:1-4           ✓ Colossians range reference
```

---

## License

MIT
