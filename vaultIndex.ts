/**
 * vaultIndex.ts
 *
 * Scans the Obsidian vault for scripture references across all notes,
 * building a reverse index: verse key → array of { filePath, context }.
 *
 * Powers Bible-mode vault highlights and research-panel backlinks.
 *
 * Color system:
 *   Picks from a hand-curated 15-color neon-pastel rainbow palette.
 *   Hue selection uses a djb2 hash of the file path so each note gets
 *   a stable, deterministic color that spreads evenly across the wheel.
 *
 * Multi-source highlighting (Bible mode):
 *   Left edge: stacked 3-px inset box-shadows, one per note (up to 5).
 *   Background: smooth linear-gradient between note colors at 12% opacity.
 *
 * Range expansion:
 *   Refs like "Romans 3:23-28" expand to at most 3 consecutive verse keys
 *   so the highlight is meaningful without flooding the index.
 */

import { Vault, TFile } from "obsidian";
import { parseScriptureRefs } from "./parser";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VerseNote {
  filePath: string;
  /** ~70-char snippet of surrounding text from the note */
  context: string;
}

/** verse key ("Book Ch:V") → ordered array of VerseNote objects */
export type VaultIndex = Map<string, VerseNote[]>;

// ── Highlight settings (set from main.ts on load / save) ─────────────────────

let _opacity:   number                      = 88;
let _textColor: "dark" | "light" | "auto"  = "auto";

export function setVaultHighlightSettings(
  opacity:   number,
  textColor: "dark" | "light" | "auto",
): void {
  _opacity   = Math.max(0, Math.min(100, opacity));
  _textColor = textColor;
}

/**
 * Returns the CSS color string to use for text on a vault-highlighted verse.
 * "auto" detects Obsidian's active theme class so it works in both light and
 * dark mode without the user having to manually adjust the setting.
 */
export function getVaultHighlightTextColor(): string {
  if (_textColor === "light") return "#f0f0f0";
  if (_textColor === "dark")  return "#1a1a1a";
  // auto — Obsidian adds .theme-dark to <body> in dark mode
  const isDark = typeof document !== "undefined"
    && document.body.classList.contains("theme-dark");
  // Neon pastel palette sits at L 60-68 % — always a bright background.
  // Dark text reads well in both themes; on dark-themed Obsidian the vivid
  // highlight patch contrasts with the dark page background, making dark
  // text on the bright patch perfectly legible.
  return isDark ? "#1a1a1a" : "#1a1a1a";
  // Note: both branches are identical for now — the auto path is wired so
  // future palette changes that affect luminance can branch correctly here.
}
//
// Hand-picked neon-pastel rainbow: vivid enough to glow on dark backgrounds,
// harmonious enough to stack beautifully when multiple notes cite one verse.

const VAULT_PALETTE: string[] = [
  "#FF9269", // warm coral
  "#FFAF75", // peach
  "#FFCC85", // golden amber
  "#FFF8A8", // soft lemon
  "#CFEF96", // lime green
  "#ADE199", // sage
  "#90D59C", // mint
  "#8ED9D3", // aqua
  "#8CD2FE", // sky blue
  "#81A4E8", // cornflower
  "#8282D0", // periwinkle
  "#9E80C9", // lavender
  "#BC89C8", // orchid
  "#F392C1", // pink
  "#FF8590", // rose
];

/** Convert a hex color string to rgba() with the given alpha. */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Deterministic color for a note file path.
 * Same path → same color across every session.
 * Different paths spread across the full palette via djb2 hash.
 */
export function notePathToColor(path: string): string {
  let h = 5381;
  for (let i = 0; i < path.length; i++) {
    h = ((h << 5) + h + path.charCodeAt(i)) & 0x7fffffff;
  }
  return VAULT_PALETTE[(h >>> 0) % VAULT_PALETTE.length];
}

// ── Highlight style builder ───────────────────────────────────────────────────

export interface VerseHighlightStyle {
  boxShadow:   string;
  background:  string;
  paddingLeft: string;
}

/**
 * CSS properties to apply to a Bible-mode verse span cited by one or more notes.
 *
 * Single note:  solid background at 28% opacity.
 * Multi-note:   linear-gradient across all source colors at 28% opacity,
 *               flowing left to right across the full verse line.
 * No left-edge bars — the full background IS the highlight.
 */
export function buildVerseHighlightStyle(notePaths: string[]): VerseHighlightStyle {
  if (!notePaths.length) {
    return { boxShadow: "none", background: "transparent", paddingLeft: "0" };
  }

  const colors = notePaths.slice(0, 5).map(p => notePathToColor(p));
  const alpha  = _opacity / 100;

  let background: string;
  if (colors.length === 1) {
    background = hexToRgba(colors[0], alpha);
  } else {
    const stops = colors.map((c, i) => {
      const pct = Math.round((i / (colors.length - 1)) * 100);
      return `${hexToRgba(c, alpha)} ${pct}%`;
    });
    background = `linear-gradient(to right, ${stops.join(", ")})`;
  }

  return {
    boxShadow:   "none",
    background,
    paddingLeft: "0",
  };
}

// ── Module state ──────────────────────────────────────────────────────────────

let _index:     VaultIndex = new Map();
let _isReady    = false;
let _isScanning = false;

/** Per-file cache: filePath → list of verse keys it contributed. */
const _fileCache: Map<string, string[]> = new Map();
const _fileByVerseSet: Map<string, Set<string>> = new Map();

const _readyCbs: Array<() => void> = [];

// ── Status ────────────────────────────────────────────────────────────────────

export function isVaultIndexReady():    boolean    { return _isReady;    }
export function isVaultIndexScanning(): boolean    { return _isScanning; }
export function getVaultIndex():        VaultIndex { return _index;      }

export function onVaultIndexReady(cb: () => void): void {
  if (_isReady) { cb(); return; }
  _readyCbs.push(cb);
}

// ── Lookups ───────────────────────────────────────────────────────────────────

/**
 * All VerseNotes for a verse key.
 * Pass excludePath to omit the currently-open file (avoids self-referencing).
 */
export function getNotesForVerse(verseKey: string, excludePath?: string): VerseNote[] {
  const all = _index.get(verseKey) ?? [];
  return excludePath ? all.filter(n => n.filePath !== excludePath) : all;
}

/** File paths only — convenience wrapper used by bibleMode vault highlight. */
export function getNotePathsForVerse(verseKey: string, excludePath?: string): string[] {
  return getNotesForVerse(verseKey, excludePath).map(n => n.filePath);
}

// ── Internal index helpers ────────────────────────────────────────────────────

function addVerseNote(verseKey: string, note: VerseNote): void {
  let fileSet = _fileByVerseSet.get(verseKey);
  if (!fileSet) {
    fileSet = new Set<string>();
    _fileByVerseSet.set(verseKey, fileSet);
  }
  
  if (!fileSet.has(note.filePath)) {
    fileSet.add(note.filePath);
    const existing = _index.get(verseKey);
    if (existing) {
      existing.push(note);
    } else {
      _index.set(verseKey, [note]);
    }
  }
}

function removeFileFromIndex(filePath: string): void {
  const keys = _fileCache.get(filePath) ?? [];
  for (const key of keys) {
    const arr = _index.get(key);
    if (!arr) continue;
    const filtered = arr.filter(n => n.filePath !== filePath);
    if (filtered.length) {
      _index.set(key, filtered);
    } else {
      _index.delete(key);
      _fileByVerseSet.delete(key);
    }
    const s = _fileByVerseSet.get(key);
    if (s) s.delete(filePath);
  }
  _fileCache.delete(filePath);
}

function extractContext(content: string, start: number, end: number): string {
  const padBefore = 30;
  const padAfter  = 40;
  const s = Math.max(0, start - padBefore);
  const e = Math.min(content.length, end + padAfter);
  let snippet = content.slice(s, e).replace(/\s+/g, " ").trim();
  if (s > 0)              snippet = "…" + snippet;
  if (e < content.length) snippet = snippet + "…";
  return snippet;
}

const MAX_RANGE_VERSES = 3;

async function indexFile(
  vault:      Vault,
  file:       TFile,
  exclusions: string[],
): Promise<void> {
  if (exclusions.some(f => file.path.startsWith(f.replace(/\/?$/, "/")))) return;

  try {
    const content = await vault.cachedRead(file);
    const refs    = parseScriptureRefs(content);

    const seen    = new Set<string>();
    const newKeys: string[] = [];
    const noteMap: Map<string, VerseNote> = new Map();

    for (const ref of refs) {
      const ctx     = extractContext(content, ref.start, ref.end);
      const rangeEnd = ref.verseEnd
        ? Math.min(ref.verseEnd, ref.verseStart + MAX_RANGE_VERSES - 1)
        : ref.verseStart;

      for (let v = ref.verseStart; v <= rangeEnd; v++) {
        const key = `${ref.book} ${ref.chapter}:${v}`;
        if (!seen.has(key)) {
          seen.add(key);
          newKeys.push(key);
          noteMap.set(key, { filePath: file.path, context: ctx });
        }
      }

      for (const v of ref.additionalVerses ?? []) {
        const key = `${ref.book} ${ref.chapter}:${v}`;
        if (!seen.has(key)) {
          seen.add(key);
          newKeys.push(key);
          noteMap.set(key, { filePath: file.path, context: ctx });
        }
      }
    }

    removeFileFromIndex(file.path);
    _fileCache.set(file.path, newKeys);
    for (const key of newKeys) addVerseNote(key, noteMap.get(key)!);
  } catch {
    // Silently skip unreadable files
  }
}

// ── Public build / update API ─────────────────────────────────────────────────

const CHUNK_SIZE = 25;

export async function buildVaultIndex(
  vault:       Vault,
  exclusions:  string[] = [],
  onProgress?: (done: number, total: number) => void,
): Promise<VaultIndex> {
  _index      = new Map();
  _isReady    = false;
  _isScanning = true;
  _fileCache.clear();

  const files = vault.getMarkdownFiles();
  const total = files.length;

  for (let i = 0; i < files.length; i += CHUNK_SIZE) {
    const chunk = files.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map(f => indexFile(vault, f, exclusions)));
    onProgress?.(Math.min(i + CHUNK_SIZE, total), total);
    await new Promise<void>(res => setTimeout(res, 0));
  }

  _isScanning = false;
  _isReady    = true;
  const cbs = _readyCbs.splice(0);
  for (const cb of cbs) cb();

  console.log(
    `ScriptureScribe: vault index ready — ${_index.size} unique verses` +
    ` cited across ${total} notes`
  );
  return _index;
}

export async function updateVaultIndexForFile(
  vault:      Vault,
  file:       TFile,
  exclusions: string[] = [],
): Promise<void> {
  await indexFile(vault, file, exclusions);
}

export function removeVaultIndexFile(filePath: string): void {
  removeFileFromIndex(filePath);
}
