/**
 * bookColorUtils.ts — Centralized book-color system for ScriptureScribe
 *
 * Single source of truth for:
 *  - BOOK_GENRE_COLOR map (moved from bibleMode.ts)
 *  - BookPalette type
 *  - generatePalette() — derives light/mid/dark from any base hex
 *  - getBookPalette() — looks up palette for a book ID, respecting useBookColors setting
 *  - getRefBookColor() / getRefBookPalette() — parse a reference string to a color
 *  - contrastSafeText() — ensures bright colors (lime, yellow, cyan) are readable in light mode
 *  - contrastSafePalette() — full palette adaptation for light/dark mode
 *
 * Light-mode accommodation
 * ─────────────────────────
 * Books Mark–2 Thessalonians (IDs 41-52) have vivid lime/yellow hues that look
 * spectacular on dark backgrounds but become invisible on white/light ones.
 * contrastSafeText() detects the current Obsidian theme and darkens any color
 * whose luminance would fail a 4.5:1 contrast ratio against white.
 * contrastSafePalette() applies this to all four tones AND adjusts the `light`
 * shade so it stays a readable tinted background in light mode.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BookPalette {
  base:       string;   // BOOK_GENRE_COLOR value — primary accent
  light:      string;   // 88 % toward white — card selected bg, hovers, def-helper bg
  mid:        string;   // 50 % toward white — Greek text, Strong's numbers, secondary
  dark:       string;   // 30 % toward black — pressed/hover states on buttons
  textOnLight: string;  // readable accent for text placed ON the light card bg (dark mode)
  textOnVivid: string;  // readable text when HOVER fills the card with the vivid base color
}

// ─── Defaults (purple fallback) ───────────────────────────────────────────────

export const DEFAULT_ACCENT = "#534AB7";
export const DEFAULT_PALETTE: BookPalette = {
  base:       "#534AB7",
  light:      "#EEEDFE",
  mid:        "#AFA9EC",
  dark:       "#3C3489",
  textOnLight: "#3C3489",  // dark variant — readable on #EEEDFE
  textOnVivid: "#ffffff",  // white reads well on purple
};

// ─── Book → genre color map ───────────────────────────────────────────────────
// (moved from bibleMode.ts — single source of truth)

export const BOOK_GENRE_COLOR: Record<number, string> = {
  // Pentateuch (1–5) — neon pink
  1: "#ff008c", 2: "#ff008c", 3: "#ff008c", 4: "#ff008c", 5: "#ff008c",
  // Historical Rise (6–10) — vivid purple
  6: "#cc27ff", 7: "#cc27ff", 8: "#cc27ff", 9: "#8c3dfa", 10: "#8c3dfa",
  // Historical Fall (11–17) — indigo blue
  11: "#5c43fd", 12: "#5c43fd", 13: "#5c43fd", 14: "#5c43fd",
  15: "#5c43fd", 16: "#5c43fd", 17: "#5c43fd",
  // Wisdom / Poetry (18–22) — bright blue
  18: "#4397fd", 19: "#4397fd", 20: "#4397fd", 21: "#4397fd", 22: "#4397fd",
  // Major Prophets (23–27) — cyan
  23: "#55e0f9", 24: "#55e0f9", 25: "#55e0f9", 26: "#55e0f9", 27: "#55e0f9",
  // Minor Prophets (28–39) — aqua green
  28: "#35f6bf", 29: "#35f6bf", 30: "#35f6bf", 31: "#35f6bf",
  32: "#35f6bf", 33: "#35f6bf", 34: "#35f6bf", 35: "#35f6bf",
  36: "#35f6bf", 37: "#35f6bf", 38: "#35f6bf", 39: "#35f6bf",
  // Gospels (40–43) — lime green
  40: "#97fe8b", 41: "#97fe8b", 42: "#97fe8b", 43: "#97fe8b",
  // Acts (44) — soft yellow-green
  44: "#ceff5b",
  // Pauline Epistles (45–57) — golden yellow → amber
  45: "#f9f462", 46: "#f9f462", 47: "#f9f462", 48: "#f9f462",
  49: "#f9f462", 50: "#f9f462", 51: "#f9f462", 52: "#f9f462",
  53: "#f9f462", 54: "#ffc341", 55: "#ffc341", 56: "#ffc341", 57: "#ffc341",
  // General Epistles (58–65) — warm orange → deep orange
  58: "#faa03d", 59: "#faa03d", 60: "#faa03d", 61: "#faa03d",
  62: "#fc6818", 63: "#fc6818", 64: "#fc6818", 65: "#fc4d18",
  // Apocalyptic Revelation (66) — red-pink
  66: "#fa3d5d",
};

// ─── Color math helpers ───────────────────────────────────────────────────────

/** Parse a 6-digit hex string to [r, g, b] in 0-255 range */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace(/^#/, "");
  const n = parseInt(h.length === 3
    ? h.split("").map(c => c + c).join("")
    : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Convert [r, g, b] (0-255) back to a "#rrggbb" string */
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b]
    .map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Mix `hex` toward white by `ratio` (0 = original, 1 = pure white).
 * Equivalent to CSS `color-mix(in srgb, hex ratio%, white)`.
 */
function mixToWhite(hex: string, ratio: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * ratio,
    g + (255 - g) * ratio,
    b + (255 - b) * ratio,
  );
}

/**
 * Mix `hex` toward black by `ratio` (0 = original, 1 = pure black).
 */
function mixToBlack(hex: string, ratio: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - ratio), g * (1 - ratio), b * (1 - ratio));
}

/**
 * Relative luminance of a hex color (per WCAG 2.1).
 * 0 = black, 1 = white.
 */
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors */
function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const lighter = Math.max(la, lb);
  const darker  = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Theme detection ──────────────────────────────────────────────────────────

/** Returns true when Obsidian is in light (non-dark) mode */
export function isLightMode(): boolean {
  return !document.body.classList.contains("theme-dark");
}

// ─── Palette generation ───────────────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map(c => c / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

/**
 * The deepest-needed shade of `hex`'s hue that reads on `bg` (≥ `ratio`:1), for small text on
 * pale cards and on vivid fills. Lightness drops in HSL with saturation held high, so lime stays
 * green and cyan stays teal; black-mixing (the old approach) turned them olive and grey, and the
 * hand-picked shades it replaced only reached about 2:1 on their own card tints.
 * Yellow leans toward amber on the way down, because dark yellow reads as mud.
 */
export function deepShadeOn(hex: string, bg: string, ratio = 5): string {
  let [h, s, l] = hexToHsl(hex);
  if (h >= 46 && h <= 72) h = 40;
  s = Math.max(s, 0.85);
  for (l = Math.min(l, 0.6); l > 0.04; l -= 0.01) {
    const shade = hslToHex(h, s, l);
    if (contrastRatio(shade, bg) >= ratio) return shade;
  }
  return "#14121f";
}

/**
 * Text color for labels sitting ON the vivid base color (hover fills, version pills).
 * White wherever it holds up (purples, pinks, reds, indigo); a deep shade of the same hue
 * on the bright ones (lime, cyan, yellow, amber), where white vanishes.
 */
export function textOnVividFor(base: string): string {
  return contrastRatio(base, "#ffffff") >= 3.5 ? "#ffffff" : deepShadeOn(base, base, 5);
}

/**
 * Algorithmic fallback: darken `hex` until ≥4.5:1 contrast vs white.
 * Used for colors not covered by ARTIST_TEXT_ON_LIGHT.
 */
function darkForLight(hex: string): string {
  const WHITE = "#ffffff";
  if (contrastRatio(hex, WHITE) >= 4.5) return hex;
  let result = hex;
  for (let i = 0; i < 25; i++) {
    result = mixToBlack(result, 0.12);
    if (contrastRatio(result, WHITE) >= 4.5) return result;
  }
  return result;
}

/**
 * Derive a five-tone palette from any base hex color.
 *
 * These ratios reproduce the existing purple palette almost exactly:
 *   purple #534AB7 → light ≈ #EEEDFE (88%), mid ≈ #AFA9EC (50%), dark ≈ #3C3489 (30% black)
 */
export function generatePalette(hex: string): BookPalette {
  const light = mixToWhite(hex, 0.88);
  return {
    base:       hex,
    light,
    mid:        mixToWhite(hex, 0.50),
    dark:       mixToBlack(hex, 0.30),
    // textOnLight: readable (≥5:1) on the pale `light` card bg in both light & dark mode.
    textOnLight: deepShadeOn(hex, light),
    // textOnVivid: what to use when the hover fill IS the base color itself.
    textOnVivid: textOnVividFor(hex),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Look up the raw genre color for a book ID.
 * Returns DEFAULT_ACCENT if no entry found.
 */
export function getBookColor(bookId: number): string {
  return BOOK_GENRE_COLOR[bookId] ?? DEFAULT_ACCENT;
}

/**
 * Return a BookPalette for `bookId`.
 * If `useBookColors` is false, always returns DEFAULT_PALETTE.
 */
export function getBookPalette(bookId: number, useBookColors: boolean): BookPalette {
  if (!useBookColors) return DEFAULT_PALETTE;
  const base = BOOK_GENRE_COLOR[bookId] ?? DEFAULT_ACCENT;
  return generatePalette(base);
}

/**
 * Parse a reference string like "Acts 15:24" → book name → book ID → color.
 * Returns DEFAULT_ACCENT on parse failure.
 */
export function getRefBookColor(refStr: string): string {
  // Lazy import avoidance — inline a simple book-name lookup
  const bookName = refStr.trim().replace(/\s+\d.*$/, ""); // "Acts 15:24" → "Acts"
  const id = _resolveBookNameToId(bookName);
  return id !== null ? (BOOK_GENRE_COLOR[id] ?? DEFAULT_ACCENT) : DEFAULT_ACCENT;
}

/**
 * Full palette for a reference string's book.
 */
export function getRefBookPalette(refStr: string, useBookColors: boolean): BookPalette {
  if (!useBookColors) return DEFAULT_PALETTE;
  const color = getRefBookColor(refStr);
  return generatePalette(color);
}

// ─── Light-mode contrast safety ───────────────────────────────────────────────

/**
 * Returns a version of `hex` that has at least 4.5:1 contrast against the
 * current background (white for light mode, ~#1e1e2e for dark).
 *
 * In light mode: bright lime/yellow/cyan colors are darkened until readable.
 * In dark mode:  colors are returned unchanged — they already read well.
 *
 * Use this for TEXT colors (addresses, labels, chip text).
 */
export function contrastSafeText(hex: string): string {
  if (!isLightMode()) return hex;

  const WHITE = "#ffffff";
  const MIN_RATIO = 4.5;

  // If already readable, return as-is
  if (contrastRatio(hex, WHITE) >= MIN_RATIO) return hex;

  // Darken until we hit the target (max 20 steps of 5% each = 100% → black)
  let result = hex;
  for (let i = 0; i < 20; i++) {
    result = mixToBlack(result, 0.10);
    if (contrastRatio(result, WHITE) >= MIN_RATIO) return result;
  }
  return result;
}

/**
 * Returns a version of `hex` that has at least 3:1 contrast against the
 * current background. Less strict — for borders and decorative elements.
 */
export function contrastSafeBorder(hex: string): string {
  if (!isLightMode()) return hex;

  const WHITE = "#ffffff";
  const MIN_RATIO = 3.0;
  if (contrastRatio(hex, WHITE) >= MIN_RATIO) return hex;

  let result = hex;
  for (let i = 0; i < 15; i++) {
    result = mixToBlack(result, 0.10);
    if (contrastRatio(result, WHITE) >= MIN_RATIO) return result;
  }
  return result;
}

/**
 * Apply contrast safety to all four tones of a palette.
 *
 * In light mode:
 *  - `base`  → darkened for text readability (4.5:1 vs white)
 *  - `light` → kept very pale (safe background tint) — uses 94% toward white
 *              from the contrast-safe base, not the original bright hue
 *  - `mid`   → contrast-safe border/secondary (3:1 vs white)
 *  - `dark`  → darkened base further; always readable
 *
 * In dark mode: palette returned unchanged.
 */
export function contrastSafePalette(pal: BookPalette): BookPalette {
  if (!isLightMode()) return pal;

  // Deepen in HSL rather than mixing toward black: black-mixing turned yellow, lime and cyan
  // olive-grey, and the card tint derived from that was mud. The tint keeps the original hue.
  const safeBase = contrastRatio(pal.base, "#ffffff") >= 4.5 ? pal.base : deepShadeOn(pal.base, "#ffffff", 4.5);
  const light = mixToWhite(pal.base, 0.84);
  return {
    base:       safeBase,
    light,
    // Unselected Greek and Strong's numbers sit on the near-white card background.
    mid:        deepShadeOn(pal.base, "#f6f6f6", 4.5),
    dark:       mixToBlack(safeBase, 0.20),
    textOnLight: deepShadeOn(pal.base, light),
    textOnVivid: textOnVividFor(safeBase),
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Minimal book-name-to-ID resolver used by getRefBookColor().
 * Only needs to handle the names used in our cross-reference strings.
 * Returns null if unresolvable.
 */
function _resolveBookNameToId(name: string): number | null {
  const n = name.trim().toLowerCase();
  for (const [id, canonical] of BOOK_NAME_MAP) {
    if (canonical.includes(n)) return id;
  }
  return null;
}

// Compact lookup table: id → array of lowercase name variants
const BOOK_NAME_MAP: Array<[number, string[]]> = [
  [1,  ["genesis","gen"]],
  [2,  ["exodus","exo","ex"]],
  [3,  ["leviticus","lev"]],
  [4,  ["numbers","num"]],
  [5,  ["deuteronomy","deu","deut"]],
  [6,  ["joshua","jos","josh"]],
  [7,  ["judges","jdg","judg"]],
  [8,  ["ruth","rut"]],
  [9,  ["1 samuel","1sa","i samuel","1samuel"]],
  [10, ["2 samuel","2sa","ii samuel","2samuel"]],
  [11, ["1 kings","1ki","i kings","1kings"]],
  [12, ["2 kings","2ki","ii kings","2kings"]],
  [13, ["1 chronicles","1ch","i chronicles","1chronicles"]],
  [14, ["2 chronicles","2ch","ii chronicles","2chronicles"]],
  [15, ["ezra","ezr"]],
  [16, ["nehemiah","neh"]],
  [17, ["esther","est"]],
  [18, ["job"]],
  [19, ["psalms","psa","psalm","ps"]],
  [20, ["proverbs","pro","prov"]],
  [21, ["ecclesiastes","ecc"]],
  [22, ["song of solomon","son","song","song of songs"]],
  [23, ["isaiah","isa"]],
  [24, ["jeremiah","jer"]],
  [25, ["lamentations","lam"]],
  [26, ["ezekiel","eze","ezek"]],
  [27, ["daniel","dan"]],
  [28, ["hosea","hos"]],
  [29, ["joel","joe"]],
  [30, ["amos","amo"]],
  [31, ["obadiah","oba","ob"]],
  [32, ["jonah","jon"]],
  [33, ["micah","mic"]],
  [34, ["nahum","nah"]],
  [35, ["habakkuk","hab"]],
  [36, ["zephaniah","zep","zeph"]],
  [37, ["haggai","hag"]],
  [38, ["zechariah","zec","zech"]],
  [39, ["malachi","mal"]],
  [40, ["matthew","mat","matt"]],
  [41, ["mark","mrk","mar"]],
  [42, ["luke","luk"]],
  [43, ["john","joh","jn"]],
  [44, ["acts","act"]],
  [45, ["romans","rom"]],
  [46, ["1 corinthians","1co","i corinthians","1corinthians"]],
  [47, ["2 corinthians","2co","ii corinthians","2corinthians"]],
  [48, ["galatians","gal"]],
  [49, ["ephesians","eph"]],
  [50, ["philippians","php","phil"]],
  [51, ["colossians","col"]],
  [52, ["1 thessalonians","1th","i thessalonians","1thessalonians"]],
  [53, ["2 thessalonians","2th","ii thessalonians","2thessalonians"]],
  [54, ["1 timothy","1ti","i timothy","1timothy"]],
  [55, ["2 timothy","2ti","ii timothy","2timothy"]],
  [56, ["titus","tit"]],
  [57, ["philemon","phm","phlm"]],
  [58, ["hebrews","heb"]],
  [59, ["james","jas","jam"]],
  [60, ["1 peter","1pe","i peter","1peter"]],
  [61, ["2 peter","2pe","ii peter","2peter"]],
  [62, ["1 john","1jn","i john","1john"]],
  [63, ["2 john","2jn","ii john","2john"]],
  [64, ["3 john","3jn","iii john","3john"]],
  [65, ["jude","jud"]],
  [66, ["revelation","rev"]],
];
