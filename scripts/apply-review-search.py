from pathlib import Path
p=Path('src/searchIndex.ts');s=p.read_text('utf-8-sig')
s=s.replace('export async function buildSearchIndex(', '''let indexBuild: Promise<void> | null = null;
let indexReady = false;
let loadSearchData: (() => Promise<void>) | null = null;
export function configureSearchLoader(loader: () => Promise<void>): void { loadSearchData = loader; }
export async function ensureSearchIndex(): Promise<void> {
  if (indexReady) return;
  if (loadSearchData) await loadSearchData();
  await buildSearchIndex(getGreekData(), getHebrewData(), getLXXData());
}

export function buildSearchIndex(
  greek: Record<string, Array<WordEntry>>,
  hebrew: Record<string, Array<WordEntry>>,
  lxx: Record<string, Array<WordEntry>>,
): Promise<void> {
  return indexBuild ??= buildIndex(greek, hebrew, lxx).catch(error => {
    indexBuild = null;
    strongsIndex = null;
    morphIndex = null;
    throw error;
  });
}
async function buildIndex(''')
s=s.replace('  console.log(\n    `ScriptureScribe: search index built', '  indexReady = true;\n  console.log(\n    `ScriptureScribe: search index built')
s=s.replace('  return strongsIndex !== null;','  return indexReady;')
s=s.replace('  if (!strongsIndex) return { results: [], mode: "english" };','  await ensureSearchIndex();')
s=s.replace('import { BIBLE_BOOKS_NAMES, OT_BOOKS, NT_BOOKS }', 'import { getGreekData, getHebrewData, getLXXData, BIBLE_BOOKS_NAMES, OT_BOOKS, NT_BOOKS }')
s=s.replace('  if (trimmed.startsWith("semantic:"))', '  if (trimmed.toLowerCase().startsWith("semantic:"))')
s=s.replace('  if (trimmed.startsWith("morph:"))', '  if (trimmed.toLowerCase().startsWith("morph:"))')
s=s.replace('      const sem = await semanticVerseSearch(query, limit);', '      const sem = await semanticVerseSearch(query, limit, undefined, true);',1)
p.write_text(s,encoding='utf-8')
p=Path('src/main.ts');s=p.read_text('utf-8');s=s.replace('import { buildSearchIndex }', 'import { buildSearchIndex, configureSearchLoader }')
s=s.replace('    configureSemanticSearch(this.app, this.manifest.dir!);','''    configureSemanticSearch(this.app, this.manifest.dir!);
    configureSearchLoader(() => this.loadInterlinearData());''')
# Mobile also needs Hebrew/LXX search data; loaded only upon a user's first search.
a=s.index('      if (Platform.isMobile) {',s.index('private async loadInterlinearData'));b=s.index('      try {',a);s=s[:a]+s[b:]
# Search only needs word stores, never the 30MB lexicon or definitions.
s=s.replace('      { file: "strongs-definitions.json", setter: setStrongsData, label: "Strong\'s definitions" },\n','').replace('      { file: "strongs-greek-lxx.json",   setter: setLXXDefsData, label: "LXX definitions" },\n','').replace('      { file: "lexicon-lsj.json",         setter: setLSJData,     label: "LSJ lexicon" },\n','')
# Single flight is provided by ensureData, including normalization setters.
a=s.index('      try {',s.index('private async loadInterlinearData'));b=s.index('      // Yield to main thread',a)
s=s[:a]+'''      await ensureData(file, setter);
'''+s[b:]
s=s.replace('configureDataLoader, clearDataLoader', 'configureDataLoader, clearDataLoader, ensureData')
p.write_text(s,encoding='utf-8')
p=Path('src/readingPanel.ts');s=p.read_text('utf-8-sig');s=s.replace('import { buildSearchIndex,', 'import { ensureSearchIndex, buildSearchIndex,')
s=s.replace('  private runMorphSearch(): void {\n    if (!isIndexBuilt()) buildSearchIndex(getGreekData(), getHebrewData(), getLXXData());', '  private async runMorphSearch(): Promise<void> {\n    await ensureSearchIndex();')
s=s.replace('    if (!isIndexBuilt()) await buildSearchIndex(getGreekData(), getHebrewData(), getLXXData());','    await ensureSearchIndex();')
s=s.replace('import { getScripture', 'import { ensureKJVData, getScripture')
s=s.replace('import { getCrossRefs', 'import { ensureCrossRefData, getCrossRefs')
s=s.replace('  async onOpen(): Promise<void> {', '  async onOpen(): Promise<void> {\n    await ensureKJVData();\n    await ensureCrossRefData();')
# Ref jumps need a captured address; asynchronous view rendering must not race goTo.
a=s.index('      if (!this.currentRef) return;',s.index('this.refLbl.addEventListener'))
b=s.index('\n    });',a)
s=s[:a]+'''      const ref = this.currentRef;
      if (!ref) return;
      if (!this.bibleMode) this.enterBibleMode();
      const book = BIBLE_BOOKS.find(b => b.name === ref.book);
      if (book && this.bibleModeView) {
        this.bibleModeView.goTo(book.id, ref.chapter, `${ref.book} ${ref.chapter}:${ref.verseStart}`);
      }'''+s[b:]
if 'import { BIBLE_BOOKS }' not in s:s='import { BIBLE_BOOKS } from "./bibleData";\n'+s
p.write_text(s,encoding='utf-8')
p=Path('src/semanticSearch.ts');s=p.read_text('utf-8');s=s.replace('  app?:  App,\n): Promise<SemanticResult[]>', '  app?: App,\n  explicit = false,\n): Promise<SemanticResult[]>')
s=s.replace('  if (app) {\n    await loadEmbeddingPipeline(app);\n    if (semanticDir) await (vectorsTask ??= loadVerseVectors(app, semanticDir));\n  }\n  // Lazy pipeline init on first search call\n  if (!pipelineLoadAttempted) {\n    // Automatic sparse-result fallback uses keywords without downloading a model.\n  }','''  const context = app ?? semanticApp;
  if ((explicit || app) && context) {
    await loadEmbeddingPipeline(context);
    if (embeddingPipeline && semanticDir) await (vectorsTask ??= loadVerseVectors(context, semanticDir));
  }''')
p.write_text(s,encoding='utf-8')
p=Path('src/tooltip.ts');s=p.read_text('utf-8-sig');s=s.replace('import { getCrossRefs', 'import { ensureCrossRefData, getCrossRefs');s=s.replace('    this.renderCrossRefChips(ref, editor);','    await ensureCrossRefData();\n    if (this.currentRef !== ref) return;\n    this.renderCrossRefChips(ref, editor);');p.write_text(s,encoding='utf-8')
