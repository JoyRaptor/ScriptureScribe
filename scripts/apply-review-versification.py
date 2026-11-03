from pathlib import Path
p=Path('src/versification.ts');s=p.read_text('utf-8')
s=s.replace('let mappingData:', 'const rangeMappings: Array<{book: string; chapter: number; first: number; last: number; toBook: string; toChapter: number; toVerse: number}> = [];\nlet mappingData:')
s=s.replace('  mappingData = data;', '''  mappingData = data;
  rangeMappings.length = 0;
  // Range declarations carry the actual coordinate change. Individual Nec./Acd.
  // annotations describe textual differences and must not override that change.
  for (const [key, value] of Object.entries(data.eng2grk ?? {}) as Array<[string, string]>) {
    const a = key.match(/^([A-Za-z0-9]+)\\.(\\d+):(\\d+)-(\\d+)$/);
    const b = value.match(/^([A-Za-z0-9]+)\\.(\\d+):(\\d+)-(\\d+)$/);
    if (a && b) rangeMappings.push({book: a[1], chapter: +a[2], first: +a[3], last: +a[4], toBook: b[1], toChapter: +b[2], toVerse: +b[3]});
  }''')
a=s.index('  const key = `${abbr}.');b=s.index('\n  // If it\'s a relative mapping',a)
s=s[:a]+'''  const key = `${abbr}.${ref.chapter}:${ref.verseStart}`;
  const range = rangeMappings.find(r => r.book === abbr && r.chapter === ref.chapter && r.first <= ref.verseStart && r.last >= ref.verseStart);
  if (range) return {...ref, book: ABBR_TO_BOOK[range.toBook] ?? ref.book,
    chapter: range.toChapter, verseStart: range.toVerse + ref.verseStart - range.first};
  const mapped = table[key];
  const direct = typeof mapped === "string" ? mapped.match(/^([A-Za-z0-9]+)\\.(\\d+):(\\d+)$/) : null;
  if (direct) return {...ref, book: ABBR_TO_BOOK[direct[1]] ?? ref.book, chapter: +direct[2], verseStart: +direct[3]};
  // Normal Psalm numbering between the explicitly split/merged ranges.
  if (ref.book === "Psalms") {
    const c = ref.chapter;
    if (c >= 11 && c <= 113 || c >= 117 && c <= 146) return {...ref, chapter: c - 1};
  }
  if (ref.book === "Joel") {
    if (ref.chapter === 2 && ref.verseStart >= 28) return {...ref, chapter: 3, verseStart: ref.verseStart - 27};
    if (ref.chapter === 3) return {...ref, chapter: 4};
  }
  if (ref.book === "Malachi" && ref.chapter === 4) return {...ref, chapter: 3, verseStart: ref.verseStart + 18};
'''+s[b:]
s+='''
/** Native Hebrew coordinate changes relative to the English chapter numbers. */
export function mapToHebrew(ref: ScriptureRef): ScriptureRef {
  if (ref.book === "Joel") {
    if (ref.chapter === 2 && ref.verseStart >= 28) return {...ref, chapter: 3, verseStart: ref.verseStart - 27};
    if (ref.chapter === 3) return {...ref, chapter: 4};
  }
  if (ref.book === "Malachi" && ref.chapter === 4) return {...ref, chapter: 3, verseStart: ref.verseStart + 18};
  return ref;
}
'''
p.write_text(s,encoding='utf-8')
# Remove unused approximate mapping from fetcher so it cannot accidentally be reused.
p=Path('src/fetcher.ts');s=p.read_text('utf-8');a=s.index('/**\n * Map English (MT/Hebrew) Psalm');b=s.index('function lookupSwete',a);s=s[:a]+s[b:];p.write_text(s,encoding='utf-8')
