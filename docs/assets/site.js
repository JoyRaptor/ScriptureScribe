(() => {
  const D = window.SS_DATA;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // ?shot renders every section at once (used to capture README images).
  const shot = new URLSearchParams(location.search).has("shot");
  if (shot) document.documentElement.classList.add("shot");
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ── hero bokeh ── */
  const bokeh = $(".bokeh");
  if (bokeh) {
    const colors = ["#35e0ff", "#ff3fd0", "#9b6bff", "#ffc24b", "#7dff9c", "#4d7cff", "#ff6a3d"];
    for (let i = 0; i < 26; i++) {
      const el = document.createElement("i");
      const size = Math.random() < 0.25 ? 18 + Math.random() * 46 : 3 + Math.random() * 7;
      const c = colors[i % colors.length];
      el.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;width:${size}px;height:${size}px;` +
        `background:${c};box-shadow:0 0 ${size}px ${c};--b:${size > 16 ? 10 + Math.random() * 14 : 1}px;` +
        `--o:${size > 16 ? 0.18 + Math.random() * 0.2 : 0.5 + Math.random() * 0.5};` +
        `--d:${12 + Math.random() * 16}s;--x:${(Math.random() - 0.5) * 80}px;--y:${(Math.random() - 0.5) * 80}px`;
      bokeh.appendChild(el);
    }
  }

  /* ── reveal on scroll ── */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  document.querySelectorAll(".reveal").forEach((el) => (shot ? el.classList.add("in") : io.observe(el)));

  /* ── screenshot slideshows ── */
  document.querySelectorAll(".slides").forEach((fig) => {
    const imgs = [...fig.querySelectorAll("img")];
    const cap = fig.querySelector(".slide-cap");
    const hud = fig.dataset.hud && document.getElementById(fig.dataset.hud);
    if (imgs.length < 2 || reduce || shot) return;
    let i = 0;
    const show = (next) => {
      imgs[i].classList.replace("on", "out");
      const prev = imgs[i];
      setTimeout(() => prev.classList.remove("out"), 1100);
      i = next;
      imgs[i].classList.add("on");
      const label = imgs[i].dataset.label || "";
      if (cap) cap.textContent = label;
      if (hud) hud.querySelector(".hud-w").textContent = label;
      if (fig.classList.contains("frame-main")) fig.closest(".stage")?.classList.toggle("wide", i !== 0);
    };
    setInterval(() => {
      if (document.hidden) return;
      const next = imgs[(i + 1) % imgs.length];
      // Never flip to a picture that hasn't arrived; ask for it now and try again next tick.
      if (!next.complete || !next.naturalWidth) { next.loading = "eager"; return; }
      show((i + 1) % imgs.length);
    }, +fig.dataset.interval || 4000);
  });

  /* ── 01: hover demo ── */
  const demo = $("#demo");
  const tip = $("#tip");
  const note = $(".note");
  const embeds = $("#demo-embeds");
  let current = null, hideT = 0, showT = 0;

  function place(btn) {
    const n = note.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const w = tip.offsetWidth;
    let left = b.left - n.left + b.width / 2 - w / 2;
    left = Math.max(12, Math.min(left, n.width - w - 12));
    tip.style.left = left + "px";
    tip.style.top = (b.bottom - n.top + 10) + "px";
  }
  function show(btn) {
    clearTimeout(hideT);
    const ref = btn.dataset.ref;
    const v = D.verses[ref];
    if (!v) return;
    if (current && current !== btn) current.classList.remove("active");
    current = btn;
    btn.classList.add("active");
    $("#tip-ref").textContent = ref;
    $("#tip-text").textContent = v.t;
    $("#tip-chips").innerHTML = v.x.map((x) => `<span>${esc(x)}</span>`).join("");
    const done = btn.classList.contains("done");
    const eb = $("#tip-embed");
    eb.disabled = done;
    eb.textContent = done ? "Embedded ✓" : "Embed";
    tip.hidden = false;
    place(btn);
    tip.classList.add("show");
  }
  function hide(delay = 220) {
    clearTimeout(hideT);
    hideT = setTimeout(() => {
      tip.classList.remove("show");
      if (current) current.classList.remove("active");
    }, delay);
  }
  demo.querySelectorAll(".ref").forEach((btn) => {
    btn.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { clearTimeout(showT); showT = setTimeout(() => show(btn), 120); } });
    btn.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { clearTimeout(showT); hide(); } });
    btn.addEventListener("click", () => (current === btn && tip.classList.contains("show") ? hide(0) : show(btn)));
    btn.addEventListener("focus", () => show(btn));
  });
  tip.addEventListener("pointerenter", () => clearTimeout(hideT));
  tip.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hide(); });
  document.addEventListener("click", (e) => { if (!demo.contains(e.target)) hide(0); });
  addEventListener("resize", () => { if (current && tip.classList.contains("show")) place(current); });

  $("#tip-embed").addEventListener("click", () => {
    if (!current || current.classList.contains("done")) return;
    const ref = current.dataset.ref;
    const q = document.createElement("blockquote");
    q.innerHTML = `<p>“${esc(D.verses[ref].t)}”</p><cite>— ${esc(ref)}, KJV</cite>`;
    embeds.appendChild(q);
    current.classList.add("done");
    hide(0);
  });
  $("#demo-reset").addEventListener("click", () => {
    embeds.innerHTML = "";
    demo.querySelectorAll(".ref.done").forEach((b) => b.classList.remove("done"));
    hide(0);
  });

  // Open one tooltip the first time the demo scrolls into view, so it reads at a glance.
  const once = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      once.disconnect();
      setTimeout(() => { if (!tip.classList.contains("show")) show(demo.querySelector('[data-ref="John 1:1"]')); }, 700);
    }
  }, { threshold: 0.6 });
  once.observe(demo);

  /* ── 03: interlinear lab ── */
  const words = $("#words");
  const lex = $("#lex");
  const kjv = $("#lab-kjv");
  let set = "greek";

  function renderLex(w) {
    const heb = set === "hebrew";
    lex.innerHTML =
      `<div class="lex-top"><span class="badge">${esc(w.s)}</span><span class="badge alt">${esc(w.m)}</span></div>` +
      `<div class="lex-lemma ${heb ? "hebrew" : "greek"}" ${heb ? 'lang="he" dir="rtl"' : 'lang="grc"'}>${esc(w.lemma || w.o)}</div>` +
      `<p class="lex-tr">${esc(w.lt || w.t)} · <b>${esc(w.g || w.e)}</b></p>` +
      `<p class="lex-row">this form <span class="${heb ? "hebrew" : "greek"}">${esc(w.o)}</span> · ${esc(w.t)}</p>` +
      `<p class="lex-row">parsing <span>${esc(w.md)}</span></p>` +
      (w.d ? `<p class="lex-def">${esc(w.d)}</p>` : "") +
      `<p class="lex-src">STEPBIBLE ${heb ? "TBESH" : "TBESG"} LEXICON · CC BY 4.0</p>`;
  }
  function renderSet(name) {
    set = name;
    const s = D.interlinear[name];
    kjv.innerHTML = `<b>${esc(s.ref)} · KJV</b>${esc(s.kjv)}`;
    words.classList.toggle("rtl", name === "hebrew");
    words.innerHTML = s.words.map((w, i) =>
      `<button class="w" type="button" data-i="${i}">` +
      `<span class="w-e">${esc(w.e)}</span>` +
      `<span class="w-o" ${name === "hebrew" ? 'lang="he"' : 'lang="grc"'}>${esc(w.o)}</span>` +
      `<span class="w-t">${esc(w.t)}</span><span class="w-s">${esc(w.s)}</span><span class="w-m">${esc(w.m)}</span></button>`
    ).join("");
    const start = name === "greek" ? s.words.findIndex((w) => w.s === "G3056") : 0;
    select(Math.max(0, start));
  }
  function select(i) {
    words.querySelectorAll(".w").forEach((b) => b.classList.toggle("on", +b.dataset.i === i));
    renderLex(D.interlinear[set].words[i]);
  }
  words.addEventListener("click", (e) => { const b = e.target.closest(".w"); if (b) select(+b.dataset.i); });
  words.addEventListener("pointerover", (e) => { const b = e.target.closest(".w"); if (b && e.pointerType === "mouse") select(+b.dataset.i); });
  document.querySelectorAll(".lab-tabs button").forEach((t) => t.addEventListener("click", () => {
    document.querySelectorAll(".lab-tabs button").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
    renderSet(t.dataset.set);
  }));
  renderSet("greek");

  /* ── stats count-up ── */
  const fmt = new Intl.NumberFormat("en-US");
  const sio = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      sio.unobserve(e.target);
      const el = e.target, target = +el.dataset.count;
      if (reduce || shot) continue;
      const t0 = performance.now(), dur = 1400;
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        el.textContent = fmt.format(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, { threshold: 0.5 });
  document.querySelectorAll("[data-count]").forEach((el) => sio.observe(el));
})();
