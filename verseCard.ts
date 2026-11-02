// Full-screen verse card overlay ("Card Mode").
//
// The engine is the DURABLE half: it fetches nothing and styles nothing. It
// owns a transparent, click-through, full-screen <iframe> and feeds it a
// "skin" — any self-contained HTML page — through a tiny contract:
//
//   • elements marked data-ss="reference" | "text" | "version" get the verse
//   • <html data-state> walks idle → in → hold → out → idle
//   • the engine auto-sizes the verse text to fit its box (data-ss="text-box")
//
// The skin is the MODULAR half: all look, animation, JS and CSS live there.
// The full contract is written up in SKIN-GUIDE.md (seeded into the skins
// folder by verseCardSkins.ts). This file has no Obsidian imports so it can
// be exercised in a plain browser page.

export interface CardContent {
  /** Stable id (e.g. "John 3:16") — re-hovering the same verse is a no-op */
  key: string;
  reference: string;
  text: string;
  version: string;
  book: string;
  testament: "ot" | "nt" | "";
  palette: { base: string; light: string; mid: string; dark: string };
}

/** Injected at the top of every skin document. Runs INSIDE the iframe. */
const RUNTIME_SOURCE = `(function(){
  var root = document.documentElement;
  var timers = [];
  var state = "idle";
  var pending = null;
  function meta(name, dflt){
    var m = document.querySelector('meta[name="' + name + '"]');
    var v = m ? parseFloat(m.getAttribute("content")) : NaN;
    return isNaN(v) ? dflt : v;
  }
  function $(k){ return document.querySelector('[data-ss="' + k + '"]'); }
  function clear(){ while (timers.length) clearTimeout(timers.pop()); }
  function emit(name, detail){
    try { window.dispatchEvent(new CustomEvent("ss:" + name, { detail: detail })); } catch(e){}
  }
  function setState(s){
    state = s;
    root.setAttribute("data-state", s);
    emit(s, null);
  }
  function post(msg){ msg.ss = 1; parent.postMessage(msg, "*"); }

  var fitting = false;
  function fit(){
    var t = $("text");
    if (!t || fitting) return;
    var box = t.closest('[data-ss="text-box"]') || t.parentElement || document.body;
    var bw = box.clientWidth, bh = box.clientHeight;
    // Not laid out yet (hidden overlay, stale viewport): measuring now would
    // report "fits" at full size. The ResizeObserver below re-fits once real.
    if (!bw || !bh || !window.innerHeight) return;
    fitting = true;
    try {
      var lo = meta("ss-min-font", 16);
      var hi = meta("ss-max-font", Math.round(window.innerHeight * 0.085));
      // Area estimate caps the start size, so even a bad measurement can't overshoot wildly.
      var n = Math.max((t.textContent || "").length, 1);
      hi = Math.min(hi, Math.max(lo, Math.sqrt(0.9 * bw * bh / (0.7 * n)) * 1.25));
      if (hi < lo) hi = lo;
      var fits = function(px){
        t.style.fontSize = px + "px";
        return t.offsetHeight <= bh + 1 && t.scrollWidth <= bw + 1;
      };
      var ok = fits(hi);
      if (!ok){
        for (var i = 0; i < 12 && hi - lo > 0.5; i++){
          var mid = (lo + hi) / 2;
          if (fits(mid)) lo = mid; else hi = mid;
        }
        t.style.fontSize = Math.floor(lo * 10) / 10 + "px";
      }
      post({ type: "fit", px: t.style.fontSize, bw: bw, bh: bh, th: t.offsetHeight, ih: window.innerHeight, ok: ok });
    } finally { fitting = false; }
  }
  function watchBox(){
    var t = $("text");
    var box = t && (t.closest('[data-ss="text-box"]') || t.parentElement);
    if (box && window.ResizeObserver) new ResizeObserver(function(){ fit(); }).observe(box);
  }

  function fill(c){
    var map = { reference: c.reference, text: c.text, version: c.version, book: c.book };
    Object.keys(map).forEach(function(k){
      var els = document.querySelectorAll('[data-ss="' + k + '"]');
      for (var i = 0; i < els.length; i++) els[i].textContent = map[k];
    });
    var p = c.palette || {};
    root.style.setProperty("--ss-accent", p.base || "");
    root.style.setProperty("--ss-accent-light", p.light || "");
    root.style.setProperty("--ss-accent-mid", p.mid || "");
    root.style.setProperty("--ss-accent-dark", p.dark || "");
    root.setAttribute("data-testament", c.testament || "");
    root.setAttribute("data-book", c.book || "");
    var n = (c.text || "").length;
    root.setAttribute("data-length", n < 90 ? "short" : n < 200 ? "medium" : n < 400 ? "long" : "epic");
    emit("content", c); // skins may rebuild the text here (e.g. wrap words), so measure after
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  }

  function show(c){
    clear();
    root.removeAttribute("data-swapping");
    if (state === "in" || state === "hold"){
      // Already on screen: cross-fade the words instead of replaying the intro.
      root.setAttribute("data-swapping", "1");
      timers.push(setTimeout(function(){
        fill(c);
        root.removeAttribute("data-swapping");
      }, meta("ss-swap-ms", 260)));
      return;
    }
    if (state === "out"){ setState("idle"); void root.offsetWidth; }
    fill(c);
    void root.offsetWidth; // flush layout so the skin's "in" transitions actually animate
    setState("in");
    timers.push(setTimeout(fit, 120));
    timers.push(setTimeout(fit, 600));
    timers.push(setTimeout(function(){ setState("hold"); }, meta("ss-in-ms", 900)));
  }

  function hide(){
    if (state === "idle" || state === "out") return;
    clear();
    root.removeAttribute("data-swapping");
    setState("out");
    timers.push(setTimeout(function(){
      setState("idle");
      post({ type: "idle" });
    }, meta("ss-out-ms", 700)));
  }

  window.addEventListener("message", function(e){
    var m = e.data;
    if (!m || m.ss !== 1) return;
    if (m.type === "show") show(m.content);
    else if (m.type === "hide") hide();
  });
  window.addEventListener("resize", fit);
  root.setAttribute("data-state", "idle");
  function ready(){ watchBox(); post({ type: "ready" }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
})();`;

const FALLBACK_SKIN = `<!doctype html><html><head><meta charset="utf-8">
<style>
html,body{margin:0;height:100%;background:transparent;font-family:Georgia,serif;color:#fff}
body{display:flex;align-items:center;justify-content:center;background:#111;opacity:0;transition:opacity .6s}
html[data-state="in"] body,html[data-state="hold"] body{opacity:1}
[data-ss="text-box"]{width:80vw;height:50vh;display:flex;align-items:center;text-align:center}
</style></head><body><div style="text-align:center">
<div data-ss="text-box"><div data-ss="text"></div></div><div data-ss="reference"></div></div></body></html>`;

function injectRuntime(html: string): string {
  const tag = `<script>${RUNTIME_SOURCE.replace(/<\/script/gi, "<\\/script")}</script>`;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + tag);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + "<head>" + tag + "</head>");
  return `<!doctype html><html><head><meta charset="utf-8">${tag}</head><body>${html}</body></html>`;
}

export class VerseCard {
  private overlay: HTMLDivElement | null = null;
  private frame: HTMLIFrameElement | null = null;
  private frameSkin: string | null = null;
  private ready = false;
  private queue: any[] = [];
  private failsafe: ReturnType<typeof setTimeout> | null = null;
  private currentKey: string | null = null;
  private visible = false;
  private building: Promise<void> | null = null;
  private onMessage = (e: MessageEvent) => {
    if (!this.frame || e.source !== this.frame.contentWindow) return;
    const m = e.data;
    if (!m || m.ss !== 1) return;
    if (m.type === "ready") {
      this.ready = true;
      for (const q of this.queue) this.send(q);
      this.queue = [];
    } else if (m.type === "idle") {
      this.finishHide();
    }
  };

  /**
   * @param readSkin  returns the skin HTML for a skin name, or null for "use built-in"
   * @param getSkin   current skin name from settings ("" = built-in)
   * @param builtin   the bundled default skin HTML
   * @param hideCursor  true = hide the mouse pointer while the card is up
   */
  constructor(
    private readSkin: (name: string) => Promise<string | null>,
    private getSkin: () => string,
    private builtin: string,
    private hideCursor: () => boolean = () => false,
  ) {
    window.addEventListener("message", this.onMessage);
  }

  isVisible(): boolean { return this.visible; }
  currentKeyOf(): string | null { return this.currentKey; }

  /** Load the skin in the background so the first hover appears instantly */
  warm(): void { void this.ensureFrame(); }

  async show(c: CardContent): Promise<void> {
    if (this.failsafe) { clearTimeout(this.failsafe); this.failsafe = null; }
    if (this.visible && this.currentKey === c.key) return; // same verse re-entered
    this.currentKey = c.key;
    this.visible = true;
    this.setCursorHidden(this.hideCursor());
    await this.ensureFrame();
    if (!this.visible || this.currentKey !== c.key) return; // left while loading
    this.overlay!.style.display = "block";
    void this.overlay!.offsetHeight; // lay the iframe out before the skin measures its text
    this.send({ ss: 1, type: "show", content: c });
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.currentKey = null;
    this.queue = [];
    this.setCursorHidden(false); // pointer returns the moment you leave the verse
    if (!this.frame || !this.ready) { this.finishHide(); return; }
    this.send({ ss: 1, type: "hide" });
    // Safety net: if a broken skin never reports idle, don't leave a dead overlay up
    this.failsafe = setTimeout(() => this.finishHide(), 6000);
  }

  /** Drop the loaded skin so the next show() re-reads it (after settings change) */
  reloadSkin(): void {
    this.hide();
    this.finishHide();
    this.frame?.remove();
    this.frame = null;
    this.frameSkin = null;
    this.ready = false;
    this.queue = [];
  }

  destroy(): void {
    this.setCursorHidden(false);
    document.getElementById("ss-card-cursor-style")?.remove();
    window.removeEventListener("message", this.onMessage);
    if (this.failsafe) clearTimeout(this.failsafe);
    this.overlay?.remove();
    this.overlay = null;
    this.frame = null;
  }

  /** The pointer is drawn by the OS, so it can't be covered by the card — hide it instead. */
  private setCursorHidden(hide: boolean): void {
    if (hide && !document.getElementById("ss-card-cursor-style")) {
      const st = document.createElement("style");
      st.id = "ss-card-cursor-style";
      st.textContent = "html.ss-card-showing, html.ss-card-showing * { cursor: none !important; }";
      document.head.appendChild(st);
    }
    document.documentElement.classList.toggle("ss-card-showing", hide);
  }

  private finishHide(): void {
    if (this.failsafe) { clearTimeout(this.failsafe); this.failsafe = null; }
    if (!this.visible && this.overlay) this.overlay.style.display = "none";
  }

  private send(msg: any): void {
    if (!this.frame || !this.ready) { this.queue.push(msg); return; }
    this.frame.contentWindow?.postMessage(msg, "*");
  }

  private async ensureFrame(): Promise<void> {
    const want = this.getSkin();
    if (this.frame && this.frameSkin === want) return;
    if (this.building) return this.building;
    this.building = this.buildFrame(want).finally(() => { this.building = null; });
    return this.building;
  }

  private async buildFrame(name: string): Promise<void> {
    let html: string | null = null;
    if (name) {
      try { html = await this.readSkin(name); } catch { html = null; }
    }
    if (!html) html = this.builtin || FALLBACK_SKIN;

    if (!this.overlay) {
      const o = document.createElement("div");
      o.className = "ss-verse-card-overlay";
      o.style.cssText = "position:fixed;inset:0;z-index:100000;pointer-events:none;display:none;";
      document.body.appendChild(o);
      this.overlay = o;
    }
    this.frame?.remove();
    this.ready = false;
    const f = document.createElement("iframe");
    f.className = "ss-verse-card-frame";
    // Scripts allowed; no same-origin, so a skin can never reach into Obsidian.
    f.setAttribute("sandbox", "allow-scripts");
    f.setAttribute("aria-hidden", "true");
    f.setAttribute("tabindex", "-1");
    f.style.cssText = "width:100%;height:100%;border:0;background:transparent;color-scheme:normal;pointer-events:none;display:block;";
    f.srcdoc = injectRuntime(html);
    this.overlay.appendChild(f);
    this.frame = f;
    this.frameSkin = name;
  }
}
