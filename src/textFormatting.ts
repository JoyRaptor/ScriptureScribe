export interface PassageRun { text: string; styles: string[]; }
export function passageRuns(text: string): PassageRun[] {
  const runs: PassageRun[] = [];
  const parts = /(\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*|\[(\d+(?::\d+)?)\])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = parts.exec(text))) {
    runs.push({text: text.slice(last, m.index), styles: []});
    runs.push({text: m[2] ?? m[3] ?? m[4] ?? m[5], styles: m[2] ? ["em", "strong"] : [m[5] ? "sup" : m[3] ? "strong" : "em"]});
    last = parts.lastIndex;
  }
  runs.push({text: text.slice(last), styles: []});
  return runs;
}

/** Render our limited emphasis syntax without accepting HTML from data or notes. */
export function renderPassage(container: HTMLElement, text: string): void {
  container.textContent = "";
  for (const run of passageRuns(text)) {
    let node: Node = document.createTextNode(run.text);
    for (const style of run.styles) {
      const el = document.createElement(style);
      // A lone *word* is a KJV supplied word: styled quiet (styles.css), not like the theme's colored italics.
      if (style === "em" && run.styles.length === 1) el.className = "ss-supplied";
      el.appendChild(node); node = el;
    }
    container.appendChild(node);
  }
}
