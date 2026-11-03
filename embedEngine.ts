import { App, Editor, Notice } from "obsidian";
import { ScriptureRef, parseScriptureRefs, refToString } from "./parser";
import { getScripture, VerseResult } from "./fetcher";
import { ScriptureScribeSettings, VERSION_CODES } from "./settings";
import type { EmbedStyle } from "./settings";

// ── Global embed style singleton ──────────────────────────────────────────────
// All embed buttons throughout the plugin read/write this value so that
// changing the style in one place (tooltip dropdown, settings, etc.) is
// reflected everywhere immediately within the session.
let _activeEmbedStyle: EmbedStyle | null = null;
let _cachedCursorOffset: number | null = null;

export function setCachedCursorOffset(offset: number | null): void {
  _cachedCursorOffset = offset;
}

export function clearCachedCursorOffset(): void {
  _cachedCursorOffset = null;
}

/** Returns the last-used embed style, defaulting to settings if none set yet. */
export function getGlobalEmbedStyle(settings: ScriptureScribeSettings): EmbedStyle {
  return _activeEmbedStyle ?? settings.embedding.defaultStyle;
}

/**
 * Updates the active embed style in memory AND persists it to settings.
 * Call this whenever any part of the UI changes the embed style.
 */
export function setGlobalEmbedStyle(
  style: EmbedStyle,
  settings: ScriptureScribeSettings,
  save: () => Promise<void>
): void {
  _activeEmbedStyle = style;
  settings.embedding.defaultStyle = style;
  save();
}

import { getActiveInterlinear } from "./interlinear";
import type { InterlinearWord } from "./interlinear";

/** Resolve by meaning as well as spelling, nearest the editor's saved cursor. */
function findOccurrence(content: string, ref: ScriptureRef): ScriptureRef | null {
  const key = refToString(ref);
  const candidates = parseScriptureRefs(content).filter(r => refToString(r) === key);
  if (!candidates.length) return null;
  const near = _cachedCursorOffset ?? ref.start;
  return candidates.reduce((best, r) => Math.abs(r.start - near) < Math.abs(best.start - near) ? r : best);
}

// ──────────────────────────────────────
// Transformation functions per embed style
// ──────────────────────────────────────

export function buildLink(ref: ScriptureRef, version: string): string {
  const versionCode = VERSION_CODES[version] ?? version;
  const search = encodeURIComponent(refToString(ref));
  const url = `https://www.biblegateway.com/passage/?search=${search}&version=${versionCode}`;
  return `[${refToString(ref)}](${url})`;
}

export function buildTooltipRef(ref: ScriptureRef, verse: VerseResult, footnoteIndex: number): {
  inline: string;
  footnote: string;
} {
  const label = refToString(ref);
  const badge = verse.version ? ` (${verse.version})` : "";
  return {
    inline:   `${label}[^ss${footnoteIndex}]`,
    footnote: `[^ss${footnoteIndex}]: ${verse.text}${badge}`,
  };
}

export function buildQuoteBlock(ref: ScriptureRef, verse: VerseResult): string {
  const label = refToString(ref);
  const badge = verse.version ? `, ${verse.version}` : "";
  const text = verse.formattedText ?? verse.text;
  return `> "${text}"\n> — ${label}${badge}`;
}

// ──────────────────────────────────────
// Interlinear embed
// ──────────────────────────────────────

/**
 * Build a Markdown pipe-table from an interlinear word array.
 *
 * Columns: English | Original | Transliteration | Strong's
 * The Original column uses non-breaking spaces as padding so Hebrew RTL text
 * doesn't disrupt the column alignment in editors that don't support RTL.
 */
export function buildInterlinearTable(ref: ScriptureRef, words: InterlinearWord[]): string {
  const refLabel = refToString(ref);

  // Escape pipe characters that would break the Markdown table
  const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();

  const header    = `| English | Original | Transliteration | Strong's |`;
  const separator = `| --- | --- | --- | --- |`;

  const rows = words
    .filter(w => w.original && w.original !== "—")
    .map(w =>
      `| ${esc(w.english)} | ${esc(w.original)} | ${esc(w.transliteration)} | ${esc(w.strongsNum)} |`
    );

  if (rows.length === 0) return `*No interlinear data for ${refLabel}.*`;

  return [`**${refLabel} — Interlinear**`, "", header, separator, ...rows].join("\n");
}

/**
 * Context-aware embed: if the interlinear panel is currently active for this
 * ref, embed the word grid as a Markdown table. Otherwise fall back to the
 * default verse embed.
 */
export async function embedInterlinear(
  editor: Editor,
  ref: ScriptureRef,
  settings: ScriptureScribeSettings
): Promise<void> {
  const active = getActiveInterlinear();

  if (!active || active.ref !== refToString(ref)) {
    // Interlinear panel is not active or is for a different ref — fall back
    await embedSingleRef(editor, ref, settings.embedding.defaultStyle, settings);
    return;
  }

  const table = buildInterlinearTable(ref, active.words);

  // Insert at cursor position; if the ref raw text is found, replace it
  const content = editor.getValue();
  
  const occurrence = findOccurrence(content, ref);
  const pos = occurrence?.start ?? -1;

  if (pos !== -1) {
    const from = editor.offsetToPos(pos);
    const to   = editor.offsetToPos(occurrence!.end);
    editor.replaceRange("\n\n" + table + "\n", from, to);
  } else {
    // Fallback: insert at cursor
    const cursor = _cachedCursorOffset !== null 
      ? editor.offsetToPos(_cachedCursorOffset)
      : editor.getCursor();
    editor.replaceRange("\n\n" + table + "\n", cursor);
  }

  clearCachedCursorOffset();
  new Notice(`ScriptureScribe: Interlinear table for ${refToString(ref)} embedded.`);
}

// ──────────────────────────────────────
// Single-reference embed
// ──────────────────────────────────────

/**
 * Inserts a formatted scripture embed AT THE CURSOR POSITION in the editor.
 * Use this when the ref was NOT typed in the document (e.g. panel swipe,
 * drawer embed button). It never tries to find/replace text — it just
 * inserts at wherever the cursor currently is, then adds a trailing newline
 * so successive embeds stack cleanly.
 */
export async function embedAtCursor(
  editor: Editor,
  ref: ScriptureRef,
  style: EmbedStyle,
  settings: ScriptureScribeSettings
): Promise<void> {
  const verse = await getScripture(ref, settings);

  const cursor = _cachedCursorOffset !== null
    ? editor.offsetToPos(_cachedCursorOffset)
    : editor.getCursor();

  const lineText    = editor.getLine(cursor.line) ?? "";
  const beforeCursor = lineText.slice(0, cursor.ch);
  const afterCursor  = lineText.slice(cursor.ch);
  // True when the cursor is the only non-whitespace content on the line
  const isOnOwnLine = beforeCursor.trim().length === 0 && afterCursor.trim().length === 0;

  let text: string;
  if (style === "link") {
    text = buildLink(ref, settings.primaryTranslation);
  } else if (style === "tooltip") {
    // Build proper footnote and append it to the document
    const docText = editor.getValue();
    const existingFootnotes = (docText.match(/^\[\^ss\d+\]:/gm) ?? []).length;
    const idx = existingFootnotes + 1;
    const { inline, footnote } = buildTooltipRef(ref, verse, idx);
    text = inline;
    // Append footnote at end of document
    const endPos = editor.offsetToPos(docText.length);
    editor.replaceRange(`\n${footnote}`, endPos);
  } else {
    // Context-aware: blockquote when cursor is alone on a line, inline quote otherwise
    if (isOnOwnLine) {
      text = buildQuoteBlock(ref, verse);
    } else {
      const badge = verse.version ? `, ${verse.version}` : "";
      text = `\u201c${verse.text}\u201d (${refToString(ref)}${badge})`;
    }
  }

  // Add a separating blank line if we're inserting mid-paragraph
  const prefix = (!isOnOwnLine && beforeCursor.trim().length > 0) ? "\n\n" : "";
  const insertedText = prefix + text + "\n\n";

  editor.replaceRange(insertedText, cursor);

  // Advance cursor to end of inserted block so consecutive embeds flow downward
  const linesAdded = insertedText.split("\n").length - 1;
  const lastLineLength = insertedText.split("\n").pop()!.length;
  const newCursor = {
    line: cursor.line + linesAdded,
    ch: linesAdded > 0 ? lastLineLength : cursor.ch + lastLineLength,
  };
  editor.setCursor(newCursor);

  clearCachedCursorOffset();
  new Notice(`ScriptureScribe: Embedded ${refToString(ref)}.`);
}

export async function embedSingleRef(
  editor: Editor,
  ref: ScriptureRef,
  style: EmbedStyle,
  settings: ScriptureScribeSettings
): Promise<void> {
  const verse = await getScripture(ref, settings);

  // Find and replace the raw text in the editor
  const content = editor.getValue();
  
  const occurrence = findOccurrence(content, ref);
  const pos = occurrence?.start ?? -1;
  if (pos === -1) {
    new Notice("ScriptureScribe: Could not locate reference in document.");
    clearCachedCursorOffset();
    return;
  }

  const from = editor.offsetToPos(pos);
  const to   = editor.offsetToPos(occurrence!.end);

  let replacement: string;

  if (style === "link") {
    replacement = buildLink(ref, settings.primaryTranslation);
  } else if (style === "tooltip") {
    // Count existing footnotes to avoid collision
    const docText = editor.getValue();
    const existingFootnotes = (docText.match(/^\[\^ss\d+\]:/gm) ?? []).length;
    const idx = existingFootnotes + 1;
    const { inline, footnote } = buildTooltipRef(ref, verse, idx);
    replacement = inline;

    // Append footnote to end of document
    const endPos = editor.offsetToPos(docText.length);
    editor.replaceRange(`\n${footnote}`, endPos);
  } else {
    const lineText = editor.getLine(from.line);
    const isAtStart = lineText.slice(0, from.ch).trim().length === 0;
    const isAtEnd = lineText.slice(to.ch).trim().length === 0;
    const isInline = !isAtStart || !isAtEnd;
    
    if (isInline) {
      const badge = verse.version ? `, ${verse.version}` : "";
      replacement = `“${verse.text}” (${refToString(ref)}${badge})`;
    } else {
      replacement = buildQuoteBlock(ref, verse);
    }
  }

  editor.replaceRange(replacement, from, to);
  clearCachedCursorOffset();
}

// ──────────────────────────────────────
// "Embed All" — document-wide operation
// ──────────────────────────────────────

export async function embedAllRefs(
  editor: Editor,
  style: EmbedStyle,
  settings: ScriptureScribeSettings,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const content = editor.getValue();
  const refs = parseScriptureRefs(content);

  if (refs.length === 0) {
    new Notice("ScriptureScribe: No scripture references found in this document.");
    return;
  }

  // Collect all replacements first (to handle offset shifting correctly)
  const replacements: Array<{ start: number; end: number; replacement: string }> = [];
  const footnotes: string[] = [];
  let footnoteBase = (content.match(/^\[\^ss\d+\]:/gm) ?? []).length;

  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i];
    onProgress?.(i + 1, refs.length);

    const verse = await getScripture(ref, settings);
    let replacement: string;

    if (style === "link") {
      replacement = buildLink(ref, settings.primaryTranslation);
    } else if (style === "tooltip") {
      const idx = footnoteBase + footnotes.length + 1;
      const { inline, footnote } = buildTooltipRef(ref, verse, idx);
      replacement = inline;
      footnotes.push(footnote);
    } else {
      const from = editor.offsetToPos(ref.start);
      const to = editor.offsetToPos(ref.end);
      const lineText = editor.getLine(from.line);
      const isAtStart = lineText.slice(0, from.ch).trim().length === 0;
      const isAtEnd = lineText.slice(to.ch).trim().length === 0;
      const isInline = !isAtStart || !isAtEnd;
      
      if (isInline) {
        const badge = verse.version ? `, ${verse.version}` : "";
        replacement = `“${verse.text}” (${refToString(ref)}${badge})`;
      } else {
        replacement = buildQuoteBlock(ref, verse);
      }
    }

    replacements.push({ start: ref.start, end: ref.end, replacement });
  }

  // Apply replacements in reverse order (so offsets remain valid)
  let updated = content;
  for (let i = replacements.length - 1; i >= 0; i--) {
    const { start, end, replacement } = replacements[i];
    updated = updated.slice(0, start) + replacement + updated.slice(end);
  }

  // Append footnotes for tooltip style
  if (footnotes.length > 0) {
    updated += "\n\n" + footnotes.join("\n");
  }

  if (editor.getValue() !== content) {
    new Notice("ScriptureScribe: the note changed while passages loaded. Run Embed All again.");
    return;
  }
  // Apply as a single transaction (one undo step)
  editor.setValue(updated);
  new Notice(`ScriptureScribe: Embedded ${refs.length} reference${refs.length === 1 ? "" : "s"}.`);
}
