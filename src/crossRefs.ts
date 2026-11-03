/**
 * crossRefs.ts
 * Loads and queries the Treasury of Scripture Knowledge cross-reference index.
 *
 * Data file: cross-refs.json (place in plugin folder alongside kjv.json)
 * Expected shape: Record<string, string[]>
 *   Key:   "Book Chapter:Verse"  e.g. "John 3:16"
 *   Value: array of ref strings  e.g. ["Romans 5:8", "1 John 4:9"]
 *
 * Falls back gracefully to an empty index if the file is not present.
 */

import { ScriptureRef, refToString } from "./parser";
import { ensureData } from "./dataLoader";

// ── Data store ────────────────────────────────────────────────────────────────

let crossRefData: Record<string, string[]> = {};

export function setCrossRefData(data: Record<string, string[]>): void {
  crossRefData = data;
}

export function ensureCrossRefData(): Promise<void> {
  return ensureData("cross-refs.json", setCrossRefData);
}

export function isCrossRefLoaded(): boolean {
  return Object.keys(crossRefData).length > 0;
}

// ── Lookup ────────────────────────────────────────────────────────────────────

/**
 * Returns cross-reference strings for a given ref.
 * For ranges (e.g. John 3:16-18) we return refs for the first verse only —
 * merging all verses in a range would produce too many results.
 *
 * Returns an empty array if no data is loaded or no refs exist for that verse.
 */
export function getCrossRefs(ref: ScriptureRef): string[] {
  const key = `${ref.book} ${ref.chapter}:${ref.verseStart}`;
  return crossRefData[key] ?? [];
}
