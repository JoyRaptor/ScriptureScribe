from pathlib import Path
p=Path('src/vaultIndex.ts');s=p.read_text('utf-8-sig')
s=s.replace('import { parseScriptureRefs }','import { parseScriptureRefs, expandRef }')
s=s.replace('const _fileByVerseSet:', '''const _fileStats = new Map<string, {mtime: number; size: number}>();
let cachePath = "";
let cacheVault: Vault | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const fileJobs = new Map<string, Promise<void>>();

export function stopVaultIndex(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  cacheVault = null;
  _readyCbs.splice(0);
}

async function saveCache(): Promise<void> {
  if (!cacheVault || !cachePath) return;
  const files: Record<string, any> = {};
  for (const [path, stat] of _fileStats) {
    files[path] = { ...stat, entries: (_fileCache.get(path) ?? []).map(key =>
      [key, _index.get(key)?.find(n => n.filePath === path)?.context ?? ""]) };
  }
  try { await cacheVault.adapter.write(cachePath, JSON.stringify({version: 3, files})); }
  catch (error) { console.warn("ScriptureScribe: could not persist vault index", error); }
}
function scheduleCacheSave(): void {
  if (!cacheVault) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveTimer = null; void saveCache(); }, 3000);
}
const _fileByVerseSet:''')
s=s.replace('  _fileCache.delete(filePath);','  _fileCache.delete(filePath);\n  _fileStats.delete(filePath);')
s=s.replace('  if (exclusions.some(f => file.path.startsWith(f.replace(/\\/?$/, "/")))) return;','''  if (exclusions.some(f => file.path.startsWith(f.replace(/\\/?$/, "/")))) {
    removeFileFromIndex(file.path);
    return;
  }
  const old = _fileStats.get(file.path);
  if (old?.mtime === file.stat.mtime && old.size === file.stat.size) return;
  const stat = { mtime: file.stat.mtime, size: file.stat.size };''')
a=s.index('      const rangeEnd =');b=s.index('\n    removeFileFromIndex(file.path);',a)
s=s[:a]+'''      for (const {chapter, verse} of expandRef(ref)) {
        const key = `${ref.book} ${chapter}:${verse}`;
        if (!seen.has(key)) {
          seen.add(key);
          newKeys.push(key);
          noteMap.set(key, { filePath: file.path, context: ctx });
        }
      }
    }
'''+s[b:]
s=s.replace('    _fileCache.set(file.path, newKeys);','    _fileCache.set(file.path, newKeys);\n    _fileStats.set(file.path, stat);')
s=s.replace('const CHUNK_SIZE = 25;', 'const CHUNK_SIZE = 4;')
s=s.replace('  onProgress?: (done: number, total: number) => void,','''  onProgress?: (done: number, total: number) => void,
  pluginDir = "",
  cancelled: () => boolean = () => false,''')
s=s.replace('  _fileCache.clear();', '''  _fileCache.clear();
  _fileStats.clear();
  _fileByVerseSet.clear();
  cacheVault = vault;
  cachePath = pluginDir ? `${pluginDir}/vault-index-cache.json` : "";
  if (cachePath) {
    try {
      const cached = JSON.parse(await vault.adapter.read(cachePath));
      if (cached.version === 3) for (const [path, record] of Object.entries(cached.files) as Array<[string, any]>) {
        const file = vault.getAbstractFileByPath(path);
        if (!(file instanceof TFile) || exclusions.some(f => path.startsWith(f.replace(/\\/?$/, "/")))) continue;
        if (file.stat.mtime !== record.mtime || file.stat.size !== record.size) continue;
        _fileStats.set(path, {mtime: record.mtime, size: record.size});
        _fileCache.set(path, record.entries.map((e: any) => e[0]));
        for (const [key, context] of record.entries) addVerseNote(key, {filePath: path, context});
      }
    } catch { /* First run or obsolete cache: rebuild from notes. */ }
  }''')
s=s.replace('    const chunk = files.slice', '    if (cancelled()) { _isScanning = false; return _index; }\n    const chunk = files.slice')
s=s.replace('    await Promise.all(chunk.map(f => indexFile(vault, f, exclusions)));','    await Promise.all(chunk.map(f => updateVaultIndexForFile(vault, f, exclusions)));')
s=s.replace('  _isScanning = false;\n  _isReady', '  if (saveTimer) clearTimeout(saveTimer);\n  saveTimer = null;\n  if (!cancelled() && cachePath) await saveCache();\n  _isScanning = false;\n  _isReady')
s=s.replace('  await indexFile(vault, file, exclusions);', '''  const prior = fileJobs.get(file.path) ?? Promise.resolve();
  const task = prior.catch(() => {}).then(() => indexFile(vault, file, exclusions));
  fileJobs.set(file.path, task);
  await task;
  if (fileJobs.get(file.path) === task) fileJobs.delete(file.path);
  if (!_isScanning) scheduleCacheSave();''')
s=s.replace('  removeFileFromIndex(filePath);\n}', '  removeFileFromIndex(filePath);\n  scheduleCacheSave();\n}')
p.write_text(s,encoding='utf-8')
p=Path('src/main.ts');s=p.read_text('utf-8');s=s.replace('buildVaultIndex, updateVaultIndexForFile', 'stopVaultIndex, buildVaultIndex, updateVaultIndexForFile');s=s.replace('    clearDataLoader();','    clearDataLoader();\n    stopVaultIndex();');p.write_text(s,encoding='utf-8')
