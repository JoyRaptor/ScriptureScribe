/**
 * citation.ts
 *
 * Formats a scripture reference + verse text as a properly-styled academic
 * citation. Supports APA (7th ed.), Chicago (17th ed.), Turabian, MLA (9th ed.),
 * and a plain everyday format.
 *
 * Usage:
 *   import { formatCitation } from "./citation";
 *   const text = await formatCitation(ref, verseText, "KJV", "chicago");
 */

import { ScriptureRef } from "./parser";

export type CitationFormat = "apa" | "chicago" | "turabian" | "mla" | "plain";

/** Full human-readable version names for citations */
const VERSION_FULL_NAMES: Record<string, string> = {
  KJV:     "King James Version",
  NIV:     "New International Version",
  ESV:     "English Standard Version",
  NASB:    "New American Standard Bible",
  NASB1995:"New American Standard Bible (1995)",
  NKJV:   "New King James Version",
  NLT:     "New Living Translation",
  CSB:     "Christian Standard Bible",
  AMP:     "Amplified Bible",
  MSG:     "The Message",
  NRSV:    "New Revised Standard Version",
  LXX:     "Septuagint (Swete Edition)",
};

/** Abbreviation used in inline citations */
const VERSION_ABBR: Record<string, string> = {
  KJV:     "KJV",  NIV:  "NIV",  ESV:  "ESV",  NASB: "NASB",
  NASB1995:"NASB", NKJV: "NKJV", NLT:  "NLT",  CSB:  "CSB",
  AMP:     "AMP",  MSG:  "MSG",  NRSV: "NRSV",  LXX:  "LXX",
};

/** Format a reference as "Book Chapter:Verse" */
function refString(ref: ScriptureRef): string {
  if (ref.verseEnd && ref.verseEnd !== ref.verseStart) {
    return `${ref.book} ${ref.chapter}:${ref.verseStart}–${ref.verseEnd}`;
  }
  return `${ref.book} ${ref.chapter}:${ref.verseStart}`;
}

/**
 * Returns a formatted citation string.
 *
 * @param ref         Parsed scripture reference
 * @param verseText   The actual verse text (for inline quotes)
 * @param version     Translation code (e.g., "KJV", "NIV")
 * @param format      Citation style
 * @param includeVer  Whether to include the version name (default: true)
 */
export function formatCitation(
  ref: ScriptureRef,
  verseText: string,
  version: string,
  format: CitationFormat,
  includeVer = true,
): string {
  const refStr   = refString(ref);
  const fullVer  = includeVer ? (VERSION_FULL_NAMES[version] ?? version) : "";
  const abbrVer  = VERSION_ABBR[version] ?? version;
  const truncated = verseText.length > 200 ? verseText.slice(0, 200) + "…" : verseText;

  switch (format) {
    // ── APA 7th ──────────────────────────────────────────────────────────────
    // Scripture sources are cited in-text only in APA; no references-list entry.
    // Format: "Quote text" (Version, Year, Book Chapter:Verse)
    case "apa": {
      // Use a conventional year for well-known translations
      const year = apaYear(version);
      const yearStr = year ? `, ${year}` : "";
      const verStr  = includeVer ? `, ${abbrVer}` : "";
      return `"${truncated}" (${refStr}${verStr}${yearStr})`;
    }

    // ── Chicago 17th (notes-bibliography) ────────────────────────────────────
    // "Quote." Book Chapter:Verse (Version).
    case "chicago": {
      const verStr = includeVer ? ` (${fullVer})` : "";
      return `"${truncated}" ${refStr}${verStr}.`;
    }

    // ── Turabian (Kate Turabian, 9th ed.) ────────────────────────────────────
    // Very similar to Chicago; Turabian prefers version in parentheses inline.
    case "turabian": {
      const verStr = includeVer ? ` (${abbrVer})` : "";
      return `"${truncated}" (${refStr}${verStr})`;
    }

    // ── MLA 9th ──────────────────────────────────────────────────────────────
    // "Quote." The Bible. Version, Publisher, Year. Book Chapter:Verse.
    case "mla": {
      const pub  = mlaPublisher(version);
      const year = apaYear(version);
      const yearStr = year ? `, ${year}` : "";
      if (includeVer) {
        return `"${truncated}" The Bible. ${fullVer}${pub ? `, ${pub}` : ""}${yearStr}. ${refStr}.`;
      }
      return `"${truncated}" ${refStr}.`;
    }

    // ── Plain ─────────────────────────────────────────────────────────────────
    // Just the quote followed by reference + version tag.
    case "plain":
    default: {
      const verStr = includeVer ? ` (${abbrVer})` : "";
      return `"${truncated}" — ${refStr}${verStr}`;
    }
  }
}

/** Approximate publication year for common translations */
function apaYear(version: string): string {
  const years: Record<string, string> = {
    KJV:     "1611", NKJV:    "1982", NIV: "2011", ESV: "2001",
    NASB:    "2020", NASB1995: "1995", NLT: "2015", NRSV: "1989",
    CSB:     "2017", AMP:      "2015", MSG: "2002", LXX: "1887",
  };
  return years[version] ?? "";
}

/** Conventional publisher for MLA citations */
function mlaPublisher(version: string): string {
  const pubs: Record<string, string> = {
    KJV:     "Oxford UP",
    NIV:     "Zondervan",
    ESV:     "Crossway",
    NASB:    "Lockman Foundation",
    NASB1995:"Lockman Foundation",
    NKJV:   "Thomas Nelson",
    NLT:     "Tyndale House",
    CSB:     "Holman Bible Publishers",
    NRSV:    "National Council of Churches",
    AMP:     "Zondervan",
    MSG:     "NavPress",
  };
  return pubs[version] ?? "";
}
