from pathlib import Path
p=Path('src/verseCard.ts');s=p.read_text('utf8');s=s.replace('var map = { reference: c.reference, text: c.text, version: c.version, book: c.book };', 'var map = { reference: c.reference, text: c.runs ? c.runs.map(function(r){ return r.text; }).join("") : c.text, version: c.version, book: c.book };')
a=s.index('    if (textEl && c.runs) {');b=s.index('\n    if (textEl) {',a)
s=s[:a]+'''    if (textEl && c.runs) {
      // Preserve skin-created word spans, gradients and animation classes.
      var offset = 0;
      var ranges = c.runs.map(function(run){ var a = offset; offset += run.text.length; return {start:a,end:offset,styles:run.styles}; });
      var walker = document.createTreeWalker(textEl, NodeFilter.SHOW_TEXT);
      var nodes = [], node;
      while ((node = walker.nextNode())) nodes.push(node);
      offset = 0;
      nodes.forEach(function(tn){
        var start = offset, text = tn.textContent || ""; offset += text.length;
        var parts = ranges.filter(function(r){ return r.start < offset && r.end > start; });
        if (!parts.some(function(r){ return r.styles.length; })) return;
        var frag = document.createDocumentFragment();
        parts.forEach(function(run){
          var child = document.createTextNode(text.slice(Math.max(run.start-start,0),Math.min(run.end-start,text.length)));
          run.styles.forEach(function(tag){ var el = document.createElement(tag); el.appendChild(child); child = el; });
          frag.appendChild(child);
        });
        tn.parentNode.replaceChild(frag, tn);
      });
    }'''+s[b:]
p.write_text(s,encoding='utf8')
p=Path('src/bibleMode.ts');s=p.read_text('utf8').replace('const OT_BOOKS = [...BIBLE_BOOKS.slice(0, 39), ...BIBLE_BOOKS.slice(66)];', 'const OT_BOOKS = BIBLE_BOOKS.slice(0, 39);\nconst APOCRYPHAL_BOOKS = BIBLE_BOOKS.slice(66);')
s=s.replace('      const lbl = inner.createEl("div");\n      lbl.textContent = label;', '''      const collapsible = label === "Apocryphal";
      const group = collapsible ? inner.createEl("details") : inner;
      if (collapsible) {
        (group as HTMLDetailsElement).open = this.pos.bookId > 66;
        group.className = "ss-apocryphal-books";
      }
      const lbl = group.createEl(collapsible ? "summary" : "div");
      lbl.textContent = label;''')
s=s.replace('      const grid = inner.createEl("div");\n      grid.style.cssText', '      if (collapsible) lbl.style.cursor = "pointer";\n      const grid = group.createEl("div");\n      grid.style.cssText',1)
s=s.replace('      for (const book of books) {\n        const btn', '      if (collapsible) { grid.style.maxHeight = "36vh"; grid.style.overflowY = "auto"; }\n      for (const book of books) {\n        const btn',1)
s=s.replace('    renderGroup(NT_BOOKS, "New Testament");', '''    renderGroup(NT_BOOKS, "New Testament");
    const apocryphalSep = inner.createEl("div");
    apocryphalSep.style.cssText = sep.style.cssText;
    renderGroup(APOCRYPHAL_BOOKS, "Apocryphal");''')
p.write_text(s,encoding='utf8')
