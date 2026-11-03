from pathlib import Path
p=Path('src/main.ts');s=p.read_text('utf8');s=s.replace('  private disposed = false;', '  private disposed = false;\n  private recordingIndex = -1;')
s=s.replace('    if (this.settings.display.cardMode) this.tooltip.card.warm();','''    this.tooltip.card.onNavigate = direction => { void this.navigateRecordingCard(direction); };
    this.tooltip.cardContext = (ref, text, editor) => this.recordingContext(ref, text, editor);
    this.registerDomEvent(document, "keydown", (event: KeyboardEvent) => {
      if (!this.tooltip.card?.isVisible() || event.isComposing) return;
      if (event.key === "Escape") { event.preventDefault(); this.tooltip.card.hide(true); }
      if (event.altKey && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
        event.preventDefault(); void this.navigateRecordingCard(event.key === "ArrowRight" ? 1 : -1);
      }
    });''')
s=s.replace('this.addCommand({ id: "toggle-card-mode", name: "Toggle Card Mode (full-screen verse cards)",', 'this.addCommand({ id: "toggle-card-mode", name: "Toggle Card Mode (full-screen verse cards)",\n      hotkeys: [{modifiers: ["Mod", "Alt"], key: "c"}],')
s=s.replace('    this.addCommand({ id: "search-strongs"', '''    this.addCommand({ id: "next-recording-card", name: "Next recording card", callback: () => { void this.navigateRecordingCard(1); } });
    this.addCommand({ id: "previous-recording-card", name: "Previous recording card", callback: () => { void this.navigateRecordingCard(-1); } });
    this.addCommand({ id: "pin-recording-card", name: "Pin or unpin recording card", callback: () => this.tooltip.card?.togglePin() });
    this.addCommand({ id: "search-strongs"''')
a=s.index('  private cancelHoverTimer():')
s=s[:a]+'''  private async navigateRecordingCard(direction: number): Promise<void> {
    const editor = this.app.workspace.activeEditor?.editor;
    if (!editor) return;
    const refs = parseScriptureRefs(editor.getValue(), this.settings.primaryTranslation);
    if (!refs.length) return;
    const key = this.tooltip.card?.currentKeyOf();
    if (this.recordingIndex < 0 || refToString(refs[this.recordingIndex] ?? refs[0]) !== key) {
      this.recordingIndex = refs.findIndex(ref => refToString(ref) === key);
    }
    this.recordingIndex = (this.recordingIndex + direction + refs.length) % refs.length;
    await this.tooltip.showRecordingRef(refs[this.recordingIndex], editor);
  }

  private recordingContext(ref: ScriptureRef, text: string, editor: Editor | null): {noteText?: string; contrastText?: string} {
    if (!editor) return {};
    const content = editor.getValue();
    const near = editor.posToOffset(editor.getCursor());
    const matches = parseScriptureRefs(content, this.settings.primaryTranslation).filter(r => refToString(r) === refToString(ref));
    if (!matches.length) return {};
    const match = matches.reduce((a, b) => Math.abs(a.start - near) < Math.abs(b.start - near) ? a : b);
    const start = content.lastIndexOf("\\n\\n", match.start);
    const end = content.indexOf("\\n\\n", match.end);
    const paragraph = content.slice(start < 0 ? 0 : start + 2, end < 0 ? content.length : end);
    let noteText = text;
    for (const emphasis of paragraph.matchAll(/(\\*\\*\\*|\\*\\*)([^*]+)\\1/g)) {
      const phrase = emphasis[2];
      const at = noteText.toLowerCase().indexOf(phrase.toLowerCase());
      if (at >= 0) noteText = noteText.slice(0, at) + emphasis[1] + noteText.slice(at, at + phrase.length) + emphasis[1] + noteText.slice(at + phrase.length);
    }
    const slash = paragraph.indexOf(" / ");
    const previous = start >= 0 ? content.slice(0, start).split(/\\n\\s*\\n/).pop()?.trim() : "";
    const contrastText = (slash >= 0 ? paragraph.slice(0, slash) : previous) ?? "";
    return {noteText: noteText !== text ? noteText : undefined,
      contrastText: contrastText && contrastText.length <= 1000 && !/^#/.test(contrastText) ? contrastText : undefined};
  }

'''+s[a:]
s=s.replace('    let editorChangeTimer: ReturnType<typeof setTimeout> | null = null;', '    let editorChangeTimer: ReturnType<typeof setTimeout> | null = null;\n    this.register(() => { if (editorChangeTimer) clearTimeout(editorChangeTimer); });')
# Delete old eager text loaders: now handled by fetcher on demand.
a=s.index('  private async loadCrossRefData()');b=s.index('  private async loadInterlinearData()',a);s=s[:a]+s[b:]
p.write_text(s,encoding='utf8')
