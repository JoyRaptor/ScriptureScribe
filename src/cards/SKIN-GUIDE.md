# ScriptureScribe — Verse Card Skin Guide

> **For the human:** paste this whole file to any AI (Claude, ChatGPT, Gemini,
> a coding agent, anything) together with a description of the look you want,
> e.g. *"Make me a skin themed like an ancient papyrus scroll unrolling, warm
> torchlight, slow dust motes."* Save the HTML it gives you as
> `my-skin-name.html` in this folder (`skins/`), then pick it in
> **Settings → ScriptureScribe → Appearance → Verse Card Mode**.
>
> **For the AI:** you are designing one self-contained HTML file. The
> ScriptureScribe engine (already written, never changes) puts the verse into
> your page, runs the in/hold/out timing, and auto-sizes the verse text. You
> own **everything visual**: layout, CSS, SVG, canvas, JavaScript, animation.
> Make it look like an award-winning title card, not a template.

---

## What this is

When the user hovers a scripture reference, a full-screen card fades in over
their screen (they are recording YouTube videos) and fades out when the mouse
leaves. Your HTML page **is** that card. It is shown full-screen (typically
1920×1080, but must work at any size and aspect ratio) in a transparent,
click-through iframe.

## The contract (everything the engine does for you)

### 1. Content slots — mark elements with `data-ss`

The engine sets the `textContent` of every element carrying these attributes:

| Attribute | Receives | Example |
|---|---|---|
| `data-ss="text"` | The verse text | `For God so loved the world…` |
| `data-ss="reference"` | The reference | `John 3:16` |
| `data-ss="version"` | Translation | `KJV` |
| `data-ss="book"` | Book name | `John` |

`text` and `reference` are required. The others are optional. You may use
several elements with the same slot (e.g. a decorative echo of the reference).
Do not hard-code any verse text — the page must work for *any* verse.

### 2. Auto-fit text — `data-ss="text-box"`

Wrap the verse element in a box that defines the **space the verse may
occupy**. The engine shrinks the font-size of the `data-ss="text"` element
until it fits inside that box, so a 3-word verse is large and a 9-line verse
is smaller, always well-composed.

```html
<div data-ss="text-box">   <!-- fixed size: this is the available area -->
  <div data-ss="text"></div> <!-- engine sets font-size on this element -->
</div>
```

Rules for fitting to work:
- The `text-box` **must have a definite width and height** from CSS
  (e.g. `width:min(78vw,1280px); height:44vh;`). Not `auto`.
- The `text` element must be a normal block whose height comes from its
  content (don't give it a fixed height, and don't set `font-size` on it with
  `!important`). Setting a *default* `font-size` is fine; the engine overrides it.
- Don't put `display:none` on the text or its parents in any state — hide with
  `opacity`/`transform`/`clip-path` instead (hidden-by-display elements can't
  be measured).
- Optional metas to tune the range (pixels):
  `<meta name="ss-min-font" content="18">` and
  `<meta name="ss-max-font" content="110">`. Default max is 8.5 % of the
  viewport height.

### 3. Lifecycle — `<html data-state="…">`

The engine drives a single attribute on the root `<html>` element:

```
idle ──► in ──► hold ──► out ──► idle
```

| State | Meaning |
|---|---|
| `idle` | Nothing showing. Page must be fully invisible (opacity 0). Animations are not running. |
| `in` | Intro. Starts the instant the user starts hovering. |
| `hold` | Intro finished, card is on screen for as long as the mouse stays. **Can last for 1 second or 5 minutes.** Put loops here. |
| `out` | The mouse left. Fade everything away. |

Declare timing with meta tags (milliseconds; the engine uses them to know
when to switch `in→hold` and when `out` is finished):

```html
<meta name="ss-in-ms"   content="1400">  <!-- length of your intro -->
<meta name="ss-out-ms"  content="800">   <!-- length of your outro -->
<meta name="ss-swap-ms" content="300">   <!-- optional, see "swapping" -->
```

Defaults if omitted: 900 / 700 / 260.

**The recommended technique is pure CSS.** Style the page for each state:

```css
.stage { opacity: 0; transition: opacity .6s; }                  /* idle/out */
html[data-state="in"]   .stage,
html[data-state="hold"] .stage { opacity: 1; transition: opacity .9s; }
```

Put **both** `in` and `hold` in the same selector for intro styles (so the
transition doesn't restart when `in` becomes `hold`), use `transition-delay`
to sequence the intro, and put looping `@keyframes` on elements always — the
engine pauses nothing, so add this line to stop wasted work while hidden:

```css
html[data-state="idle"] *, html[data-state="idle"] *::before, html[data-state="idle"] *::after {
  animation-play-state: paused !important;
}
```

**Design for interruption.** The user can sweep the mouse across a link, so
`out` may begin halfway through `in`, and `in` may begin halfway through
`out`. CSS *transitions* handle this gracefully (they reverse smoothly);
one-shot `@keyframes` tied to `in` can look jumpy — prefer transitions for
intro/outro, keyframes for loops.

### 4. JavaScript events (optional)

Inside your page, the engine dispatches events on `window`:

| Event | When | `event.detail` |
|---|---|---|
| `ss:content` | New verse text has just been written into the slots (fires before `in` starts) | `{reference, text, version, book, testament, palette}` |
| `ss:in` `ss:hold` `ss:out` `ss:idle` | State changes | — |

Typical use: on `ss:content`, split the verse into word `<span>`s so they can
animate in one by one (the built-in skin does exactly this — read it).
The engine fits the text size immediately **after** `ss:content` handlers run
(and again on font load / window resize), so wrapping the words in spans — even
spans with padding — is safe. Keep normal spaces between word spans.

### 5. Swapping verses

If the user slides directly from one reference to another, the engine does
**not** replay the whole intro. It sets `data-swapping` on `<html>` for
`ss-swap-ms`, swaps the text underneath, then removes it. Optional polish:

```css
html[data-swapping] [data-ss="text"] { opacity: 0; transition: opacity .25s; }
```

**Gotcha when you rebuild the words in `ss:content`:** during a swap the card is
already in `hold`, so freshly created word spans would appear instantly with no
animation. Create them with a `.pre` class that forces the hidden look
(`transition: none !important`), then remove it after two animation frames
(`requestAnimationFrame` twice). The built-in skins all do this.

### 6. Free theming data

The engine sets these on `<html>` for every verse:

- CSS variables from the book's colour: `--ss-accent`, `--ss-accent-light`,
  `--ss-accent-mid`, `--ss-accent-dark` (use with a fallback:
  `var(--ss-accent, #7c5cff)`). Use them if you want each book to tint the
  card differently — or ignore them for a fixed look.
- `data-testament="ot" | "nt"`
- `data-book="John"`
- `data-length="short" | "medium" | "long" | "epic"` (by verse character
  count: <90, <200, <400, 400+) — e.g. use a bigger ornament for short verses.

## Hard technical rules

1. **One single `.html` file.** No other files can be loaded.
2. **Inline everything**: `<style>` for CSS, `<script>` for JS, inline SVG,
   `data:` URIs for images.
3. **Fonts:** the *only* external stylesheet that works is Google Fonts
   (`<link href="https://fonts.googleapis.com/css2?family=…" rel="stylesheet">`).
   Always include fallback fonts. Call `document.fonts.load('600 40px "Font"')`
   at startup so the first verse doesn't flash a fallback face. External
   *scripts* are discouraged (the user may be offline); write vanilla JS.
4. **Transparent root:** `html, body { background: transparent; }` and make
   your own full-viewport background element (`position:fixed; inset:0`) that
   fades with the state. The page must be completely invisible in `idle`.
5. **No interactivity.** The card is click-through. No buttons, no hover
   effects, no scrolling (`overflow:hidden`).
6. **Responsive:** size with `vw`/`vh`/`vmin`/`clamp()`, never fixed pixels
   for layout. Test mentally at 1920×1080, 1280×720 and a portrait window.
7. **Performance:** this runs during screen recording. Prefer `transform` and
   `opacity` animations; keep blur filters modest; keep particle counts under
   ~80; use `requestAnimationFrame` only when needed. Pause loops in `idle`.
8. **Legibility first.** Verse text must have strong contrast against the
   background at every moment of `hold`, including over your animated
   elements. This is a teaching video — people must be able to read it.
9. **Text is plain text.** The engine writes it with `textContent`; never
   assume HTML in it. Verses may contain punctuation like `—`, `;`, curly
   quotes. Reference format is like `1 Corinthians 13:4-7`.
10. Add a `<title>` describing the theme (shown nowhere, but helps the user).

## Design brief — what "incredible" means here

- **Choreograph the intro (1–2 s).** Layers arriving in sequence: background
  → frame/ornament → text (word-by-word or line reveal) → reference → small
  details. Use easing curves (`cubic-bezier(.22,.8,.24,1)`), not `ease`/linear.
- **Make `hold` alive but calm.** Slow loops (8–30 s): drifting light, floating
  particles, gentle gradient motion, a shimmer that sweeps the reference every
  few seconds. Motion must never compete with reading the verse.
- **Make `out` graceful**, roughly 60 % the length of `in`: text first, then
  the background. Nothing should snap.
- **Typography carries the page.** Pick one display font and one text font
  with character; generous line-height; `text-wrap: balance`. The reference
  can be tracked-out small caps; the verse should feel like it was lettered.
- **Use depth:** layered gradients, vignette, soft glows, grain (an SVG
  `feTurbulence` filter works), inner shadows. Avoid flat single-colour
  backgrounds.
- **Commit to a theme** (parchment & candlelight, deep-sea bioluminescence,
  stained glass, starfield, stone tablet, desert sunrise, etc.) and let every
  element serve it — frame, ornaments, particles, palette, fonts.

## Minimal working skeleton

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Minimal skin</title>
<meta name="ss-in-ms" content="900">
<meta name="ss-out-ms" content="600">
<style>
  html, body { margin:0; height:100%; overflow:hidden; background:transparent; }
  .stage { position:fixed; inset:0; background:#101820; color:#fff;
           display:flex; flex-direction:column; align-items:center; justify-content:center;
           opacity:0; transition:opacity .6s; }
  html[data-state="in"] .stage, html[data-state="hold"] .stage { opacity:1; transition:opacity .9s; }
  [data-ss="text-box"] { width:min(78vw,1200px); height:46vh; display:flex; align-items:center; }
  [data-ss="text"] { width:100%; text-align:center; font:600 48px/1.3 Georgia,serif; text-wrap:balance; }
  [data-ss="reference"] { margin-top:3vh; letter-spacing:.3em; text-transform:uppercase; opacity:.8; }
</style>
</head>
<body>
  <div class="stage">
    <div data-ss="text-box"><div data-ss="text"></div></div>
    <div data-ss="reference"></div>
  </div>
</body>
</html>
```

**Reference implementation:** `_example-built-in.html` in this same folder is
the built-in "Violet & Gold" skin — a complete, working, polished example
(frame that draws outward, word-by-word reveal, drifting light and motes,
shimmering reference, graceful out). Read it before designing; copy its
structure, replace its look. Do **not** edit `_example-built-in.html` itself
(it is rewritten whenever the plugin updates) — save your skin under a new name.

## Checklist before handing the file back

- [ ] Single file, no external files except Google Fonts
- [ ] `data-ss="text-box"` has definite width **and** height in CSS
- [ ] `data-ss="text"` inside it; `data-ss="reference"` present
- [ ] Fully transparent/invisible when `data-state="idle"`
- [ ] `in` and `hold` share selectors for intro styles; `out` has its own
- [ ] `ss-in-ms` / `ss-out-ms` metas match the real animation lengths
- [ ] Loops pause in `idle`
- [ ] Verse text readable at all times; works for 1 word and for 90 words
- [ ] No `display:none` on anything the engine measures

## More examples to study

`Velvet Rainbow.html` (highlighter swipes in the Royal Velvet palette, with
stop-motion "boil"), `Velvet Aurora.html` (the wispy light show, in that
palette) and `Obsidian Minimal.html` (a quiet, plain card) are in this folder too — they show very different looks built on the
exact same contract.

Starter skins that carry an `ss-starter vN` comment are refreshed by plugin
updates. To keep your own edits to one, delete that comment line or save the
file under a new name.
