from pathlib import Path
p=Path('src/bibleMode.ts');s=p.read_text('utf8');s='import { fetchInterlinear } from "./interlinear";\n'+s;s=s.replace('this.startWordSelection(span, verseKey);', 'this.startWordSelection(span, verseKey, tapX, tapY);')
a=s.index('  private startWordSelection(');b=s.index('\n  // ',a+40)
# Find next method after entire old selection implementation.
b=s.index('\n  private ',a+40)
s=s[:a]+'''  private startWordSelection(span: HTMLElement, verseKey: string, x: number, y: number): void {
    this.selectionCleanup?.();
    const selection = window.getSelection();
    const caret = (document as any).caretRangeFromPoint?.(x, y) as Range | undefined;
    if (caret && span.contains(caret.startContainer) && caret.startContainer.nodeType === Node.TEXT_NODE) {
      const text = caret.startContainer.textContent ?? "";
      let start = caret.startOffset, end = caret.startOffset;
      while (start > 0 && /[\\p{L}\\p{N}'’]/u.test(text[start - 1])) start--;
      while (end < text.length && /[\\p{L}\\p{N}'’]/u.test(text[end])) end++;
      caret.setStart(caret.startContainer, start); caret.setEnd(caret.startContainer, end);
      selection?.removeAllRanges(); selection?.addRange(caret);
    }
    span.style.userSelect = "text";
    const menu = document.createElement("div");
    menu.className = "ss-selection-actions";
    menu.style.cssText = "position:fixed;z-index:10001;display:flex;gap:6px;padding:6px;background:var(--background-primary);border:1px solid var(--background-modifier-border);border-radius:8px;";
    menu.addEventListener("pointerdown", event => event.preventDefault());
    const selectedText = () => {
      const current = window.getSelection();
      return current?.anchorNode && current.focusNode && span.contains(current.anchorNode) && span.contains(current.focusNode) ? current.toString().trim() : "";
    };
    const cleanup = () => { menu.remove(); document.removeEventListener("selectionchange", update); this.selectionCleanup = null; };
    const button = (label: string, action: () => void) => {
      const el = document.createElement("button"); el.textContent = label; el.title = label;
      el.addEventListener("click", event => { event.stopPropagation(); action(); }); menu.appendChild(el);
    };
    button("Search English", () => {
      const text = selectedText(); if (text) this.onOpenResearch?.(`search:${text}`, false); cleanup();
    });
    button("א Search original", () => {
      const text = selectedText();
      const ref = parseScriptureRefs(verseKey)[0];
      if (!text || !ref) return;
      void fetchInterlinear(ref, "both", this.settings.primaryTranslation).then(words => {
        const clean = (value: string) => value.toLowerCase().replace(/[^\\p{L}\\p{N}]/gu, "");
        const target = clean(text);
        const word = words.find(word => clean(word.english) === target) ??
          words.find(word => word.english.split(/\\s+/).some(part => clean(part) === target));
        if (word?.strongsNum || word?.original) this.onOpenResearch?.(`search:${word.strongsNum || word.original}`, true);
        else this.onOpenResearch?.(verseKey, true, text);
        cleanup();
      });
    });
    button("Done", cleanup);
    const update = () => {
      if (!selectedText()) { menu.style.display = "none"; return; }
      menu.style.display = "flex";
      const rect = window.getSelection()!.getRangeAt(0).getBoundingClientRect();
      menu.style.top = `${Math.max(4, rect.top - 48)}px`;
      menu.style.left = `${Math.max(4, Math.min(rect.left, window.innerWidth - menu.offsetWidth - 4))}px`;
    };
    document.body.appendChild(menu); document.addEventListener("selectionchange", update);
    this.selectionCleanup = cleanup;
    update();
  }
'''+s[b:]
s=s.replace('  destroy(): void {','  private selectionCleanup: (() => void) | null = null;\n\n  destroy(): void {\n    this.selectionCleanup?.();')
p.write_text(s,encoding='utf8')
p=Path('src/verseCard.ts');s=p.read_text('utf8');s=s.replace('  private pinned = false;','  private pinned = false;\n  private controlsHovered = false;');s=s.replace('if (this.pinned && !force) return;', 'if ((this.pinned || this.controlsHovered) && !force) return;');s=s.replace('      controls.addEventListener("pointerdown"', '      controls.addEventListener("mouseenter", () => { this.controlsHovered = true; });\n      controls.addEventListener("mouseleave", () => { this.controlsHovered = false; this.hide(); });\n      controls.addEventListener("pointerdown"');p.write_text(s,encoding='utf8')
p=Path('src/tooltip.ts');s=p.read_text('utf8').replace('this.card?.isVisible() ? 120 : 400','this.card?.isVisible() ? 1500 : 400');s=s.replace('if (on) this.card?.warm(); else this.card?.hide();', 'if (on) this.card?.warm(); else this.card?.hide(true);');p.write_text(s,encoding='utf8')
