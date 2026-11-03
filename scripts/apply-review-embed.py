from pathlib import Path
p=Path('src/embedEngine.ts');s=p.read_text('utf-8-sig')
a=s.index('// ──────────────────────────────────────\n// Transformation')
s=s[:a]+'''/** Resolve by meaning as well as spelling, nearest the editor's saved cursor. */
function findOccurrence(content: string, ref: ScriptureRef): ScriptureRef | null {
  const key = refToString(ref);
  const candidates = parseScriptureRefs(content).filter(r => refToString(r) === key);
  if (!candidates.length) return null;
  const near = _cachedCursorOffset ?? ref.start;
  return candidates.reduce((best, r) => Math.abs(r.start - near) < Math.abs(best.start - near) ? r : best);
}

'''+s[a:]
# Replace two repeated occurrence search blocks with canonical document parsing.
a=s.index('  let pos = -1;');b=s.index('\n  if (pos !== -1) {',a)
s=s[:a]+'''  const occurrence = findOccurrence(content, ref);
  const pos = occurrence?.start ?? -1;
'''+s[b:]
s=s.replace('editor.offsetToPos(pos + ref.raw.length)', 'editor.offsetToPos(occurrence!.end)',1)
a=s.index('  let pos = -1;',s.index('export async function embedSingleRef'));b=s.index('  if (pos === -1) {\n    new Notice',a)
s=s[:a]+'''  const occurrence = findOccurrence(content, ref);
  const pos = occurrence?.start ?? -1;
'''+s[b:]
s=s.replace('editor.offsetToPos(pos + ref.raw.length)', 'editor.offsetToPos(occurrence!.end)',1)
# Protect edits made while asynchronous data/network retrieval was underway.
s=s.replace('  // Apply as a single transaction (one undo step)\n  editor.setValue(updated);', '''  if (editor.getValue() !== content) {
    new Notice("ScriptureScribe: the note changed while passages loaded. Run Embed All again.");
    return;
  }
  // Apply as a single transaction (one undo step)
  editor.setValue(updated);''')
p.write_text(s,encoding='utf-8')
