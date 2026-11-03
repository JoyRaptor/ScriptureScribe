import { BIBLE_BOOKS, BOOK_LOOKUP } from "./bibleData";
import verseCounts from "./verseCounts.json";

export interface ScriptureRef {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  chapterEnd?: number;
  chapterOnly?: boolean;
  additionalVerses?: number[];
  raw: string;
  start: number;
  end: number;
}
const counts: Record<string, number[]> = verseCounts;
const metadata = new Map(BIBLE_BOOKS.map(b => [b.name, b]));
const DASH = "[-‐‑‒–—―−﹣－]";
const address = `(\\d{1,3})(?:[:.](\\d{1,3})(?:[abc]|ff?)?)?(?:[ \\t]*${DASH}[ \\t]*(\\d{1,3})(?:[:.](\\d{1,3}))?(?:[abc]|ff?)?)?(?![\\w:])`;
const escapeRE = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const names = new Map(BOOK_LOOKUP);
for (const [alias, book] of BOOK_LOOKUP) {
  const m = alias.match(/^([1234])\s*(.+)$/);
  if (!m) continue;
  const n = Number(m[1]);
  names.set(`${n} ${m[2]}`, book);
  for (const prefix of [["", "I", "II", "III", "IV"][n], ["", "First", "Second", "Third", "Fourth"][n], `${n}${["", "st", "nd", "rd", "th"][n]}`]) {
    names.set(`${prefix.toLowerCase()} ${m[2]}`, book);
  }
}
const bookPattern = [...names.keys()].sort((a, b) => b.length - a.length)
  .map(n => escapeRE(n).replace(/\s+/g, "[ \\t]+")).join("|");
const primaryRE = new RegExp(`\\b(${bookPattern})\\.?([ \\t]*)${address}`, "gi");
const continuationRE = new RegExp(`^[ \\t]*;[ \\t]*${address}`, "i");
const markerRE = new RegExp(`\\b(?:vv?\\.?|ver\\.?|verses?)[ \\t]*(\\d{1,3})(?:[abc]|ff?)?(?:[ \\t]*${DASH}[ \\t]*(\\d{1,3})(?:[abc]|ff?)?)?(?!\\w)`, "g");

/** Preserve offsets and line boundaries while excluding non-prose Markdown. */
export function maskMarkdown(text: string): string {
  const blank = (s: string) => s.replace(/[^\r\n]/g, " ");
  let masked = text.replace(/^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)[^\S\r\n]*(?:\r?\n|$)/, blank);
  masked = masked.replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\1[^\n]*(?:\n|$)|(?![\s\S]))/gm, blank);
  masked = masked.replace(/(`+)[\s\S]*?\1/g, blank);
  masked = masked.replace(/!?\[\[[\s\S]*?\]\]/g, blank);
  masked = masked.replace(/!?\[(?:\\.|[^\]\\])*\]\((?:\\.|[^()\n]|\([^()\n]*\))*\)/g, blank);
  masked = masked.replace(/!?\[(?:\\.|[^\]\\])*\]\[[^\]\n]*\]|^ {0,3}\[[^\]\n]+\]:[^\n]*|<https?:\/\/[^>]+>/gm, blank);
  return masked;
}
export function verseCount(book: string, chapter: number): number {
  return book === "Psalms" && chapter === 151 ? 7 : counts[book]?.[chapter - 1] ?? 0;
}
function valid(ref: ScriptureRef, translation: string): boolean {
  const max = metadata.get(ref.book)?.chapters ?? 0;
  const lxxPsalm = translation === "LXX" && ref.book === "Psalms" && ref.chapter === 151;
  if (ref.chapter < 1 || (ref.chapter > max && !lxxPsalm)) return false;
  const endChapter = ref.chapterEnd ?? ref.chapter;
  if (endChapter < ref.chapter || endChapter > (lxxPsalm ? 151 : max)) return false;
  if (ref.chapterOnly) return true;
  const end = ref.verseEnd ?? ref.verseStart;
  if (ref.verseStart < 1 || end < 1 || (endChapter === ref.chapter && end < ref.verseStart)) return false;
  const startMax = lxxPsalm ? 7 : verseCount(ref.book, ref.chapter);
  const endMax = lxxPsalm ? 7 : verseCount(ref.book, endChapter);
  return (!startMax || ref.verseStart <= startMax) && (!endMax || end <= endMax)
    && !(ref.additionalVerses ?? []).some(v => v < 1 || (startMax > 0 && v > startMax));
}
function makeRef(book: string, a: string[], start: number, end: number, text: string): ScriptureRef {
  const loneVerse = metadata.get(book)?.chapters === 1 && !a[1];
  return {
    book, chapter: loneVerse ? 1 : Number(a[0]),
    verseStart: loneVerse ? Number(a[0]) : Number(a[1] ?? 1),
    chapterOnly: !a[1] && !loneVerse,
    chapterEnd: a[3] || !a[1] && !loneVerse && a[2] ? Number(a[2]) : undefined,
    verseEnd: a[2] && (a[1] || loneVerse) ? Number(a[3] ?? a[2]) : undefined,
    start, end, raw: text.slice(start, end),
  };
}
export function parseScriptureRefs(text: string, translation = "KJV"): ScriptureRef[] {
  const scan = maskMarkdown(text);
  const results: ScriptureRef[] = [];
  primaryRE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = primaryRE.exec(scan))) {
    const book = names.get(m[1].toLowerCase().replace(/\s+/g, " "))!;
    // Unsupported numbered books must not become an unnumbered book.
    if (/\b(?:[1-4]|I{1,3}|IV|First|Second|Third|Fourth|[1-4](?:st|nd|rd|th))[ \t]+$/i.test(scan.slice(Math.max(0, m.index - 14), m.index))) continue;
    if (!m[2] && !m[4]) continue;
    const ref = makeRef(book, m.slice(3, 7), m.index, primaryRE.lastIndex, text);
    if (!valid(ref, translation)) continue;
    if (!ref.chapterOnly && !ref.chapterEnd) {
      let cm: RegExpExecArray | null;
      while ((cm = /^[ \t]*,[ \t]*(\d{1,3})(?=[ \t]*(?:[,;\])}.!?]|$|\r?$))/m.exec(scan.slice(ref.end)))) {
        const v = Number(cm[1]);
        if (v < 1 || (verseCount(book, ref.chapter) && v > verseCount(book, ref.chapter))) break;
        (ref.additionalVerses ??= []).push(v);
        ref.end += cm[0].length;
      }
      ref.raw = text.slice(ref.start, ref.end);
    }
    results.push(ref);
    let cursor = ref.end;
    let cm: RegExpExecArray | null;
    while ((cm = continuationRE.exec(scan.slice(cursor)))) {
      const next = makeRef(book, cm.slice(1, 5), cursor + cm[0].search(/\d/), cursor + cm[0].length, text);
      if (!valid(next, translation)) break;
      results.push(next);
      cursor = next.end;
    }
    primaryRE.lastIndex = cursor;
  }
  const anchors = results.slice();
  let anchor: ScriptureRef | undefined;
  let i = 0;
  markerRE.lastIndex = 0;
  while ((m = markerRE.exec(scan))) {
    while (i < anchors.length && anchors[i].end <= m.index) anchor = anchors[i++];
    if (!anchor || anchors.some(r => r.start <= m!.index && r.end > m!.index)) continue;
    const gap = scan.slice(anchor.end, m.index);
    const anchorLine = scan.slice(scan.lastIndexOf("\n", anchor.start) + 1, anchor.start);
    if (/\n[ \t]*\r?\n|(?:^|\n)[ \t]*#{1,6}[ \t]/.test(gap) || (/\n/.test(gap) && /^\s*#{1,6}\s/.test(anchorLine))) continue;
    const ref: ScriptureRef = { book: anchor.book, chapter: anchor.chapterEnd ?? anchor.chapter,
      verseStart: Number(m[1]), verseEnd: m[2] ? Number(m[2]) : undefined,
      raw: m[0], start: m.index, end: markerRE.lastIndex };
    if (valid(ref, translation)) results.push(ref);
  }
  return results.sort((a, b) => a.start - b.start);
}
/** Expand every selected verse, including chapter and cross-chapter references. */
export function expandRef(ref: ScriptureRef): Array<{ chapter: number; verse: number }> {
  const verses: Array<{ chapter: number; verse: number }> = [];
  const endChapter = ref.chapterEnd ?? ref.chapter;
  for (let chapter = ref.chapter; chapter <= endChapter; chapter++) {
    const start = ref.chapterOnly || chapter > ref.chapter ? 1 : ref.verseStart;
    const end = ref.chapterOnly || chapter < endChapter ? verseCount(ref.book, chapter) : ref.verseEnd ?? ref.verseStart;
    for (let verse = start; verse <= end && verses.length < 5000; verse++) verses.push({ chapter, verse });
  }
  for (const verse of ref.additionalVerses ?? []) if (!verses.some(v => v.chapter === ref.chapter && v.verse === verse)) verses.push({ chapter: ref.chapter, verse });
  return verses;
}
export function refToString(ref: ScriptureRef): string {
  let s = `${ref.book} ${ref.chapter}`;
  if (ref.chapterOnly && ref.chapterEnd) s += `-${ref.chapterEnd}`;
  if (!ref.chapterOnly && ref.verseStart) {
    s += `:${ref.verseStart}`;
    if (ref.verseEnd) s += `-${ref.chapterEnd ? `${ref.chapterEnd}:` : ""}${ref.verseEnd}`;
    if (ref.additionalVerses?.length) s += `,${ref.additionalVerses.join(",")}`;
  }
  return s;
}
export function refToUrlParam(ref: ScriptureRef): string {
  return encodeURIComponent(refToString(ref)).replace(/%20/g, "+");
}
