from pathlib import Path
p=Path('src/fetcher.ts');s=p.read_text('utf-8-sig')
a=s.index('  let ref = mapToSwete(engRef);');b=s.index('  if (pairs.length === 0)',a)
s=s[:a]+'''  const refStr = refToString(engRef);
  const pairs: string[] = [];
  for (const { chapter, verse } of expandRef(engRef)) {
    const ref = mapToSwete({ ...engRef, chapter, verseStart: verse, verseEnd: undefined,
      chapterEnd: undefined, chapterOnly: false, additionalVerses: undefined });
    const sweteBook = SWETE_BOOK_MAP[ref.book];
    const txt = sweteData[sweteBook]?.[ref.chapter]?.[ref.verseStart];
    if (txt) pairs.push(txt);
  }

'''+s[b:]
a=s.index('  // Collect [verseNumber');b=s.index('  const refStr = refToString(ref);',a)
s=s[:a]+'''  const pairs: Array<{ v: number; text: string }> = [];
  for (const { chapter, verse } of expandRef(ref)) {
    const bookName = resolveBookName(ref.book, chapter);
    const text = kjvData[`${bookName} ${chapter}:${verse}`];
    if (text) pairs.push({ v: chapter * 1000 + verse, text });
  }

'''+s[b:]
a=s.index('  let query = `${ref.book}');b=s.index('  const fetchOne',a)
s=s[:a]+'''  const query = refToString(ref);

'''+s[b:]
a=s.index('    // Fetch additional comma-list');b=s.index('    const displayVer',a);s=s[:a]+s[b:]
s=s.replace('      const ctrl  = new AbortController();\n      const timer = setTimeout(() => ctrl.abort(), timeoutMs);','      const ctrl = new AbortController();\n      let timer: ReturnType<typeof setTimeout> | undefined;\n      try {\n      timer = setTimeout(() => ctrl.abort(), timeoutMs);')
s=s.replace('      return data.text.trim().replace(/\\n/g, " ");','      return data.text.trim().replace(/\\n/g, " ");\n      } finally { if (timer) clearTimeout(timer); }')
s=s.replace('  const ver    = settings.primaryTranslation;','  await ensureKJVData();\n  if (settings.primaryTranslation === "LXX") {\n    await ensureVersificationData();\n    await ensureData("swete-lxx.json", setSweteData);\n  }\n  const ver    = settings.primaryTranslation;')
s=s.replace('  CACHE.set(cacheKey', '  if (CACHE.size >= 256) CACHE.delete(CACHE.keys().next().value);\n  CACHE.set(cacheKey')
p.write_text(s,encoding='utf-8')
p=Path('src/semanticSearch.ts');s=p.read_text('utf-8-sig')
a=s.index('// ── Environment Patches');b=s.index('// ── State',a);s=s[:a]+s[b:]
s=s.replace('let dims = 384;', '''let dims = 384;
let semanticApp: App | undefined;
let semanticDir = "";
let vectorsTask: Promise<void> | null = null;
export function configureSemanticSearch(app: App, dir: string): void {
  semanticApp = app;
  semanticDir = dir;
}
''')
a=s.index('  if (app) await loadEmbeddingPipeline(app);',s.index('export async function semanticVerseSearch'))
b=s.index('  //',a)
# Read later: replace only loader calls, explicit concept search initializes model, fallback stays keyword.
s=s.replace('  if (app) await loadEmbeddingPipeline(app);', '''  if (app) {
    await loadEmbeddingPipeline(app);
    if (semanticDir) await (vectorsTask ??= loadVerseVectors(app, semanticDir));
  }''')
s=s.replace('    await loadEmbeddingPipeline(app);\n  }\n', '    // Automatic sparse-result fallback uses keywords without downloading a model.\n  }\n')
p.write_text(s,encoding='utf-8')
p=Path('src/interlinear.ts');s=p.read_text('utf-8-sig')
s=s.replace('import { ScriptureRef, refToString }', 'import { ScriptureRef, refToString, expandRef }')
s=s.replace('import { mapToSwete }', 'import { ensureData } from "./dataLoader";\nimport { mapToSwete, ensureVersificationData }')
s=s.replace('  const isLXX = version === "LXX";', '''  const selected = expandRef(ref);
  if (selected.length > 1) {
    const result: InterlinearWord[] = [];
    for (const {chapter, verse} of selected) {
      result.push(...await fetchInterlinear({...ref, chapter, verseStart: verse,
        verseEnd: undefined, chapterEnd: undefined, chapterOnly: false, additionalVerses: undefined}, language, version, isFallback));
    }
    return result;
  }
  if (version === "LXX") await ensureVersificationData();
  const isLXX = version === "LXX";''')
s=s.replace('(lang === "hebrew" ? await getLazyHebBook(lookupRef.book) : null)', '(lang === "hebrew" ? await getLazyHebBook(lookupRef.book) : await loadBookFile("greek-books", lookupRef.book))')
s=s.replace('    if (data) _lazyLxxBooks.set(bookName, data);','    if (data) { if (_lazyLxxBooks.size >= 3) _lazyLxxBooks.delete(_lazyLxxBooks.keys().next().value); _lazyLxxBooks.set(bookName, data); }')
s=s.replace('    if (data) _lazyHebBooks.set(bookName, data);','    if (data) { if (_lazyHebBooks.size >= 3) _lazyHebBooks.delete(_lazyHebBooks.keys().next().value); _lazyHebBooks.set(bookName, data); }')
s=s.replace('  if (!strongsNum) return null;','''  if (!strongsNum) return null;
  await ensureData("strongs-definitions.json", setStrongsData);
  if (strongsNum.startsWith("G")) {
    await ensureData("strongs-greek-lxx.json", setLXXDefsData);
    await ensureData("lexicon-lsj.json", setLSJData);
  }''')
p.write_text(s,encoding='utf-8')
