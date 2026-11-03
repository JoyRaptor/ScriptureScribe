from pathlib import Path
p=Path('src/fetcher.ts');s=p.read_text('utf8');s=s.replace('  setKJVStoreRef(kjvData);','  setKJVStoreRef(kjvData);\n  setVerseRefs(Object.keys(kjvData));\n  CACHE.clear();');s=s.replace('  setVerseRefs(Object.keys(kjvData));\n}', '}');p.write_text(s,encoding='utf8')
p=Path('src/readingPanel.ts');s=p.read_text('utf8');s='import { renderPassage } from "./textFormatting";\n'+s;s=s.replace('this.renderVerseText(this.verseTextEl, verse.text)', 'this.renderVerseText(this.verseTextEl, verse.formattedText ?? verse.text)');s=s.replace('this.renderVerseText(verseText, verse.text)', 'this.renderVerseText(verseText, verse.formattedText ?? verse.text)')
a=s.index('    container.empty();',s.index('  private renderVerseText'));b=s.index('\n  }',a);s=s[:a]+'    renderPassage(container, text);'+s[b:];p.write_text(s,encoding='utf8')
p=Path('src/tooltip.ts');s=p.read_text('utf8');s='import { renderPassage } from "./textFormatting";\n'+s;s=s.replace('textEl.textContent = verse.text;', 'renderPassage(textEl, verse.formattedText ?? verse.text);');s=s.replace('t.textContent = verse.text;', 'if (this.currentRef === ref) renderPassage(t, verse.formattedText ?? verse.text);');s=s.replace('      text: verse.text,','      text: verse.text,\n      formattedText: verse.formattedText,');p.write_text(s,encoding='utf8')
p=Path('src/bibleMode.ts');s=p.read_text('utf-8-sig');s=s.replace('import { getKJVData }', 'import { getKJVData, getFormattedKJV }');s='import { renderPassage } from "./textFormatting";\n'+s;s=s.replace('      span.textContent = text + " ";','      renderPassage(span, (this.settings.primaryTranslation === "KJV" ? getFormattedKJV(verseKey) : undefined) ?? text);\n      span.appendChild(document.createTextNode(" "));');p.write_text(s,encoding='utf8')
p=Path('src/main.ts');s=p.read_text('utf8');a=s.index('  private highlightInElement(');b=s.index('  private wrapReadingMatches(',a)
s=s[:a]+'''  private highlightInElement(rootEl: HTMLElement, editor: Editor | null): void {
    const groups = new Map<Element, Text[]>();
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const p = node.parentElement;
      if (!p || p.closest("script,style,.frontmatter,.metadata-container")) continue;
      const block = p.closest("p,li,td,th,h1,h2,h3,h4,h5,h6") ?? rootEl;
      const group = groups.get(block) ?? [];
      group.push(node as Text);
      groups.set(block, group);
    }
    for (const nodes of groups.values()) {
      let content = "";
      const offsets: number[] = [];
      for (const tn of nodes) {
        offsets.push(content.length);
        const text = tn.textContent ?? "";
        content += tn.parentElement?.closest("code,pre,a") ? text.replace(/[^\\r\\n]/g, " ") : text;
      }
      const refs = parseScriptureRefs(content, this.settings.primaryTranslation);
      for (let i = 0; i < nodes.length; i++) {
        const tn = nodes[i];
        if (tn.parentElement?.closest("code,pre,a,.ss-ref-highlight,.ss-strongs-highlight")) continue;
        const offset = offsets[i];
        const text = tn.textContent ?? "";
        const local = refs.filter(r => r.start < offset + text.length && r.end > offset).map(r => ({...r,
          start: Math.max(r.start - offset, 0), end: Math.min(r.end - offset, text.length),
          raw: text.slice(Math.max(r.start - offset, 0), Math.min(r.end - offset, text.length))}));
        const strongs = [...text.matchAll(/\\b[gh]\\d{1,5}\\b/gi)].map(m => ({start: m.index!, end: m.index! + m[0].length, text: m[0]}));
        if (local.length || strongs.length) this.wrapReadingMatches(tn, local, strongs, editor);
      }
    }
  }

'''+s[b:]
# Use paragraph context in editor so a viewport edge doesn't lose v-markers.
s=s.replace('for (const { from, to } of view.visibleRanges) {\n        const text', '''for (const visible of view.visibleRanges) {
        let first = view.state.doc.lineAt(visible.from);
        while (first.number > 1 && first.text.trim() && !/^\\s*#{1,6}\\s/.test(first.text)) {
          const previous = view.state.doc.line(first.number - 1);
          if (!previous.text.trim() || /^\\s*#{1,6}\\s/.test(previous.text)) break;
          first = previous;
        }
        const from = first.from;
        const to = view.state.doc.lineAt(visible.to).to;
        const text''')
s=s.replace('        for (const ref of refs) {','        for (const ref of refs) {\n          if (from + ref.end <= visible.from || from + ref.start >= visible.to) continue;',1)
p.write_text(s,encoding='utf8')
