





\# Dynamic Book Color Theme — Comprehensive Implementation Plan (v2)



\---



\## Executive Summary



After auditing every line of both files, I count \*\*\~100 individual color references\*\* across `bibleMode.ts` (\~38) and `readingPanel.ts` (\~62) that need to change. The previous plan failed because it described categories of changes but didn't trace the actual code paths. This plan maps every single occurrence and addresses the architectural problem: colors are set at DOM-build-time via inline styles, but need to update dynamically when the book changes.



\---



\## Architecture Overview



```

┌──────────────────────────────────────────┐

│         bookColorUtils.ts (NEW)          │

│                                          │

│  BOOK\_GENRE\_COLOR map (moved here)       │

│  BookPalette { base, light, mid, dark }  │

│  generatePalette(hex) → BookPalette      │

│  getBookPalette(bookId, enabled)         │

│  getRefBookColor(refStr) → hex           │

│  contrastSafeText(hex) → hex             │

│  DEFAULT\_PALETTE (purple fallback)       │

└───────────┬────────────┬─────────────────┘

&#x20;           │            │

&#x20;   ┌───────▼──┐   ┌─────▼─────────────┐

&#x20;   │ BibleMode│   │ ReadingPanel       │

&#x20;   │          │   │ (Research Mode)    │

&#x20;   │ Instance │   │ Instance palette   │

&#x20;   │ palette: │   │ derived from       │

&#x20;   │ from     │   │ currentRef.book    │

&#x20;   │ pos.     │   │                    │

&#x20;   │ bookId   │   │ Independent color  │

&#x20;   │          │   │ from Bible side    │

&#x20;   └──────────┘   └───────────────────-┘

```



\*\*Core Principle:\*\* Replace the 4 module-level constants (`P`, `PL`, `PM`, `PD`) with instance properties on each class. Add an `updatePalette()` method that recalculates all four values from the current book, sets CSS custom properties on the root element (for keyframe animations), and updates all persistent DOM elements. Dynamic elements (word cards, cross-ref cards) are rebuilt each time and naturally use the current palette.



\### Palette Generation Algorithm



Given any hex color, generate the four-tone palette that preserves the existing aesthetic depth:



```

base  = the book's BOOK\_GENRE\_COLOR value

light = 88% mix toward white  (card selected bg, hovers)

mid   = 50% mix toward white  (Greek text, Strong's numbers, secondary accents)

dark  = 30% mix toward black  (pressed/hover states on buttons)

```



\*\*Validation against current purple:\*\*

| Role | Current Hardcoded | Algorithm Output | Match? |

|------|------------------|-----------------|--------|

| base | `#534AB7` | `#534AB7` | ✓ |

| light | `#EEEDFE` | `#ECE9F8` | ≈ ✓ |

| mid | `#AFA9EC` | `#A9A5DB` | ≈ ✓ |

| dark | `#3C3489` | `#3A3480` | ≈ ✓ |



The algorithm faithfully reproduces the existing look, then applies it to any book color.



\---



\## Phase 0 — Foundation Layer



\### \[NEW] `bookColorUtils.ts`



```typescript

// Centralized color system for the entire plugin



export interface BookPalette {

&#x20; base: string;    // BOOK\_GENRE\_COLOR value

&#x20; light: string;   // 88% toward white — hovers, selected card bg

&#x20; mid: string;     // 50% toward white — Greek text, Strong's, secondary

&#x20; dark: string;    // 30% toward black — pressed states

}



export const DEFAULT\_ACCENT = "#534AB7";

export const DEFAULT\_PALETTE: BookPalette = { 

&#x20; base: "#534AB7", light: "#EEEDFE", mid: "#AFA9EC", dark: "#3C3489" 

};



// Moved from bibleMode.ts — single source of truth

export const BOOK\_GENRE\_COLOR: Record<number, string> = { /\* ... full map ... \*/ };



export function generatePalette(hex: string): BookPalette { /\* color math \*/ }

export function getBookColor(bookId: number): string { /\* lookup + fallback \*/ }

export function getBookPalette(bookId: number, useBookColors: boolean): BookPalette { /\* ... \*/ }

export function getRefBookColor(refStr: string): string { /\* parse ref → book → color \*/ }

export function contrastSafeText(hex: string): string { /\* darken bright colors in light mode \*/ }

```



Key details:

\- `getRefBookColor("Acts 15:24")` → parses "Acts" → bookId 44 → `#ceff5bff`

\- `contrastSafeText()` detects light/dark mode via `document.body.classList.contains('theme-dark')` and darkens colors like yellow/lime that would be invisible on white backgrounds

\- `getBookPalette(bookId, false)` → always returns `DEFAULT\_PALETTE` (purple override)



\### \[MODIFY] `settings.ts`



Add to the `display` block:



```typescript

display: {

&#x20; // ... existing fields ...

&#x20; useBookColors: boolean;  // NEW — default true

}

```



Add to `DEFAULT\_SETTINGS.display`:

```typescript

useBookColors: true,

```



\### \[MODIFY] `settingsTab.ts`



Add toggle in Display Settings section:



```

┌──────────────────────────────────────────┐

│ 📖 Colorful Book Themes          \[🟢]   │

│ Each book of the Bible colors the UI     │

│ with its genre accent color. Disable     │

│ for a uniform purple theme.              │

└──────────────────────────────────────────┘

```



Wired to `settings.display.useBookColors`. On change → calls `updatePalette()` on both views.



\---



\## Phase 1 — `bibleMode.ts` (38 color references)



\### Structural Changes



\*\*Remove module-level constants:\*\*

```typescript

// DELETE these four lines:

const P = "#534AB7";

const PL = "#EEEDFE";

const PM = "#AFA9EC";

const PD = "#3C3489";

```



\*\*Remove `BOOK\_GENRE\_COLOR` map\*\* (moved to `bookColorUtils.ts`).



\*\*Add instance properties to `BibleModeView`:\*\*

```typescript

private P: string;

private PL: string;

private PM: string;

private PD: string;

```



\*\*Initialize in constructor:\*\*

```typescript

constructor(app, root, settings) {

&#x20; // ...

&#x20; this.updatePalette();

&#x20; this.build();

}

```



\*\*Convert `ripple()` from standalone function to class method\*\* (or add color parameter):

```typescript

// BEFORE (standalone):

function ripple(btn: HTMLElement): void {

&#x20; // ... background:${P} ...

}



// AFTER (class method):

private ripple(btn: HTMLElement): void {

&#x20; // ... background:${this.P} ...

}

```



\### New Methods



```typescript

private updatePalette(): void {

&#x20; const pal = getBookPalette(

&#x20;   this.pos.bookId, 

&#x20;   this.settings.display?.useBookColors ?? true

&#x20; );

&#x20; this.P = pal.base;

&#x20; this.PL = pal.light;

&#x20; this.PM = pal.mid;

&#x20; this.PD = pal.dark;

&#x20; this.updateCSSVars();

}



private updateCSSVars(): void {

&#x20; const s = this.root.style;

&#x20; s.setProperty('--ss-accent',       this.P);

&#x20; s.setProperty('--ss-accent-light', this.PL);

&#x20; s.setProperty('--ss-accent-mid',   this.PM);

&#x20; s.setProperty('--ss-accent-dark',  this.PD);

&#x20; s.setProperty('--ss-accent-a15',   this.P + '26');

&#x20; s.setProperty('--ss-accent-a27',   this.P + '44');

&#x20; s.setProperty('--ss-accent-a33',   this.P + '55');

}

```



\*\*Call `updatePalette()` in:\*\*

\- `goTo()` — before `this.refresh()`

\- `advance()` — after updating `this.pos`

\- Any settings change callback



\### Keyframe Refactoring (5 keyframe injections)



All dynamically injected `<style>` elements must use CSS variables instead of hardcoded colors. They're created once (guarded by `getElementById`) but the CSS variables resolve at animation time.



| ID | Current | New |

|---|---|---|

| `ss-verse-flash-kf` | `background: ${P}26`, `${PL}`, `color: ${P}` | `var(--ss-accent-a15)`, `var(--ss-accent-light)`, `var(--ss-accent)` |

| `ss-tap-flash-kf` | `${P}55`, `${P}22` | `var(--ss-accent-a33)`, `var(--ss-accent-a15)` |

| `ss-ripple-kf` | No color (already clean) | No change needed |

| `ss-wsel-kf` | `background:${P}44` in `.selected` class | `var(--ss-accent-a27)` |

| `ss-quill-kf` | No color (transform only) | No change needed |



\### Every Inline Style Replacement (33 occurrences)



| # | Method | Element | Was | Becomes |

|---|--------|---------|-----|---------|

| 1 | `ripple()` | overlay span | `background:${P}` | `background:${this.P}` |

| 2 | `renderBookGrid()` | book btn fallback | `?? P` | `?? this.P` |

| 3 | `renderChapterGrid()` | back button | `color:${P}` | `color:${this.P}` |

| 4 | `renderChapterGrid()` | gc fallback | `\\|\\| P` | `\\|\\| this.P` |

| 5 | `paintChapter()` | drop cap | `color:${P}` | `color:${this.P}` |

| 6 | `paintChapter()` | verse sup | `color:${P}` | `color:${this.P}` |

| 7 | `showVerseActions()` | action btn bg | `background:${P}` | `background:${this.P}` |

| 8 | `showVerseActions()` | hover | `btn.style.background = PD` | `= this.PD` |

| 9 | `showVerseActions()` | mouseleave | `btn.style.background = P` | `= this.P` |

| 10 | `startWordSelection()` | α icon SVG | `fill="${P}"` | `fill="${this.P}"` |

| 11 | `startWordSelection()` | menu btn color | `color:${P}` | `color:${this.P}` |

| 12 | `startWordSelection()` | menu hover | `b.style.background = PL` | `= this.PL` |

| 13 | `showToast()` | toast bg | `background:${P}` | `background:${this.P}` |

| 14 | `openUnifiedDrawer()` | title | `color:${P}` | `color:${this.P}` |

| 15 | `openUnifiedDrawer()` | "In Your Notes" label | `color:${P}` | `color:${this.P}` |

| 16 | `openUnifiedDrawer()` | swipe underlay | `background:${P}` | `background:${this.P}` |

| 17 | `openUnifiedDrawer()` | swipe hint SVG | `stroke="${PM}"` | `stroke="${this.PM}"` |

| 18 | `openUnifiedDrawer()` | xref address | `color:${P}` | \*\*`color:${getRefBookColor(xref)}`\*\* |

| 19 | `openUnifiedDrawer()` | insertBtn style | `color:${P}` (in btnStyle) | `color:${this.P}` |

| 20 | `openUnifiedDrawer()` | insertBtn hover | `PL` | `this.PL` |

| 21 | `openUnifiedDrawer()` | embedBtn hover | `PL` | `this.PL` |

| 22 | `openUnifiedDrawer()` | resBtn hover | `PL` | `this.PL` |

| 23 | `openUnifiedDrawer()` | resBtn SVG color | `style.color = P` | `= this.P` |

| 24 | `openUnifiedDrawer()` | resLbl | `color:${P}` | `color:${this.P}` |

| 25 | `openBacklinkDrawer()` | title | `color:${P}` | `color:${this.P}` |

| 26 | `openXrefDrawer()` | title | `color:${P}` | `color:${this.P}` |

| 27-38 | `openXrefDrawer()` | addr per row | `color:${P}` | \*\*`color:${getRefBookColor(xref)}`\*\* |



Row #18 and #27-38 are \*\*cross-reference addresses that show their OWN book's color\*\*, not the active book. This is the key dual-color behavior.



\---



\## Phase 2 — `readingPanel.ts` (62 color references)



\### Structural Changes



\*\*Remove module-level constants\*\* (same 4 lines).



\*\*Convert `spinnerSVG()` to instance method:\*\*

```typescript

// BEFORE (standalone):

function spinnerSVG(): string {

&#x20; return `...stroke="${PM}"...stroke="${P}"...`;

}



// AFTER (method):

private spinnerSVG(): string {

&#x20; return `...stroke="${this.PM}"...stroke="${this.P}"...`;

}

```



\*\*Add instance properties:\*\*

```typescript

private P:  string = DEFAULT\_PALETTE.base;

private PL: string = DEFAULT\_PALETTE.light;

private PM: string = DEFAULT\_PALETTE.mid;

private PD: string = DEFAULT\_PALETTE.dark;



// New element references (needed for live palette updates)

private verBtnEl!:  HTMLElement;   // version button (bg color)

private intLblEl!:  HTMLElement;   // "Interlinear" label (text color)

private pillWrapEl!: HTMLElement;  // search pill (focus ring color)

private emptyIconEl!: HTMLElement; // empty state icon (tint color)

```



\### New Methods



```typescript

/\*\* Derives the book ID from the current research context \*/

private getActiveBookId(): number | null {

&#x20; if (!this.currentRef) return null;

&#x20; const book = BIBLE\_BOOKS.find(b => b.name === this.currentRef!.book);

&#x20; return book?.id ?? null;

}



private updatePalette(): void {

&#x20; const bookId = this.bibleMode

&#x20;   ? (this.bibleModeView?.getPosition().bookId ?? null)

&#x20;   : this.getActiveBookId();



&#x20; const pal = bookId !== null

&#x20;   ? getBookPalette(bookId, this.settings.display?.useBookColors ?? true)

&#x20;   : DEFAULT\_PALETTE;



&#x20; this.P  = pal.base;

&#x20; this.PL = pal.light;

&#x20; this.PM = pal.mid;

&#x20; this.PD = pal.dark;

&#x20; this.updateCSSVars();

&#x20; this.updatePersistentColors();

}



private updateCSSVars(): void {

&#x20; const s = this.contentEl.style;

&#x20; s.setProperty('--ss-accent',       this.P);

&#x20; s.setProperty('--ss-accent-light', this.PL);

&#x20; s.setProperty('--ss-accent-mid',   this.PM);

&#x20; s.setProperty('--ss-accent-dark',  this.PD);

&#x20; s.setProperty('--ss-accent-a15',   this.P + '26');

&#x20; s.setProperty('--ss-accent-a27',   this.P + '44');

&#x20; s.setProperty('--ss-accent-a33',   this.P + '55');

}



/\*\* Updates all persistent DOM elements with current palette \*/

private updatePersistentColors(): void {

&#x20; if (this.backBtn)          this.backBtn.style.color = this.P;

&#x20; if (this.refLbl)           this.refLbl.style.color  = this.P;

&#x20; if (this.bibleChapterNumEl) this.bibleChapterNumEl.style.color = this.P;

&#x20; if (this.bibleNavCaret)    this.bibleNavCaret.style.color = this.P;

&#x20; if (this.intLblEl)         this.intLblEl.style.color = this.P;

&#x20; if (this.emptyIconEl)      this.emptyIconEl.style.color = this.P;



&#x20; // Version button — needs !important override

&#x20; if (this.verBtnEl) {

&#x20;   this.verBtnEl.style.setProperty('background', this.P, 'important');

&#x20;   this.verBtnEl.style.setProperty('color', this.PL, 'important');

&#x20; }



&#x20; // α toggle — depends on current mode

&#x20; this.applyLayout();



&#x20; // Sdef panel (if visible)

&#x20; if (this.sdefEl) {

&#x20;   this.sdefEl.style.background = this.PL;

&#x20;   this.sdefEl.style.borderColor = this.PM;

&#x20; }

}

```



\*\*Call `updatePalette()` in:\*\*

\- `setRef()` — after determining the book, before rendering

\- `setRefInternal()` — same

\- `enterBibleMode()` / `exitBibleMode()` — mode switch changes active book source

\- Settings change callback



\### Keyframe Refactoring (2 keyframe injections)



| ID | Current | New |

|---|---|---|

| `ss-research-tap-kf` | `${P}33` | `var(--ss-accent-a27)` |

| `ss-card-kf` | No colors (transform only) | No change |



\### Every Inline Style Replacement (62 occurrences)



\*\*`buildHeader()` — 9 references:\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 1 | `backBtn` | `color:${P}` | `color:${this.P}` |

| 2 | `refLbl` | `color:${P}` | `color:${this.P}` |

| 3 | `bibleChapterNumEl` | `color:${P}` | `color:${this.P}` |

| 4 | `bibleNavCaret` | `color:${P}` | `color:${this.P}` |

| 5 | `intToggleBtn` border | `border:1px solid ${P}` | `border:1px solid ${this.P}` |

| 6 | `intToggleBtn` bg | `background:${P}` | `background:${this.P}` |

| 7 | `intToggleBtn` text | `color:${PL}` | `color:${this.PL}` |

| 8 | `verBtn` bg | `background:${P}` | `background:${this.P}` → store as `this.verBtnEl` |

| 9 | `verBtn` text | `color:${PL}` | `color:${this.PL}` |



\*\*`buildSearchBar()` — 2 references (in event listeners):\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 10 | focus handler | `pillWrap.style.borderColor = P` | `= this.P` |

| 11 | focus handler | `\\`0 0 0 2px ${PM}40\\`` | `\\`0 0 0 2px ${this.PM}40\\`` |



\*\*`buildIndexingBar()` — 1 reference:\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 12 | dot | `color:${P}` | `color:${this.P}` |



\*\*`buildEmptyState()` — 1 reference:\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 13 | iconWrap | `color:${P}` | `color:${this.P}` → store as `this.emptyIconEl` |



\*\*`buildContentWrap()` — 4 references:\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 14 | intLbl | `color:${P}` | `color:${this.P}` → store as `this.intLblEl` |

| 15 | sdefEl bg | `background:${PL}` | `background:${this.PL}` |

| 16 | sdefEl border | `border:1px solid ${PM}` | `border:1px solid ${this.PM}` |

| 17 | (countBadge — rendered in `renderBacklinks`, not here) | — | — |



\*\*`applyLayout()` — 5 references:\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 18 | toggle active bg | `= P` | `= this.P` |

| 19 | toggle active text | `= PL` | `= this.PL` |

| 20 | toggle active border | `= P` | `= this.P` |

| 21 | toggle inactive text | `= P` | `= this.P` |

| 22 | toggle inactive border | `= PM` | `= this.PM` |



\*\*`showSearchResults()` — 9 references:\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 23 | label | `color:${P}` | `color:${this.P}` |

| 24 | back button | `color:${P}` | `color:${this.P}` |

| 25 | def panel bg | `background:${PL}` | `background:${this.PL}` |

| 26 | def panel border | `border:...${PM}` | `border:...${this.PM}` |

| 27 | def header | `color:${P}` | `color:${this.P}` |

| 28 | def body | `color:${PD}` | `color:${this.PD}` |

| 29 | result ref address | `color:${P}` | \*\*`color:${getRefBookColor(result.reference)}`\*\* |

| 30 | matched word chip | `color:${PM}` | `color:${this.PM}` |

| 31 | underlay bg | `background:${P}` | `background:${this.P}` |



\*\*`buildWordCard()` — 6 references:\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 32 | orig text color | `color:${PM}` | `color:${this.PM}` |

| 33 | strongs number | `color:${PM}` | `color:${this.PM}` |

| 34 | hover border | `= P` | `= this.P` |

| 35 | hover bg | `= P` | `= this.P` |

| 36 | hover shadow | `${P}55` | `${this.P}55` |

| 37 | hover orig | `\\`${PM}\\`` | `\\`${this.PM}\\`` |



\*\*`resetCardColors()` — 2 references:\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 38 | orig | `PM` | `this.PM` |

| 39 | strongs | `PM` | `this.PM` |



\*\*`selectCardColors()` — 5 references:\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 40 | border | `P` | `this.P` |

| 41 | bg | `PL` | `this.PL` |

| 42 | shadow | `${P}33` | `${this.P}33` |

| 43 | orig | `P` | `this.P` |

| 44 | strongs | `PM` | `this.PM` |



\*\*`showSdef()` — 3 references:\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 45 | header label | `color:${P}` | `color:${this.P}` |

| 46 | toggle btn | `color:${P}` | `color:${this.P}` |

| 47 | close btn | `color:${P}` | `color:${this.P}` |



\*\*`renderBacklinks()` — 2 references:\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 48 | badge text | `color:${P}` | `color:${this.P}` |

| 49 | badge bg | `background:${PL}` | `background:${this.PL}` |



\*\*`buildCrossRefCard()` — 3 references:\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 50 | underlay bg | `background:${P}` | `background:${this.P}` |

| 51 | swipe hint SVG | `stroke="${PM}"` | `stroke="${this.PM}"` |

| 52 | address color | `color:${P}` | \*\*`color:${contrastSafeText(getRefBookColor(refStr))}`\*\* |



\*\*`renderVerseText()` — 1 reference:\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 53 | verse sup | `color:${P}` | `color:${this.P}` |



\*\*`spinnerSVG()` (now method) — 2 references:\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 54 | bg circle stroke | `${PM}` | `${this.PM}` |

| 55 | fg circle stroke | `${P}` | `${this.P}` |



\*\*`showEmbedToast()` — 2 references:\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 56 | bg | `#534AB7` (hardcoded!) | `${this.P}` |

| 57 | box-shadow | `rgba(83,74,183,0.35)` | dynamic from `this.P` |



\*\*Remaining event listener closures — 5 references:\*\*



| # | Location | Was | Becomes |

|---|----------|-----|---------|

| 58-62 | Various `mouseenter`/`mouseleave` handlers referencing P, PL, PM | Module const | `this.P`, `this.PL`, `this.PM` |



These work automatically because arrow function closures resolve `this.P` at call-time, not capture-time.



\---



\## Phase 3 — Cross-Reference Per-Book Coloring



Every cross-reference address, in both Bible mode drawers and Research panel, uses the \*\*referenced book's own color\*\* (not the active book):



```typescript

// Example: rendering "Acts 15:24" in a cross-ref list

const refColor = contrastSafeText(getRefBookColor("Acts 15:24"));

// → parses "Acts" → bookId 44 → #ceff5bff → (darkened in light mode) → result

addrEl.style.color = refColor;

```



\*\*Locations where this applies:\*\*

1\. `bibleMode.ts` → `openUnifiedDrawer()` xref address elements

2\. `bibleMode.ts` → `openXrefDrawer()` address elements

3\. `readingPanel.ts` → `buildCrossRefCard()` address element

4\. `readingPanel.ts` → `showSearchResults()` result reference labels



\---



\## Phase 4 — Settings Toggle



\### `settings.ts` change:

```typescript

display: {

&#x20; // ... existing ...

&#x20; useBookColors: boolean;   // NEW

}



// In DEFAULT\_SETTINGS:

display: {

&#x20; // ... existing ...

&#x20; useBookColors: true,      // NEW

}

```



\### `settingsTab.ts` change:

Add toggle in Display Settings section. When toggled:

1\. Save setting

2\. Call `updatePalette()` on the active ReadingPanel and BibleModeView

3\. If disabled → everything reverts to `DEFAULT\_PALETTE` (purple `#534AB7`)

4\. If enabled → current book's palette applies immediately



\---



\## Phase 5 — Color Transition Between Books



When swiping from one book to another in Bible mode, or navigating to a different book's verse in Research mode, add a brief cross-fade:



```typescript

// In updatePalette(), after setting new CSS vars:

this.root.style.transition = 

&#x20; '--ss-accent 0.3s ease, --ss-accent-light 0.3s ease, ' +

&#x20; '--ss-accent-mid 0.3s ease, --ss-accent-dark 0.3s ease';

// Clean up after transition

setTimeout(() => { this.root.style.transition = ''; }, 350);

```



For inline-styled elements, `updatePersistentColors()` updates them directly. We can add `transition: color 0.3s ease, background 0.3s ease` to persistent elements at build time so they cross-fade smoothly.



\---



\## Files I Still Need To See



Before writing final code, I need to audit these for hardcoded purple references:



| File | Why |

|------|-----|

| \*\*`settingsTab.ts`\*\* | Need to see existing pattern to add the toggle consistently |

| \*\*`bibleData.ts`\*\* | Confirm `BookMeta` interface shape; confirm no color references |

| \*\*`defHelpers.ts`\*\* | The screenshot shows verse refs (1Ti 6:1, etc.) inside definitions — these should use per-book colors. Need to see how they're rendered |

| \*\*`tooltip.ts`\*\* | The readingPanel comment says "mirrors tooltip.ts" — likely has its own P/PL/PM/PD that also needs updating |

| \*\*`svgAssets.ts`\*\* | `openBibleSvg()`, `researchBibleSvg()`, `scrollSvg()` may contain hardcoded purple |

| \*\*`iconRegistry.ts`\*\* | `getIcon("embed-text-white-qwill", 40)` — may have purple embedded |

| \*\*`embedEngine.ts`\*\* | Embed toast/styling may reference purple |



\---



\## Remaining Questions



\*\*Q1 — Definition References:\*\* In the screenshot, inside the definition panel, I see clickable verse pills ("1Ti 6:1", "2Ti 2:21", "Tit 2:9", "Luk 2:29", "Act 4:24", "Rev 6:10", "2Pe 2:1"). Should each of those pills use its own book's color? (e.g., "Rev 6:10" in red-pink `#fa3d5d`, "Luk 2:29" in lime green `#97fe8b`). This requires changes in `defHelpers.ts`.



\*\*Q2 — Tooltip Panel:\*\* Does `tooltip.ts` render a similar mini-panel when hovering references in the note editor? If so, should it also adopt book colors, or stay neutral purple? This is a separate rendering context from the sidebar panel.



\*\*Q3 — SVG Icons:\*\* The Bible mode toggle icons (`openBibleSvg`, `researchBibleSvg`, `scrollSvg`) — should they tint to the active book color, or stay neutral? Currently they inherit `color` from CSS. If they have hardcoded fills, they'd need parameters.



\*\*Q4 — Empty State:\*\* When no verse is loaded (empty state with the scroll icon and "No reference selected"), there's no active book. Should this stay purple always, or adopt the most-recently-viewed book's color?



\*\*Q5 — Search Bar Focus Ring:\*\* The search input shows a purple glow on focus. Should this also follow the active book color? It's subtle but would complete the immersion.



\*\*Q6 — Version Button:\*\* The "KJV ▾" pill in the header is currently solid purple. Should it follow the active book color? Or stay purple as a brand element?



\*\*Q7 — Transition Direction:\*\* When you swipe the Bible carousel from Genesis 50 → Exodus 1, the color change should happen:

\- \*\*A)\*\* Immediately when the new book appears (during the slide animation)

\- \*\*B)\*\* After the slide settles (300ms after advance completes)



I recommend B — the slide animation completes, then the accent colors cross-fade. This prevents jarring mid-animation color jumps.



\*\*Q8 — Can you upload `settingsTab.ts`, `defHelpers.ts`, `tooltip.ts`, and `svgAssets.ts`?\*\* These are the remaining files I need to guarantee 100% coverage with no missed purple references.



\---



\## Testing Checklist



\- \[ ] \*\*Settings OFF\*\* → all UI elements are uniform purple `#534AB7` across both modes

\- \[ ] \*\*Settings ON\*\* → navigate through Genesis (pink), Psalms (blue), John (green), Revelation (red) — all accent elements change

\- \[ ] \*\*Bible mode:\*\* verse numbers, drop cap, action buttons, drawer titles, swipe underlays match active book

\- \[ ] \*\*Research mode:\*\* header ref label, "Interlinear" label, α toggle, version button, word card Greek text, word card hover/selected states, definition panel, verse number sups — all match active research book

\- \[ ] \*\*Cross-ref addresses:\*\* "Acts 15:24" shows Acts' color, "1 Peter 2:16" shows 1 Peter's color, regardless of which book is active

\- \[ ] \*\*Search results:\*\* reference addresses show per-book colors

\- \[ ] \*\*Book transition:\*\* swipe Genesis→Exodus → colors cross-fade smoothly (\~300ms)

\- \[ ] \*\*Mode switch:\*\* Research (Jude) → Bible (Genesis) → accent colors update immediately

\- \[ ] \*\*Light mode:\*\* yellow/lime book colors darken automatically for text readability

\- \[ ] \*\*Dark mode:\*\* all book colors render vibrantly

\- \[ ] \*\*Mobile touch:\*\* all swipe gestures, taps, long-presses work with new colors

\- \[ ] \*\*Keyframe animations:\*\* verse flash, tap flash, word selection — use current book color (not stale purple)

\- \[ ] \*\*Settings toggle:\*\* toggling ON/OFF takes effect immediately without reload

\- \[ ] \*\*Definition pills:\*\* verse references in Strong's definitions show per-book colors

\- \[ ] \*\*No regressions:\*\* book chooser grid still shows correct genre colors per book





\# Plan Completion — Phases 6 \& 7, Cross-Cutting Updates



\---



\## Phase 0 — Additions to `bookColorUtils.ts`



Two new exports needed by tooltip and defHelpers:



```typescript

/\*\*

&#x20;\* Generate a per-chip palette for inline elements (verse chips, xref pills)

&#x20;\* that need their OWN book's color rather than the active context's palette.

&#x20;\*/

export function getRefBookPalette(

&#x20; refStr: string,

&#x20; useBookColors: boolean

): BookPalette {

&#x20; if (!useBookColors) return DEFAULT\_PALETTE;

&#x20; const color = getRefBookColor(refStr);        // parses "Acts 15:24" → hex

&#x20; return generatePalette(color);

}



/\*\*

&#x20;\* Given a hex color, return a version safe for use as TEXT on

&#x20;\* both light and dark backgrounds.

&#x20;\* Light mode: darken bright colors (yellow, lime, cyan).

&#x20;\* Dark mode: lighten very dark colors if needed.

&#x20;\*/

export function contrastSafeText(hex: string): string { /\* ... \*/ }

```



No new dependency on `bibleData.ts` — callers map `bookName → bookId` themselves using their existing imports.



\---



\## Phase 6 — `tooltip.ts` (36 color references)



\### Architectural Approach



The tooltip is a \*\*singleton\*\* — one DOM tree reused for every hover. Its "active book" changes on each `show(ref)` call. The approach mirrors the panel: instance properties `this.P/PL/PM/PD` updated at show-time, with a `updatePersistentColors()` pass over stored elements.



\### Structural Changes



\*\*Remove module-level constants:\*\*

```typescript

// DELETE these four lines:

const P  = "#534AB7";

const PL = "#EEEDFE";

const PM = "#AFA9EC";

const PD = "#3C3489";

```



\*\*Add instance properties:\*\*

```typescript

private P:  string = DEFAULT\_PALETTE.base;

private PL: string = DEFAULT\_PALETTE.light;

private PM: string = DEFAULT\_PALETTE.mid;

private PD: string = DEFAULT\_PALETTE.dark;

```



\*\*Initialise before `buildDOM()`:\*\*

```typescript

constructor(app, settings, saveSettings) {

&#x20; // palette defaults already set by field initialisers

&#x20; this.el = this.buildDOM();      // uses this.P etc. → purple on first build

&#x20; // ... rest of constructor ...

}

```



\### New Methods



```typescript

private updatePalette(ref: ScriptureRef): void {

&#x20; const bookMeta = BIBLE\_BOOKS.find(b => b.name === ref.book);

&#x20; const bookId   = bookMeta?.id ?? null;

&#x20; const pal = bookId !== null

&#x20;   ? getBookPalette(bookId, this.settings.display?.useBookColors ?? true)

&#x20;   : DEFAULT\_PALETTE;

&#x20; this.P  = pal.base;

&#x20; this.PL = pal.light;

&#x20; this.PM = pal.mid;

&#x20; this.PD = pal.dark;

&#x20; this.updatePersistentColors();

}



private updatePersistentColors(): void {

&#x20; // Version button

&#x20; const verBtn = this.q<HTMLElement>('.ss-ver-btn');

&#x20; if (verBtn) { verBtn.style.background = this.P; this.setChildColor(verBtn, this.PL); }



&#x20; // α interlinear button — re-apply based on current state

&#x20; this.updateIntBtn(this.interlinearActive);



&#x20; // Embed button + caret

&#x20; const embBtn   = this.q<HTMLElement>('.ss-emb-btn');

&#x20; const embCaret = this.q<HTMLElement>('.ss-emb-caret');

&#x20; if (embBtn)   { embBtn.style.background = this.P; embBtn.style.color = this.PL; }

&#x20; if (embCaret) {

&#x20;   embCaret.style.background  = this.P;

&#x20;   embCaret.style.color       = this.PL;

&#x20;   embCaret.style.borderLeft  = `1px solid ${this.PM}`;

&#x20; }



&#x20; // Sdef panel (if visible)

&#x20; const sdef = this.q<HTMLElement>('.ss-sdef');

&#x20; if (sdef) {

&#x20;   sdef.style.background  = this.PL;

&#x20;   sdef.style.borderColor = this.PM;

&#x20; }

&#x20; const shdr   = this.q<HTMLElement>('.ss-shdr');

&#x20; const toggle = this.q<HTMLElement>('.ss-def-toggle');

&#x20; if (shdr)   shdr.style.color   = this.P;

&#x20; if (toggle) toggle.style.color = this.P;

}



/\*\* Small helper — sets element.style.color \*/

private setChildColor(el: HTMLElement, c: string): void { el.style.color = c; }

```



\*\*Call `updatePalette()` in `show()`:\*\*

```typescript

async show(ref: ScriptureRef, x: number, y: number, editor: Editor): Promise<void> {

&#x20; this.cancelHide();

&#x20; this.currentRef  = ref;

&#x20; this.\_lastEditor = editor;

&#x20; this.activeTooltipCard = null;

&#x20; clearActiveInterlinear();



&#x20; this.updatePalette(ref);          // ← NEW — palette before any rendering

&#x20; this.resetToVersePanel();

&#x20; this.updateIntBtn(this.interlinearActive);

&#x20; // ... rest unchanged ...

}

```



\### `buildDOM()` — 13 references



The template uses `this.P/PL/PM/PD` (resolved at build time to DEFAULT\_PALETTE). Subsequent calls to `updatePersistentColors()` override these inline values when the book changes.



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 1 | `ss-ver-btn` bg | `background:${P}` | `background:${this.P}` |

| 2 | `ss-ver-btn` text | `color:${PL}` | `color:${this.PL}` |

| 3 | `ss-int-btn` text | `color:${P}` | `color:${this.P}` |

| 4 | `ss-int-btn` border | `border:1px solid ${PM}` | `border:1px solid ${this.PM}` |

| 5 | `ss-emb-btn` bg | `background:${P}` | `background:${this.P}` |

| 6 | `ss-emb-btn` text | `color:${PL}` | `color:${this.PL}` |

| 7 | `ss-emb-caret` bg | `background:${P}` | `background:${this.P}` |

| 8 | `ss-emb-caret` text | `color:${PL}` | `color:${this.PL}` |

| 9 | `ss-emb-caret` border | `border-left:1px solid ${PM}` | `border-left:1px solid ${this.PM}` |

| 10 | `ss-sdef` bg | `background:${PL}` | `background:${this.PL}` |

| 11 | `ss-sdef` border | `border:1px solid ${PM}` | `border:1px solid ${this.PM}` |

| 12 | `ss-shdr` text | `color:${P}` | `color:${this.P}` |

| 13 | `ss-def-toggle` text | `color:${P}` | `color:${this.P}` |



\### `updateIntBtn()` — 5 references



| # | State | Property | Was | Becomes |

|---|-------|----------|-----|---------|

| 14 | ON | background | `P` | `this.P` |

| 15 | ON | color | `PL` | `this.PL` |

| 16 | ON | borderColor | `P` | `this.P` |

| 17 | OFF | color | `P` | `this.P` |

| 18 | OFF | borderColor | `PM` | `this.PM` |



\### `buildTooltipCard()` — 6 references



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 19 | `origEl` text | `color:${PM}` | `color:${this.PM}` |

| 20 | `snEl` text | `color:${PM}` | `color:${this.PM}` |

| 21 | mouseenter borderColor | `= P` | `= this.P` |

| 22 | mouseenter background | `= P` | `= this.P` |

| 23 | mouseenter boxShadow | `` `…${P}55` `` | `` `…${this.P}55` `` |

| 24 | mouseenter orig color | `PM` | `this.PM` |



\### `resetTooltipCard()` — 2 references



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 25 | `.ss-tc-orig` color | `PM` | `this.PM` |

| 26 | `.ss-tc-snum` color | `PM` | `this.PM` |



\### `selectTooltipCard()` — 5 references



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 27 | borderColor | `P` | `this.P` |

| 28 | background | `PL` | `this.PL` |

| 29 | boxShadow | `` `…${P}33` `` | `` `…${this.P}33` `` |

| 30 | `.ss-tc-orig` color | `P` | `this.P` |

| 31 | `.ss-tc-snum` color | `PM` | `this.PM` |



\### `renderCrossRefChips()` — 5 references (\*\*per-book coloring\*\*)



Each cross-ref chip shows a DIFFERENT book's address. These use the referenced book's own color, not the active tooltip palette:



```typescript

private renderCrossRefChips(ref: ScriptureRef, editor: Editor): void {

&#x20; // ...

&#x20; const useColors = this.settings.display?.useBookColors ?? true;



&#x20; for (const refStr of toShow) {

&#x20;   const chipPal = getRefBookPalette(refStr, useColors);   // ← per-book

&#x20;   const chipColor = contrastSafeText(chipPal.base);



&#x20;   const chip = document.createElement("span");

&#x20;   chip.textContent = refStr;

&#x20;   chip.style.cssText = `

&#x20;     … color:${chipColor};

&#x20;     background:${chipPal.light}; border:1px solid ${chipPal.mid};

&#x20;     …

&#x20;   `;

&#x20;   chip.addEventListener("mouseenter", () => chip.style.background = chipPal.mid);

&#x20;   chip.addEventListener("mouseleave", () => chip.style.background = chipPal.light);

&#x20;   // ...

&#x20; }

}

```



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 32 | chip text | `color:${P}` | `color:${chipColor}` (per-book) |

| 33 | chip bg | `background:${PL}` | `background:${chipPal.light}` |

| 34 | chip border | `border:…${PM}` | `border:…${chipPal.mid}` |

| 35 | mouseenter bg | `= PM` | `= chipPal.mid` |

| 36 | mouseleave bg | `= PL` | `= chipPal.light` |



\### `showStrongsPopup()` — Caller-side change



`showStrongsPopup` calls defHelpers functions. After Phase 7, these calls pass the current palette:



```typescript

// In showStrongsPopup:

buildSimpleDom(simple, def.definition, { base: this.P, light: this.PL, mid: this.PM, dark: this.PD });

buildAdvancedDefinition(advanced, def.definition, callbacks, 

&#x20; { base: this.P, light: this.PL, mid: this.PM, dark: this.PD },

&#x20; this.settings.display?.useBookColors ?? true);

if (speakerWrap) speakerWrap.appendChild(

&#x20; makeSpeakerLink(def.number, { base: this.P, light: this.PL, mid: this.PM, dark: this.PD })

);

```



\---



\## Phase 7 — `defHelpers.ts` (40 color references)



\### Architectural Approach



`defHelpers.ts` is a collection of \*\*stateless exported functions\*\* — no class, no `this`. Colors can't be instance properties. The solution: every public function that produces colored DOM accepts an \*\*optional `BookPalette`\*\* parameter, defaulting to `DEFAULT\_PALETTE`.



Internally, the palette flows through the call chain: `buildAdvancedDefinition → appendInlineTokens → makeVerseChip / makeStrongsChip / etc.`



\*\*Critical distinction:\*\*

\- \*\*Verse chips\*\* (`makeVerseChip`) derive their own per-book palette from the reference string using `getRefBookPalette()`, because they display a DIFFERENT book's address.

\- \*\*Everything else\*\* (Strong's chips, stem badges, section markers, separators) uses the \*\*passed-in\*\* context palette — the active book's theme.



\### Structural Changes



\*\*Remove/replace module-level constants:\*\*

```typescript

// DELETE these lines:

const P   = "#534AB7";

const PL  = "#EEEDFE";

const PM  = "#AFA9EC";

const PD  = "#3C3489";

const ON\_CARD\_ACCENT = "#534AB7";



// KEEP these (not accent-derived — fixed readability colors):

const ON\_CARD\_BODY   = "#1e1e3c";

const ON\_CARD\_MUTED  = "#5a5a7a";

```



\*\*Add import:\*\*

```typescript

import { 

&#x20; BookPalette, DEFAULT\_PALETTE, 

&#x20; getRefBookPalette, contrastSafeText 

} from "./bookColorUtils";

```



\### Updated Function Signatures



```typescript

// PUBLIC — callers updated in Phase 6 (tooltip) and Phase 2 (readingPanel)

export function buildSimpleDom(

&#x20; container: HTMLElement, raw: string, pal?: BookPalette

): void;



export function buildAdvancedDefinition(

&#x20; container: HTMLElement, raw: string,

&#x20; callbacks?: DefCallbacks,

&#x20; pal?: BookPalette,

&#x20; useBookColors?: boolean       // flows to verse chips

): void;



export function makeSpeakerLink(

&#x20; strongsNum: string, pal?: BookPalette

): HTMLElement;



// INTERNAL — palette threaded through

function buildGreekAdvanced(

&#x20; container: HTMLElement, raw: string,

&#x20; cbs?: DefCallbacks, pal?: BookPalette, useBookColors?: boolean

): void;



function buildHebrewAdvanced(

&#x20; container: HTMLElement, raw: string,

&#x20; cbs?: DefCallbacks, pal?: BookPalette, useBookColors?: boolean

): void;



function appendInlineTokens(

&#x20; container: HTMLElement, text: string,

&#x20; cbs?: DefCallbacks, pal?: BookPalette, useBookColors?: boolean

): void;



function appendInlineHebrew(

&#x20; container: HTMLElement, text: string,

&#x20; cbs?: DefCallbacks, pal?: BookPalette, useBookColors?: boolean

): void;



function makeVerseChip(

&#x20; refStr: string, cbs?: DefCallbacks, useBookColors?: boolean

): HTMLElement;



function makeStrongsChip(

&#x20; num: string, cbs?: DefCallbacks, pal?: BookPalette

): HTMLElement;



function makeStemBadge(stem: string, pal?: BookPalette): HTMLElement;



function makeTechSpan(abbr: string): HTMLElement;  // no colors to change



function showRefPreview(

&#x20; anchor: HTMLElement, text: string, borderColor?: string

): void;

```



All `pal` parameters default to `DEFAULT\_PALETTE` via `pal = pal ?? DEFAULT\_PALETTE` at the top of each function body.



\### Every Inline Style Replacement (40 occurrences)



\*\*`makeSpeakerLink()` — 3 references:\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 1 | link color | `color:${PM}` | `color:${pal.mid}` |

| 2 | mouseenter color | `= P` | `= pal.base` |

| 3 | mouseleave color | `= PM` | `= pal.mid` |



\*\*`showRefPreview()` — 1 reference:\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 4 | popup border | `border:1px solid ${PM}` | `border:1px solid ${borderColor}` (passed from verse chip's derived palette) |



\*\*`buildSimpleDom()` — 2 references:\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 5 | bullet color | `color:${ON\_CARD\_ACCENT}` | `color:${pal.base}` |

| 6 | text color | `color:${ON\_CARD\_BODY}` | `color:${ON\_CARD\_BODY}` (unchanged — fixed readability) |



\*\*`buildGreekAdvanced()` — 9 references:\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 7 | LXX note text | `color:${ON\_CARD\_MUTED}` | unchanged (fixed) |

| 8 | LXX note border | `border-bottom:…${PM}33` | `border-bottom:…${pal.mid}33` |

| 9 | preamble text | `color:${ON\_CARD\_MUTED}` | unchanged (fixed) |

| 10 | section separator | `background:${PM}` | `background:${pal.mid}` |

| 11 | level-1 marker | `color:${ON\_CARD\_ACCENT}` | `color:${pal.base}` |

| 12 | level-2 marker | `color:${PM}` | `color:${pal.mid}` |

| 13 | body text | `color:${ON\_CARD\_BODY}` | unchanged (fixed) |

| 14 | SYN separator | `background:${PM}` | `background:${pal.mid}` |

| 15 | SYN text | `color:${ON\_CARD\_MUTED}` | unchanged (fixed) |



\*\*`buildHebrewAdvanced()` — 7 references:\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 16 | fallback text | `color:${ON\_CARD\_BODY}` | unchanged (fixed) |

| 17 | separator | `background:${PM}` | `background:${pal.mid}` |

| 18 | level-0 marker | `color:${ON\_CARD\_ACCENT}` | `color:${pal.base}` |

| 19 | level-1+ marker | `color:${PM}` | `color:${pal.mid}` |

| 20 | body text | `color:${ON\_CARD\_BODY}` | unchanged (fixed) |

| 21 | Aramaic separator | `background:${PM}` | `background:${pal.mid}` |

| 22 | Aramaic text | `color:${ON\_CARD\_MUTED}` | unchanged (fixed) |



\*\*`makeVerseChip()` — 8 references (PER-BOOK coloring):\*\*



Each verse chip derives its OWN palette from the reference it displays:



```typescript

function makeVerseChip(

&#x20; refStr: string, cbs?: DefCallbacks, useBookColors: boolean = true

): HTMLElement {

&#x20; const vPal = getRefBookPalette(refStr, useBookColors);  // ← per-book

&#x20; const textColor = contrastSafeText(vPal.dark);

&#x20; // ...

}

```



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 23 | chip text | `color:${PD}` | `color:${textColor}` (per-book dark) |

| 24 | chip bg | `background:${PL}` | `background:${vPal.light}` |

| 25 | chip border | `border:…${PM}66` | `border:…${vPal.mid}66` |

| 26 | mouseenter bg | `= PM` | `= vPal.mid` |

| 27 | mouseenter borderColor | `= PM` | `= vPal.mid` |

| 28 | mouseleave bg | `= PL` | `= vPal.light` |

| 29 | mouseleave color | `= PD` | `= textColor` |

| 30 | mouseleave borderColor | `` `${PM}66` `` | `` `${vPal.mid}66` `` |



The hover preview also uses the chip's palette:

```typescript

if (cbs?.getVerseText) {

&#x20; const t = cbs.getVerseText(refStr);

&#x20; if (t) showRefPreview(chip, t, vPal.mid);  // ← per-book border

}

```



\*\*`makeStrongsChip()` — 8 references (CONTEXT palette):\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 31 | chip text | `color:${P}` | `color:${pal.base}` |

| 32 | chip bg | `background:${P}18` | `background:${pal.base}18` |

| 33 | chip border | `border:…${PM}55` | `border:…${pal.mid}55` |

| 34 | mouseenter bg | `= P` | `= pal.base` |

| 35 | mouseenter borderColor | `= P` | `= pal.base` |

| 36 | mouseleave bg | `` `${P}18` `` | `` `${pal.base}18` `` |

| 37 | mouseleave color | `= P` | `= pal.base` |

| 38 | mouseleave borderColor | `` `${PM}55` `` | `` `${pal.mid}55` `` |



\*\*`makeStemBadge()` — 1 reference:\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 39 | badge bg | `background:${P}` | `background:${pal.base}` |



\*\*`makeTechSpan()` — 1 reference:\*\*



| # | Element | Was | Becomes |

|---|---------|-----|---------|

| 40 | text color | `color:${ON\_CARD\_MUTED}` | unchanged (fixed readability color) |



\### Call-Site Updates in `appendInlineTokens()`



```typescript

function appendInlineTokens(

&#x20; container: HTMLElement, text: string,

&#x20; cbs?: DefCallbacks, pal?: BookPalette, useBookColors?: boolean

): void {

&#x20; pal = pal ?? DEFAULT\_PALETTE;

&#x20; // ...

&#x20; for (const tok of toks) {

&#x20;   switch (tok.kind) {

&#x20;     case "verse":   container.appendChild(makeVerseChip(tok.val, cbs, useBookColors ?? true));   break;

&#x20;     case "strongs": container.appendChild(makeStrongsChip(tok.val, cbs, pal)); break;

&#x20;     case "stem":    container.appendChild(makeStemBadge(tok.val, pal));         break;

&#x20;     case "tech":    container.appendChild(makeTechSpan(tok.val));               break;

&#x20;   }

&#x20; }

}

```



Same for `appendInlineHebrew()` — thread `pal` and `useBookColors` through.



\---



\## Cross-Cutting Updates to Existing Phases



\### Phase 2 Update — `readingPanel.ts` caller sites



`showSdef()` in readingPanel calls defHelpers. Add palette parameter:



```typescript

// In showSdef():

const pal: BookPalette = { base: this.P, light: this.PL, mid: this.PM, dark: this.PD };

const useColors = this.settings.display?.useBookColors ?? true;



buildSimpleDom(simple, def.definition, pal);

buildAdvancedDefinition(advanced, def.definition, callbacks, pal, useColors);

speakerWrap.appendChild(makeSpeakerLink(def.number, pal));

```



\### Phase 3 Update — Additional per-book locations



The original Phase 3 listed 4 locations. With tooltip and defHelpers audited, the complete list is now \*\*7 locations\*\* where per-book coloring applies to REFERENCED books:



| # | File | Method | Element | Approach |

|---|------|--------|---------|----------|

| 1 | bibleMode.ts | `openUnifiedDrawer()` | xref address | `getRefBookColor(xref)` |

| 2 | bibleMode.ts | `openXrefDrawer()` | address per row | `getRefBookColor(xref)` |

| 3 | readingPanel.ts | `buildCrossRefCard()` | address | `contrastSafeText(getRefBookColor(refStr))` |

| 4 | readingPanel.ts | `showSearchResults()` | result ref label | `getRefBookColor(result.reference)` |

| 5 | tooltip.ts | `renderCrossRefChips()` | chip text+bg+border | `getRefBookPalette(refStr)` |

| 6 | defHelpers.ts | `makeVerseChip()` | chip text+bg+border | `getRefBookPalette(refStr)` |

| 7 | defHelpers.ts | `showRefPreview()` | popup border | derived from chip's `vPal.mid` |



\---



\## Summary of Color Reference Counts



| File | References | Constants Removed | Palette Source |

|------|-----------|-------------------|----------------|

| `bibleMode.ts` | 38 | 4 (`P/PL/PM/PD`) + `BOOK\_GENRE\_COLOR` map | `this.pos.bookId` |

| `readingPanel.ts` | 62 | 4 (`P/PL/PM/PD`) | `this.currentRef.book` or `bibleModeView.getPosition()` |

| `tooltip.ts` | 36 | 4 (`P/PL/PM/PD`) | `ref.book` (from `show()` argument) |

| `defHelpers.ts` | 40 (28 accent + 12 fixed) | 5 (`P/PL/PM/PD/ON\_CARD\_ACCENT`) | Passed as parameter by caller |

| \*\*Total\*\* | \*\*176 accent\*\* + 12 fixed | \*\*17 constants\*\* | — |



\---



\## Updated Testing Checklist



\### Existing items (unchanged)

\- \[ ] Settings OFF → uniform purple across all modes

\- \[ ] Settings ON → Genesis (pink), Psalms (blue), John (green), Revelation (red)

\- \[ ] Bible mode: verse numbers, drop cap, action buttons, drawers

\- \[ ] Research mode: header, toggle, version button, word cards, definition panel, verse sups

\- \[ ] Cross-ref addresses: per-book colors in both modes

\- \[ ] Search results: per-book reference labels

\- \[ ] Book transition: smooth cross-fade (\~300ms) after swipe settles

\- \[ ] Mode switch: accent updates immediately

\- \[ ] Light mode: bright colors darken for readability

\- \[ ] Dark mode: all colors render vibrantly

\- \[ ] Mobile touch: all gestures work with new colors

\- \[ ] Keyframe animations: use current book color

\- \[ ] Settings toggle: immediate effect, no reload

\- \[ ] Book chooser grid: still shows correct genre colors



\### New items from Phase 6 + 7

\- \[ ] \*\*Tooltip theming:\*\* hover "John 3:16" in notes → tooltip accents are John-green; hover "Psalm 23:1" → tooltip accents are Psalms-blue

\- \[ ] \*\*Tooltip version button:\*\* matches hovered book color

\- \[ ] \*\*Tooltip embed button:\*\* matches hovered book color

\- \[ ] \*\*Tooltip α toggle:\*\* active/inactive states use hovered book color

\- \[ ] \*\*Tooltip interlinear cards:\*\* word cards use hovered book's palette for Greek text, Strong's numbers, hover/selected states

\- \[ ] \*\*Tooltip cross-ref chips:\*\* "Acts 15:24" chip in a John-verse tooltip shows Acts' color (not John's)

\- \[ ] \*\*Tooltip consecutive hover:\*\* hover John 3:16 (green) then quickly Psalm 23:1 (blue) — palette updates cleanly, no stale green elements

\- \[ ] \*\*Definition panel — simple mode:\*\* bullet accent color matches active book

\- \[ ] \*\*Definition panel — advanced mode:\*\* section markers, separators, stem badges all match active book

\- \[ ] \*\*Definition verse chips per-book:\*\* "1Ti 6:1" chip shows 1Timothy's color, "Rev 6:10" shows Revelation's red-pink, "Luk 2:29" shows Luke's lime — regardless of which book's definition panel is open

\- \[ ] \*\*Definition Strong's chips:\*\* use active context palette (not per-book)

\- \[ ] \*\*Definition hover preview:\*\* border color matches the verse chip's book color

\- \[ ] \*\*Definition speaker link:\*\* icon tint matches active book palette

\- \[ ] \*\*Settings OFF + tooltip:\*\* tooltip stays uniform purple

\- \[ ] \*\*Settings OFF + definitions:\*\* all chips/badges uniform purple

\- \[ ] \*\*Light mode + definition verse chips:\*\* bright book colors (yellow, lime) darken via `contrastSafeText()` so chip text is readable on white/light backgrounds

\- \[ ] \*\*Dark mode + definition verse chips:\*\* all colors render without washing out



\---



\## Implementation Order



```

1\. bookColorUtils.ts      (foundation — all other files import from here)

2\. settings.ts             (add useBookColors field)

3\. defHelpers.ts           (add pal parameters — no behavior change until callers pass palettes)

4\. tooltip.ts              (instance palette + call defHelpers with palette)

5\. bibleMode.ts            (instance palette)

6\. readingPanel.ts         (instance palette + call defHelpers with palette)

7\. settingsTab.ts          (toggle wiring — activates the feature)

```



Step 3 is safe to deploy independently because all `pal` parameters default to `DEFAULT\_PALETTE` — existing callers continue to get purple until they're updated in steps 4–6.

