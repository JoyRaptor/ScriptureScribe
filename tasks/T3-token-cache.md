# T3 — Tokenized corpus cache (phrase/boolean search speedup)

Phrase search re-tokenizes all 31k verses on every search
(`lc.replace(/[^a-z\s]/g, "").split(/\s+/)` per verse), and boolean search
re-splits every verse per query. Cache the token arrays once, exactly like
the existing `kjvLowerEntries()` cache in `src/searchIndex.ts`.

## Design (implement as written)

1. In `src/searchIndex.ts`, next to `kjvLowerCache`, add:

```ts
/** [ref, lowercased text, tokens] triples — tokens computed once per KJV load. */
let kjvTokenCache: Array<[string, string, string[]]> | null = null;

function kjvTokenEntries(): Array<[string, string, string[]]> {
  if (!kjvTokenCache) {
    kjvTokenCache = kjvLowerEntries().map(([k, lc]) =>
      [k, lc, lc.replace(/[^a-z\s]/g, "").split(/\s+/)]
    );
  }
  return kjvTokenCache;
}
```

2. In `setKJVStoreRef`, alongside the existing `kjvLowerCache = null;` add
   `kjvTokenCache = null;`.

3. In `searchPhrase`: iterate `kjvTokenEntries()` instead of
   `kjvLowerEntries()`, destructure `const [verseKey, lc, words] = entries[ei];`
   and DELETE the line that computed `words` locally. Everything else stays
   byte-identical.

4. In `searchBoolean`: iterate `kjvTokenEntries()`, destructure the same way,
   and replace `lc.split(/\s+/).some(w => stem(w) === t.wordStem)` with
   `words.some(w => stem(w) === t.wordStem)`.

   ⚠ CRITICAL: this changes the token source for boolean stem-matching from a
   raw whitespace split (punctuation attached) to the phrase tokenizer
   (punctuation stripped). That can legitimately change boolean results —
   usually finding MORE correct matches (e.g. "world," now stems as "world").

## Verification

- tsc + build must pass.
- Run `npm run golden`. Expected outcome: phrase queries PASS unchanged;
  the three boolean queries (`faith AND works`, `faith|grace`,
  `love NOT world`) MAY change counts slightly for the reason above. If ONLY
  boolean queries changed, and the counts moved by a small amount (not to 0,
  not to 200 from 25), run `npm run golden:update` and commit goldens.json
  with your change. If phrase or any other mode changed: REVERT — you broke
  something.
- Report before/after `ms` timings printed by the golden run for the two
  phrase queries and three boolean queries.

## Files you may edit

- `src/searchIndex.ts`
- `scripts/goldens.json` (only via `npm run golden:update`, only if the
  boolean-only condition above is met)
