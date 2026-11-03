/**
 * defHelpers.ts — Lexicon Definition Parser
 *
 * Handles STEPBible-format Strong's definitions:
 * Hebrew (BDB):  1) 1a) 1a1) numbering with verbal-stem markers (Qal) etc.
 * Greek (Thayer): __1. __(a) section markers, prose with inline verse lists
 *
 * Simple mode:   2–4 semantic bullets. No verse refs, no grammar jargon.
 * Aimed at the engaged lay reader.
 * Advanced mode: Full scholarly hierarchy. Interactive chips for verse refs
 * and Strong's cross-references. Verbal-stem badges. Tech
 * abbreviation highlighting.
 */

import { requestUrl } from "obsidian";

// ── Colors (on the lavender card background #EEEDFE) ────────────────────────────────────────────────────
let P   = "#534AB7";   // purple accent
let PL  = "#EEEDFE";   // lavender bg (card background)
let PM  = "#AFA9EC";   // mid purple
let PD  = "#3C3489";   // dark purple
let PX  = "#3C3489";   // text-on-light: readable accent ON the pale card bg

export function setDefPalette(p: string, pl: string, pm: string, pd: string, px?: string) {
  P = p; PL = pl; PM = pm; PD = pd;
  PX = px ?? pd;  // fall back to PD if not supplied
}

// ON_CARD_* values are intentionally dark-on-light because definition cards always
// use PL (the palette's near-white/light tint) as their background.
// They are constants, not CSS vars, because the card background is always light.
const ON_CARD_BODY   = "#1a1a2e";  // deep navy — high contrast on light card bg
const ON_CARD_MUTED  = "#5a5a7a";  // mid-grey-purple — secondary text on light card bg
const ON_CARD_ACCENT = "#534AB7";  // purple — outline markers, section heads


// ── Shared mode state ─────────────────────────────────────────────────────────
let _defAdvanced = false;
export function isDefAdvanced(): boolean    { return _defAdvanced; }
export function setDefAdvanced(v: boolean): void { _defAdvanced = v; }
export function toggleDefAdvanced(): boolean { _defAdvanced = !_defAdvanced; return _defAdvanced; }

// ── Callback interface ────────────────────────────────────────────────────────
export interface DefCallbacks {
  /** Called when a verse-reference chip is clicked. rawRef e.g. "Mat.7:7" */
  onVerseRef?:   (rawRef: string) => void;
  /** Called when a Strong's-number chip is clicked. e.g. "G25" */
  onStrongsNum?: (num: string)    => void;
  /** Return KJV verse text for hover preview, or null if unavailable */
  getVerseText?: (rawRef: string) => string | null;
}

// ── BLB page link (globe icon) ──────────────────────────────────────────────
export function makeGlobeLink(strongsNum: string): HTMLElement {
  const isGreek = /^[Gg]/.test(strongsNum);
  const id      = strongsNum.toLowerCase().replace(/^[gh]0*/, m => m[0]);
  const url     = isGreek
    ? `https://www.blueletterbible.org/lexicon/${id}/kjv/tr/0-1/`
    : `https://www.blueletterbible.org/lexicon/${id}/kjv/wlc/0-1/`;

  const btn = document.createElement("button");
  btn.title = `Open in Blue Letter Bible · ${strongsNum.toUpperCase()}`;
  btn.style.cssText = `
    display:inline-flex; align-items:center; justify-content:center;
    width:20px; height:20px; border-radius:3px; flex-shrink:0;
    color:${PX}; opacity:0.65; cursor:pointer; margin-left:2px;
    background:none; border:none; padding:0;
    box-shadow:none; outline:none;
    transition:opacity 0.12s, color 0.12s;
  `;
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    width="13" height="13">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>`;
  btn.addEventListener("mouseenter", () => { btn.style.opacity = "1"; btn.style.color = P; });
  btn.addEventListener("mouseleave", () => { btn.style.opacity = "0.65"; btn.style.color = PX; });
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    window.open(url, "_blank", "noopener,noreferrer");
  });
  return btn;
}

// ── Pronunciation audio (Google Translate TTS) ────────────────────────────────
// Google Translate's TTS endpoint speaks the actual Greek/Hebrew word naturally.
// Works cross-platform (Windows, Android, iOS) without installed language packs.
// Uses requestUrl (Obsidian main-process) to bypass CORS, plays via blob URL.

let _activeTTSBlob: string | null = null;
let _activeTTSAudio: HTMLAudioElement | null = null;

export function makeSpeakerLink(strongsNum: string, originalWord?: string, transliteration?: string): HTMLElement {
  const isGreek = /^[Gg]/.test(strongsNum);
  const numOnly = strongsNum.replace(/^[GgHh]0*/, "");
  const lang    = isGreek ? "el" : "he";

  const pageId  = strongsNum.toLowerCase().replace(/^[gh]0*/, m => m[0]);
  const pageUrl = isGreek
    ? `https://www.blueletterbible.org/lexicon/${pageId}/kjv/tr/0-1/`
    : `https://www.blueletterbible.org/lexicon/${pageId}/kjv/wlc/0-1/`;

  const btn = document.createElement("button");
  btn.title = `Hear pronunciation · ${isGreek ? "G" : "H"}${numOnly}`;
  btn.style.cssText = `display:inline-flex;align-items:center;justify-content:center;
    width:20px;height:20px;border-radius:3px;flex-shrink:0;
    color:${PX};opacity:0.65;cursor:pointer;margin-left:4px;
    background:none;border:none;padding:0;box-shadow:none;outline:none;
    transition:opacity 0.12s,color 0.12s;`;

  const speakerSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
  const spinnerSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="13" height="13" style="animation:ss-spin 0.7s linear infinite;"><circle cx="12" cy="12" r="9" stroke-dasharray="28 56"/></svg>`;

  if (!document.getElementById("ss-spin-kf")) {
    const s = document.createElement("style"); s.id = "ss-spin-kf";
    s.textContent = `@keyframes ss-spin{to{transform:rotate(360deg)}}`;
    document.head.appendChild(s);
  }

  btn.innerHTML = speakerSVG;
  btn.addEventListener("mouseenter", () => { btn.style.opacity = "1"; btn.style.color = P; });
  btn.addEventListener("mouseleave", () => { btn.style.opacity = "0.65"; btn.style.color = PX; });

  btn.addEventListener("click", async (e) => {
    e.stopPropagation();

    // Stop any currently playing audio
    if (_activeTTSAudio) { _activeTTSAudio.pause(); _activeTTSAudio = null; }
    if (_activeTTSBlob)  { URL.revokeObjectURL(_activeTTSBlob); _activeTTSBlob = null; }

    // Pick what to speak: prefer original Greek/Hebrew chars; fall back to
    // transliteration if original is ASCII-only (English gloss in wrong field)
    const hasNonAscii = /[^\x00-\x7F]/.test(originalWord ?? "");
    const word = hasNonAscii
      ? (originalWord?.trim() ?? "")
      : (transliteration?.trim() || originalWord?.trim() || numOnly);
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(word)}&tl=${lang}&client=tw-ob&ttsspeed=0.8`;

    btn.innerHTML = spinnerSVG;
    btn.style.opacity = "1";

    try {
      const resp = await requestUrl({
        url: ttsUrl,
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer":    "https://translate.google.com/",
          "Accept":     "audio/mpeg, audio/*;q=0.9",
        },
        throw: false,
      });

      if (resp.status < 200 || resp.status >= 300) throw new Error(`HTTP ${resp.status}`);

      const blob    = new Blob([resp.arrayBuffer], { type: "audio/mpeg" });
      const blobUrl = URL.createObjectURL(blob);
      _activeTTSBlob  = blobUrl;

      const audio = new Audio(blobUrl);
      _activeTTSAudio = audio;
      btn.innerHTML = speakerSVG;
      await audio.play();

      audio.onended = () => {
        btn.style.opacity = "0.65"; btn.style.color = PX;
        _activeTTSAudio = null;
        URL.revokeObjectURL(blobUrl); _activeTTSBlob = null;
      };
    } catch {
      btn.innerHTML = speakerSVG;
      btn.style.opacity = "0.65";
      window.open(pageUrl, "_blank", "noopener,noreferrer");
    }
  });

  return btn;
}


// ── Hover preview (module singleton) ─────────────────────────────────────────



let _previewEl: HTMLElement | null = null;

function showRefPreview(anchor: HTMLElement, text: string): void {
  _previewEl?.remove();
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText = `
    position:fixed; z-index:10002; pointer-events:none;
    max-width:260px; padding:7px 10px;
    background:var(--background-primary);
    border:1px solid ${PM};
    border-radius:6px; box-shadow:0 4px 18px rgba(0,0,0,0.22);
    font-size:11px; line-height:1.65; color:var(--text-normal);
    font-style:italic;
  `;
  document.body.appendChild(el);
  _previewEl = el;
  const r  = anchor.getBoundingClientRect();
  let left = r.left;
  let top  = r.bottom + 6;
  if (left + 268 > window.innerWidth - 8)  left = window.innerWidth - 276;
  if (top  + 76  > window.innerHeight - 8) top  = r.top - 82;
  el.style.left = `${Math.max(8, left)}px`;
  el.style.top  = `${Math.max(8, top)}px`;
}

function hideRefPreview(): void { _previewEl?.remove(); _previewEl = null; }

// ── Format detection ──────────────────────────────────────────────────────────
function isGreekEntry(raw: string): boolean {
  // Greek Thayer entries use __ section markers or start with a Greek word
  return raw.includes("__") || /^[\u0370-\u03FF\u1F00-\u1FFF]/.test(raw.trim());
}

// ── Aggressive cleaning helpers ───────────────────────────────────────────────

// Strips ALL verse references (for simple mode)
const VERSE_STRIP_RE = /\b[123]?\s?[A-Za-z]{2,8}\.?\s*\d{1,3}:\d{1,3}(?:-\d{1,3})?(?:[,;]\s*(?:\d+:)?\d+(?:-\d+)?)*\b/g;

// Strips scholarly parenthetical notes: (MM, VGT, see word) (LS, ) (Arist.) etc.
const SCHOLAR_PAREN_RE = /\([^)]*(?:MM|VGT|LS|Arist|Plat|Thuc|Hdt|Cremer|Lft|Westc|Tr|Syn|Field|Milligan|LAE|NTD|Deiss|Eutherford|Rutherford|Diod|Polyb|Bl)[^)]*\)/gi;

// Grammar qualifiers to strip in simple mode
const GRAM_STRIP_RE = /\b(?:absol\.|in late writers|(?:with|before)\s+(?:accusative|genitive|dative|inf\.|dupl\.)[^;,]*|(?:with)\s+(?:εἰς|ἀπό|παρά|πρός|ὅτι|πῶς|τί|ἵνα|ἐν\s+τ)[^;,]*|of (?:persons?|things?)[,;][^;]*|see M[, .][^;]*|see MM[^;]*)\b/gi;

function cleanShared(raw: string): string {
  return raw
    .replace(/\(AS\)|\(ML\)|[†*✝]/g, "")
    .replace(/\[in LXX[^\]]*\]/gi, "")
    .replace(/<BR\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanForSimple(raw: string): string {
  return cleanShared(raw)
    .replace(/SYN\.:.+$/s, "")
    .replace(/Aramaic (?:equivalent|of|for)[^.]*\.?\s*/is, "")
    .replace(/Also (?:means|named|called)[^.]*\.?\s*/is, "")
    .replace(/§[^\n]*/g, "")
    .replace(/__/g, "")                   // ← strip __ section markers
    .replace(VERSE_STRIP_RE, "")          // ← strip all verse refs
    .replace(SCHOLAR_PAREN_RE, "")        // ← strip scholarly parens
    .replace(/\(cf\.[^)]*\)/gi, "")
    .replace(/\(see [^)]*\)/gi, "")
    .replace(/\s*[,;]\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ── Simple mode ───────────────────────────────────────────────────────────────

/** Plain-text version — used for search-results preview (sets textContent). */
export function buildSimpleDefinition(raw: string): string {
  const points = extractSimplePoints(raw);
  return points.length ? points.join("; ") : raw.slice(0, 100).replace(/<[^>]+>/g, "").trim();
}

/** DOM version — used in definition drawer. */
export function buildSimpleDom(container: HTMLElement, raw: string): void {
  container.innerHTML = "";
  const points = extractSimplePoints(raw);

  if (!points.length) {
    const fallback = document.createElement("span");
    fallback.textContent = raw.slice(0, 120).replace(/<[^>]+>/g, "").trim();
    fallback.style.cssText = `font-size:11.5px; color:${ON_CARD_BODY}; line-height:1.65;`;
    container.appendChild(fallback);
    return;
  }

  for (const pt of points) {
    const row = document.createElement("div");
    row.style.cssText = "display:flex; align-items:baseline; gap:7px; padding:2px 0; line-height:1.65;";

    const bullet = document.createElement("span");
    bullet.textContent = "•";
    bullet.style.cssText = `color:${ON_CARD_ACCENT}; font-size:11px; flex-shrink:0; opacity:0.7;`;
    row.appendChild(bullet);

    const text = document.createElement("span");
    text.textContent = pt;
    text.style.cssText = `font-size:11.5px; color:${ON_CARD_BODY}; flex:1;`;
    row.appendChild(text);

    container.appendChild(row);
  }
}

function extractSimplePoints(raw: string): string[] {
  const cleaned = cleanForSimple(raw);
  return isGreekEntry(raw) ? extractGreekSimple(cleaned) : extractHebrewSimple(cleaned);
}

function extractGreekSimple(text: string): string[] {
  // Strip grammar qualifiers
  let t = text.replace(GRAM_STRIP_RE, "");

  // Check if there are Roman-numeral or numeric section markers
  const hasSections = /\s+(?:[IVX]+\.|[0-9]+\.)\s/.test(t);

  const results: string[] = [];

  if (hasSections) {
    // Split on Roman-numeral or numeric section starters
    const parts = t.split(/\s+(?=[IVX]+\.\s|[0-9]+\.\s)/);
    for (const part of parts) {
      if (!part.trim()) continue;
      const meaning = part
        .replace(/^[IVX]+\.\s*|^[0-9]+\.\s*/, "")   // strip section num
        .replace(/\(a\)\s*|\(b\)\s*|\(c\)\s*/g, " ") // flatten subsections
        .split(/[;]/)[0]                               // first clause only
        .replace(/[,;:\s]+$/, "")
        .trim();
      if (meaning.length > 5 && meaning.length < 110) results.push(meaning);
      if (results.length >= 4) break;
    }
  } else {
    // Prose format — take first clause, then Mid. clause if present
    const firstClause = t.split(/:\s*(?:absol\.|with acc|before |with dat|Mid\.)/i)[0]
      .split(/[;]/)[0]
      .replace(/[,;:\s]+$/, "")
      .trim();
    if (firstClause.length > 3) results.push(firstClause);

    // Extract Mid. (middle voice) meaning
    const midMatch = t.match(/\bMid\.\b[^:]*:([^;.]+)/i);
    if (midMatch) {
      const mid = midMatch[1].replace(GRAM_STRIP_RE, "").replace(/[,;:\s]+$/, "").trim();
      if (mid.length > 5 && mid !== firstClause) results.push("(Middle voice) " + mid);
    }
  }
  return results;
}

function extractHebrewSimple(text: string): string[] {
  const results: string[] = [];
  // Match top-level items: "1) meaning 2) meaning"
  // Stops before sub-items like "1a)"
  const RE = /\b(\d)\)\s+([\s\S]+?)(?=\s+\d\)|$)/g;
  let m: RegExpExecArray | null;
  RE.lastIndex = 0;
  while ((m = RE.exec(text)) !== null && results.length < 4) {
    let chunk = m[2]
      // strip sub-items
      .replace(/\s+\d[a-z]\d*\)\s+[\s\S]+?(?=\s+\d[a-z]?\d*\)|$)/g, "")
      // strip verbal stems
      .replace(/\(\s*(?:Qal|Niphal|Piel|Pual|Hiphil|Hophal|Hithpael|Aphel|P'al|Peal|Ithpeel|Ithpaal)\s*\)/gi, "")
      .replace(/\(fig\.\)|\(spec\.\)/gi, "")
      .split(/;/)[0]
      .trim()
      .replace(/[-–,]\s*$/, "")
      .trim();
    if (chunk.length > 2) results.push(chunk);
  }

  if (!results.length) {
    // fallback: semicolons
    return text.split(/;\s+/).slice(0, 4)
      .map(s => s.trim()).filter(s => s.length > 2 && s.length < 100);
  }
  return results;
}

// ── Advanced mode ─────────────────────────────────────────────────────────────

// Tokenizer patterns: Note the optional dot `\.?` to support "Act." and "Mrk"
const ADV_VERSE_RE   = /\b([123]?\s?[A-Za-z]{2,8})\.?\s*(\d{1,3}:\d{1,3}(?:-\d{1,3})?)\b/g;
const ADV_STRONGS_RE = /\b([GH]\d{1,4}[a-z]?)\b/g;
const STEM_RE        = /\(\s*(Qal|Niphal|Piel|Pual|Hiphil|Hophal|Hithpael|P'al|Aphel|Peal|Shafel|Pael|Ithpeel|Ithpaal)\s*\)/g;
const TECH_RE        = /\b(absol\.|intrans\.|trans\.|pass\.|act\.|cl\.|cf\.|q\.v\.|spec\.|fig\.|al\.)\s*/g;
// Greek __ section patterns
const GREEK_SECT_RE  = /__([IVX]+\.|[0-9]+\.)\s*/g;
const GREEK_SUB_RE   = /__\(([a-z])\)\s*/g;
const GREEK_SYN_RE   = /\s*SYN\.:[\s\S]+$/;
const LXX_INLINE_RE  = /\[in LXX[^\]]*\]/gi;

export function buildAdvancedDefinition(
  container: HTMLElement,
  raw: string,
  callbacks?: DefCallbacks,
): void {
  container.innerHTML = "";
  if (isGreekEntry(raw)) {
    buildGreekAdvanced(container, raw, callbacks);
  } else {
    buildHebrewAdvanced(container, raw, callbacks);
  }
}

// ── Greek advanced ────────────────────────────────────────────────────────────

function buildGreekAdvanced(
  container: HTMLElement,
  raw: string,
  cbs?: DefCallbacks,
): void {
  let text = raw
    .replace(/\(AS\)|\(ML\)|[†*✝]/g, "")
    .replace(/<BR\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();

  // Pull out LXX note → dim header
  const lxxMatch = LXX_INLINE_RE.exec(text);
  if (lxxMatch) {
    const lxxEl = document.createElement("div");
    lxxEl.textContent = lxxMatch[0].replace(/^\[|\]$/g, "").trim();
    lxxEl.style.cssText = `
      font-size:9.5px; color:${ON_CARD_MUTED}; font-style:italic;
      margin-bottom:6px; opacity:0.8; line-height:1.4;
      padding-bottom:4px; border-bottom:1px solid ${PM}33;
    `;
    container.appendChild(lxxEl);
    text = text.replace(LXX_INLINE_RE, "").trim();
  }

  // Pull out SYN section
  const synMatch = GREEK_SYN_RE.exec(text);
  const synText  = synMatch ? synMatch[0].trim() : "";
  if (synText) text = text.replace(GREEK_SYN_RE, "").trim();
  text = text.replace(/[†*]\s*$/, "").trim();

  // Remove the opening word form (e.g. "αἰτέω, -ῶ, [...]" before the first meaning)
  // This is the inflected form at the start — strip up to first comma+space after Greek chars
  text = text.replace(/^[\p{Script=Greek}\p{Script=Hebrew}\s,\-–()\u0300-\u036f\u1F00-\u1FFF]+,\s*/u, "");

  // Split on __ major sections and __(a) subsections
  // First, collect all markers and their positions
  interface Sect { marker: string; level: 1 | 2; pos: number; bodyStart: number }
  const sects: Sect[] = [];

  // Reset regexes
  GREEK_SECT_RE.lastIndex = 0;
  GREEK_SUB_RE.lastIndex  = 0;

  let m: RegExpExecArray | null;
  while ((m = GREEK_SECT_RE.exec(text)) !== null)
    sects.push({ marker: m[1].replace(".", ""), level: 1, pos: m.index, bodyStart: m.index + m[0].length });
  while ((m = GREEK_SUB_RE.exec(text)) !== null)
    sects.push({ marker: `(${m[1]})`, level: 2, pos: m.index, bodyStart: m.index + m[0].length });

  sects.sort((a, b) => a.pos - b.pos);

  if (!sects.length) {
    // Plain prose — no section markers
    const bodyEl = document.createElement("div");
    bodyEl.style.cssText = `font-size:11px; color:${ON_CARD_BODY}; line-height:1.75;`;
    appendInlineTokens(bodyEl, text.trim(), cbs);
    container.appendChild(bodyEl);
  } else {
    // Render preamble (text before first section)
    const preamble = text.slice(0, sects[0].pos).trim();
    if (preamble.length > 2) {
      const pre = document.createElement("div");
      pre.style.cssText = `font-size:11px; color:${ON_CARD_MUTED}; font-style:italic; margin-bottom:5px;`;
      pre.textContent = preamble;
      container.appendChild(pre);
    }

    for (let i = 0; i < sects.length; i++) {
      const sect  = sects[i];
      const nextP = i + 1 < sects.length ? sects[i + 1].pos : text.length;
      const body  = text.slice(sect.bodyStart, nextP).trim();

      // Separator above top-level sections (except first)
      if (sect.level === 1 && i > 0) {
        const sep = document.createElement("div");
        sep.style.cssText = `height:1px; background:${PM}; opacity:0.18; margin:5px 0 3px;`;
        container.appendChild(sep);
      }

      const row = document.createElement("div");
      row.style.cssText = `
        display:flex; align-items:flex-start; gap:5px;
        padding:${sect.level === 1 ? "2px 0 1px" : "1px 0"};
        padding-left:${sect.level === 2 ? "14px" : "0"};
        line-height:1.7;
      `;

      // Marker
      const mk = document.createElement("span");
      mk.textContent = sect.marker;
      mk.style.cssText = `
        font-size:${sect.level === 1 ? "10.5px" : "9.5px"}; font-weight:700;
        color:${sect.level === 1 ? ON_CARD_ACCENT : PM}; flex-shrink:0;
        min-width:${sect.level === 1 ? "20px" : "16px"};
        padding-top:1px; opacity:${sect.level === 1 ? "0.85" : "0.65"};
      `;
      row.appendChild(mk);

      const bodyEl = document.createElement("span");
      bodyEl.style.cssText = `
        flex:1; min-width:0;
        font-size:${sect.level === 1 ? "11.5px" : "11px"};
        font-weight:${sect.level === 1 ? "500" : "400"};
        color:${ON_CARD_BODY}; line-height:inherit;
      `;
      appendInlineTokens(bodyEl, body, cbs);
      row.appendChild(bodyEl);
      container.appendChild(row);
    }
  }

  // SYN footer
  if (synText) {
    const sep = document.createElement("div");
    sep.style.cssText = `height:1px; background:${PM}; opacity:0.2; margin:6px 0 4px;`;
    container.appendChild(sep);
    const synEl = document.createElement("div");
    synEl.style.cssText = `font-size:10px; color:${ON_CARD_MUTED}; font-style:italic; line-height:1.5;`;
    appendInlineTokens(synEl, synText, cbs);
    container.appendChild(synEl);
  }
}

// ── Hebrew advanced ───────────────────────────────────────────────────────────

function buildHebrewAdvanced(
  container: HTMLElement,
  raw: string,
  cbs?: DefCallbacks,
): void {
  let text = raw
    .replace(/\(AS\)|\(ML\)|[†*✝]/g, "")
    .replace(/<BR\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .trim();

  // Pull Aramaic tail into footer
  let aramNote = "";
  const aramIdx = text.search(/\s+(?:Aramaic (?:equivalent|of|for)|Also means:)/i);
  if (aramIdx > 0) { aramNote = text.slice(aramIdx).trim(); text = text.slice(0, aramIdx).trim(); }

  // Parse hierarchy: 1) 1a) 1a1) etc.
  interface HItem { marker: string; level: 0|1|2; pos: number; bodyStart: number }
  const items: HItem[] = [];
  // Match numeric items: "1)" "2)" = level 0
  // Alpha-sub: "1a)" "1b)" = level 1
  // Deep: "1a1)" "1a2)" = level 2
  const HIER_RE = /\b(\d+[a-z]?\d*)\)\s/g;
  let hm: RegExpExecArray | null;
  HIER_RE.lastIndex = 0;
  while ((hm = HIER_RE.exec(text)) !== null) {
    const mk = hm[1];
    const level: 0|1|2 = /^\d+$/.test(mk) ? 0 : /^\d+[a-z]$/.test(mk) ? 1 : 2;
    items.push({ marker: mk, level, pos: hm.index, bodyStart: hm.index + hm[0].length });
  }

  if (!items.length) {
    // Plain text fallback
    const el = document.createElement("div");
    el.style.cssText = `font-size:11px; color:${ON_CARD_BODY}; line-height:1.7;`;
    appendInlineTokens(el, text, cbs);
    container.appendChild(el);
  } else {
    for (let i = 0; i < items.length; i++) {
      const item  = items[i];
      const nextP = i + 1 < items.length ? items[i + 1].pos : text.length;
      const body  = text.slice(item.bodyStart, nextP).trim();

      // Separator above top-level items (except first)
      if (item.level === 0 && i > 0) {
        const sep = document.createElement("div");
        sep.style.cssText = `height:1px; background:${PM}; opacity:0.13; margin:4px 0 2px;`;
        container.appendChild(sep);
      }

      const row = document.createElement("div");
      row.style.cssText = `
        display:flex; align-items:flex-start; gap:5px;
        padding:${item.level === 0 ? "2px 0" : "1px 0"};
        padding-left:${item.level === 1 ? "14px" : item.level === 2 ? "26px" : "0"};
        line-height:1.65;
      `;

      const mk = document.createElement("span");
      mk.textContent = `${item.marker})`;
      mk.style.cssText = `
        font-size:${item.level === 0 ? "10.5px" : "9px"}; font-weight:700;
        color:${item.level === 0 ? ON_CARD_ACCENT : PM}; flex-shrink:0;
        min-width:${item.level === 0 ? "20px" : "16px"};
        opacity:${item.level === 0 ? "0.85" : "0.6"}; padding-top:1px;
      `;
      row.appendChild(mk);

      const bodyEl = document.createElement("span");
      bodyEl.style.cssText = `
        flex:1; min-width:0;
        font-size:${item.level === 0 ? "11.5px" : item.level === 1 ? "11px" : "10.5px"};
        font-weight:${item.level === 0 ? "500" : "400"};
        color:${ON_CARD_BODY}; line-height:inherit;
      `;
      appendInlineHebrew(bodyEl, body, cbs);
      row.appendChild(bodyEl);
      container.appendChild(row);
    }
  }

  // Aramaic footer
  if (aramNote) {
    const sep = document.createElement("div");
    sep.style.cssText = `height:1px; background:${PM}; opacity:0.2; margin:6px 0 4px;`;
    container.appendChild(sep);
    const el = document.createElement("div");
    el.style.cssText = `font-size:10px; color:${ON_CARD_MUTED}; font-style:italic; line-height:1.5;`;
    appendInlineTokens(el, aramNote, cbs);
    container.appendChild(el);
  }
}

// ── Inline tokenizer (shared by Greek and Hebrew bodies) ─────────────────────

type TokKind = "verse" | "strongs" | "stem" | "tech" | "text";
interface Tok { start: number; end: number; kind: TokKind; val: string }

function collectTokens(text: string): Tok[] {
  const toks: Tok[] = [];
  const addIfNoOverlap = (t: Tok) => {
    const over = toks.some(x => t.start < x.end && t.end > x.start);
    if (!over) toks.push(t);
  };

  ADV_VERSE_RE.lastIndex = 0; ADV_STRONGS_RE.lastIndex = 0;
  STEM_RE.lastIndex = 0; TECH_RE.lastIndex = 0;

  let m: RegExpExecArray | null;
  // Use group 1 and 2 to reassemble without space gaps
  while ((m = ADV_VERSE_RE.exec(text))   !== null) addIfNoOverlap({ start: m.index, end: m.index+m[0].length, kind:"verse",   val: `${m[1]} ${m[2]}` });
  while ((m = ADV_STRONGS_RE.exec(text)) !== null) addIfNoOverlap({ start: m.index, end: m.index+m[0].length, kind:"strongs", val:m[0] });
  while ((m = STEM_RE.exec(text))        !== null) addIfNoOverlap({ start: m.index, end: m.index+m[0].length, kind:"stem",    val:m[1] });
  while ((m = TECH_RE.exec(text))        !== null) addIfNoOverlap({ start: m.index, end: m.index+m[0].length, kind:"tech",    val:m[0].trim() });

  return toks.sort((a, b) => a.start - b.start);
}

function appendInlineTokens(container: HTMLElement, text: string, cbs?: DefCallbacks): void {
  const toks = collectTokens(text);
  let cursor = 0;
  for (const tok of toks) {
    if (tok.start > cursor) container.appendChild(document.createTextNode(text.slice(cursor, tok.start)));
    switch (tok.kind) {
      case "verse":   container.appendChild(makeVerseChip(tok.val, cbs));   break;
      case "strongs": container.appendChild(makeStrongsChip(tok.val, cbs)); break;
      case "stem":    container.appendChild(makeStemBadge(tok.val));        break;
      case "tech":    container.appendChild(makeTechSpan(tok.val));         break;
    }
    cursor = tok.end;
  }
  if (cursor < text.length) container.appendChild(document.createTextNode(text.slice(cursor)));
}

function appendInlineHebrew(container: HTMLElement, text: string, cbs?: DefCallbacks): void {
  const processed = text
    .replace(/\(fig\.\)/gi, "(figurative)")
    .replace(/\(spec\.\)/gi, "(specifically)");
  appendInlineTokens(container, processed, cbs);
}

// ── Chip / badge builders ─────────────────────────────────────────────────────

function makeVerseChip(refStr: string, cbs?: DefCallbacks): HTMLElement {
  const chip = document.createElement("span");
  chip.textContent = refStr;
  const clickable = !!(cbs?.onVerseRef);
  const hoverable = !!(cbs?.getVerseText || cbs?.onVerseRef);
  chip.style.cssText = `
    display:inline-block; font-size:9.5px; font-weight:600;
    color:${PD}; background:${PL}; border:1px solid ${PM}66;
    border-radius:3px; padding:0 4px; margin:0 2px;
    line-height:1.75; vertical-align:baseline;
    ${hoverable ? "cursor:pointer;" : ""}
    transition:background 0.12s, color 0.12s; white-space:nowrap;
  `;
  if (hoverable) {
    chip.addEventListener("mouseenter", () => {
      chip.style.background = PM;
      chip.style.color = "#fff";
      chip.style.borderColor = PM;
      if (cbs?.getVerseText) {
        const t = cbs.getVerseText(refStr);
        if (t) showRefPreview(chip, t);
      }
    });
    chip.addEventListener("mouseleave", () => {
      chip.style.background = PL;
      chip.style.color = PD;
      chip.style.borderColor = `${PM}66`;
      hideRefPreview();
    });
  }
  if (clickable) {
    chip.addEventListener("click", e => { e.stopPropagation(); cbs!.onVerseRef!(refStr); });
  }
  return chip;
}

function makeStrongsChip(num: string, cbs?: DefCallbacks): HTMLElement {
  const chip = document.createElement("span");
  chip.textContent = num;
  chip.style.cssText = `
    display:inline-block; font-size:8.5px; font-weight:700;
    color:${P}; background:${P}18; border:1px solid ${PM}55;
    border-radius:3px; padding:0 4px; margin:0 2px;
    line-height:1.75; vertical-align:baseline;
    font-family:var(--font-monospace,'Courier New',monospace);
    ${cbs?.onStrongsNum ? "cursor:pointer;" : ""}
    transition:background 0.12s, color 0.12s; white-space:nowrap;
  `;
  if (cbs?.onStrongsNum) {
    chip.title = `Look up ${num}`;
    chip.addEventListener("mouseenter", () => { chip.style.background = P; chip.style.color = "#fff"; chip.style.borderColor = P; });
    chip.addEventListener("mouseleave", () => { chip.style.background = `${P}18`; chip.style.color = P; chip.style.borderColor = `${PM}55`; });
    chip.addEventListener("click", e => { e.stopPropagation(); cbs!.onStrongsNum!(num); });
  }
  return chip;
}

function makeStemBadge(stem: string): HTMLElement {
  const el = document.createElement("span");
  el.textContent = stem;
  el.style.cssText = `
    display:inline-block; font-size:8.5px; font-weight:700;
    color:#fff; background:${P}; border-radius:3px;
    padding:1px 5px; margin:0 3px; line-height:1.6;
    vertical-align:baseline; white-space:nowrap; opacity:0.9;
  `;
  return el;
}

function makeTechSpan(abbr: string): HTMLElement {
  const el = document.createElement("span");
  el.textContent = abbr;
  el.style.cssText = `
    font-size:10px; color:${ON_CARD_MUTED}; font-style:italic;
    opacity:0.75; letter-spacing:0.01em;
  `;
  return el;
}

// ── Legacy prepDef (kept for any external callers) ────────────────────────────
export function prepDef(raw: string): string { return cleanShared(raw); }