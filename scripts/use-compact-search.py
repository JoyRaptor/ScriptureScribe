from pathlib import Path
p=Path('src/searchIndex.ts');s=p.read_text('utf8');a=s.index('let searchLoad:');b=s.index('\nexport function buildSearchIndex(',a)
s=s[:a]+'''export interface SearchStores {
  greek: Record<string, WordEntry[]>;
  hebrew: Record<string, WordEntry[]>;
  lxx: Record<string, WordEntry[]>;
}
let searchLoad: Promise<SearchStores> | null = null;
let loadSearchData: (() => Promise<SearchStores>) | null = null;
export function configureSearchLoader(loader: () => Promise<SearchStores>): void { loadSearchData = loader; searchLoad = null; }
export async function ensureSearchIndex(): Promise<void> {
  if (indexReady) return;
  if (loadSearchData) {
    const stores = await (searchLoad ??= loadSearchData().catch(error => { searchLoad = null; throw error; }));
    await buildSearchIndex(stores.greek, stores.hebrew, stores.lxx);
  } else await buildSearchIndex(getGreekData(), getHebrewData(), getLXXData());
}
'''+s[b:];p.write_text(s,encoding='utf8')
p=Path('src/main.ts');s=p.read_text('utf8').replace('buildSearchIndex, configureSearchLoader', 'SearchStores, configureSearchLoader');s=s.replace('configureSearchLoader(() => this.loadInterlinearData())', 'configureSearchLoader(() => this.loadSearchData())')
a=s.index('  private async loadInterlinearData()');b=s.index('  // Reading mode only',a)
s=s[:a]+'''  private async loadSearchData(): Promise<SearchStores> {
    const stores = {} as SearchStores;
    for (const language of ["greek", "hebrew", "lxx"] as const) {
      const raw = await this.app.vault.adapter.read(`${this.manifest.dir}/search-data/${language}.json`);
      const data = JSON.parse(raw);
      const store: SearchStores[typeof language] = {};
      for (const key of Object.keys(data.verses)) store[key] = data.verses[key].map((id: number) => data.words[id]);
      stores[language] = store;
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    return stores;
  }

'''+s[b:];p.write_text(s,encoding='utf8')
p=Path('src/fetcher.ts');s=p.read_text('utf8').replace('function toCache(r: VerseResult)', 'function toCache(r: VerseResult, requestedVersion = r.version)').replace('cacheKey(r.reference, r.version)', 'cacheKey(r.reference, requestedVersion)').replace('toCache(r);','toCache(r, ver);').replace('toCache(api);','toCache(api, ver);');p.write_text(s,encoding='utf8')
