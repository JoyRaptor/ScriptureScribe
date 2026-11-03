from pathlib import Path
p=Path('src/interlinear.ts');s=p.read_text('utf8');a=s.index('/** Cache of lazily loaded');b=s.index('import { normalizeBookName }',a)
s=s[:a]+'''/** A small shared LRU bounds original-language memory on every device. */
const lazyBooks = new Map<string, Record<string, CompactWord[]>>();
const lazyLoading = new Map<string, Promise<Record<string, CompactWord[]> | null>>();
async function getLazyBook(subdir: string, bookName: string): Promise<Record<string, CompactWord[]> | null> {
  const key = `${subdir}:${bookName}`;
  const cached = lazyBooks.get(key);
  if (cached) { lazyBooks.delete(key); lazyBooks.set(key, cached); return cached; }
  const pending = lazyLoading.get(key);
  if (pending) return pending;
  if (!_vaultAdapter || !_pluginDir) return null;
  const path = normalizePath(`${_pluginDir}/${subdir}/${bookName.replace(/[/:*?"<>|]/g, "_")}.json`);
  const task = _vaultAdapter.read(path).then((raw: string) => {
    const data = normalizeKeys(JSON.parse(raw)) as Record<string, CompactWord[]>;
    if (lazyBooks.size >= 3) lazyBooks.delete(lazyBooks.keys().next().value);
    lazyBooks.set(key, data);
    return data;
  }).catch(() => null).finally(() => lazyLoading.delete(key));
  lazyLoading.set(key, task);
  return task;
}

'''+s[b:]
s=s.replace('await getLazyLxxBook(lookupRef.book)', 'await getLazyBook("lxx-books", lookupRef.book)').replace('await getLazyHebBook(lookupRef.book)', 'await getLazyBook("hebrew-books", lookupRef.book)').replace('await loadBookFile("greek-books", lookupRef.book)', 'await getLazyBook("greek-books", lookupRef.book)')
s=s.replace('    await ensureData("strongs-greek-lxx.json", setLXXDefsData);\n    await ensureData("lexicon-lsj.json", setLSJData);','''    await ensureData(`definitions/lxx-${shard}.json`, data => Object.assign(lxxDefs, data));
    await ensureData(`definitions/lsj-${shard}.json`, data => Object.assign(lsjDefs, data));''')
s=s.replace('  await ensureData("strongs-definitions.json", setStrongsData);','''  const normalized = strongsNum.toUpperCase().match(/^([GH])0*(\\d+)(?:[A-Z])?$/);
  if (!normalized) return null;
  strongsNum = `${normalized[1]}${Number(normalized[2])}`;
  const shard = `${normalized[1]}${Math.floor(Number(normalized[2]) / 100)}`;
  await ensureData(`definitions/strongs-${shard}.json`, data => Object.assign(strongsDefs, data));''')
s=s.replace('  _vaultAdapter = adapter;', '  _vaultAdapter = adapter;\n  lazyBooks.clear();\n  lazyLoading.clear();')
s=s.replace('  return morphIndex !== null;', '  return indexReady;')
# Bound verse/definition caches without changing keys or their results.
s=s.replace('      INTERLINEAR_CACHE.set(cacheKey, words);', '      if (INTERLINEAR_CACHE.size >= 128) INTERLINEAR_CACHE.delete(INTERLINEAR_CACHE.keys().next().value);\n      INTERLINEAR_CACHE.set(cacheKey, words);')
s=s.replace('    STRONGS_CACHE.set(', '    if (STRONGS_CACHE.size >= 256) STRONGS_CACHE.delete(STRONGS_CACHE.keys().next().value);\n    STRONGS_CACHE.set(')
p.write_text(s,encoding='utf8')
