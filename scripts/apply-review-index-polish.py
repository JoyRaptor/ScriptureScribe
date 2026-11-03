from pathlib import Path
p=Path('src/vaultIndex.ts');s=p.read_text('utf8')
s=s.replace('const MAX_RANGE_VERSES = 3;\n','')
s=s.replace('    removeFileFromIndex(file.path);\n    _fileCache.set', '    if (vault.getAbstractFileByPath(file.path) !== file) return;\n    removeFileFromIndex(file.path);\n    _fileCache.set')
s=s.replace('  const files = vault.getMarkdownFiles();\n  const total = files.length;', '''  const allFiles = vault.getMarkdownFiles();
  const total = allFiles.length;
  const files = allFiles.filter(file => {
    if (exclusions.some(f => file.path.startsWith(f.replace(/\\/?$/, "/")))) return false;
    const stat = _fileStats.get(file.path);
    return !stat || stat.mtime !== file.stat.mtime || stat.size !== file.stat.size;
  });
  const reused = total - files.length;''')
s=s.replace('Math.min(i + CHUNK_SIZE, total), total', 'Math.min(reused + i + CHUNK_SIZE, total), total')
p.write_text(s,encoding='utf8')
p=Path('src/main.ts');s=p.read_text('utf8');s=s.replace('  private scanPromise:', '  private scanExclusions = "";\n  private scanPromise:')
s=s.replace('    if (this.scanPromise) return this.scanPromise;\n    this.scanStarted = true;', '''    const exclusions = this.getVaultScanExclusions();
    const signature = JSON.stringify(exclusions);
    if (this.scanPromise && signature === this.scanExclusions) return this.scanPromise;
    if (this.scanPromise) await this.scanPromise;
    this.scanExclusions = signature;
    this.scanStarted = true;''')
s=s.replace('this.app.vault, this.getVaultScanExclusions(), undefined,', 'this.app.vault, exclusions, undefined,')
# Force scan button must be able to request a rebuild.
s=s.replace('  async startVaultScan(): Promise<void> {','  async startVaultScan(force = false): Promise<void> {\n    if (force) { await this.scanPromise; this.scanPromise = null; }')
s=s.replace('      this.manifest.dir!, () => this.disposed)', '      force ? "" : this.manifest.dir!, () => this.disposed)')
s=s.replace('    if (panel) panel.onVaultIndexReady();\n  }\n', '    if (panel) { panel.onVaultIndexReady(); void this.startVaultScan(); }\n  }\n',1)
p.write_text(s,encoding='utf8')
p=Path('src/settingsTab.ts');s=p.read_text('utf-8-sig').replace('() => this.plugin.startVaultScan(), true)', '() => this.plugin.startVaultScan(true), true)');p.write_text(s,encoding='utf8')
