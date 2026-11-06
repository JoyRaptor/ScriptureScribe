(()=>{function c(e){let t=[],a=/(\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*]+)\*|\[(\d+(?::\d+)?)\])/g,s=0,i;for(;i=a.exec(e);)t.push({text:e.slice(s,i.index),styles:[]}),t.push({text:i[2]??i[3]??i[4]??i[5],styles:i[2]?["em","strong"]:[i[5]?"sup":i[3]?"strong":"em"]}),s=a.lastIndex;return t.push({text:e.slice(s),styles:[]}),t}var F=`(function(){
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
  var lastFit = "";
  function fit(){
    var t = $("text");
    if (!t || fitting) return;
    var box = t.closest('[data-ss="text-box"]') || t.parentElement || document.body;
    var bw = box.clientWidth, bh = box.clientHeight;
    // Not laid out yet (hidden overlay, stale viewport): measuring now would
    // report "fits" at full size. The ResizeObserver below re-fits once real.
    if (!bw || !bh || !window.innerHeight) return;
    var fitKey = bw + ":" + bh + ":" + t.clientWidth + ":" + t.textContent + ":" + (document.fonts ? document.fonts.status : "");
    if (fitKey === lastFit) return;
    lastFit = fitKey;
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
    lastFit = ""; // new content/emphasis may change metrics; reveal-only skin classes do not
    var map = { reference: c.reference, text: c.runs ? c.runs.map(function(r){ return r.text; }).join("") : c.text, version: c.version, book: c.book };
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
    var textEl = $("text");
    if (textEl && c.runs) {
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
    }
    if (textEl) {
      var box = textEl.closest('[data-ss="text-box"]') || textEl.parentElement;
      var aside = box.querySelector('[data-ss="contrast"]');
      if (!aside) { aside = document.createElement("div"); aside.setAttribute("data-ss", "contrast"); box.insertBefore(aside, textEl); }
      aside.textContent = c.contrast || "";
      aside.style.cssText = "display:" + (c.contrast ? "block" : "none") + ";box-sizing:border-box;width:48%;max-height:100%;overflow:auto;padding:20px;border-right:1px solid currentColor;font-size:clamp(16px,2.4vw,36px);line-height:1.45;white-space:pre-wrap;";
      textEl.style.width = c.contrast ? "48%" : "";
      textEl.style.flex = c.contrast ? "0 1 48%" : "";
      box.style.gap = c.contrast ? "4%" : "";
    }
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
  function ready(){
    watchBox();
    // Let a cached webfont settle before the entrance; avoid a visible font swap.
    var fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.race([fonts, new Promise(function(resolve){ setTimeout(resolve, 1200); })])
      .then(function(){ post({ type: "ready" }); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
})();`;function f(e){let t=`<script>${F.replace(/<\/script/gi,"<\\/script")}<\/script>`;return/<head[^>]*>/i.test(e)?e.replace(/<head[^>]*>/i,a=>a+t):/<html[^>]*>/i.test(e)?e.replace(/<html[^>]*>/i,a=>a+"<head>"+t+"</head>"):`<!doctype html><html><head><meta charset="utf-8">${t}</head><body>${e}</body></html>`}function l(e){let t=e.replace(/^#/,""),a=parseInt(t.length===3?t.split("").map(s=>s+s).join(""):t,16);return[a>>16&255,a>>8&255,a&255]}function h(e,t,a){return"#"+[e,t,a].map(s=>Math.round(Math.max(0,Math.min(255,s))).toString(16).padStart(2,"0")).join("")}function m(e,t){let[a,s,i]=l(e);return h(a+(255-a)*t,s+(255-s)*t,i+(255-i)*t)}function z(e,t){let[a,s,i]=l(e);return h(a*(1-t),s*(1-t),i*(1-t))}function p(e){let[t,a,s]=l(e).map(i=>{let n=i/255;return n<=.03928?n/12.92:Math.pow((n+.055)/1.055,2.4)});return .2126*t+.7152*a+.0722*s}function v(e,t){let a=p(e),s=p(t),i=Math.max(a,s),n=Math.min(a,s);return(i+.05)/(n+.05)}function T(e){let[t,a,s]=l(e).map(E=>E/255),i=Math.max(t,a,s),n=Math.min(t,a,s),r=(i+n)/2;if(i===n)return[0,0,r];let o=i-n,S=r>.5?o/(2-i-n):o/(i+n);return[(i===t?(a-s)/o+(a<s?6:0):i===a?(s-t)/o+2:(t-a)/o+4)*60,S,r]}function L(e,t,a){let s=r=>(r+e/30)%12,i=t*Math.min(a,1-a),n=r=>a-i*Math.max(-1,Math.min(s(r)-3,Math.min(9-s(r),1)));return h(n(0)*255,n(8)*255,n(4)*255)}function u(e,t,a=5){let[s,i,n]=T(e);for(s>=46&&s<=72&&(s=40),i=Math.max(i,.85),n=Math.min(n,.6);n>.04;n-=.01){let r=L(s,i,n);if(v(r,t)>=a)return r}return"#14121f"}function P(e){return v(e,"#ffffff")>=3.5?"#ffffff":u(e,e,5)}function g(e){let t=m(e,.88);return{base:e,light:t,mid:m(e,.5),dark:z(e,.3),textOnLight:u(e,t),textOnVivid:P(e)}}var y=`<!doctype html>\r
<html lang="en">\r
<head>\r
<meta charset="utf-8">\r
<title>Violet &amp; Gold \u2014 built-in ScriptureScribe card skin</title>\r
<!-- Timing contract (milliseconds). The engine switches data-state from "in"\r
     to "hold" after ss-in-ms, and from "out" to "idle" after ss-out-ms. -->\r
<meta name="ss-in-ms"   content="1500">\r
<meta name="ss-out-ms"  content="850">\r
<meta name="ss-swap-ms" content="320">\r
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Cinzel:wght@500;600&display=swap">\r
<style>\r
  :root {\r
    /* Book colour from the plugin (falls back to royal violet) */\r
    --acc:   var(--ss-accent, #8f7dff);\r
    --acc-l: var(--ss-accent-light, #ddd6ff);\r
    --gold:  #ecdcae;\r
    --ivory: #f7f1e6;\r
    --ease:  cubic-bezier(.22, .8, .24, 1);\r
  }\r
  html, body { margin: 0; height: 100%; overflow: hidden; background: transparent; }\r
\r
  /* \u2500\u2500 Stage: the whole card fades as one \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\r
  .stage {\r
    position: fixed; inset: 0; overflow: hidden;\r
    opacity: 0;\r
    transition: opacity .6s cubic-bezier(.4, 0, .2, 1) .12s;\r
    background:\r
      radial-gradient(120% 85% at 50% -10%, #2c2070 0%, transparent 62%),\r
      radial-gradient(100% 80% at 50% 115%, #3b1b5e 0%, transparent 58%),\r
      linear-gradient(160deg, #0b0920 0%, #150f3a 52%, #09071d 100%);\r
  }\r
  html[data-state="in"] .stage, html[data-state="hold"] .stage {\r
    opacity: 1; transition: opacity .8s cubic-bezier(.3, 0, .2, 1);\r
  }\r
  html[data-state="idle"] *, html[data-state="idle"] *::before, html[data-state="idle"] *::after {\r
    animation-play-state: paused !important;\r
  }\r
\r
  /* \u2500\u2500 Living background (loops while the card is held) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\r
  .aurora {\r
    position: absolute; width: 85vmax; height: 85vmax; border-radius: 50%;\r
    filter: blur(70px); opacity: .55; mix-blend-mode: screen;\r
    background: radial-gradient(closest-side, rgba(143,125,255,.7), transparent);\r
    background: radial-gradient(closest-side, color-mix(in srgb, var(--acc) 72%, transparent), transparent);\r
  }\r
  .aurora.a1 { left: -30vmax; top: -45vmax; animation: drift1 26s ease-in-out infinite alternate; }\r
  .aurora.a2 {\r
    right: -35vmax; bottom: -50vmax; opacity: .38;\r
    background: radial-gradient(closest-side, rgba(200,90,200,.6), transparent);\r
    animation: drift2 32s ease-in-out infinite alternate;\r
  }\r
  @keyframes drift1 { to { transform: translate(18vmax, 12vmax) scale(1.18) rotate(25deg); } }\r
  @keyframes drift2 { to { transform: translate(-16vmax, -10vmax) scale(1.12) rotate(-20deg); } }\r
\r
  .rays {\r
    position: absolute; left: 50%; top: 50%; width: 220vmax; height: 220vmax;\r
    margin: -110vmax 0 0 -110vmax; opacity: .22; mix-blend-mode: screen;\r
    background: repeating-conic-gradient(from 0deg, rgba(255,240,200,.0) 0deg, rgba(255,240,200,.16) 3deg, rgba(255,240,200,0) 9deg, rgba(255,240,200,0) 24deg);\r
    -webkit-mask-image: radial-gradient(closest-side, #000 10%, transparent 70%);\r
            mask-image: radial-gradient(closest-side, #000 10%, transparent 70%);\r
    animation: spin 160s linear infinite;\r
  }\r
  @keyframes spin { to { transform: rotate(360deg); } }\r
\r
  .motes { position: absolute; inset: 0; pointer-events: none; }\r
  .motes i {\r
    position: absolute; bottom: -12px; left: var(--x); width: var(--s); height: var(--s);\r
    border-radius: 50%; background: #fff6d8; opacity: 0;\r
    box-shadow: 0 0 calc(var(--s) * 3) rgba(255,236,170,.9);\r
    animation: rise var(--d) linear var(--dl) infinite;\r
  }\r
  @keyframes rise {\r
    0%   { transform: translate(0, 0);                    opacity: 0; }\r
    12%  { opacity: var(--o); }\r
    85%  { opacity: var(--o); }\r
    100% { transform: translate(var(--dx), -112vh);       opacity: 0; }\r
  }\r
\r
  .vignette {\r
    position: absolute; inset: 0;\r
    background: radial-gradient(ellipse at center, transparent 45%, rgba(4,3,16,.72) 100%);\r
  }\r
\r
  /* \u2500\u2500 Frame: draws outward from the centre line \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\r
  .frame {\r
    position: absolute; inset: 4.6vh 3.2vw; box-sizing: border-box;\r
    border: 1px solid rgba(236,220,174,.5);\r
    clip-path: inset(0 50% 0 50%);\r
    transition: clip-path .55s cubic-bezier(.5, 0, .7, 0);\r
    box-shadow: inset 0 0 90px rgba(143,125,255,.14);\r
  }\r
  .frame.inner { inset: 6.6vh 4.7vw; border-color: rgba(236,220,174,.2); box-shadow: none; }\r
  html[data-state="in"] .frame, html[data-state="hold"] .frame {\r
    clip-path: inset(0 0 0 0);\r
    transition: clip-path 1.35s cubic-bezier(.65, 0, .2, 1) .3s;\r
  }\r
  html[data-state="in"] .frame.inner, html[data-state="hold"] .frame.inner { transition-delay: .5s; }\r
  .dia {\r
    position: absolute; width: 9px; height: 9px; background: var(--gold);\r
    transform: translate(-50%, -50%) rotate(45deg) scale(0); opacity: 0;\r
    box-shadow: 0 0 14px rgba(236,220,174,.8);\r
    transition: transform .3s ease, opacity .3s ease;\r
  }\r
  .dia.tl { left: 3.2vw;  top: 4.6vh; } .dia.tr { left: calc(100% - 3.2vw); top: 4.6vh; }\r
  .dia.bl { left: 3.2vw;  top: calc(100% - 4.6vh); } .dia.br { left: calc(100% - 3.2vw); top: calc(100% - 4.6vh); }\r
  html[data-state="in"] .dia, html[data-state="hold"] .dia {\r
    transform: translate(-50%, -50%) rotate(45deg) scale(1); opacity: 1;\r
    transition: transform .7s var(--ease) 1.45s, opacity .7s ease 1.45s;\r
  }\r
\r
  /* \u2500\u2500 Content \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\r
  .content {\r
    position: absolute; inset: 0; display: flex; flex-direction: column;\r
    align-items: center; justify-content: center; text-align: center;\r
    animation: breathe 14s ease-in-out infinite alternate;\r
  }\r
  @keyframes breathe { from { transform: scale(1); } to { transform: scale(1.014); } }\r
\r
  .orn {\r
    display: flex; align-items: center; gap: 1.1vw; margin-bottom: 3.2vh;\r
    opacity: 0; transform: scaleX(.3);\r
    transition: opacity .35s ease, transform .35s ease;\r
  }\r
  .orn span { display: block; width: 7vw; height: 1px; background: linear-gradient(90deg, transparent, var(--gold)); }\r
  .orn span:last-child { transform: scaleX(-1); }\r
  .orn b { width: 9px; height: 9px; background: var(--gold); transform: rotate(45deg); box-shadow: 0 0 16px rgba(236,220,174,.9); }\r
  html[data-state="in"] .orn, html[data-state="hold"] .orn {\r
    opacity: 1; transform: none; transition: opacity 1s ease .55s, transform 1.1s var(--ease) .55s;\r
  }\r
\r
  .quote {\r
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -66%);\r
    font: 700 46vh/1 "Cormorant Garamond", Georgia, serif; color: var(--acc-l); opacity: 0;\r
    transition: opacity .4s ease; pointer-events: none; user-select: none;\r
  }\r
  html[data-state="in"] .quote, html[data-state="hold"] .quote { opacity: .07; transition: opacity 1.6s ease .5s; }\r
\r
  [data-ss="text-box"] {\r
    position: relative; width: min(78vw, 1280px); height: 44vh;\r
    display: flex; align-items: center; justify-content: center;\r
  }\r
  [data-ss="text"] {\r
    width: 100%; font-family: "Cormorant Garamond", Georgia, "Times New Roman", serif;\r
    font-weight: 600; line-height: 1.26; color: var(--ivory);\r
    text-wrap: balance; text-shadow: 0 2px 34px rgba(143,125,255,.5), 0 1px 2px rgba(0,0,0,.5);\r
    transition: opacity .3s ease;\r
  }\r
  html[data-swapping] [data-ss="text"] { opacity: 0; }\r
  .w {\r
    display: inline-block; opacity: 0; transform: translateY(.42em); filter: blur(7px);\r
    transition: opacity .35s ease, transform .35s ease, filter .35s ease;\r
  }\r
  .w.pre { opacity: 0 !important; transform: translateY(.42em) !important; filter: blur(7px) !important; transition: none !important; }\r
  html[data-state="in"] .w, html[data-state="hold"] .w {\r
    opacity: 1; transform: none; filter: blur(0);\r
    transition: opacity .8s ease, transform .9s var(--ease), filter .8s ease;\r
    transition-delay: calc(var(--i) * var(--step, 40ms) + 650ms);\r
  }\r
\r
  .ref {\r
    margin-top: 3.4vh; font: 600 clamp(14px, 2.6vh, 30px)/1 Cinzel, Georgia, serif;\r
    letter-spacing: .85em; text-transform: uppercase; padding-left: .85em; /* optically re-centre tracked caps */\r
    background: linear-gradient(100deg, var(--acc-l) 0%, var(--acc-l) 38%, #ffffff 50%, var(--acc-l) 62%, var(--acc-l) 100%);\r
    background-size: 260% 100%; -webkit-background-clip: text; background-clip: text; color: transparent;\r
    opacity: 0; transform: translateY(14px);\r
    transition: opacity .3s ease, transform .3s ease, letter-spacing .4s ease;\r
    animation: shimmer 8s ease-in-out infinite;\r
  }\r
  @keyframes shimmer { 0%, 55% { background-position: 100% 0; } 85%, 100% { background-position: 0 0; } }\r
  html[data-state="in"] .ref, html[data-state="hold"] .ref {\r
    opacity: 1; transform: none; letter-spacing: .42em; padding-left: .42em;\r
    transition: opacity 1s ease 1.25s, transform 1.1s var(--ease) 1.25s, letter-spacing 1.8s var(--ease) 1.25s, padding-left 1.8s var(--ease) 1.25s;\r
  }\r
\r
  .ver {\r
    margin-top: 1.6vh; font: 500 clamp(10px, 1.6vh, 18px)/1 Cinzel, Georgia, serif;\r
    letter-spacing: .5em; padding-left: .5em; color: rgba(236,220,174,.55); opacity: 0;\r
    transition: opacity .3s ease;\r
  }\r
  html[data-state="in"] .ver, html[data-state="hold"] .ver { opacity: 1; transition: opacity 1.2s ease 1.7s; }\r
</style>\r
</head>\r
<body>\r
<div class="stage">\r
  <div class="aurora a1"></div>\r
  <div class="aurora a2"></div>\r
  <div class="rays"></div>\r
  <div class="motes"></div>\r
  <div class="vignette"></div>\r
  <div class="frame"></div><div class="frame inner"></div>\r
  <i class="dia tl"></i><i class="dia tr"></i><i class="dia bl"></i><i class="dia br"></i>\r
\r
  <div class="content">\r
    <div class="orn"><span></span><b></b><span></span></div>\r
    <div class="quote">&ldquo;</div>\r
    <div data-ss="text-box"><div data-ss="text">&nbsp;</div></div>\r
    <div class="ref" data-ss="reference"></div>\r
    <div class="ver" data-ss="version"></div>\r
  </div>\r
</div>\r
\r
<script>\r
(function () {\r
  // Drifting golden motes \u2014 randomised once, loop forever.\r
  var motes = document.querySelector(".motes");\r
  for (var i = 0; i < 36; i++) {\r
    var m = document.createElement("i");\r
    var s = (1.5 + Math.random() * 3.5).toFixed(1);\r
    m.style.cssText =\r
      "--x:" + (Math.random() * 100).toFixed(1) + "%;--s:" + s + "px;" +\r
      "--d:" + (16 + Math.random() * 18).toFixed(1) + "s;" +\r
      "--dl:-" + (Math.random() * 34).toFixed(1) + "s;" +\r
      "--o:" + (0.35 + Math.random() * 0.55).toFixed(2) + ";" +\r
      "--dx:" + ((Math.random() - 0.5) * 18).toFixed(1) + "vw";\r
    motes.appendChild(m);\r
  }\r
\r
  // Warm the web fonts so the first verse never flashes a fallback face.\r
  if (document.fonts && document.fonts.load) {\r
    document.fonts.load('600 40px "Cormorant Garamond"');\r
    document.fonts.load('600 20px "Cinzel"');\r
  }\r
\r
  // Split the verse into words so they can rise in one after another.\r
  window.addEventListener("ss:content", function () {\r
    var el = document.querySelector('[data-ss="text"]');\r
    if (!el) return;\r
    var words = (el.textContent || "").split(/\\s+/).filter(Boolean);\r
    el.textContent = "";\r
    el.style.setProperty("--step", Math.min(55, 1100 / Math.max(words.length, 1)).toFixed(1) + "ms");\r
    words.forEach(function (w, idx) {\r
      var span = document.createElement("span");\r
      span.className = "w pre";\r
      span.style.setProperty("--i", idx);\r
      span.textContent = w;\r
      el.appendChild(span);\r
      if (idx < words.length - 1) el.appendChild(document.createTextNode(" "));\r
    });\r
    // Reveal on the next frames so the rise transition runs even when swapping verses mid-hold.\r
    requestAnimationFrame(function () { requestAnimationFrame(function () {\r
      el.querySelectorAll(".w.pre").forEach(function (s) { s.classList.remove("pre"); });\r
    }); });\r
  });\r
})();\r
<\/script>\r
</body>\r
</html>\r
`;var x=`<!doctype html>\r
<html lang="en">\r
<!-- ss-starter v5 \u2014 the plugin refreshes this file on updates. Delete this line, or save a copy under a new name, to keep your own edits. -->\r
<head>\r
<meta charset="utf-8">\r
<title>Velvet Aurora \u2014 wispy light show in the Royal Velvet theme colours</title>\r
<meta name="ss-in-ms"   content="1600">\r
<meta name="ss-out-ms"  content="900">\r
<meta name="ss-swap-ms" content="340">\r
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Cinzel:wght@600&display=swap">\r
<style>\r
  @property --drift { syntax: "<number>"; initial-value: 0; inherits: true; }\r
  :root {\r
    --ease:  cubic-bezier(.22, .8, .24, 1);\r
    --paper: hsl(60 30% 96%);\r
  }\r
  html, body { margin: 0; height: 100%; overflow: hidden; background: transparent; }\r
\r
  .stage {\r
    position: fixed; inset: 0; overflow: hidden; opacity: 0;\r
    transition: opacity .6s cubic-bezier(.4, 0, .2, 1) .12s;\r
    background:\r
      radial-gradient(120% 85% at 50% -10%, hsl(250 38% 24%) 0%, transparent 62%),\r
      radial-gradient(100% 80% at 50% 115%, hsl(300 30% 20%) 0%, transparent 58%),\r
      linear-gradient(160deg, hsl(235 16% 10%) 0%, hsl(240 18% 15%) 52%, hsl(235 20% 8%) 100%);\r
    animation: drift 50s linear infinite;\r
  }\r
  @keyframes drift { to { --drift: 360; } }\r
  html[data-state="in"] .stage, html[data-state="hold"] .stage { opacity: 1; transition: opacity .8s cubic-bezier(.3, 0, .2, 1); }\r
  html[data-state="idle"] *, html[data-state="idle"] *::before, html[data-state="idle"] *::after {\r
    animation-play-state: paused !important;\r
  }\r
\r
  /* \u2500\u2500 Living aurora: four palette blobs that drift, merge and slowly change hue \u2500\u2500 */\r
  .auroras { position: absolute; inset: 0; animation: hue 80s linear infinite; }\r
  @keyframes hue { to { filter: hue-rotate(360deg); } }\r
  .a { position: absolute; width: 80vmax; height: 80vmax; border-radius: 50%; filter: blur(80px); mix-blend-mode: screen; opacity: .42; }\r
  .a1 { left: -28vmax; top: -42vmax; background: radial-gradient(closest-side, hsl(200 100% 66% / .85), transparent); animation: d1 28s ease-in-out infinite alternate; }\r
  .a2 { right: -34vmax; top: -30vmax; background: radial-gradient(closest-side, hsl(285 100% 68% / .8), transparent); animation: d2 34s ease-in-out infinite alternate; }\r
  .a3 { left: -26vmax; bottom: -48vmax; background: radial-gradient(closest-side, hsl(330 100% 68% / .7), transparent); animation: d2 30s ease-in-out infinite alternate-reverse; }\r
  .a4 { right: -30vmax; bottom: -46vmax; background: radial-gradient(closest-side, hsl(115 90% 62% / .55), transparent); animation: d1 38s ease-in-out infinite alternate-reverse; }\r
  @keyframes d1 { to { transform: translate(16vmax, 12vmax) scale(1.2) rotate(25deg); } }\r
  @keyframes d2 { to { transform: translate(-15vmax, 10vmax) scale(1.14) rotate(-22deg); } }\r
\r
  .rays {\r
    position: absolute; left: 50%; top: 50%; width: 220vmax; height: 220vmax; margin: -110vmax 0 0 -110vmax;\r
    opacity: .2; mix-blend-mode: screen;\r
    background: repeating-conic-gradient(from 0deg, transparent 0deg, hsl(60 100% 90% / .17) 3deg, transparent 9deg, transparent 24deg);\r
    -webkit-mask-image: radial-gradient(closest-side, #000 10%, transparent 70%);\r
            mask-image: radial-gradient(closest-side, #000 10%, transparent 70%);\r
    animation: spin 170s linear infinite;\r
  }\r
  @keyframes spin { to { transform: rotate(360deg); } }\r
\r
  .motes i {\r
    position: absolute; bottom: -12px; left: var(--x); width: var(--s); height: var(--s); border-radius: 50%;\r
    background: hsl(var(--c) 100% 88%); opacity: 0; box-shadow: 0 0 calc(var(--s) * 3) hsl(var(--c) 100% 75% / .9);\r
    animation: rise var(--d) linear var(--dl) infinite;\r
  }\r
  @keyframes rise {\r
    0% { transform: translate(0, 0); opacity: 0; } 12% { opacity: var(--o); } 85% { opacity: var(--o); }\r
    100% { transform: translate(var(--dx), -112vh); opacity: 0; }\r
  }\r
  .vignette { position: absolute; inset: 0; background: radial-gradient(ellipse at center, transparent 45%, rgba(4,3,16,.7) 100%); }\r
\r
  /* \u2500\u2500 Frame draws outward from the centre line; colour drifts around the wheel \u2500\u2500 */\r
  .frame {\r
    position: absolute; inset: 4.6vh 3.2vw; box-sizing: border-box;\r
    border: 1px solid hsl(calc(250 + var(--drift)) 100% 82% / .55);\r
    clip-path: inset(0 50% 0 50%); transition: clip-path .55s cubic-bezier(.5, 0, .7, 0);\r
    box-shadow: inset 0 0 90px hsl(calc(250 + var(--drift)) 100% 70% / .14);\r
  }\r
  .frame.inner { inset: 6.6vh 4.7vw; border-color: hsl(calc(330 + var(--drift)) 100% 82% / .25); box-shadow: none; }\r
  html[data-state="in"] .frame, html[data-state="hold"] .frame { clip-path: inset(0 0 0 0); transition: clip-path 1.4s cubic-bezier(.65, 0, .2, 1) .3s; }\r
  html[data-state="in"] .frame.inner, html[data-state="hold"] .frame.inner { transition-delay: .5s; }\r
  .dia {\r
    position: absolute; width: 9px; height: 9px; transform: translate(-50%, -50%) rotate(45deg) scale(0); opacity: 0;\r
    background: hsl(calc(var(--c) + var(--drift)) 100% 82%); box-shadow: 0 0 14px hsl(calc(var(--c) + var(--drift)) 100% 72% / .9);\r
    transition: transform .3s ease, opacity .3s ease;\r
  }\r
  .dia.tl { --c: 200; left: 3.2vw; top: 4.6vh; } .dia.tr { --c: 285; left: calc(100% - 3.2vw); top: 4.6vh; }\r
  .dia.bl { --c: 115; left: 3.2vw; top: calc(100% - 4.6vh); } .dia.br { --c: 330; left: calc(100% - 3.2vw); top: calc(100% - 4.6vh); }\r
  html[data-state="in"] .dia, html[data-state="hold"] .dia {\r
    transform: translate(-50%, -50%) rotate(45deg) scale(1); opacity: 1; transition: transform .7s var(--ease) 1.5s, opacity .7s ease 1.5s;\r
  }\r
\r
  /* \u2500\u2500 Content \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\r
  .content {\r
    position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;\r
    animation: breathe 14s ease-in-out infinite alternate;\r
  }\r
  @keyframes breathe { from { transform: scale(1); } to { transform: scale(1.014); } }\r
\r
  .orn { display: flex; align-items: center; gap: 1.1vw; margin-bottom: 3.2vh; opacity: 0; transform: scaleX(.3); transition: opacity .35s ease, transform .35s ease; }\r
  .orn span { display: block; width: 7vw; height: 1px; background: linear-gradient(90deg, transparent, hsl(calc(285 + var(--drift)) 100% 82%)); }\r
  .orn span:last-child { transform: scaleX(-1); }\r
  .orn b { width: 9px; height: 9px; transform: rotate(45deg); background: hsl(calc(330 + var(--drift)) 100% 84%); box-shadow: 0 0 16px hsl(calc(330 + var(--drift)) 100% 72%); }\r
  html[data-state="in"] .orn, html[data-state="hold"] .orn { opacity: 1; transform: none; transition: opacity 1s ease .55s, transform 1.1s var(--ease) .55s; }\r
\r
  [data-ss="text-box"] { position: relative; width: min(78vw, 1280px); height: 44vh; display: flex; align-items: center; justify-content: center; }\r
  [data-ss="text"] {\r
    width: 100%; font-family: Lora, Georgia, serif; font-weight: 600; line-height: 1.3; color: var(--paper);\r
    text-wrap: balance; transition: opacity .3s ease;\r
  }\r
  html[data-swapping] [data-ss="text"] { opacity: 0; }\r
  .w {\r
    display: inline-block; opacity: 0; transform: translateY(.42em); filter: blur(7px);\r
    color: hsl(calc(var(--h) + var(--drift)) 100% 85%);\r
    text-shadow: 0 0 .5em hsl(calc(var(--h) + var(--drift)) 100% 68% / .55), 0 1px 2px rgba(0,0,0,.5);\r
    transition: opacity .35s ease, transform .35s ease, filter .35s ease;\r
  }\r
  .w.pre { opacity: 0 !important; transform: translateY(.42em) !important; filter: blur(7px) !important; transition: none !important; }\r
  html[data-state="in"] .w, html[data-state="hold"] .w {\r
    opacity: 1; transform: none; filter: blur(0);\r
    transition: opacity .8s ease, transform .9s var(--ease), filter .8s ease;\r
    transition-delay: calc(var(--i) * var(--step, 40ms) + 650ms);\r
  }\r
\r
  .ref {\r
    margin-top: 3.4vh; font: 600 clamp(14px, 2.6vh, 30px)/1 Cinzel, Georgia, serif; letter-spacing: .85em; padding-left: .85em; text-transform: uppercase;\r
    background: linear-gradient(100deg, hsl(200 100% 80%), hsl(285 100% 82%), hsl(330 100% 82%), hsl(10 100% 82%), hsl(60 100% 85%), hsl(115 100% 80%), hsl(200 100% 80%));\r
    background-size: 300% 100%; -webkit-background-clip: text; background-clip: text; color: transparent;\r
    opacity: 0; transform: translateY(14px); transition: opacity .3s ease, transform .3s ease, letter-spacing .4s ease;\r
    animation: flow 9s linear infinite;\r
  }\r
  @keyframes flow { to { background-position: 300% 0; } }\r
  html[data-state="in"] .ref, html[data-state="hold"] .ref {\r
    opacity: 1; transform: none; letter-spacing: .42em; padding-left: .42em;\r
    transition: opacity 1s ease 1.3s, transform 1.1s var(--ease) 1.3s, letter-spacing 1.8s var(--ease) 1.3s, padding-left 1.8s var(--ease) 1.3s;\r
  }\r
  .ver {\r
    margin-top: 1.6vh; font: 600 clamp(10px, 1.6vh, 18px)/1 Cinzel, Georgia, serif; letter-spacing: .5em; padding-left: .5em;\r
    color: hsl(235 14% 72% / .7); opacity: 0; transition: opacity .3s ease;\r
  }\r
  html[data-state="in"] .ver, html[data-state="hold"] .ver { opacity: 1; transition: opacity 1.2s ease 1.8s; }\r
</style>\r
</head>\r
<body>\r
<div class="stage">\r
  <div class="auroras"><div class="a a1"></div><div class="a a2"></div><div class="a a3"></div><div class="a a4"></div></div>\r
  <div class="rays"></div>\r
  <div class="motes"></div>\r
  <div class="vignette"></div>\r
  <div class="frame"></div><div class="frame inner"></div>\r
  <i class="dia tl"></i><i class="dia tr"></i><i class="dia bl"></i><i class="dia br"></i>\r
\r
  <div class="content">\r
    <div class="orn"><span></span><b></b><span></span></div>\r
    <div data-ss="text-box"><div data-ss="text">&nbsp;</div></div>\r
    <div class="ref" data-ss="reference"></div>\r
    <div class="ver" data-ss="version"></div>\r
  </div>\r
</div>\r
\r
<script>\r
(function () {\r
  var HUES = [200, 250, 285, 330, 10, 60, 115, 170];\r
  var motes = document.querySelector(".motes");\r
  for (var i = 0; i < 38; i++) {\r
    var m = document.createElement("i");\r
    m.style.cssText =\r
      "--x:" + (Math.random() * 100).toFixed(1) + "%;--s:" + (1.5 + Math.random() * 3.5).toFixed(1) + "px;" +\r
      "--c:" + HUES[i % HUES.length] + ";--d:" + (16 + Math.random() * 18).toFixed(1) + "s;" +\r
      "--dl:-" + (Math.random() * 34).toFixed(1) + "s;--o:" + (0.35 + Math.random() * 0.55).toFixed(2) + ";" +\r
      "--dx:" + ((Math.random() - 0.5) * 18).toFixed(1) + "vw";\r
    motes.appendChild(m);\r
  }\r
  if (document.fonts && document.fonts.load) {\r
    document.fonts.load('600 40px Lora');\r
    document.fonts.load('600 20px Cinzel');\r
  }\r
\r
  var STOPS = [200, 250, 285, 330, 370, 420, 475, 530];\r
  function hueAt(t) {\r
    var p = Math.max(0, Math.min(0.9999, t)) * (STOPS.length - 1);\r
    var k = Math.floor(p), f = p - k;\r
    return Math.round(STOPS[k] + (STOPS[k + 1] - STOPS[k]) * f);\r
  }\r
\r
  window.addEventListener("ss:content", function () {\r
    var el = document.querySelector('[data-ss="text"]');\r
    if (!el) return;\r
    var words = (el.textContent || "").split(/\\s+/).filter(Boolean);\r
    var n = words.length, span = Math.min(1, n / 16), made = [];\r
    el.textContent = "";\r
    el.style.setProperty("--step", Math.min(55, 1100 / Math.max(n, 1)).toFixed(1) + "ms");\r
    words.forEach(function (w, idx) {\r
      var s = document.createElement("span");\r
      s.className = "w pre";\r
      s.style.setProperty("--i", idx);\r
      s.style.setProperty("--h", hueAt((idx + 0.5) / n * span));\r
      s.textContent = w;\r
      el.appendChild(s);\r
      if (idx < n - 1) el.appendChild(document.createTextNode(" "));\r
      made.push(s);\r
    });\r
    requestAnimationFrame(function () { requestAnimationFrame(function () {\r
      made.forEach(function (s) { s.classList.remove("pre"); });\r
    }); });\r
  });\r
})();\r
<\/script>\r
</body>\r
</html>\r
`;var b=`<!doctype html>\r
<html lang="en">\r
<!-- ss-starter v5 \u2014 the plugin refreshes this file on updates. Delete this line, or save a copy under a new name, to keep your own edits. -->\r
<head>\r
<meta charset="utf-8">\r
<title>Velvet Rainbow \u2014 highlighter card in the Royal Velvet theme colours</title>\r
<meta name="ss-in-ms"   content="1400">\r
<meta name="ss-out-ms"  content="800">\r
<meta name="ss-swap-ms" content="320">\r
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Inter:wght@600;700&display=swap">\r
<style>\r
  @property --ang   { syntax: "<angle>";  initial-value: 0deg; inherits: false; }\r
  @property --drift { syntax: "<number>"; initial-value: 0;     inherits: true;  }\r
  :root {\r
    --ink:   hsl(235 14% 14%);\r
    --paper: hsl(60 30% 96%);\r
    --ease:  cubic-bezier(.22, .8, .24, 1);\r
    --spring: cubic-bezier(.34, 1.45, .5, 1);\r
    --rainbow: hsl(200 100% 75%), hsl(250 100% 75%), hsl(285 100% 75%), hsl(330 100% 75%),\r
               hsl(10 100% 75%), hsl(60 100% 75%), hsl(115 100% 75%), hsl(170 100% 75%), hsl(200 100% 75%);\r
  }\r
  html, body { margin: 0; height: 100%; overflow: hidden; background: transparent; }\r
\r
  .stage {\r
    position: fixed; inset: 0; overflow: hidden;\r
    display: flex; align-items: center; justify-content: center;\r
    opacity: 0; transition: opacity .5s cubic-bezier(.4, 0, .2, 1) .1s;\r
    background:\r
      radial-gradient(90% 70% at 20% 0%, hsl(250 30% 22%) 0%, transparent 60%),\r
      linear-gradient(135deg, hsl(235 15% 10%) 0%, hsl(235 17% 18%) 50%, hsl(240 20% 9%) 100%);\r
    animation: drift 45s linear infinite;               /* colours flow slowly while held */\r
  }\r
  @keyframes drift { to { --drift: 360; } }\r
  html[data-state="in"] .stage, html[data-state="hold"] .stage { opacity: 1; transition: opacity .7s cubic-bezier(.3, 0, .2, 1); }\r
  html[data-state="idle"] *, html[data-state="idle"] *::before, html[data-state="idle"] *::after {\r
    animation-play-state: paused !important;\r
  }\r
\r
  /* Rainbow glow behind the card \u2014 bursts on entry, then breathes.\r
     Compositor-only animation (transform/opacity on a statically blurred layer):\r
     animating filter or a gradient angle re-paints the whole blur every frame,\r
     which flickers on phones. */\r
  .glow {\r
    position: absolute; left: 50%; top: 50%; width: 130vmin; height: 86vmin; margin: -43vmin 0 0 -65vmin;\r
    opacity: 0; transform: scale(.6) translateZ(0); will-change: transform, opacity;\r
    transition: opacity .5s ease, transform .5s ease;\r
  }\r
  .glow i {\r
    position: absolute; inset: 0; border-radius: 50%; filter: blur(90px);\r
    background: conic-gradient(from 0deg, var(--rainbow));\r
    will-change: transform, opacity; backface-visibility: hidden;\r
    animation: spin 24s linear infinite, pulse 6s ease-in-out infinite alternate;\r
  }\r
  html[data-state="in"] .glow, html[data-state="hold"] .glow { opacity: .3; transform: scale(1) translateZ(0); transition: opacity 1.6s ease .1s, transform 1.8s var(--ease) .1s; }\r
  @keyframes spin  { to { transform: rotate(360deg); } }\r
  @keyframes spinang { to { --ang: 360deg; } }\r
  @keyframes pulse { from { opacity: .7; } to { opacity: 1; } }\r
\r
  .vignette { position: absolute; inset: 0; background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,.5) 100%); }\r
\r
  /* Twinkling stars */\r
  .stars i {\r
    position: absolute; left: var(--x); top: var(--y); width: var(--s); height: var(--s);\r
    background: hsl(var(--c) 100% 88%); opacity: 0;\r
    clip-path: polygon(50% 0, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0 50%, 40% 40%);\r
    filter: drop-shadow(0 0 6px hsl(var(--c) 100% 75%));\r
    animation: twinkle var(--d) ease-in-out var(--dl) infinite;\r
  }\r
  @keyframes twinkle { 0%, 100% { opacity: 0; transform: scale(.3) rotate(0); } 50% { opacity: .95; transform: scale(1) rotate(45deg); } }\r
\r
  /* \u2500\u2500 Card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\r
  .float { animation: float 7s ease-in-out infinite alternate; }\r
  @keyframes float { from { transform: translateY(-.7vh); } to { transform: translateY(.7vh); } }\r
\r
  .card {\r
    position: relative; box-sizing: border-box; padding: 5.2vh 4.4vw 4.4vh;\r
    border-radius: 2.4vmin; text-align: center;\r
    background: linear-gradient(160deg, hsla(235,15%,17%,.95), hsla(235,17%,12%,.97));\r
    box-shadow: 0 4vh 12vh rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.07);\r
    opacity: 0; transform: translateY(7vh) scale(.9) rotate(-1.2deg);\r
    transition: opacity .4s ease, transform .5s ease;\r
  }\r
  html[data-state="in"] .card, html[data-state="hold"] .card {\r
    opacity: 1; transform: none; transition: opacity .6s ease .05s, transform 1.1s var(--spring) .05s;\r
  }\r
  .card::before {                                         /* travelling rainbow hairline */\r
    content: ""; position: absolute; inset: -2px; border-radius: inherit; padding: 2px;\r
    background: conic-gradient(from var(--ang), var(--rainbow));\r
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);\r
    -webkit-mask-composite: xor; mask-composite: exclude;\r
    opacity: .9; animation: spinang 7s linear infinite; pointer-events: none;\r
  }\r
\r
  .ref {\r
    font: 700 clamp(14px, 2.7vh, 32px)/1 Inter, system-ui, sans-serif;\r
    letter-spacing: .8em; padding-left: .8em; text-transform: uppercase;\r
    color: hsl(calc(10 + var(--drift)) 100% 76%);\r
    opacity: 0; transform: translateY(-1.6vh);\r
    transition: opacity .3s ease, transform .3s ease, letter-spacing .3s ease;\r
  }\r
  html[data-state="in"] .ref, html[data-state="hold"] .ref {\r
    opacity: 1; transform: none; letter-spacing: .5em; padding-left: .5em;\r
    transition: opacity .8s ease .45s, transform .9s var(--ease) .45s, letter-spacing 1.4s var(--ease) .45s, padding-left 1.4s var(--ease) .45s;\r
  }\r
  .rule {\r
    height: 3px; width: 0; margin: 2.2vh auto 3.4vh; border-radius: 2px;\r
    background: linear-gradient(90deg, var(--rainbow), var(--rainbow)); background-size: 200% 100%;\r
    animation: slide 5s linear infinite; transition: width .3s ease;\r
  }\r
  html[data-state="in"] .rule, html[data-state="hold"] .rule { width: 18vw; transition: width 1s var(--ease) .55s; }\r
  @keyframes slide { to { background-position: 200% 0; } }\r
\r
  [data-ss="text-box"] { width: min(72vw, 1180px); height: 42vh; display: flex; align-items: center; justify-content: center; }\r
  [data-ss="text"] {\r
    width: 100%; font-family: Lora, Georgia, serif; font-weight: 600; line-height: 1.62;\r
    color: var(--ink); text-wrap: balance; transition: opacity .3s ease;\r
  }\r
  html[data-swapping] [data-ss="text"] { opacity: 0; }\r
\r
  /* Each word is a highlighter swipe. Colours drift; words "boil" like stop-motion. */\r
  .w {\r
    display: inline-block; padding: .04em .125em; margin: 0 -.14em; line-height: 1.3; color: var(--ink);\r
    background: linear-gradient(90deg, hsl(calc(var(--h) + var(--drift)) 95% 79%), hsl(calc(var(--h2) + var(--drift)) 95% 79%));\r
    clip-path: inset(0 100% 0 0);\r
    transition: clip-path .25s ease;\r
    animation: boil var(--bd, .56s) step-end infinite; animation-delay: calc(var(--i) * -.071s);\r
  }\r
  .w.pre { clip-path: inset(0 100% 0 0) !important; transition: none !important; }\r
  html[data-state="in"] .w, html[data-state="hold"] .w {\r
    clip-path: inset(-4% -1% -4% -1%);\r
    transition: clip-path .45s var(--ease); transition-delay: calc(var(--i) * var(--step, 40ms) + 420ms);\r
  }\r
  @keyframes boil {\r
    0%   { transform: translate(0, 0) rotate(0); }\r
    25%  { transform: translate(.012em, -.02em) rotate(.45deg); }\r
    50%  { transform: translate(-.01em, .015em) rotate(-.4deg); }\r
    75%  { transform: translate(.008em, .02em) rotate(.25deg); }\r
  }\r
\r
  .ver {\r
    margin-top: 3vh; display: inline-block; padding: .55em 1.3em .5em;\r
    font: 700 clamp(10px, 1.7vh, 18px)/1 Inter, system-ui, sans-serif; letter-spacing: .4em; text-indent: .4em;\r
    color: hsl(235 12% 72%); border: 1px solid hsl(235 12% 34%); border-radius: 99px;\r
    opacity: 0; transition: opacity .3s ease;\r
  }\r
  html[data-state="in"] .ver, html[data-state="hold"] .ver { opacity: 1; transition: opacity 1s ease 1.3s; }\r
</style>\r
</head>\r
<body>\r
<div class="stage">\r
  <div class="glow"><i></i></div>\r
  <div class="stars"></div>\r
  <div class="vignette"></div>\r
  <div class="float">\r
    <div class="card">\r
      <div class="ref" data-ss="reference"></div>\r
      <div class="rule"></div>\r
      <div data-ss="text-box"><div data-ss="text">&nbsp;</div></div>\r
      <div class="ver" data-ss="version"></div>\r
    </div>\r
  </div>\r
</div>\r
\r
<script>\r
(function () {\r
  if (document.fonts && document.fonts.load) {\r
    document.fonts.load('600 40px Lora');\r
    document.fonts.load('700 20px Inter');\r
  }\r
  var stars = document.querySelector(".stars");\r
  var HUES = [200, 250, 285, 330, 10, 60, 115, 170];\r
  for (var k = 0; k < 18; k++) {\r
    var st = document.createElement("i");\r
    st.style.cssText =\r
      "--x:" + (Math.random() * 96 + 2).toFixed(1) + "%;--y:" + (Math.random() * 90 + 4).toFixed(1) + "%;" +\r
      "--s:" + (10 + Math.random() * 20).toFixed(0) + "px;--c:" + HUES[k % HUES.length] + ";" +\r
      "--d:" + (3 + Math.random() * 4).toFixed(1) + "s;--dl:-" + (Math.random() * 7).toFixed(1) + "s";\r
    stars.appendChild(st);\r
  }\r
\r
  // Blue \u2192 purple \u2192 pink \u2192 red \u2192 yellow \u2192 green \u2192 teal (the theme's rainbow order).\r
  var STOPS = [200, 250, 285, 330, 370, 420, 475, 530];\r
  function hueAt(t) {\r
    var p = Math.max(0, Math.min(0.9999, t)) * (STOPS.length - 1);\r
    var i = Math.floor(p), f = p - i;\r
    return Math.round(STOPS[i] + (STOPS[i + 1] - STOPS[i]) * f);\r
  }\r
\r
  window.addEventListener("ss:content", function () {\r
    var el = document.querySelector('[data-ss="text"]');\r
    if (!el) return;\r
    var words = (el.textContent || "").split(/\\s+/).filter(Boolean);\r
    var n = words.length;\r
    var span = Math.min(1, n / 16);              // short verses use a shorter slice of the rainbow\r
    el.textContent = "";\r
    el.style.setProperty("--step", Math.min(50, 900 / Math.max(n, 1)).toFixed(1) + "ms");\r
    var made = [];\r
    words.forEach(function (w, idx) {\r
      var s = document.createElement("span");\r
      s.className = "w pre";                       // start hidden, even when swapping verses mid-hold\r
      s.style.setProperty("--i", idx);\r
      s.style.setProperty("--h",  hueAt(idx / n * span));\r
      s.style.setProperty("--h2", hueAt((idx + 1) / n * span));\r
      s.style.setProperty("--bd", (0.5 + (idx % 5) * 0.035).toFixed(3) + "s");\r
      s.textContent = w;\r
      el.appendChild(s);\r
      if (idx < n - 1) el.appendChild(document.createTextNode(" "));\r
      made.push(s);\r
    });\r
    // Reveal on the next frames so the swipe transition always runs.\r
    requestAnimationFrame(function () { requestAnimationFrame(function () {\r
      made.forEach(function (s) { s.classList.remove("pre"); });\r
    }); });\r
  });\r
})();\r
<\/script>\r
</body>\r
</html>\r
`;var w=`<!doctype html>\r
<html lang="en">\r
<head>\r
<meta charset="utf-8">\r
<title>Obsidian Minimal \u2014 quiet card in Obsidian's default dark colours</title>\r
<meta name="ss-in-ms"   content="1000">\r
<meta name="ss-out-ms"  content="650">\r
<meta name="ss-swap-ms" content="260">\r
<style>\r
  :root {\r
    --bg:  #1e1e1e;      /* Obsidian default dark */\r
    --ink: #dadada;\r
    --mute:#999999;\r
    --acc: var(--ss-accent, #a78bfa);\r
    --ease: cubic-bezier(.22, .8, .24, 1);\r
  }\r
  html, body { margin: 0; height: 100%; overflow: hidden; background: transparent; }\r
  .stage {\r
    position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;\r
    background: radial-gradient(80% 70% at 50% 40%, #262626 0%, var(--bg) 70%);\r
    opacity: 0; transition: opacity .5s ease .08s;\r
  }\r
  html[data-state="in"] .stage, html[data-state="hold"] .stage { opacity: 1; transition: opacity .7s ease; }\r
\r
  .wrap { display: flex; gap: 2.4vw; align-items: stretch; transform: translateY(2vh); opacity: 0; transition: opacity .35s ease, transform .45s ease; }\r
  html[data-state="in"] .wrap, html[data-state="hold"] .wrap { transform: none; opacity: 1; transition: opacity .8s ease .2s, transform 1s var(--ease) .2s; }\r
\r
  .bar { width: 4px; border-radius: 2px; background: var(--acc); transform: scaleY(0); transform-origin: top; transition: transform .3s ease; }\r
  html[data-state="in"] .bar, html[data-state="hold"] .bar { transform: none; transition: transform .9s var(--ease) .3s; }\r
\r
  .col { display: flex; flex-direction: column; justify-content: center; }\r
  [data-ss="text-box"] { width: min(66vw, 1100px); height: 44vh; display: flex; align-items: center; }\r
  [data-ss="text"] {\r
    width: 100%; text-align: left; color: var(--ink); font-weight: 500; line-height: 1.5;\r
    font-family: "Iowan Old Style", "Palatino Linotype", Georgia, serif; text-wrap: pretty;\r
    transition: opacity .25s ease;\r
  }\r
  html[data-swapping] [data-ss="text"] { opacity: 0; }\r
  [data-ss="reference"] {\r
    margin-top: 2.4vh; font: 600 clamp(13px, 2.4vh, 28px)/1 system-ui, -apple-system, "Segoe UI", sans-serif;\r
    letter-spacing: .06em; color: var(--acc);\r
  }\r
  [data-ss="version"] {\r
    margin-top: .8vh; font: 500 clamp(10px, 1.6vh, 18px)/1 system-ui, sans-serif; color: var(--mute); letter-spacing: .12em;\r
  }\r
</style>\r
</head>\r
<body>\r
<div class="stage">\r
  <div class="wrap">\r
    <div class="bar"></div>\r
    <div class="col">\r
      <div data-ss="text-box"><div data-ss="text">&nbsp;</div></div>\r
      <div data-ss="reference"></div>\r
      <div data-ss="version"></div>\r
    </div>\r
  </div>\r
</div>\r
</body>\r
</html>\r
`;var k=`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Seed Tree Fruit \u2014 the verse is a leaf: its reference carved on a great leaf, vines coiling out to either side, leaves drifting down</title>
<meta name="ss-in-ms"   content="1800">
<meta name="ss-out-ms"  content="900">
<meta name="ss-swap-ms" content="320">
<meta name="ss-min-font" content="22">
<meta name="ss-max-font" content="92">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=Inter:wght@600;700&display=swap">
<style>
  :root { --ease: cubic-bezier(.22,.8,.24,1); --spring: cubic-bezier(.34,1.45,.5,1); --cream: hsl(48 50% 95%);
          --l1: hsl(128 62% 80%); --l2: hsl(134 52% 66%); --carve: hsl(138 45% 20%); --vine: hsl(96 45% 62%); }
  html[data-testament="nt"] { --l1: hsl(152 62% 80%); --l2: hsl(158 52% 64%); --carve: hsl(162 48% 18%); }
  html, body { margin: 0; height: 100%; overflow: hidden; background: transparent; }
  html[data-state="idle"] *, html[data-state="idle"] *::before, html[data-state="idle"] *::after { animation-play-state: paused !important; }

  .stage { position: fixed; inset: 0; overflow: hidden; opacity: 0; transition: opacity .55s cubic-bezier(.4,0,.2,1) .3s;
    background: radial-gradient(60% 55% at 20% 28%, hsl(330 45% 20% / .7), transparent 70%), radial-gradient(55% 50% at 82% 74%, hsl(205 50% 20% / .6), transparent 70%),
                radial-gradient(120% 100% at 50% 50%, hsl(262 32% 11%), hsl(240 32% 5%)); }
  html[data-state="in"] .stage, html[data-state="hold"] .stage { opacity: 1; transition: opacity .7s cubic-bezier(.3,0,.2,1); }
  .vignette { position: absolute; inset: 0; background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.55) 100%); }
  .stars i { position: absolute; left: var(--x); top: var(--y); width: var(--s); height: var(--s); background: hsl(var(--c) 100% 88%); opacity: 0;
    clip-path: polygon(50% 0, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0 50%, 40% 40%); animation: twinkle var(--d) ease-in-out var(--dl) infinite; }
  @keyframes twinkle { 0%, 100% { opacity: 0; transform: scale(.3); } 50% { opacity: .8; transform: scale(1) rotate(45deg); } }
  .fall i { position: absolute; top: -6vh; left: var(--x); width: var(--s); height: calc(var(--s) * .55); opacity: 0; background: hsl(var(--h) 60% 72%);
    border-radius: 100% 0; animation: fall var(--d) linear var(--dl) infinite; }
  @keyframes fall { 0% { opacity: 0; transform: translate(0, 0) rotate(0); } 10% { opacity: .55; } 50% { transform: translate(6vw, 55vh) rotate(200deg); }
    90% { opacity: .5; } 100% { opacity: 0; transform: translate(-3vw, 112vh) rotate(420deg); } }
  html:not([data-state="hold"]) .fall { opacity: 0; transition: opacity .4s; }
  html[data-state="hold"] .fall { opacity: 1; transition: opacity 2s; }

  .hero { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }

  /* the vines: they leave the great leaf's heart and coil away to either side */
  .crown { position: relative; width: 100%; height: 30vh; flex: none; }
  .vines { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
  .vn { fill: none; stroke: var(--vine); stroke-linecap: round; stroke-dasharray: 1000; stroke-dashoffset: 1000; transition: stroke-dashoffset .4s ease; }
  .vn.thin { stroke: hsl(110 55% 70%); }
  html[data-state="in"] .vn, html[data-state="hold"] .vn { stroke-dashoffset: 0; transition: stroke-dashoffset 1.8s var(--ease) .45s; }
  .vl { transform-box: fill-box; transform-origin: 0% 50%; transform: scale(0); transition: transform .3s ease; }
  html[data-state="in"] .vl, html[data-state="hold"] .vl { transform: scale(1); transition: transform .8s var(--spring) calc(.75s + var(--i) * 60ms); animation: sway var(--sd) ease-in-out var(--sl) infinite alternate; }
  @keyframes sway { from { rotate: -8deg; } to { rotate: 8deg; } }

  /* the great leaf, the reference carved across it */
  .leafwrap { --lw: clamp(190px, 34vh, 420px); position: absolute; left: 50%; top: 50%; width: var(--lw); aspect-ratio: 400 / 230; margin: calc(var(--lw) * -0.31) 0 0 calc(var(--lw) * -0.5); transform-origin: 50% 60%;
    opacity: 0; transform: scale(.25) rotate(-24deg); transition: opacity .3s ease, transform .4s ease; }
  html[data-state="in"] .leafwrap, html[data-state="hold"] .leafwrap { opacity: 1; transform: rotate(-4deg); transition: opacity .5s ease .2s, transform 1.3s var(--spring) .2s; }
  .leafsway { width: 100%; height: 100%; transform-origin: 8% 62%; animation: leafsway 7s ease-in-out infinite alternate; }
  @keyframes leafsway { from { rotate: -1.6deg; } to { rotate: 1.8deg; } }
  .leaf { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 1.6vh 3vh rgba(0,0,0,.45)); }
  .sheen { mix-blend-mode: screen; opacity: .0; animation: sheen 6s ease-in-out 2.2s infinite; }
  @keyframes sheen { 0%, 70%, 100% { opacity: 0; transform: translateX(-30%); } 82% { opacity: .55; } 95% { opacity: 0; transform: translateX(40%); } }
  .ref { position: absolute; left: 15%; right: 10%; top: 45%; transform: translateY(-50%) rotate(-13deg); text-align: center; white-space: nowrap;
    font: 400 clamp(26px, 7.4vh, 86px)/1 "Blackadder ITC", "Cormorant Garamond", Georgia, serif; color: var(--carve);
    text-shadow: 0 .03em 0 hsl(140 70% 90% / .75), 0 -.02em 0 hsl(150 60% 14% / .25); opacity: 0; transition: opacity .3s ease; }
  html[data-state="in"] .ref, html[data-state="hold"] .ref { opacity: 1; transition: opacity 1s ease .85s; }

  /* the verse itself: large, lettered, unfurling word by word from leaf-green to cream */
  [data-ss="text-box"] { width: min(84vw, 1500px); height: 36vh; margin-top: 3.2vh; display: flex; align-items: center; justify-content: center; }
  [data-ss="text"] { width: 100%; font-size: clamp(26px, 6vh, 80px); font-family: "Cormorant Garamond", Georgia, serif; font-weight: 600; line-height: 1.3;
    text-align: center; color: var(--cream); text-wrap: balance; text-shadow: 0 2px 18px rgba(0,0,0,.55); transition: opacity .3s ease; }
  html[data-swapping] [data-ss="text"] { opacity: 0; }
  .w { display: inline-block; opacity: 0; transform: translateY(.35em) rotate(-4deg) scale(.96); filter: blur(7px); color: hsl(140 62% 80%);
    transition: opacity .25s, transform .25s, filter .25s; }
  .w.pre { opacity: 0 !important; transition: none !important; }
  html[data-state="in"] .w, html[data-state="hold"] .w { opacity: 1; transform: none; filter: none; color: hsl(var(--h, 48) 72% 86%);
    transition: opacity .6s ease, transform .9s var(--ease), filter .7s ease, color 1.6s ease; transition-delay: calc(var(--i) * var(--step, 40ms) + 950ms); }

  .ver { margin-top: 2.2vh; padding: .5em 1.3em .45em; font: 700 clamp(10px, 1.5vh, 16px)/1 Inter, system-ui, sans-serif; letter-spacing: .4em; text-indent: .4em;
    color: hsl(140 50% 82%); border: 1px solid hsl(140 40% 60% / .4); border-radius: 99px; opacity: 0; transition: opacity .3s ease; }
  html[data-state="in"] .ver, html[data-state="hold"] .ver { opacity: 1; transition: opacity 1s ease 1.5s; }
  .seed { width: clamp(34px, 6vh, 64px); height: auto; margin-top: 1.4vh; overflow: visible; }
  .shell { transform-box: view-box; transform-origin: 50px 88px; transition: transform .4s ease; }
  html[data-state="in"] .shell.l, html[data-state="hold"] .shell.l { transform: rotate(-26deg); transition: transform 1s var(--spring) 1.3s; }
  html[data-state="in"] .shell.r, html[data-state="hold"] .shell.r { transform: rotate(26deg); transition: transform 1s var(--spring) 1.3s; }
  .sprout { fill: none; stroke: hsl(110 60% 72%); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 60; stroke-dashoffset: 60; transition: stroke-dashoffset .3s; }
  html[data-state="in"] .sprout, html[data-state="hold"] .sprout { stroke-dashoffset: 0; transition: stroke-dashoffset .9s var(--ease) 1.6s; }
  .kernel { animation: breathe 3.6s ease-in-out infinite alternate; }
  @keyframes breathe { from { filter: drop-shadow(0 0 3px hsl(48 100% 75%)); } to { filter: drop-shadow(0 0 14px hsl(48 100% 70%)); } }
  .sl { transform-box: fill-box; transform-origin: 0% 100%; transform: scale(0); transition: transform .3s; }
  html[data-state="in"] .sl, html[data-state="hold"] .sl { transform: scale(1); transition: transform .7s var(--spring) 2.1s; }
</style>
</head>
<body>
<div class="stage">
  <div class="stars"></div>
  <div class="fall"></div>
  <div class="vignette"></div>
  <div class="hero">
    <div class="crown"><svg class="vines" viewBox="0 0 1600 400" preserveAspectRatio="xMidYMid meet"></svg>
    <div class="leafwrap"><div class="leafsway">
      <svg class="leaf" viewBox="0 0 400 230">
        <defs>
          <linearGradient id="lt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color: var(--l1)"/><stop offset="1" stop-color="hsl(96 70% 84%)"/></linearGradient>
          <linearGradient id="lb" x1="0" y1="1" x2="1" y2="0"><stop offset="0" style="stop-color: var(--l2)"/><stop offset="1" stop-color="hsl(150 55% 72%)"/></linearGradient>
          <linearGradient id="sh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
          <clipPath id="lc"><path d="M26 150 C 58 76, 168 24, 290 34 C 340 38, 372 48, 394 56 C 368 104, 300 172, 200 192 C 120 206, 58 186, 26 150 Z"/></clipPath>
        </defs>
        <path d="M26 150 C 18 156, 9 163, 1 171 L 4 174 C 12 167, 20 161, 30 155 Z" fill="var(--vine)"/>
        <path d="M26 150 C 58 76, 168 24, 290 34 C 340 38, 372 48, 394 56 C 370 66, 330 76, 282 84 C 200 98, 110 124, 26 150 Z" fill="url(#lt)"/>
        <path d="M26 150 C 110 124, 200 98, 282 84 C 330 76, 370 66, 394 56 C 368 104, 300 172, 200 192 C 120 206, 58 186, 26 150 Z" fill="url(#lb)"/>
        <path d="M30 148 C 110 124, 200 98, 282 84 S 370 64, 390 57" fill="none" stroke="hsl(100 60% 94% / .6)" stroke-width="2.6" stroke-linecap="round"/>
        <g fill="none" stroke="hsl(110 60% 94% / .38)" stroke-linecap="round">
          <path stroke-width="2.2" d="M92 130 C 104 104, 122 82, 146 64"/><path stroke-width="2" d="M158 112 C 172 88, 192 68, 218 52"/><path stroke-width="1.7" d="M226 96 C 240 78, 258 64, 282 54"/><path stroke-width="1.4" d="M292 82 C 304 70, 320 62, 338 56"/>
          <path stroke-width="2.2" d="M100 128 C 116 152, 134 170, 156 182"/><path stroke-width="2" d="M168 110 C 186 136, 206 156, 232 168"/><path stroke-width="1.7" d="M236 94 C 254 116, 274 132, 298 140"/><path stroke-width="1.4" d="M298 82 C 314 98, 330 108, 350 112"/>
        </g>
        <g clip-path="url(#lc)"><rect class="sheen" x="0" y="0" width="160" height="230" fill="url(#sh)" transform="skewX(-20)"/></g>
      </svg>
      <div class="ref" data-ss="reference"></div>
    </div></div></div>
    <div data-ss="text-box"><div data-ss="text">&nbsp;</div></div>
    <div class="ver" data-ss="version"></div>
    <svg class="seed" viewBox="0 0 100 100"><path class="sprout" d="M50 52 C 50 40, 44 32, 50 14"/><path class="sl" d="M50 26 c -4 -9 -14 -11 -20 -7 c 4 8 13 10 20 7z" fill="hsl(140 60% 74%)"/><path class="sl" d="M50 20 c 4 -9 14 -12 21 -8 c -4 8 -14 11 -21 8z" fill="hsl(158 60% 68%)"/><ellipse class="kernel" cx="50" cy="66" rx="12" ry="16" fill="hsl(70 75% 86%)"/><path class="shell l" d="M50 88 C 30 88, 24 70, 30 54 C 34 44, 44 40, 50 40 L 47 64 Z" fill="hsl(36 85% 72%)"/><path class="shell r" d="M50 88 C 70 88, 76 70, 70 54 C 66 44, 56 40, 50 40 L 53 64 Z" fill="hsl(24 85% 74%)"/></svg>
  </div>
</div>
<script>
(function () {
  if (document.fonts && document.fonts.load) { document.fonts.load('600 40px "Cormorant Garamond"'); document.fonts.load('400 40px "Blackadder ITC"'); }
  var NS = 'http://www.w3.org/2000/svg';
  var rnd = (function (s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })(20261104);
  var stars = document.querySelector('.stars'), HUES = [200, 250, 285, 330, 10, 60, 115, 170];
  for (var k = 0; k < 16; k++) { var st = document.createElement('i');
    st.style.cssText = '--x:' + (rnd() * 96 + 2).toFixed(1) + '%;--y:' + (rnd() * 90 + 4).toFixed(1) + '%;--s:' + (9 + rnd() * 16).toFixed(0) + 'px;--c:' + HUES[k % 8] + ';--d:' + (3 + rnd() * 4).toFixed(1) + 's;--dl:-' + (rnd() * 7).toFixed(1) + 's';
    stars.appendChild(st); }
  var fall = document.querySelector('.fall');
  for (var f = 0; f < 14; f++) { var lf = document.createElement('i');
    lf.style.cssText = '--x:' + (rnd() * 100).toFixed(1) + '%;--s:' + (16 + rnd() * 16).toFixed(0) + 'px;--h:' + (110 + rnd() * 60).toFixed(0) + ';--d:' + (14 + rnd() * 12).toFixed(1) + 's;--dl:-' + (rnd() * 26).toFixed(1) + 's';
    fall.appendChild(lf); }

  // vines leave the leaf's heart, swing out in long S-curves and coil up at their ends
  var vines = document.querySelector('.vines');
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var a in attrs) e.setAttribute(a, attrs[a]); if (parent) parent.appendChild(e); return e; }
  function coil(x, y, r0, dir, turns) {             // an inward spiral, as a smooth path continuing from (x, y)
    var d = '', a = dir > 0 ? Math.PI : 0, cx = x + dir * r0, cy = y, n = Math.round(turns * 28);
    for (var i = 1; i <= n; i++) { var t = i / n, r = r0 * (1 - t * .82), an = a - dir * t * turns * 2 * Math.PI; d += ' L' + (cx + r * Math.cos(an)).toFixed(1) + ' ' + (cy + r * Math.sin(an)).toFixed(1); }
    return d;
  }
  [-1, 1].forEach(function (s) {
    var X = function (x) { return 800 + s * x; };
    var main = 'M' + X(40) + ' 214 C ' + X(150) + ' 150, ' + X(250) + ' 300, ' + X(380) + ' 238 S ' + X(560) + ' 120, ' + X(660) + ' 196 S ' + X(720) + ' 290, ' + X(640) + ' 300' + coil(X(640), 300, 46, -s, 1.6);
    var p = el('path', { d: main, 'class': 'vn', 'stroke-width': 7, pathLength: 1000 }, vines);
    var tend = 'M' + X(380) + ' 238 C ' + X(420) + ' 300, ' + X(470) + ' 330, ' + X(440) + ' 352' + coil(X(440), 352, 18, s, 1.4);
    el('path', { d: tend, 'class': 'vn thin', 'stroke-width': 3, pathLength: 1000 }, vines);
    var tend2 = 'M' + X(250) + ' 262 C ' + X(250) + ' 200, ' + X(300) + ' 160, ' + X(330) + ' 150' + coil(X(330), 150, 14, -s, 1.3);
    el('path', { d: tend2, 'class': 'vn thin', 'stroke-width': 3, pathLength: 1000 }, vines);
    var L = p.getTotalLength();
    for (var j = 0; j < 9; j++) {
      var t = 0.06 + j * 0.088, q = p.getPointAtLength(t * L), q2 = p.getPointAtLength(Math.min(L, t * L + 2));
      var ang = Math.atan2(q2.y - q.y, q2.x - q.x) * 180 / Math.PI + (j % 2 ? 58 : -58), sz = 30 + rnd() * 18;
      var g = el('g', { transform: 'translate(' + q.x.toFixed(1) + ' ' + q.y.toFixed(1) + ') rotate(' + ang.toFixed(0) + ')' }, vines);
      var leaf = el('path', { 'class': 'vl', d: 'M0 0 c ' + sz * .25 + ' ' + -sz * .42 + ' ' + sz * .78 + ' ' + -sz * .5 + ' ' + sz * 1.2 + ' ' + -sz * .2 + ' c ' + -sz * .25 + ' ' + sz * .4 + ' ' + -sz * .8 + ' ' + sz * .48 + ' ' + -sz * 1.2 + ' ' + sz * .2 + 'z',
        fill: 'hsl(' + (122 + rnd() * 40).toFixed(0) + ' 58% ' + (64 + rnd() * 12).toFixed(0) + '%)' }, g);
      leaf.style.cssText = '--i:' + j + ';--sd:' + (4 + rnd() * 3).toFixed(1) + 's;--sl:-' + (rnd() * 4).toFixed(1) + 's';
    }
  });

  // a long reference is shrunk to stay on its leaf
  var ref = document.querySelector('.ref');
  // measured in layout space (clientWidth), so the leaf's grow-in animation can't fool it
  function fitRef() { ref.style.fontSize = ''; var box = ref.clientWidth, need = ref.scrollWidth; if (need > box && box > 0) ref.style.fontSize = (parseFloat(getComputedStyle(ref).fontSize) * box / need * 0.96).toFixed(1) + 'px'; }
  window.addEventListener('resize', fitRef);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitRef);

  window.addEventListener('ss:content', function () {
    var t = document.querySelector('[data-ss="text"]');
    if (!t) return;
    var words = (t.textContent || '').split(/\\s+/).filter(Boolean), n = words.length, made = [];
    t.textContent = '';
    t.style.setProperty('--step', Math.min(55, 1000 / Math.max(n, 1)).toFixed(1) + 'ms');
    words.forEach(function (w, i) {
      var s = document.createElement('span'); s.className = 'w pre'; s.style.setProperty('--i', i); s.style.setProperty('--h', ((48 - (i / Math.max(1, n - 1)) * 270 + 360) % 360).toFixed(0)); s.textContent = w;
      t.appendChild(s); if (i < n - 1) t.appendChild(document.createTextNode(' ')); made.push(s);
    });
    fitRef();
    requestAnimationFrame(function () { requestAnimationFrame(function () { made.forEach(function (s) { s.classList.remove('pre'); }); }); });
  });
})();
<\/script>
</body>
</html>
`;var C=`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Seed Tree Fruit, Falling Leaf \u2014 a seed at the verse's corner sends vines along it, golden words smoke in, the reference leaf falls and settles at its foot</title>
<meta name="ss-in-ms"   content="2600">
<meta name="ss-out-ms"  content="900">
<meta name="ss-swap-ms" content="320">
<meta name="ss-min-font" content="26">
<meta name="ss-max-font" content="124">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Inter:wght@700&display=swap">
<style>
  :root { --ease: cubic-bezier(.22,.8,.24,1); --spring: cubic-bezier(.34,1.45,.5,1); --vine: hsl(96 45% 62%);
          --l1: hsl(128 62% 80%); --l2: hsl(134 52% 66%); --carve: hsl(138 45% 20%); }
  html[data-testament="nt"] { --l1: hsl(152 62% 80%); --l2: hsl(158 52% 64%); --carve: hsl(162 48% 18%); }
  html, body { margin: 0; height: 100%; overflow: hidden; background: transparent; }
  html[data-state="idle"] *, html[data-state="idle"] *::before, html[data-state="idle"] *::after { animation-play-state: paused !important; }
  .stage { position: fixed; inset: 0; overflow: hidden; opacity: 0; transition: opacity .55s ease .3s;
    background: radial-gradient(60% 55% at 22% 26%, hsl(330 40% 18% / .7), transparent 70%), radial-gradient(55% 50% at 80% 76%, hsl(205 45% 18% / .6), transparent 70%),
                radial-gradient(120% 100% at 50% 50%, hsl(262 30% 10%), hsl(240 32% 5%)); }
  html[data-state="in"] .stage, html[data-state="hold"] .stage { opacity: 1; transition: opacity .7s ease; }
  .stars i { position: absolute; left: var(--x); top: var(--y); width: var(--s); height: var(--s); background: hsl(var(--c) 90% 86%); opacity: 0;
    clip-path: polygon(50% 0, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0 50%, 40% 40%); animation: twinkle var(--d) ease-in-out var(--dl) infinite; }
  @keyframes twinkle { 0%, 100% { opacity: 0; transform: scale(.3); } 50% { opacity: .6; transform: scale(1) rotate(45deg); } }

  /* background leaves: large, dark and soft, tumbling and swaying as real leaves fall */
  .fall { position: absolute; inset: 0; perspective: 900px; filter: blur(1.4px); }
  .fall i { position: absolute; top: -14vh; left: var(--x); animation: drop var(--d) linear var(--dl) infinite; }
  .fall b { display: block; width: var(--s); height: calc(var(--s) * .52); border-radius: 100% 0; opacity: .5;
    background: linear-gradient(160deg, hsl(var(--h) 34% 34%) 0 48%, hsl(var(--h) 38% 26%) 52%);
    animation: sway var(--w) ease-in-out var(--wl) infinite alternate, flutter var(--f) ease-in-out var(--wl) infinite; }
  @keyframes drop { from { transform: translateY(0); } to { transform: translateY(130vh); } }
  @keyframes sway { from { translate: -5vw 0; } to { translate: 5vw 0; } }
  @keyframes flutter { 0% { transform: rotate(-30deg) rotateX(10deg) rotateY(0deg); } 25% { transform: rotate(10deg) rotateX(60deg) rotateY(30deg); }
    50% { transform: rotate(40deg) rotateX(0deg) rotateY(70deg); } 75% { transform: rotate(5deg) rotateX(-50deg) rotateY(20deg); } 100% { transform: rotate(-30deg) rotateX(10deg) rotateY(0deg); } }
  html:not([data-state="hold"]) .fall { opacity: 0; transition: opacity .4s; }
  html[data-state="hold"] .fall { opacity: 1; transition: opacity 2.4s; }

  /* the composition: the verse, framed by its own vines and its leaf */
  .hero { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
  .frame { position: relative; width: min(74vw, 1340px); }
  .corner { position: absolute; left: -11%; top: -17%; width: 64%; height: auto; overflow: visible; pointer-events: none; }
  .under { position: absolute; left: 22%; bottom: -15%; width: 42%; height: auto; overflow: visible; pointer-events: none; }
  .vn { fill: none; stroke: var(--vine); stroke-linecap: round; stroke-dasharray: 1000; stroke-dashoffset: 1000; transition: stroke-dashoffset .4s ease; }
  .vn.thin { stroke: hsl(110 55% 70%); }
  html[data-state="in"] .vn, html[data-state="hold"] .vn { stroke-dashoffset: 0; transition: stroke-dashoffset 2s var(--ease) .3s; }
  .vl { transform-box: fill-box; transform-origin: 0% 50%; transform: scale(0); transition: transform .3s ease; }
  html[data-state="in"] .vl, html[data-state="hold"] .vl { transform: scale(1); transition: transform .8s var(--spring) calc(.6s + var(--i) * 80ms); animation: lsway var(--sd) ease-in-out var(--sl) infinite alternate; }
  @keyframes lsway { from { rotate: -8deg; } to { rotate: 8deg; } }
  .shell { transform-box: view-box; transition: transform .4s ease; }
  html[data-state="in"] .shell.l, html[data-state="hold"] .shell.l { transform: rotate(-26deg); transition: transform 1s var(--spring) .1s; }
  html[data-state="in"] .shell.r, html[data-state="hold"] .shell.r { transform: rotate(26deg); transition: transform 1s var(--spring) .1s; }
  .kernel { animation: breathe 3.6s ease-in-out infinite alternate; }
  @keyframes breathe { from { filter: drop-shadow(0 0 3px hsl(48 100% 75%)); } to { filter: drop-shadow(0 0 14px hsl(48 100% 70%)); } }

  /* golden lettering, set tight so the verse reads as one block; a faint warm-and-cool sheen */
  [data-ss="text-box"] { width: 100%; height: 50vh; display: flex; align-items: center; justify-content: center; }
  [data-ss="text"] { width: 100%; font-size: clamp(30px, 8vh, 112px); font-family: "Blackadder ITC", "Cormorant Garamond", Georgia, serif; line-height: 1.02;
    text-align: center; text-wrap: balance; word-spacing: .04em; color: hsl(46 95% 74%); filter: drop-shadow(0 0 .14em hsl(42 100% 50% / .32)); transition: opacity .3s ease; }
  html[data-swapping] [data-ss="text"] { opacity: 0; }
  .w { display: inline-block; padding: 0 .04em;
    background: linear-gradient(100deg, hsl(46 95% 76%), hsl(40 92% 68%) 26%, hsl(28 70% 76%) 42%, hsl(50 92% 80%) 56%, hsl(170 30% 80%) 66%, hsl(44 95% 72%) 80%, hsl(46 95% 76%));
    background-size: 400% 100%; background-position: var(--bp) 0; -webkit-background-clip: text; background-clip: text; color: transparent;
    opacity: 0; transform: translateY(-.3em) scale(1.1); filter: blur(16px); letter-spacing: .1em;
    transition: opacity .3s, filter .3s, transform .3s; animation: irid 20s linear infinite; }
  @keyframes irid { to { background-position: calc(var(--bp) + 400%) 0; } }
  .w.pre { opacity: 0 !important; transition: none !important; }
  html[data-state="in"] .w, html[data-state="hold"] .w { opacity: 1; filter: none; transform: none; letter-spacing: 0;
    transition: opacity 1.2s ease, filter 1.6s ease, transform 1.6s var(--ease), letter-spacing 1.6s var(--ease); transition-delay: calc(var(--i) * var(--step, 60ms) + 500ms); }

  /* the reference leaf falls, rocking, and settles against the verse's lower right */
  .leafwrap { position: absolute; right: -6%; bottom: -19%; width: clamp(150px, 25vh, 320px); aspect-ratio: 400 / 230; opacity: 0; transition: opacity .4s ease; }
  /* it falls like a real leaf: swinging in shrinking arcs under gravity, fastest at the bottom of each
     swing and slowing as it rises at the ends, its high side tipping up, until it settles */
  html[data-state="in"] .leafwrap, html[data-state="hold"] .leafwrap { opacity: 1; animation: descend 3.2s cubic-bezier(.3,.15,.35,1) 1.1s both; }
  @keyframes descend { from { transform: translate(-12vw, -66vh); } to { transform: none; } }
  .swing { position: relative; width: 100%; height: 100%; }
  html[data-state="in"] .swing, html[data-state="hold"] .swing { animation: swing 3.2s linear 1.1s both; }
  @keyframes swing {
    0%   { transform: translate(-9vw, -2.6vh) rotate(30deg); animation-timing-function: ease-in; }
    10%  { transform: translate(0, 1.8vh) rotate(0deg); animation-timing-function: ease-out; }
    21%  { transform: translate(8vw, -2.2vh) rotate(-26deg); animation-timing-function: ease-in; }
    32%  { transform: translate(0, 1.5vh) rotate(0deg); animation-timing-function: ease-out; }
    43%  { transform: translate(-6vw, -1.6vh) rotate(19deg); animation-timing-function: ease-in; }
    54%  { transform: translate(0, 1vh) rotate(0deg); animation-timing-function: ease-out; }
    65%  { transform: translate(4vw, -1vh) rotate(-12deg); animation-timing-function: ease-in; }
    75%  { transform: translate(0, .6vh) rotate(0deg); animation-timing-function: ease-out; }
    86%  { transform: translate(-1.6vw, -.4vh) rotate(6deg); animation-timing-function: ease-in-out; }
    100% { transform: rotate(-4deg); }
  }
  .leaf { width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 1.2vh 2.4vh rgba(0,0,0,.45)); }
  .ref { position: absolute; left: 15%; right: 10%; top: 45%; transform: translateY(-50%) rotate(-13deg); text-align: center; white-space: nowrap;
    font: 400 clamp(20px, 5vh, 60px)/1 "Blackadder ITC", "Cormorant Garamond", Georgia, serif; color: var(--carve); text-shadow: 0 .03em 0 hsl(140 70% 90% / .75); }
  .ver { position: absolute; left: 50%; bottom: -24%; transform: translateX(-50%); padding: .5em 1.3em .45em; font: 700 clamp(10px, 1.4vh, 15px)/1 Inter, system-ui, sans-serif;
    letter-spacing: .4em; text-indent: .4em; color: hsl(140 40% 78%); border: 1px solid hsl(140 30% 60% / .35); border-radius: 99px; opacity: 0; transition: opacity .3s ease; }
  html[data-state="in"] .ver, html[data-state="hold"] .ver { opacity: .85; transition: opacity 1s ease 2.4s; }
</style>
</head>
<body>
<div class="stage">
  <div class="stars"></div>
  <div class="fall"></div>
  <div class="hero">
    <div class="frame">
      <svg class="corner" viewBox="0 0 980 560"></svg>
      <div data-ss="text-box"><div data-ss="text">&nbsp;</div></div>
      <svg class="under" viewBox="0 0 480 80"></svg>
      <div class="ver" data-ss="version"></div>
      <div class="leafwrap">
        <div class="swing"><svg class="leaf" viewBox="0 0 400 230">
          <defs>
            <linearGradient id="lt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color: var(--l1)"/><stop offset="1" stop-color="hsl(96 70% 84%)"/></linearGradient>
            <linearGradient id="lb" x1="0" y1="1" x2="1" y2="0"><stop offset="0" style="stop-color: var(--l2)"/><stop offset="1" stop-color="hsl(150 55% 72%)"/></linearGradient>
          </defs>
          <path d="M26 150 C 18 156, 9 163, 1 171 L 4 174 C 12 167, 20 161, 30 155 Z" fill="var(--vine)"/>
        <path d="M26 150 C 58 76, 168 24, 290 34 C 340 38, 372 48, 394 56 C 370 66, 330 76, 282 84 C 200 98, 110 124, 26 150 Z" fill="url(#lt)"/>
        <path d="M26 150 C 110 124, 200 98, 282 84 C 330 76, 370 66, 394 56 C 368 104, 300 172, 200 192 C 120 206, 58 186, 26 150 Z" fill="url(#lb)"/>
        <path d="M30 148 C 110 124, 200 98, 282 84 S 370 64, 390 57" fill="none" stroke="hsl(100 60% 94% / .6)" stroke-width="2.6" stroke-linecap="round"/>
        <g fill="none" stroke="hsl(110 60% 94% / .38)" stroke-linecap="round">
          <path stroke-width="2.2" d="M92 130 C 104 104, 122 82, 146 64"/><path stroke-width="2" d="M158 112 C 172 88, 192 68, 218 52"/><path stroke-width="1.7" d="M226 96 C 240 78, 258 64, 282 54"/><path stroke-width="1.4" d="M292 82 C 304 70, 320 62, 338 56"/>
          <path stroke-width="2.2" d="M100 128 C 116 152, 134 170, 156 182"/><path stroke-width="2" d="M168 110 C 186 136, 206 156, 232 168"/><path stroke-width="1.7" d="M236 94 C 254 116, 274 132, 298 140"/><path stroke-width="1.4" d="M298 82 C 314 98, 330 108, 350 112"/>
        </g>
        </svg>
        <div class="ref" data-ss="reference"></div></div>
      </div>
    </div>
  </div>
</div>
<script>
(function () {
  if (document.fonts && document.fonts.load) { document.fonts.load('400 40px "Blackadder ITC"'); document.fonts.load('600 40px "Cormorant Garamond"'); }
  var NS = 'http://www.w3.org/2000/svg', rnd = (function (s) { return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })(7731);
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var a in attrs) e.setAttribute(a, attrs[a]); if (parent) parent.appendChild(e); return e; }
  var stars = document.querySelector('.stars'), HUES = [200, 250, 285, 330, 10, 60, 115, 170];
  for (var k = 0; k < 14; k++) { var st = document.createElement('i'); st.style.cssText = '--x:' + (rnd() * 96 + 2).toFixed(1) + '%;--y:' + (rnd() * 90 + 4).toFixed(1) + '%;--s:' + (8 + rnd() * 14).toFixed(0) + 'px;--c:' + HUES[k % 8] + ';--d:' + (3 + rnd() * 4).toFixed(1) + 's;--dl:-' + (rnd() * 7).toFixed(1) + 's'; stars.appendChild(st); }
  var fall = document.querySelector('.fall');
  for (var f = 0; f < 11; f++) {
    var lf = document.createElement('i'), d = 20 + rnd() * 14;
    lf.style.cssText = '--x:' + (rnd() * 100).toFixed(1) + '%;--d:' + d.toFixed(1) + 's;--dl:-' + (rnd() * d).toFixed(1) + 's';
    var b = document.createElement('b');
    b.style.cssText = '--s:' + (34 + rnd() * 34).toFixed(0) + 'px;--h:' + (100 + rnd() * 70).toFixed(0) + ';--w:' + (3.2 + rnd() * 2.5).toFixed(1) + 's;--wl:-' + (rnd() * 5).toFixed(1) + 's;--f:' + (4 + rnd() * 3).toFixed(1) + 's';
    lf.appendChild(b); fall.appendChild(lf);
  }
  function coil(x, y, r0, dir, turns) { var dd = '', cx = x + dir * r0, n = Math.round(turns * 28); for (var i = 1; i <= n; i++) { var t = i / n, r = r0 * (1 - t * .8), an = (dir > 0 ? Math.PI : 0) - dir * t * turns * 2 * Math.PI; dd += ' L' + (cx + r * Math.cos(an)).toFixed(1) + ' ' + (y + r * Math.sin(an)).toFixed(1); } return dd; }
  function leaves(path, svg, count, start, size) {
    var L = path.getTotalLength();
    for (var j = 0; j < count; j++) {
      var t = 0.08 + j * (0.86 / count), q = path.getPointAtLength(t * L), q2 = path.getPointAtLength(Math.min(L, t * L + 2));
      var ang = Math.atan2(q2.y - q.y, q2.x - q.x) * 180 / Math.PI + (j % 2 ? 58 : -58), sz = size * (0.8 + rnd() * 0.5);
      var g = el('g', { transform: 'translate(' + q.x.toFixed(1) + ' ' + q.y.toFixed(1) + ') rotate(' + ang.toFixed(0) + ')' }, svg);
      var p = el('path', { 'class': 'vl', fill: 'hsl(' + (122 + rnd() * 40).toFixed(0) + ' 58% ' + (64 + rnd() * 12).toFixed(0) + '%)', d: 'M0 0 c ' + sz * .25 + ' ' + -sz * .42 + ' ' + sz * .78 + ' ' + -sz * .5 + ' ' + sz * 1.2 + ' ' + -sz * .2 + ' c ' + -sz * .25 + ' ' + sz * .4 + ' ' + -sz * .8 + ' ' + sz * .48 + ' ' + -sz * 1.2 + ' ' + sz * .2 + 'z' }, g);
      p.style.cssText = '--i:' + (start + j) + ';--sd:' + (4 + rnd() * 3).toFixed(1) + 's;--sl:-' + (rnd() * 4).toFixed(1) + 's';
    }
  }
  var corner = document.querySelector('.corner');
  var seed = el('g', { transform: 'translate(52 40) scale(1.5)' }, corner);
  seed.innerHTML = '<ellipse class="kernel" cx="0" cy="6" rx="10" ry="13" fill="hsl(70 75% 86%)"/>' +
    '<path class="shell l" style="transform-origin:0px 24px" d="M0 24 C -16 24, -21 10, -16 -2 C -13 -10, -5 -13, 0 -13 L -2 6 Z" fill="hsl(36 85% 72%)"/>' +
    '<path class="shell r" style="transform-origin:0px 24px" d="M0 24 C 16 24, 21 10, 16 -2 C 13 -10, 5 -13, 0 -13 L 2 6 Z" fill="hsl(24 85% 74%)"/>';
  var top = el('path', { 'class': 'vn', 'stroke-width': 6, pathLength: 1000, d: 'M70 30 C 130 -10, 180 60, 250 34 S 370 -6, 440 40 S 570 70, 650 30 S 770 10, 810 46' + coil(810, 46, 26, -1, 1.5) }, corner);
  var side = el('path', { 'class': 'vn', 'stroke-width': 6, pathLength: 1000, d: 'M48 70 C 4 130, 74 180, 38 250 S 14 370, 56 430 S 34 510, 44 530' + coil(44, 530, 20, 1, 1.4) }, corner);
  el('path', { 'class': 'vn thin', 'stroke-width': 3, pathLength: 1000, d: 'M440 40 C 480 80, 530 96, 510 120' + coil(510, 120, 14, 1, 1.3) }, corner);
  el('path', { 'class': 'vn thin', 'stroke-width': 3, pathLength: 1000, d: 'M38 250 C 84 270, 114 310, 100 340' + coil(100, 340, 12, -1, 1.3) }, corner);
  leaves(top, corner, 9, 0, 30); leaves(side, corner, 6, 9, 30);
  var under = document.querySelector('.under');
  leaves(el('path', { 'class': 'vn thin', 'stroke-width': 4, pathLength: 1000, d: 'M10 46 C 60 20, 110 70, 170 44 S 270 20, 320 50 S 420 60, 460 36' }, under), under, 4, 3, 26);

  var ref = document.querySelector('.ref');
  function fitRef() { ref.style.fontSize = ''; var box = ref.clientWidth, need = ref.scrollWidth; if (need > box && box > 0) ref.style.fontSize = (parseFloat(getComputedStyle(ref).fontSize) * box / need * 0.96).toFixed(1) + 'px'; }
  window.addEventListener('resize', fitRef);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitRef);
  window.addEventListener('ss:content', function () {
    var t = document.querySelector('[data-ss="text"]'); if (!t) return;
    var words = (t.textContent || '').split(/\\s+/).filter(Boolean), n = words.length, made = [];
    t.textContent = '';
    t.style.setProperty('--step', Math.min(70, 1300 / Math.max(n, 1)).toFixed(1) + 'ms');
    words.forEach(function (w, i) {
      var s = document.createElement('span'); s.className = 'w pre'; s.style.setProperty('--i', i); s.style.setProperty('--bp', ((i / Math.max(1, n)) * 300).toFixed(0) + '%'); s.textContent = w;
      t.appendChild(s); if (i < n - 1) t.appendChild(document.createTextNode(' ')); made.push(s);
    });
    fitRef();
    requestAnimationFrame(function () { requestAnimationFrame(function () { made.forEach(function (s) { s.classList.remove('pre'); }); }); });
  });
})();
<\/script>
</body>
</html>
`;var M="What shall we say then? Shall we continue in sin, that grace may abound?",d=g("#f9f462");window.SS_CARDS={skins:[["Velvet Aurora",x],["Velvet Rainbow",b],["Seed Tree Fruit",k],["Seed Tree Fruit \xB7 Falling Leaf",C],["Violet & Gold",y],["Obsidian Minimal",w]].map(([e,t])=>({name:e,html:f(t)})),content:{key:"Romans 6:1",reference:"Romans 6:1",text:M,version:"KJV",book:"Romans",testament:"nt",palette:{base:d.base,light:d.light,mid:d.mid,dark:d.dark},runs:c(M),contrast:""}};})();
