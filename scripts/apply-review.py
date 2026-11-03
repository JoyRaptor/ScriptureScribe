from pathlib import Path
p=Path('src/main.ts');s=p.read_text('utf-8-sig')
s=s.replace('import { RangeSetBuilder } from "@codemirror/state";', 'import { syntaxTree } from "@codemirror/language";')
s=s.replace('import { parseScriptureRefs, ScriptureRef, refToString }', 'import { parseScriptureRefs, ScriptureRef, refToString, maskMarkdown }')
s=s.replace('import { loadVerseVectors, setVerseRefs, loadEmbeddingPipeline } from "./semanticSearch";', 'import { configureSemanticSearch } from "./semanticSearch";\nimport { configureDataLoader, clearDataLoader } from "./dataLoader";')
a=s.index('    // Offload heavy');b=s.index('    // Incremental index',a)
s=s[:a]+'''    configureDataLoader(this.manifest.dir!, this.app.vault.adapter);
    configureSemanticSearch(this.app, this.manifest.dir!);
    // Registration is cheap; data is loaded by the feature that needs it.
    this.app.workspace.onLayoutReady(() => {
      if (this.getReadingPanel()) void this.startVaultScan();
    });

'''+s[b:]
s=s.replace('      await updateVaultIndexForFile', '      if (!this.scanStarted || this.disposed) return;\n      await updateVaultIndexForFile')
s=s.replace('  private hoverTimer:', '  private scanStarted = false;\n  private disposed = false;\n  private scanPromise: Promise<void> | null = null;\n  private hoverTimer:')
s=s.replace('    this.tooltip?.destroy();','    this.disposed = true;\n    clearDataLoader();\n    this.tooltip?.destroy();')
s=s.replace('  async activatePanel(): Promise<ScriptureReadingPanel | null> {','  async activatePanel(): Promise<ScriptureReadingPanel | null> {\n    void this.startVaultScan();')
a=s.index('  async startVaultScan(): Promise<void> {');b=s.index('  private isExcluded',a)
s=s[:a]+'''  async startVaultScan(): Promise<void> {
    if (this.scanPromise) return this.scanPromise;
    this.scanStarted = true;
    this.scanPromise = buildVaultIndex(this.app.vault, this.getVaultScanExclusions(), undefined,
      this.manifest.dir!, () => this.disposed).then(() => {
        if (!this.disposed) this.getReadingPanel()?.onVaultIndexReady();
      }).catch(error => {
        this.scanPromise = null;
        console.error("ScriptureScribe: vault scan failed", error);
      });
    return this.scanPromise;
  }

'''+s[b:]
# All decoration ranges, including Strong's, must be sorted together.
s=s.replace('      const builder = new RangeSetBuilder<Decoration>();', '      const marks: any[] = [];')
s=s.replace('        const text = view.state.doc.sliceString(from, to);\n        const refs = parseScriptureRefs(text);', '''        const text = view.state.doc.sliceString(from, to);
        const excluded: Array<{from: number; to: number}> = [];
        syntaxTree(view.state).iterate({ from, to, enter(node) {
          if (/code|link|url|hmd-frontmatter/i.test(node.name)) {
            excluded.push({from: node.from, to: node.to});
            return false;
          }
        }});
        const allowed = (start: number, end: number) => !excluded.some(r => r.from < from + end && r.to > from + start);
        const refs = parseScriptureRefs(text, getSettings().primaryTranslation).filter(r => allowed(r.start, r.end));''')
s=s.replace('          builder.add(from + ref.start, from + ref.end, Decoration.mark({', '          marks.push(Decoration.mark({')
s=s.replace('attributes: { "data-ref": refToString(ref) },\n          }));','attributes: { "data-ref": refToString(ref) },\n          }).range(from + ref.start, from + ref.end));')
s=s.replace('          builder.add(from + match.index, from + match.index + match[0].length, Decoration.mark({', '          if (!allowed(match.index, match.index + match[0].length)) continue;\n          marks.push(Decoration.mark({')
s=s.replace('attributes: { "data-strongs": match[0] },\n          }));', 'attributes: { "data-strongs": match[0] },\n          }).range(from + match.index, from + match.index + match[0].length));')
s=s.replace('      return builder.finish();','      return Decoration.set(marks, true);')
# Preserve the original editor occurrence when hovering normalized data-ref attributes.
s=s.replace('      const refs = parseScriptureRefs(refAttr);', '''      const refs = parseScriptureRefs(refAttr, this.settings.primaryTranslation);
      if (refs.length) refs[0].raw = refSpan!.textContent ?? refs[0].raw;''')
# Postprocessor section belongs to its source file, not whichever editor is active.
s=s.replace('this.highlightInElement(el, view?.editor ?? null);','if (!this.isExcluded(_ctx.sourcePath)) this.highlightInElement(el, view?.editor ?? null);')
# Built-in delegated listeners already handle reading-mode spans. Remove duplicate per-span listeners.
a=s.index('        span.addEventListener("mouseenter"');b=s.index('      } else {',a);s=s[:a]+s[b:]
a=s.index('        span.addEventListener("mouseenter"');b=s.index('      frag.appendChild(span);',a);s=s[:a]+'''      }
'''+s[b:]
s=s.replace('const refs = parseScriptureRefs(text);','const refs = parseScriptureRefs(text, this.settings.primaryTranslation);')
p.write_text(s,encoding='utf-8')
