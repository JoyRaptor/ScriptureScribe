/**
 * bibleMode.ts  — Phase 5a (rev 2)
 *
 * Fixes in this revision:
 * 1. Horizontal chapter swiping works on touch, mouse drag, AND two-finger
 * trackpad (wheel deltaX). Pointer capture only on genuine drag start.
 * 2. Drop-cap chapter number is full opacity (was 0.18 → now 1.0, styled
 * as a large accent numeral rather than a ghost).
 * 3. Navigator is IN-FLOW (not position:absolute) — it slides open below
 * the header and physically pushes the carousel down.
 * 4. Richer open/close animation with a spring-like cubic-bezier.
 * 5. Purple ripple flash on book/chapter button tap.
 * 6. Hovering a note link while in Bible mode scrolls to the verse and
 * pulses it with a purple highlight that fades away.
 */

import { App, MarkdownView } from "obsidian";
import { BIBLE_BOOKS, BookMeta } from "./bibleData";
import { getKJVData } from "./fetcher";
import { ScriptureScribeSettings } from "./settings";
import { getIcon } from "./iconRegistry";
import {
  getNotePathsForVerse,
  buildVerseHighlightStyle,
  notePathToColor,
  isVaultIndexReady,
  onVaultIndexReady,
  getVaultHighlightTextColor,
} from "./vaultIndex";
import { getCrossRefs } from "./crossRefs";
import { parseScriptureRefs } from "./parser";
import { embedSingleRef, embedAtCursor, getGlobalEmbedStyle } from "./embedEngine";
import { researchBibleSvg } from "./svgAssets";
import {
  BOOK_GENRE_COLOR,
  BookPalette,
  getBookPalette,
  getRefBookColor,
  contrastSafeText,
  contrastSafePalette,
  DEFAULT_PALETTE,
} from "./bookColorUtils";

// ── Colour palette — now instance-derived from bookColorUtils ───────────────

// ── OT / NT split ─────────────────────────────────────────────────────────────
const OT_BOOKS = [...BIBLE_BOOKS.slice(0, 39), ...BIBLE_BOOKS.slice(66)];
const NT_BOOKS = BIBLE_BOOKS.slice(39, 66);

// BOOK_GENRE_COLOR moved to bookColorUtils.ts


// ── Public types ──────────────────────────────────────────────────────────────
export interface BiblePosition {
  bookId: number;
  chapter: number;
}

// ── Ripple helper ─────────────────────────────────────────────────────────────
function ripple(btn: HTMLElement, color: string = "#534AB7"): void {
  if (!document.getElementById("ss-ripple-kf")) {
    const s = document.createElement("style");
    s.id = "ss-ripple-kf";
    s.textContent = `@keyframes ss-ripple{0%{opacity:.55;transform:scale(.7)}100%{opacity:0;transform:scale(1.15)}}`;
    document.head.appendChild(s);
  }
  const r = document.createElement("span");
  r.style.cssText = `
    position:absolute; inset:0; border-radius:inherit;
    background:${color}; opacity:0.55;
    animation:ss-ripple 0.35s ease forwards;
    pointer-events:none;
  `;
  btn.style.position = "relative";
  btn.style.overflow = "hidden";
  btn.appendChild(r);
  setTimeout(() => r.remove(), 380);
}

// ── Main class ────────────────────────────────────────────────────────────────
export class BibleModeView {
  private app: App;
  private root: HTMLElement;
  settings: ScriptureScribeSettings;

  private pos: BiblePosition = { bookId: 1, chapter: 1 };

  // ── Instance palette (updated per book) ───────────────────────────────────
  private P: string = DEFAULT_PALETTE.base;
  private PL: string = DEFAULT_PALETTE.light;
  private PM: string = DEFAULT_PALETTE.mid;
  private PD: string = DEFAULT_PALETTE.dark;

  // Layout — no own header; readingPanel provides header elements externally
  private extBookTitleEl: HTMLElement | null = null;
  private extChapterNumEl: HTMLElement | null = null;
  private extCaretEl: HTMLElement | null = null;
  private navContainer!: HTMLElement;
  private carouselWrap!: HTMLElement;
  private carouselTrack!: HTMLElement;
  private slides: HTMLElement[] = [];

  // Nav state
  private navOpen = false;
  private navLevel: "book" | "chapter" = "book";

  // Drag state
  private dragStartX = 0;
  private dragStartY = 0;
  private dragDelta = 0;
  private dragging = false;
  private dragAxis: "h" | "v" | null = null;
  private dragCaptured = false;
  /** True while a native touch gesture is active — suppresses pointer events to prevent double-advance */
  private touchActive = false;

  // Wheel accumulator for trackpad horizontal swipe
  private wheelAccum = 0;
  private wheelTimer: ReturnType<typeof setTimeout> | null = null;

  // Vault highlight — backlink drawer & xref drawer
  private backlinkDrawer!: HTMLElement;
  private backlinkOverlay!: HTMLElement;
  private drawerOpen = false;
  private _drawerHighlightWord: string | undefined = undefined;

  // Verse tap — floating action icons
  private verseActionEl: HTMLElement | null = null;
  private verseActionKey: string = "";
  private verseActionTimer: ReturnType<typeof setTimeout> | null = null;
  /** Callback injected by readingPanel to open research mode for a verse */
  onOpenResearch: ((verseKey: string, withInterlinear?: boolean, highlightWord?: string) => void) | null = null;
  /** Callback injected by readingPanel to be notified when the book/palette changes */
  onPaletteChange: ((P: string, PL: string, PM: string, PD: string) => void) | null = null;

  constructor(app: App, root: HTMLElement, settings: ScriptureScribeSettings) {
    this.app = app;
    this.root = root;
    this.settings = settings;
    this.updatePalette();
    this.build();
  }

  // ── Palette management ────────────────────────────────────────────────────

  private updatePalette(): void {
    const raw = getBookPalette(
      this.pos.bookId,
      this.settings.display?.useBookColors ?? true
    );
    const pal = contrastSafePalette(raw);
    this.P = pal.base;
    this.PL = pal.light;
    this.PM = pal.mid;
    this.PD = pal.dark;
    // Notify readingPanel so it can re-theme its own header elements
    this.onPaletteChange?.(this.P, this.PL, this.PM, this.PD);
    this.updateDynamicStyles();
  }

  private updateDynamicStyles(): void {
    let s = document.getElementById("ss-verse-flash-kf");
    if (!s) {
      s = document.createElement("style");
      s.id = "ss-verse-flash-kf";
      document.head.appendChild(s);
    }
    s.textContent = `
      @keyframes ss-verse-flash {
        0%   { background: transparent; }
        15%  { background: ${this.P}26; }
        35%  { background: ${this.PL}; color: ${this.P}; }
        100% { background: transparent; color: var(--text-normal); }
      }
    `;
  }

  /** Called externally (e.g. settings change) to refresh the palette */
  refreshPalette(): void {
    this.updatePalette();
  }

  /**
   * Re-fires the current palette values through onPaletteChange without
   * navigating. Used by readingPanel when entering bible mode so the header
   * immediately reflects the bible view's current book, not the research ref.
   */
  firePaletteChange(): void {
    this.onPaletteChange?.(this.P, this.PL, this.PM, this.PD);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  goTo(bookId: number, chapter: number, verseKey?: string): void {
    const book = this.getBook(bookId);
    if (!book) return;
    const newChapter = Math.max(1, Math.min(chapter, book.chapters));
    const sameChapter = this.pos.bookId === bookId && this.pos.chapter === newChapter;
    this.pos = { bookId, chapter: newChapter };
    this.updatePalette();
    if (this.extBookTitleEl) this.extBookTitleEl.style.color = this.P;
    if (this.extChapterNumEl) this.extChapterNumEl.style.color = this.P;

    if (sameChapter && verseKey) {
      this.highlightVerse(verseKey, this.slides[1]);
    } else {
      this.refresh(verseKey);
    }
  }

  getPosition(): BiblePosition { return { ...this.pos }; }

  /**
   * Re-apply vault highlights on the current centre slide without
   * re-fetching verses or resetting scroll. Called after the vault
   * index is updated (editor change, file save, settings change).
   */
  refreshHighlights(): void {
    const slide = this.slides[1]; // centre slide = current chapter
    if (!slide) return;
    const book = this.getBook(this.pos.bookId);
    if (!book) return;
    slide.querySelectorAll<HTMLElement>("[data-verse-key]").forEach(span => {
      const verseKey = span.dataset.verseKey ?? "";
      const notePaths = getNotePathsForVerse(verseKey);
      if (!notePaths.length) {
        // Clear any stale highlight from a previous index state
        if (span.dataset.vaultBg) {
          span.style.background = "";
          span.style.color = "var(--text-normal)";
          span.dataset.vaultBg = "";
        }
        return;
      }
      const style = buildVerseHighlightStyle(notePaths);
      span.style.background = style.background;
      span.style.color = getVaultHighlightTextColor();
      span.dataset.vaultBg = style.background;
    });
  }

  /** Called when the shared header's center (Book·Chapter) is clicked */
  handleHeaderClick(): void {
    if (this.navOpen) this.closeNav();
    else this.openNav("book");
  }

  destroy(): void {
    this.closeBacklinkDrawer();
    this.dismissVerseActions();
    this.root.empty();
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  private build(): void {
    this.root.style.cssText = `
      display:flex; flex-direction:column; height:100%; overflow:hidden;
      background:var(--background-primary);
    `;
    // No header here — readingPanel owns the single shared header bar
    this.buildNavContainer();
    this.buildCarousel();
    this.buildBacklinkDrawer();
    this.refresh();
  }

  /** Called by readingPanel to keep the shared header Book · Chapter display in sync */
  updateHeaderExternal(
    bookTitleEl: HTMLElement,
    chapterNumEl: HTMLElement,
    caretEl: HTMLElement
  ): void {
    this.extBookTitleEl = bookTitleEl;
    this.extChapterNumEl = chapterNumEl;
    this.extCaretEl = caretEl;
    this.updateHeader();
  }

  // ── Header ────────────────────────────────────────────────────────────────

  private updateHeader(): void {
    if (!this.extBookTitleEl || !this.extChapterNumEl) return;

    // Inject Cinzel (stately inscriptions Roman font) once
    if (!document.getElementById("ss-cinzel-font")) {
      const link = document.createElement("link");
      link.id = "ss-cinzel-font";
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap";
      document.head.appendChild(link);
    }

    const book = this.getBook(this.pos.bookId)!;
    this.extBookTitleEl.textContent = book.name.toUpperCase();
    this.extBookTitleEl.style.fontFamily = "'Cinzel', 'Trajan Pro', Georgia, serif";
    this.extBookTitleEl.style.letterSpacing = "0.06em";
    // Apply current palette color to all themed header elements
    this.extBookTitleEl.style.color = this.P;
    this.extChapterNumEl.textContent = String(this.pos.chapter);
    this.extChapterNumEl.style.color = this.P;
    if (this.extCaretEl) this.extCaretEl.style.color = this.P;
  }

  // ── In-flow navigator container ───────────────────────────────────────────
  // Sits between header and carousel in normal flow. Growing its max-height
  // physically pushes the carousel down — no z-index overlay tricks needed.

  private buildNavContainer(): void {
    this.navContainer = this.root.createEl("div");
    this.navContainer.style.cssText = `
      flex-shrink:0; overflow:hidden;
      max-height:0;
      transition:max-height 0.38s cubic-bezier(0.34,1.3,0.64,1);
      background:var(--background-primary);
      border-bottom:0px solid var(--background-modifier-border);
    `;
  }

  private openNav(level: "book" | "chapter"): void {
    this.navOpen = true;
    this.navLevel = level;

    if (this.extCaretEl) this.extCaretEl.style.transform = "rotate(180deg)";
    this.navContainer.style.borderBottomWidth = "1px";

    this.navContainer.empty();
    if (level === "book") this.renderBookGrid(this.navContainer);
    else this.renderChapterGrid(this.navContainer, this.pos.bookId);

    requestAnimationFrame(() => {
      this.navContainer.style.maxHeight = this.navContainer.scrollHeight + 'px';
      // Once transition finishes, set to actual bounds so mobile height is preserved
      setTimeout(() => {
        if (this.navOpen) this.navContainer.style.maxHeight = '85vh';
      }, 400);
    });
  }

  private closeNav(): void {
    if (!this.navOpen) return;
    this.navOpen = false;
    if (this.extCaretEl) this.extCaretEl.style.transform = "rotate(0deg)";
    this.navContainer.style.maxHeight = this.navContainer.scrollHeight + 'px';
    requestAnimationFrame(() => {
      this.navContainer.style.maxHeight = "0";
      this.navContainer.style.borderBottomWidth = "0px";
    });
    setTimeout(() => { if (!this.navOpen) this.navContainer.empty(); }, 420);
  }

  // ── Book grid ─────────────────────────────────────────────────────────────

  private renderBookGrid(container: HTMLElement): void {
    const inner = container.createEl("div");
    inner.style.cssText = "padding:8px 10px 0; overflow-y:auto; max-height:72vh;";
    inner.style.paddingBottom = "calc(env(safe-area-inset-bottom, 0px) + 56px)";

    const renderGroup = (books: BookMeta[], label: string) => {
      const lbl = inner.createEl("div");
      lbl.textContent = label;
      lbl.style.cssText = `
        font-size:9px; font-weight:700; letter-spacing:.1em;
        text-transform:uppercase; color:var(--text-muted);
        padding:6px 2px 3px; user-select:none;
      `;

      const grid = inner.createEl("div");
      grid.style.cssText = `
        display:grid; grid-template-columns:repeat(4,1fr); gap:4px; margin-bottom:6px;
      `;

      for (const book of books) {
        const btn = grid.createEl("button");
        btn.textContent = book.abbrevs[0] ?? book.name.slice(0, 4);
        btn.title = book.name;
        const active = this.pos.bookId === book.id;
        const gc = BOOK_GENRE_COLOR[book.id] ?? this.P;
        btn.style.cssText = `
          padding:6px 4px; font-size:11px; font-weight:700;
          background:${active ? gc : "transparent"};
          color:${active ? "#1a1a2e" : gc};
          border:1.5px solid ${gc};
          border-radius:5px; cursor:pointer; white-space:nowrap;
          overflow:hidden; text-overflow:ellipsis;
          transition:background 0.12s, color 0.12s, transform 0.1s;
          position:relative;
        `;
        btn.addEventListener("mouseenter", () => {
          if (!active) { btn.style.background = gc; btn.style.color = "#1a1a2e"; btn.style.transform = "scale(1.04)"; }
        });
        btn.addEventListener("mouseleave", () => {
          if (!active) { btn.style.background = "transparent"; btn.style.color = gc; btn.style.transform = ""; }
        });
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          // White ripple on select
          const r = document.createElement("span");
          r.style.cssText = `
            position:absolute;inset:0;border-radius:inherit;
            background:#fff;opacity:0.45;
            animation:ss-ripple 0.35s ease forwards;
            pointer-events:none;
          `;
          btn.style.position = "relative"; btn.style.overflow = "hidden";
          btn.appendChild(r);
          setTimeout(() => r.remove(), 380);
          setTimeout(() => {
            this.navContainer.style.maxHeight = this.navContainer.scrollHeight + 'px';
            this.navContainer.empty();
            this.renderChapterGrid(this.navContainer, book.id);
            requestAnimationFrame(() => {
              this.navContainer.style.maxHeight = this.navContainer.scrollHeight + 'px';
              setTimeout(() => {
                if (this.navOpen) this.navContainer.style.maxHeight = '72vh';
              }, 400);
            });
          }, 160);
        });
        grid.appendChild(btn);
      }
    };

    renderGroup(OT_BOOKS, "Old Testament");

    const sep = inner.createEl("div");
    sep.style.cssText = `height:1px; background:var(--background-modifier-border); margin:6px 0; opacity:.4;`;

    renderGroup(NT_BOOKS, "New Testament");
  }

  // ── Chapter grid ──────────────────────────────────────────────────────────

  private renderChapterGrid(container: HTMLElement, bookId: number): void {
    const book = this.getBook(bookId);
    if (!book) return;

    const inner = container.createEl("div");
    inner.style.cssText = "padding:10px 10px 0; overflow-y:auto; max-height:72vh;";
    inner.style.paddingBottom = "calc(env(safe-area-inset-bottom, 0px) + 56px)";

    const gc = BOOK_GENRE_COLOR[bookId] || this.P;

    const back = inner.createEl("div");
    back.textContent = `← ${book.name}`;
    // ✅ Use gc (selected book's color) instead of this.P
    back.style.cssText = `
      font-size:11px; font-weight:700; color:${gc};
      cursor:pointer; margin-bottom:8px; padding:2px 0; user-select: none;
    `;
    back.addEventListener("click", (e) => {
      e.stopPropagation();
      this.navContainer.style.maxHeight = this.navContainer.scrollHeight + 'px';
      container.empty();
      this.renderBookGrid(container);
      requestAnimationFrame(() => {
        this.navContainer.style.maxHeight = this.navContainer.scrollHeight + 'px';
        setTimeout(() => {
          if (this.navOpen) this.navContainer.style.maxHeight = '72vh';
        }, 400);
      });
    });

    const grid = inner.createEl("div");
    grid.style.cssText = `display:grid; grid-template-columns:repeat(6,1fr); gap:5px;`;


    for (let ch = 1; ch <= book.chapters; ch++) {
      const btn = grid.createEl("button");
      btn.textContent = String(ch);
      const active = this.pos.bookId === bookId && this.pos.chapter === ch;
      btn.style.cssText = `
        padding:8px 4px; font-size:12px; font-weight:600;
        background:${active ? gc : "var(--background-secondary)"};
        color:${active ? "#1a1a2e" : gc};
        border:1px solid ${active ? gc : "var(--background-modifier-border)"};
        border-radius:5px; cursor:pointer;
        transition:background 0.12s, color 0.12s;
        position:relative;
      `;
      btn.addEventListener("mouseenter", () => {
        if (!active) { btn.style.background = gc; btn.style.color = "#1a1a2e"; }
      });
      btn.addEventListener("mouseleave", () => {
        if (!active) { btn.style.background = "var(--background-secondary)"; btn.style.color = gc; }
      });
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        ripple(btn, this.P);
        setTimeout(() => {
          this.pos = { bookId, chapter: ch };
          this.updatePalette();
          // Immediately update external header colors so they refresh the moment
          // the drawer closes — no need to swipe for the color to appear.
          if (this.extBookTitleEl) this.extBookTitleEl.style.color = this.P;
          if (this.extChapterNumEl) this.extChapterNumEl.style.color = this.P;
          if (this.extCaretEl) this.extCaretEl.style.color = this.P;
          this.closeNav();
          this.refresh();
        }, 160);
      });
      grid.appendChild(btn);
    }
  }

  // ── Carousel ──────────────────────────────────────────────────────────────

  private buildCarousel(): void {
    this.carouselWrap = this.root.createEl("div");
    // touch-action:pan-y lets the browser handle vertical scroll natively;
    // we intercept horizontal ourselves via pointer/wheel events.
    this.carouselWrap.style.cssText = `flex:1; overflow:hidden; position:relative; touch-action:pan-y;`;

    this.carouselTrack = this.carouselWrap.createEl("div");
    this.carouselTrack.style.cssText = `
      display:flex; width:300%; height:100%;
      will-change:transform;
      transform:translateX(-33.333%);
    `;

    for (let i = 0; i < 3; i++) {
      const slide = this.carouselTrack.createEl("div");
      slide.style.cssText = `
        width:33.333%; height:100%; overflow-y:auto; flex-shrink:0;
        padding:16px 18px 40px; box-sizing:border-box;
      `;
      this.slides.push(slide);
    }

    this.wireSwipe();
    this.wireWheel();

    // Tapping the reading area while navigator is open closes it
    this.carouselWrap.addEventListener("pointerdown", (e: PointerEvent) => {
      if (this.navOpen) { e.stopPropagation(); this.closeNav(); }
    }, { capture: true });
  }

  // ── Pointer swipe (mouse drag only — touch handled separately below) ────

  private wireSwipe(): void {
    const el = this.carouselWrap;

    // ── Pointer events — mouse/pen only, never touch ─────────────────────
    el.addEventListener("pointerdown", (e: PointerEvent) => {
      if (this.touchActive) return;           // real touch is happening, ignore
      if (e.pointerType === "touch") return;  // skip touch-sourced pointer events
      if (e.pointerType === "mouse" && e.button !== 0) return;
      // Let user naturally highlight text
      if (window.getSelection()?.toString().length) return;

      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.dragDelta = 0;
      this.dragging = true;
      this.dragAxis = null;
      this.dragCaptured = false;
    });

    el.addEventListener("pointermove", (e: PointerEvent) => {
      if (this.touchActive || e.pointerType === "touch") return;
      if (!this.dragging) return;
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;

      if (!this.dragAxis) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        this.dragAxis = Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
      }
      if (this.dragAxis !== "h") return;

      if (!this.dragCaptured) {
        try { el.setPointerCapture(e.pointerId); } catch { }
        this.dragCaptured = true;
      }

      e.preventDefault();
      const maxDrag = this.carouselWrap.offsetWidth * 0.72;
      this.dragDelta = Math.max(-maxDrag, Math.min(maxDrag, dx));
      const pct = (this.dragDelta / this.carouselWrap.offsetWidth) * 100;
      this.setTrackTransform(`calc(-33.333% + ${pct}%)`, false);
    }, { passive: false });

    const pointerEnd = (e: PointerEvent) => {
      if (this.touchActive || e.pointerType === "touch") return;
      if (!this.dragging || this.dragAxis !== "h") { this.dragging = false; return; }
      this.dragging = false;
      const threshold = this.carouselWrap.offsetWidth * 0.20;
      if (this.dragDelta < -threshold) this.advance(1);
      else if (this.dragDelta > threshold) this.advance(-1);
      else this.snapBack();
    };

    el.addEventListener("pointerup", pointerEnd);
    el.addEventListener("pointercancel", pointerEnd);

    // ── Native touch events (sole handler for touch devices) ─────────────
    let touchStartX = 0, touchStartY = 0, touchAxis: "h" | "v" | null = null;

    el.addEventListener("touchstart", (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      this.touchActive = true;          // block pointer path for this gesture
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      this.dragDelta = 0;
      touchAxis = null;
    }, { passive: true });

    el.addEventListener("touchmove", (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;

      if (!touchAxis) {
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
        touchAxis = Math.abs(dx) >= Math.abs(dy) ? "h" : "v";
      }
      if (touchAxis !== "h") return;

      e.preventDefault();
      const maxDrag = this.carouselWrap.offsetWidth * 0.72;
      this.dragDelta = Math.max(-maxDrag, Math.min(maxDrag, dx));
      const pct = (this.dragDelta / this.carouselWrap.offsetWidth) * 100;
      this.setTrackTransform(`calc(-33.333% + ${pct}%)`, false);
    }, { passive: false });

    el.addEventListener("touchend", () => {
      // Release touchActive slightly after so any late pointer events are still blocked
      setTimeout(() => { this.touchActive = false; }, 120);
      if (touchAxis !== "h") { touchAxis = null; return; }
      touchAxis = null;
      const threshold = this.carouselWrap.offsetWidth * 0.20;
      const delta = this.dragDelta;
      this.dragDelta = 0;  // reset BEFORE advance so a late event can't re-use stale delta
      if (delta < -threshold) this.advance(1);
      else if (delta > threshold) this.advance(-1);
      else this.snapBack();
    }, { passive: true });

    el.addEventListener("touchcancel", () => {
      this.touchActive = false;
      touchAxis = null;
      this.snapBack();
    }, { passive: true });
  }

  // ── Trackpad horizontal wheel ──────────────────────────────────────────────

  private wireWheel(): void {
    // ── Advancing cooldown ─────────────────────────────────────────────────
    // The chapter-slide animation takes ~340 ms. Without a gate, a fast
    // trackpad swipe can fire multiple advances in that window, skipping
    // several chapters in one gesture. `wheelAdvancing` blocks new advances
    // until the current slide transition has fully settled.
    let wheelAdvancing = false;

    this.carouselWrap.addEventListener("wheel", (e: WheelEvent) => {
      // Only handle events that are primarily horizontal
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();

      // Ignore further wheel ticks while an advance is in progress
      if (wheelAdvancing) {
        // Still drain the accumulator so it doesn't surge after cooldown
        if (this.wheelTimer) clearTimeout(this.wheelTimer);
        this.wheelTimer = setTimeout(() => { this.wheelAccum = 0; }, 350);
        return;
      }

      this.wheelAccum += e.deltaX;

      if (this.wheelTimer) clearTimeout(this.wheelTimer);
      this.wheelTimer = setTimeout(() => { this.wheelAccum = 0; }, 350);

      // Raised from 90 → 130 so a normal single swipe gesture maps to
      // exactly one chapter rather than firing on the lightest flick.
      const threshold = 130;
      if (this.wheelAccum > threshold) {
        this.wheelAccum = 0;
        wheelAdvancing = true;
        setTimeout(() => { wheelAdvancing = false; }, 420);
        this.advance(1);
      } else if (this.wheelAccum < -threshold) {
        this.wheelAccum = 0;
        wheelAdvancing = true;
        setTimeout(() => { wheelAdvancing = false; }, 420);
        this.advance(-1);
      }
    }, { passive: false });
  }

  // ── Track helpers ─────────────────────────────────────────────────────────

  private setTrackTransform(val: string, animated: boolean): void {
    this.carouselTrack.style.transition = animated
      ? "transform 0.32s cubic-bezier(0.4,0,0.2,1)"
      : "none";
    this.carouselTrack.style.transform = val;
  }

  private snapBack(): void {
    this.setTrackTransform("translateX(-33.333%)", true);
  }

  // ── Chapter advance ───────────────────────────────────────────────────────

  private advance(dir: 1 | -1): void {
    const book = this.getBook(this.pos.bookId)!;
    let bookId = this.pos.bookId;
    let chapter = this.pos.chapter + dir;

    if (chapter < 1) {
      const prev = this.getBook(bookId - 1);
      if (prev) { bookId = prev.id; chapter = prev.chapters; }
      else { chapter = 1; }
    } else if (chapter > book.chapters) {
      const next = this.getBook(bookId + 1);
      if (next) { bookId = next.id; chapter = 1; }
      else { chapter = book.chapters; }
    }

    this.pos = { bookId, chapter };
    this.dragDelta = 0; // clear drag state immediately
    const endPct = dir === 1 ? -66.666 : 0;
    this.setTrackTransform(`translateX(${endPct}%)`, true);

    // Wait for the CSS transition to actually finish before resetting.
    // transitionend is the reliable signal; a 400ms safety-net handles
    // edge cases where the event doesn't fire (e.g. element hidden).
    let settled = false;
    const onDone = () => {
      if (settled) return;
      settled = true;
      this.carouselTrack.removeEventListener("transitionend", onDone);
      this.setTrackTransform("translateX(-33.333%)", false);
      this.updatePalette();
      this.loadAllSlides();
      this.updateHeader();
    };
    this.carouselTrack.addEventListener("transitionend", onDone, { once: true });
    setTimeout(onDone, 400); // safety-net
  }

  // ── Refresh / render ──────────────────────────────────────────────────────

  private refresh(scrollToVerse?: string): void {
    this.updateHeader();
    this.loadAllSlides(scrollToVerse);
  }

  private loadAllSlides(scrollToVerse?: string): void {
    const prev = this.adjacentPos(-1);
    const curr = this.pos;
    const next = this.adjacentPos(1);

    // Render all three slides; current slide gets the scroll-to-verse hint
    this.renderChapter(this.slides[0], prev);
    this.renderChapter(this.slides[1], curr, scrollToVerse);
    this.renderChapter(this.slides[2], next);
    this.setTrackTransform("translateX(-33.333%)", false);
  }

  private adjacentPos(dir: 1 | -1): BiblePosition {
    const book = this.getBook(this.pos.bookId)!;
    let bookId = this.pos.bookId;
    let chapter = this.pos.chapter + dir;

    if (chapter < 1) {
      const prev = this.getBook(bookId - 1);
      if (prev) { bookId = prev.id; chapter = prev.chapters; }
      else { chapter = 1; }
    } else if (chapter > book.chapters) {
      const next = this.getBook(bookId + 1);
      if (next) { bookId = next.id; chapter = 1; }
      else { chapter = book.chapters; }
    }
    return { bookId, chapter };
  }

  // ── Chapter renderer ──────────────────────────────────────────────────────
  // Uses getKJVData() for fast synchronous rendering (the offline KJV store
  // is always preloaded). When a non-KJV translation is selected, verses are
  // fetched asynchronously after the skeleton frame is painted, then swapped in.

  private renderChapter(container: HTMLElement, pos: BiblePosition, scrollToVerse?: string): void {
    container.empty();
    container.scrollTop = 0;

    const book = this.getBook(pos.bookId);
    if (!book) return;

    // ── 1. Try KJV local data first (synchronous, always fast) ───────────
    const kjv = getKJVData();

    // Safety-net: some kjv.json builds use "Revelation of John" instead of
    // "Revelation". Normalise the lookup key so the chapter always renders
    // even if setKJVData's alias pass didn't catch every variant.
    const KJV_ALIASES: Record<string, string> = {
      // Alternate long-form names used by some KJV JSON builds
      "Revelation": "Revelation of John",
      "Song of Solomon": "Song of Songs",
      // Roman-numeral fallbacks for builds where setKJVData normalization
      // may not have converted these (belt-and-suspenders)
      "1 Samuel": "I Samuel", "2 Samuel": "II Samuel",
      "1 Kings": "I Kings", "2 Kings": "II Kings",
      "1 Chronicles": "I Chronicles", "2 Chronicles": "II Chronicles",
      "1 Corinthians": "I Corinthians", "2 Corinthians": "II Corinthians",
      "1 Thessalonians": "I Thessalonians", "2 Thessalonians": "II Thessalonians",
      "1 Timothy": "I Timothy", "2 Timothy": "II Timothy",
      "1 Peter": "I Peter", "2 Peter": "II Peter",
      "1 John": "I John", "2 John": "II John",
      "3 John": "III John",
    };
    // Resolve which key prefix actually has data
    const resolveBookName = (name: string): string => {
      if (kjv[`${name} ${pos.chapter}:1`] !== undefined) return name;
      const alt = KJV_ALIASES[name];
      if (alt && kjv[`${alt} ${pos.chapter}:1`] !== undefined) return alt;
      // Last resort: try without space e.g. "1Kings" for builds not yet normalised
      const glued = name.replace(/^([123]) /, "$1");
      if (glued !== name && kjv[`${glued} ${pos.chapter}:1`] !== undefined) return glued;
      return name; // fallback — will produce empty chapter, not crash
    };
    const bookLookupName = resolveBookName(book.name);

    const verses: Array<{ num: number; text: string }> = [];
    let misses = 0;
    for (let v = 1; v <= 176; v++) {
      const text = kjv[`${bookLookupName} ${pos.chapter}:${v}`];
      if (text) {
        verses.push({ num: v, text });
        misses = 0;
      } else if (verses.length > 0) {
        misses++;
        if (misses >= 3) break;
      }
    }

    this.paintChapter(container, book.name, pos.chapter, verses, scrollToVerse);

    // ── 2. If non-KJV selected, fetch async and repaint ──────────────────
    if (this.settings.primaryTranslation !== "KJV") {
      this.fetchAndRepaintChapter(container, pos, book.name, scrollToVerse);
    }
  }

  /** Fetch all verses of a chapter via getScripture (handles any translation + fallback) */
  private async fetchAndRepaintChapter(
    container: HTMLElement,
    pos: BiblePosition,
    bookName: string,
    scrollToVerse?: string
  ): Promise<void> {
    const { getScripture } = await import("./fetcher");

    const verses: Array<{ num: number; text: string }> = [];

    // Fetch verses sequentially; stop after 3 consecutive misses
    let misses = 0;
    for (let v = 1; v <= 176; v++) {  // Ps 119 is longest chapter (176 verses)
      const ref = {
        book: bookName, chapter: pos.chapter, verseStart: v,
        raw: `${bookName} ${pos.chapter}:${v}`,
        start: 0, end: 0
      } as any;
      
      try {
        const result = await getScripture(ref, this.settings);
        if (result.text && !result.text.startsWith("[")) {
          verses.push({ num: v, text: result.text });
          misses = 0;
        } else {
          misses++;
          if (misses >= 3) break;
        }
      } catch {
        misses++;
        if (misses >= 3) break;
      }
    }

    if (!container.isConnected) return;
    if (verses.length > 0) {
      this.paintChapter(container, bookName, pos.chapter, verses, scrollToVerse);
    }
  }

  /** Synchronously paint verse content into the container */
  private paintChapter(
    container: HTMLElement,
    bookName: string,
    chapter: number,
    verses: Array<{ num: number; text: string }>,
    scrollToVerse?: string
  ): void {
    container.empty();
    container.scrollTop = 0;

    if (!verses.length) {
      const msg = container.createEl("div");
      msg.style.cssText = `
        font-size:13px; color:var(--text-muted); text-align:center;
        padding:32px 16px; line-height:1.7;
      `;
      msg.textContent = `${bookName} ${chapter} — text unavailable. Check your internet connection.`;
      return;
    }

    // ── Drop-cap chapter number ───────────────────────────────────────────
    const chNumEl = container.createEl("div");
    chNumEl.textContent = String(chapter);
    chNumEl.style.cssText = `
      float:left;
      font-size:72px; line-height:0.78;
      font-weight:900;
      font-family:Georgia,'Times New Roman',serif;
      color:${this.P};
      opacity:1;
      margin-right:9px; margin-top:8px; margin-bottom:0;
      user-select:none; cursor:pointer;
      letter-spacing:-2px;
    `;
    chNumEl.title = "Jump to chapter";
    chNumEl.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.navOpen) this.closeNav();
      else this.openNav("chapter");
    });

    // ── Verse text ────────────────────────────────────────────────────────
    const FONT_MAP: Record<string, string> = {
      default: "var(--font-text,Georgia,'Times New Roman',serif)",
      "Inter": "'Inter',sans-serif",
      "Plus Jakarta": "'Plus Jakarta Sans',sans-serif",
      "Lora": "'Lora',Georgia,serif",
      "Playfair": "'Playfair Display',Georgia,serif",
      "EB Garamond": "'EB Garamond',Georgia,serif",
      "Cormorant": "'Cormorant Garamond',Georgia,serif",
      "Cinzel": "'Cinzel',Georgia,serif",
      "UnifrakturMaguntia": "'UnifrakturMaguntia',cursive",
      "Aref Ruqaa": "'Aref Ruqaa',serif",
      "Grenze Gotisch": "'Grenze Gotisch',cursive",
      "Sansation": "'Sansation',sans-serif",
      "Baumans": "'Baumans',sans-serif",
      "Aldrich": "'Aldrich',sans-serif",
      "Megrim": "'Megrim',cursive",
    };

    const GFONTS: Record<string, string> = {
      "Inter": "Inter:wght@400;600",
      "Plus Jakarta": "Plus+Jakarta+Sans:wght@400;600",
      "Lora": "Lora:wght@400;600",
      "Playfair": "Playfair+Display:wght@400;700",
      "EB Garamond": "EB+Garamond:wght@400;600",
      "Cormorant": "Cormorant+Garamond:wght@400;600",
      "Cinzel": "Cinzel:wght@700",
      "UnifrakturMaguntia": "UnifrakturMaguntia",
      "Aref Ruqaa": "Aref+Ruqaa:wght@400;700",
      "Grenze Gotisch": "Grenze+Gotisch:wght@400;600",
      "Sansation": "Sansation",
      "Baumans": "Baumans",
      "Aldrich": "Aldrich",
      "Megrim": "Megrim",
    };

    const fontKey = this.settings.bibleText?.fontFamily ?? "default";
    const fontSize = this.settings.bibleText?.fontSize ?? 15;
    const fontFamily = FONT_MAP[fontKey] ?? FONT_MAP["default"];

    // Load Google Font if needed
    if (fontKey !== "default" && GFONTS[fontKey]) {
      const linkId = `ss-gfont-${fontKey.replace(/\s/g, "")}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${GFONTS[fontKey]}&display=swap`;
        document.head.appendChild(link);
      }
    }

    const textWrap = container.createEl("div");
    textWrap.style.cssText = `
      font-size:${fontSize}px; line-height:2.05; color:var(--text-normal);
      font-family:${fontFamily}; user-select:text; -webkit-user-select:text;
    `;

    for (const { num, text } of verses) {
      const verseKey = `${bookName} ${chapter}:${num}`;

      const sup = textWrap.createEl("sup");
      sup.textContent = String(num);
      sup.style.cssText = `
        font-size:9.5px; font-weight:700;
        color:${this.P};
        margin-right:3px; margin-left:${num === 1 ? "0" : "6px"};
        padding:2px 4px; border-radius:4px;
        vertical-align:super; user-select:none;
        cursor:pointer; line-height:0; transition:background 0.15s, opacity 0.2s;
        font-family:var(--font-interface,-apple-system,sans-serif);
      `;
      sup.addEventListener("mouseenter", () => { sup.style.background = "var(--background-secondary)"; });
      sup.addEventListener("mouseleave", () => { sup.style.background = ""; });
      sup.addEventListener("click", (e) => {
        e.stopPropagation();
        sup.style.opacity = "0.3"; setTimeout(() => sup.style.opacity = "1", 200);
        this.insertRefIntoNote(" " + verseKey);
      });
      sup.title = `Long-press to insert ${verseKey}`;
      this.wireLongPress(sup, verseKey);

      const span = textWrap.createEl("span");
      span.textContent = text + " ";
      span.dataset.verseKey = verseKey;
      span.style.cssText = `padding:2px 4px; margin:0 -2px; border-radius:6px; cursor:pointer; transition:background 0.15s, opacity 0.2s, color 0.8s ease, box-shadow 0.4s ease;`;

      span.addEventListener("mouseenter", () => {
        if (!span.dataset.ssDragging && !span.dataset.vaultBg) span.style.background = "var(--background-secondary)";
      });
      span.addEventListener("mouseleave", () => {
        span.style.background = span.dataset.vaultBg || "";
      });
      span.addEventListener("click", () => {
        span.style.opacity = "0.3"; setTimeout(() => span.style.opacity = "1", 200);
      });

      // ── Gesture wiring ───────────────────────────────────────────────────
      this.wireVerseGestures(span, verseKey);

      // Apply vault highlight (glows if this verse is cited in any notes)
      this.applyVaultHighlight(span, verseKey);
    }

    const clear = container.createEl("div");
    clear.style.cssText = "clear:both; height:1px;";

    if (scrollToVerse) {
      // Small delay lets the browser finish layout before we measure positions.
      // highlightVerse has its own retry loop for async repaints.
      setTimeout(() => this.highlightVerse(scrollToVerse, container), 60);
    }
  }

  // ── Verse highlight (scroll + purple pulse) ───────────────────────────────

  highlightVerse(verseKey: string, container: HTMLElement): void {

    const attempt = (triesLeft: number) => {
      const span = container.querySelector<HTMLElement>(`[data-verse-key="${CSS.escape(verseKey)}"]`);

      if (!span) {
        if (triesLeft > 0) setTimeout(() => attempt(triesLeft - 1), 100);
        return;
      }

      // Scroll into view
      const containerRect = container.getBoundingClientRect();
      const spanRect = span.getBoundingClientRect();
      const targetOffset = spanRect.top - containerRect.top
        - Math.round(container.clientHeight * 0.3);
      container.scrollBy({ top: targetOffset, behavior: "smooth" });

      // Capture any existing vault highlight so we can restore it afterward
      const vaultBg = span.dataset.vaultBg ?? "";
      const hasVault = !!vaultBg;

      // Trigger flash animation
      span.style.animation = "none";
      span.style.color = "var(--text-normal)";
      void span.offsetWidth; // force reflow
      span.style.animation = "ss-verse-flash 2.2s cubic-bezier(0.4,0,0.2,1) forwards";

      // After animation ends, restore vault highlight (or clear if none)
      setTimeout(() => {
        if (!span.isConnected) return;
        span.style.animation = "";
        if (hasVault) {
          span.style.background = vaultBg;
          span.style.color = getVaultHighlightTextColor();
        } else {
          span.style.background = "";
          span.style.color = "";
        }
      }, 2300);
    };

    attempt(6);
  }

  // ── Long-press on verse superscript ───────────────────────────────────────

  // ── Verse gesture system ─────────────────────────────────────────────────
  //
  // Single tap (300 ms delay)  → Check notes -> Check cross refs -> Do nothing
  // Double tap                 → Highlight verse, Show Action Menu
  // Long press on VERSE TEXT   → word selection mode
  // Long press on VERSE NUMBER → insert ref into active note

  private wireVerseGestures(
    span: HTMLElement,
    verseKey: string,
  ): void {
    let tapTimer: ReturnType<typeof setTimeout> | null = null;
    let longTimer: ReturnType<typeof setTimeout> | null = null;
    let didLong = false;
    // Touch/mouse separation — same pattern as wireDrawerSwipe to prevent
    // double-fire: touch events fire first, then browser emits synthetic
    // mouse events. touchActive flag suppresses the mouse path for 500ms.
    let touchActive = false;
    let touchActiveTimer: ReturnType<typeof setTimeout> | null = null;

    const clearTimers = () => {
      if (tapTimer) { clearTimeout(tapTimer); tapTimer = null; }
      if (longTimer) { clearTimeout(longTimer); longTimer = null; }
    };

    let tapX = 0, tapY = 0;

    const handleStart = () => {
      didLong = false;
      clearTimers();
      longTimer = setTimeout(() => {
        if (window.getSelection()?.toString().length) return;
        didLong = true;
        longTimer = null;
        this.startWordSelection(span, verseKey);
      }, 600);
    };

    const handleEnd = (moved: boolean) => {
      if (longTimer) { clearTimeout(longTimer); longTimer = null; }
      if (window.getSelection()?.toString().length) return;
      if (didLong || moved) return;

      if (tapTimer) {
        clearTimeout(tapTimer); tapTimer = null;
        this.flashVerseTap(span);
        this.highlightVerse(verseKey, span.parentElement!);
        this.toggleVerseActions(span, verseKey);
      } else {
        this.flashVerseTap(span);
        tapTimer = setTimeout(() => {
          tapTimer = null;
          // ✅ Extract word at tap coords and pass to drawer
          const word = this.getWordAtTap(tapX, tapY);
          this.openUnifiedDrawer(verseKey, word);
        }, 320);
      }
    };

    const handleMove = () => {
      if (longTimer) { clearTimeout(longTimer); longTimer = null; }
    };

    // ── Touch path ───────────────────────────────────────────────────────────
    let touchStartX = 0, touchStartY = 0;
    span.addEventListener("touchstart", (e) => {
      tapX = e.touches[0].clientX; tapY = e.touches[0].clientY; // ✅ Capture
      if (touchActiveTimer) { clearTimeout(touchActiveTimer); touchActiveTimer = null; }
      touchActive = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      handleStart();
    }, { passive: true });

    span.addEventListener("touchmove", () => {
      handleMove();
    }, { passive: true });

    span.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const moved = Math.abs(dx) > 8 || Math.abs(dy) > 8;
      // ✅ Block synthetic mouse events so the verse action that fires after the
      // drawer opens doesn't also trigger whatever happens to be under the finger.
      if (!moved) this.blockSyntheticMouse();
      handleEnd(moved);
      if (touchActiveTimer) clearTimeout(touchActiveTimer);
      touchActiveTimer = setTimeout(() => { touchActive = false; touchActiveTimer = null; }, 500);
    }, { passive: true });

    span.addEventListener("touchcancel", () => {
      clearTimers();
      if (touchActiveTimer) clearTimeout(touchActiveTimer);
      touchActiveTimer = setTimeout(() => { touchActive = false; touchActiveTimer = null; }, 500);
    }, { passive: true });

    // Block synthetic click on mobile
    span.addEventListener("click", (e) => {
      if (touchActive) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    // ── Mouse path (desktop only) ─────────────────────────────────────────────
    span.addEventListener("mousedown", (e) => {
      tapX = e.clientX; tapY = e.clientY; // ✅ Capture
      if (touchActive || e.button !== 0) return;
      handleStart();
    });

    span.addEventListener("mousemove", () => {
      if (touchActive) return;
      handleMove();
    });

    span.addEventListener("mouseup", (e) => {
      if (touchActive || e.button !== 0) return;
      handleEnd(false);
    });

    span.addEventListener("mouseleave", () => {
      if (touchActive) return;
      if (longTimer) { clearTimeout(longTimer); longTimer = null; }
    });
  }

  // ── Floating verse action icons ─────────────────────────────────────────

  /**
   * Brief purple ripple flash on a verse span — fires immediately on tap
   * so the user gets instant visual feedback before the drawer opens.
   * Restores any existing vault highlight color afterward.
   */
  private flashVerseTap(span: HTMLElement): void {
    if (!document.getElementById("ss-tap-flash-kf")) {
      const s = document.createElement("style");
      s.id = "ss-tap-flash-kf";
      s.textContent = `
        @keyframes ss-tap-flash {
          0%   { background: ${this.P}55; }
          60%  { background: ${this.P}22; }
          100% { background: var(--ss-restore-bg, transparent); }
        }
      `;
      document.head.appendChild(s);
    }
    const vaultBg = span.dataset.vaultBg ?? "";
    // Store restore target as a CSS variable on the element
    span.style.setProperty("--ss-restore-bg", vaultBg || "transparent");
    span.style.animation = "none";
    void span.offsetWidth; // force reflow
    span.style.animation = "ss-tap-flash 0.38s ease forwards";
    setTimeout(() => {
      if (!span.isConnected) return;
      span.style.animation = "";
      span.style.background = vaultBg || "";
      span.style.removeProperty("--ss-restore-bg");
    }, 400);
  }

  private toggleVerseActions(span: HTMLElement, verseKey: string): void {
    // Dismiss if already showing for this verse
    if (this.verseActionKey === verseKey && this.verseActionEl) {
      this.dismissVerseActions();
      return;
    }
    this.dismissVerseActions();
    this.showVerseActions(span, verseKey);
  }

  private showVerseActions(span: HTMLElement, verseKey: string): void {
    this.verseActionKey = verseKey;

    // Inject keyframes once
    if (!document.getElementById("ss-va-kf")) {
      const s = document.createElement("style");
      s.id = "ss-va-kf";
      s.textContent = `
        @keyframes ss-va-in  { from { opacity:0; transform:scale(0.6) translateX(8px); }
                               to   { opacity:1; transform:scale(1)   translateX(0); } }
        @keyframes ss-va-out { from { opacity:1; transform:scale(1);   }
                               to   { opacity:0; transform:scale(0.7); } }
      `;
      document.head.appendChild(s);
    }

    const panel = document.createElement("div");
    panel.style.cssText = `
      position:absolute; display:flex; flex-direction:column; gap:7px;
      left:-48px; z-index:20; align-items:center;
      pointer-events:all;
    `;

    const actions: Array<{ icon: string; label: string; fn: () => void }> = [
      {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
        label: "Copy",
        fn: () => {
          const text = span.textContent?.trim() ?? "";
          const ref = verseKey;
          navigator.clipboard?.writeText(`${text} — ${ref}`);
          this.showToast(`Copied: ${ref}`);
          this.dismissVerseActions();
        },
      },
      {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`,
        label: "Share",
        fn: () => {
          const text = span.textContent?.trim() ?? "";
          if (navigator.share) {
            navigator.share({ title: verseKey, text: `${text} — ${verseKey}` });
          } else {
            navigator.clipboard?.writeText(`${text} — ${verseKey}`);
            this.showToast("Copied to clipboard");
          }
          this.dismissVerseActions();
        },
      },
      {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
        label: "Embed",
        fn: () => {
          // Insert verse address into the most recent editor
          this.insertRefIntoNote(verseKey);
          this.dismissVerseActions();
        },
      },
      {
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
        label: "Research",
        fn: () => {
          this.dismissVerseActions();
          if (this.onOpenResearch) this.onOpenResearch(verseKey, false);
        },
      },
    ];

    actions.forEach((action, i) => {
      const btn = document.createElement("button");
      btn.title = action.label;
      btn.style.cssText = `
        width:36px; height:36px; border-radius:50%; border:none;
        background:${this.P}; color:#fff;
        display:flex; align-items:center; justify-content:center;
        cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,0.25);
        transition:transform 0.15s, background 0.15s;
        animation:ss-va-in 0.22s cubic-bezier(0.34,1.3,0.64,1) both;
        animation-delay:${i * 40}ms;
        flex-shrink:0;
      `;
      btn.innerHTML = action.icon;
      btn.addEventListener("mouseenter", () => { btn.style.transform = "scale(1.12)"; btn.style.background = this.PD; });
      btn.addEventListener("mouseleave", () => { btn.style.transform = ""; btn.style.background = this.P; });
      btn.addEventListener("click", (e) => { e.stopPropagation(); action.fn(); });
      panel.appendChild(btn);
    });

    // Make span position:relative so panel anchors to it
    span.style.position = "relative";
    span.appendChild(panel);
    this.verseActionEl = panel;

    // Auto-dismiss after 5 s of inactivity
    if (this.verseActionTimer) clearTimeout(this.verseActionTimer);
    this.verseActionTimer = setTimeout(() => this.dismissVerseActions(), 5000);
  }

  private dismissVerseActions(): void {
    if (this.verseActionTimer) { clearTimeout(this.verseActionTimer); this.verseActionTimer = null; }
    if (!this.verseActionEl) return;
    const el = this.verseActionEl;
    this.verseActionEl = null;
    this.verseActionKey = "";
    el.style.animation = "ss-va-out 0.18s ease forwards";
    setTimeout(() => {
      el.remove();
      // Clean up position:relative we added to the span
      const parent = el.parentElement;
      if (parent) parent.style.position = "";
    }, 200);
  }

  // ── Word selection (long press) ──────────────────────────────────────────

  private startWordSelection(span: HTMLElement, verseKey: string): void {
    // Inject keyframes once
    if (!document.getElementById("ss-wsel-kf")) {
      const s = document.createElement("style");
      s.id = "ss-wsel-kf";
      s.textContent = `
        @keyframes ss-wsel-in  { from{opacity:0;transform:scale(0.5)} to{opacity:1;transform:scale(1)} }
        .ss-wsel-word { cursor:pointer; border-radius:2px; transition:background 0.1s; }
        .ss-wsel-word.selected { background:${this.P}44; }
      `;
      document.head.appendChild(s);
    }

    const fullText = (span.textContent ?? "").trimEnd();
    const words = fullText.split(/(\s+)/); // preserve spaces
    span.empty();

    let selStart = -1;
    let selEnd = -1;
    const wordEls: HTMLElement[] = [];

    // Rebuild verse as individually-tappable word spans
    words.forEach((token, i) => {
      if (/^\s+$/.test(token)) {
        span.appendText(token);
        return;
      }
      const w = document.createElement("span");
      w.className = "ss-wsel-word";
      w.textContent = token;
      const wordIdx = wordEls.length;
      wordEls.push(w);

      w.addEventListener("click", (e) => {
        e.stopPropagation();
        if (selStart === -1) {
          selStart = selEnd = wordIdx;
        } else if (wordIdx < selStart) {
          selStart = wordIdx;
        } else {
          selEnd = wordIdx;
        }
        wordEls.forEach((el, j) => {
          el.classList.toggle("selected", j >= selStart && j <= selEnd);
        });
        updateSelectionMenu();
      });
      span.appendChild(w);
    });

    // Selection action menu
    const menuEl = document.createElement("div");
    menuEl.style.cssText = `
      display:none; position:absolute; left:0; bottom:calc(100% + 6px);
      background:var(--background-primary);
      border:1px solid var(--background-modifier-border);
      border-radius:8px; box-shadow:0 4px 16px rgba(0,0,0,0.18);
      padding:6px; gap:6px; z-index:30;
      animation:ss-wsel-in 0.18s cubic-bezier(0.34,1.3,0.64,1);
    `;
    menuEl.style.display = "none";
    span.style.position = "relative";
    span.appendChild(menuEl);

    const menuBtn = (label: string, icon: string, fn: () => void) => {
      const b = document.createElement("button");
      b.title = label;
      b.style.cssText = `
        width:40px; height:40px; border-radius:8px; border:none;
        background:var(--background-secondary); color:${this.P};
        display:flex; align-items:center; justify-content:center;
        cursor:pointer; transition:background 0.1s;
      `;
      b.innerHTML = icon;
      b.addEventListener("mouseenter", () => b.style.background = this.PL);
      b.addEventListener("mouseleave", () => b.style.background = "var(--background-secondary)");
      b.addEventListener("click", (e) => { e.stopPropagation(); fn(); });
      menuEl.appendChild(b);
    };

    const getSelectedText = () =>
      selStart >= 0 && selEnd >= selStart
        ? wordEls.slice(selStart, selEnd + 1).map(el => el.textContent).join(" ")
        : "";

    const SEARCH_ICON = getIcon("Search-vault", 20);
    const ALEPH_ICON = getIcon("Search-word", 20);
    const TEXT_ICON = getIcon("embed-text-white-qwill", 20);
    const ADDR_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
    const CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

    const updateSelectionMenu = () => {
      menuEl.innerHTML = '';
      if (selStart < 0) {
        menuEl.style.display = "none";
        return;
      }
      menuEl.style.display = "flex";

      const single = selStart === selEnd;

      if (single) {
        menuBtn("Search English", SEARCH_ICON, () => {
          const t = getSelectedText();
          if (t && this.onOpenResearch) this.onOpenResearch(`search:${t}`, false);
          exitSelection();
        });
        menuBtn("Define (Interlinear)", ALEPH_ICON, () => {
          const t = getSelectedText();
          if (t && this.onOpenResearch) {
            // Route to research mode with interlinear open AND pre-search the word.
            // We pass withInterlinear=true so the panel stays in interlinear mode,
            // then trigger an English-gloss search so the matching card is highlighted.
            this.onOpenResearch(`search:${t}:original`, true);
          }
          exitSelection();
        });
      } else {
        menuBtn("Embed Text", TEXT_ICON, () => {
          const t = getSelectedText();
          if (t) {
            this.insertRefIntoNote(`${t} — ${verseKey}`);
          }
          exitSelection();
        });
        menuBtn("Write Address", ADDR_ICON, () => {
          this.insertRefIntoNote(verseKey);
          exitSelection();
        });
        menuBtn("Interlinear", ALEPH_ICON, () => {
          if (this.onOpenResearch) this.onOpenResearch(verseKey, true);
          exitSelection();
        });
      }

      menuBtn("Done", CLOSE_ICON, exitSelection);
    };

    function exitSelection() {
      // Restore original span text content
      span.empty();
      span.textContent = fullText + " ";
      span.style.position = "";
      menuEl.remove();
    }

    // Auto-exit selection after 15 s
    setTimeout(exitSelection, 15000);
  }

  // ── Long press on verse number (existing: insert ref) ────────────────────

  private wireLongPress(el: HTMLElement, verseKey: string): void {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };

    el.addEventListener("pointerdown", (e: PointerEvent) => {
      if (e.pointerType !== "mouse") e.preventDefault();
      cancel();
      timer = setTimeout(() => { timer = null; this.insertRefIntoNote(verseKey); }, 600);
    });
    el.addEventListener("pointerup", cancel);
    el.addEventListener("pointerleave", cancel);
    el.addEventListener("pointermove", cancel);
  }

  /**
   * Finds the best available markdown editor across all workspace leaves.
   * Uses the most recently active MarkdownView, falling back to any open one.
   * This is necessary because getActiveViewOfType returns null when the panel itself has focus.
   */
  private getBestEditor(): import("obsidian").Editor | null {
    // Try the most recent leaf first
    const recentView = this.app.workspace.getMostRecentLeaf()?.view;
    if (recentView && "editor" in recentView && (recentView as any).editor) {
      return (recentView as any).editor;
    }
    // Fall back to iterating all leaves for any MarkdownView
    let found: import("obsidian").Editor | null = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (found) return;
      const view = leaf.view;
      if (view && "editor" in view && (view as any).editor) {
        found = (view as any).editor;
      }
    });
    return found;
  }

  private insertRefIntoNote(refStr: string): void {
    const editor = this.getBestEditor();
    if (editor) {
      const line = editor.getLine(editor.getCursor().line);
      const before = line.slice(0, editor.getCursor().ch);
      const needsSpace = before.length > 0 && !before.endsWith(" ");
      editor.replaceSelection((needsSpace ? " " : "") + refStr);
      this.showToast(`Inserted: ${refStr}`);
    } else {
      navigator.clipboard?.writeText(refStr);
      this.showToast(`Copied: ${refStr}`);
    }
  }

  private showToast(msg: string): void {
    const toast = document.createElement("div");
    toast.textContent = msg;
    toast.style.cssText = `
      position:fixed; bottom:60px; left:50%; transform:translateX(-50%);
      background:${this.P}; color:#fff; padding:7px 16px;
      border-radius:20px; font-size:12px; font-weight:600;
      z-index:10000; pointer-events:none; opacity:1;
      transition:opacity 0.4s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = "0"; }, 1800);
    setTimeout(() => { toast.remove(); }, 2300);
  }

  // ── Vault highlight ───────────────────────────────────────────────────────

  private applyVaultHighlight(span: HTMLElement, verseKey: string): void {
    const applyNow = () => {
      const notePaths = getNotePathsForVerse(verseKey);
      if (!notePaths.length) return;

      const style = buildVerseHighlightStyle(notePaths);
      span.style.background = style.background;
      span.style.boxShadow = style.boxShadow;
      span.style.paddingLeft = style.paddingLeft;
      span.style.color = getVaultHighlightTextColor();
      span.dataset.vaultBg = style.background;

      const names = notePaths
        .slice(0, 3)
        .map(p => p.split("/").pop()?.replace(/\.md$/, "") ?? p)
        .join(", ");
      span.title = `In ${notePaths.length} note${notePaths.length !== 1 ? "s" : ""}: ${names}`;
    };

    if (isVaultIndexReady()) {
      applyNow();
    } else {
      onVaultIndexReady(() => {
        if (span.isConnected) applyNow();
      });
    }
  }

  // ── Backlink drawer ───────────────────────────────────────────────────────

  private buildBacklinkDrawer(): void {
    // Inject keyframes once
    if (!document.getElementById("ss-drawer-kf")) {
      const s = document.createElement("style");
      s.id = "ss-drawer-kf";
      s.textContent = `
        @keyframes ss-drawer-row-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(s);
    }

    this.backlinkOverlay = this.root.createEl("div");
    this.backlinkOverlay.style.cssText = `
      display:none; position:absolute; inset:0;
      background:rgba(0,0,0,0);
      z-index:10; transition:background 0.28s ease;
    `;
    this.backlinkOverlay.addEventListener("click", () => this.closeBacklinkDrawer());

    this.backlinkDrawer = this.root.createEl("div");
    this.backlinkDrawer.style.cssText = `
      position:absolute; bottom:0; left:0; right:0;
      height:auto; min-height:200px; max-height:72%;
      background:var(--background-primary);
      border-top:1px solid var(--background-modifier-border);
      border-radius:16px 16px 0 0;
      box-shadow:0 -6px 32px rgba(0,0,0,0.22), 0 -1px 4px rgba(0,0,0,0.10);
      z-index:11;
      display:flex; flex-direction:column;
      transform:translateY(100%);
      transition:transform 0.38s cubic-bezier(0.34,1.15,0.64,1);
      overflow:hidden;
      padding-bottom:env(safe-area-inset-bottom, 0px);
    `;
  }

  // ── Unified verse drawer (single-tap) ──────────────────────────────────

  /**
   * Always opens on a single tap of any verse.
   * Shows: vault-highlight rows (colored) + cross-ref rows (plain) + fixed action bar.
   * If neither highlights nor xrefs exist, still shows the action bar alone.
   */
  openUnifiedDrawer(verseKey: string, highlightWord?: string): void {
    this._drawerHighlightWord = highlightWord;
    if (this.drawerOpen) this.closeBacklinkDrawer();
    this.drawerOpen = true;

    // Ensure palette is synced with the current book (or the book of the verseKey if provided)
    // For now, sync with current position's palette
    this.updatePalette();

    const notePaths = getNotePathsForVerse(verseKey);
    const parsedRefs = parseScriptureRefs(verseKey);
    const xrefs = parsedRefs.length ? getCrossRefs(parsedRefs[0]) : [];

    this.backlinkOverlay.style.display = "block";
    requestAnimationFrame(() => requestAnimationFrame(() => {
      this.backlinkOverlay.style.background = "rgba(0,0,0,0.18)";
      this.backlinkDrawer.style.transform = "translateY(0)";
    }));

    this.backlinkDrawer.empty();

    // Handle
    const handle = this.backlinkDrawer.createEl("div");
    handle.style.cssText = `width:36px;height:4px;border-radius:2px;background:var(--background-modifier-border);margin:10px auto 4px;flex-shrink:0;opacity:0.55;`;

    // Header
    const hdr = this.backlinkDrawer.createEl("div");
    hdr.style.cssText = `display:flex;align-items:center;justify-content:space-between;padding:10px 16px;flex-shrink:0;border-bottom:1px solid var(--background-modifier-border);`;

    const leftHdr = hdr.createEl("div");
    leftHdr.style.cssText = `display:flex;align-items:baseline;gap:8px;min-width:0;cursor:pointer;`;
    const titleEl = leftHdr.createEl("span");
    titleEl.style.cssText = `font-size:13px;font-weight:700;color:${this.P};`;
    titleEl.textContent = verseKey;
    const subEl = leftHdr.createEl("span");
    subEl.style.cssText = `font-size:10px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
    const parts: string[] = [];
    if (notePaths.length) parts.push(`${notePaths.length} note${notePaths.length !== 1 ? "s" : ""}`);
    if (xrefs.length) parts.push(`${xrefs.length} xref${xrefs.length !== 1 ? "s" : ""}`);
    subEl.textContent = parts.length ? parts.join(" · ") : "";

    // Action: Tap address header to insert reference at cursor
    leftHdr.addEventListener("click", (e) => {
      e.stopPropagation();
      this.insertRefIntoNote(verseKey);
      this.closeBacklinkDrawer();
    });

    const rightHdr = hdr.createEl("div");
    rightHdr.style.cssText = `display:flex;align-items:center;gap:12px;flex-shrink:0;`;

    // 1. Embed Icon
    const embBtn = rightHdr.createEl("button");
    embBtn.title = "Embed Verse";
    embBtn.style.cssText = `background:none;border:none;box-shadow:none;padding:0;cursor:pointer;display:flex;color:${this.P};opacity:0.8;`;
    embBtn.innerHTML = getIcon("embed-text-white-qwill", 28).replace(/fill="[^"]*"/g, 'fill="currentColor"');
    embBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const parsed = parseScriptureRefs(verseKey);
      if (parsed.length) {
        const style = getGlobalEmbedStyle(this.settings);
        const editor = this.getBestEditor();
        if (!editor) { this.showToast("Open a note first"); return; }
        await embedAtCursor(editor, parsed[0], style, this.settings);
        this.showToast(`Embedded: ${verseKey}`);
        this.closeBacklinkDrawer();
      }
    });

    // 2. Research Panel Icon
    const researchBtnIcon = rightHdr.createEl("button");
    researchBtnIcon.title = "Send to Research Panel";
    researchBtnIcon.style.cssText = `background:none;border:none;box-shadow:none;padding:0;cursor:pointer;display:flex;color:${this.P};opacity:0.8;`;
    researchBtnIcon.innerHTML = getIcon("interliniar", 24);
    requestAnimationFrame(() => researchBtnIcon.querySelectorAll('svg').forEach(s => s.style.fill = 'currentColor'));
    researchBtnIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeBacklinkDrawer();
      // ✅ Pass the captured word to the research panel
      if (this.onOpenResearch) this.onOpenResearch(verseKey, false, this._drawerHighlightWord);
    });

    // 3. Share/Send Icon (Clipboard)
    const shrBtn = rightHdr.createEl("button");
    shrBtn.title = "Copy to Clipboard";
    shrBtn.style.cssText = `background:none;border:none;box-shadow:none;padding:0;cursor:pointer;display:flex;color:${this.P};opacity:0.8;`;
    shrBtn.innerHTML = getIcon("dove-send", 24);
    shrBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const { getScripture } = await import("./fetcher");
      const parsed = parseScriptureRefs(verseKey);
      if (parsed.length) {
        const res = await getScripture(parsed[0], this.settings);
        const text = `${verseKey}\n${res.text}`;
        await navigator.clipboard.writeText(text);
        this.showToast("Copied to clipboard");
        this.closeBacklinkDrawer();
      }
    });

    const closeBtn = rightHdr.createEl("button");
    closeBtn.textContent = "✕";
    closeBtn.style.cssText = `background:none;border:none;box-shadow:none;padding:0;cursor:pointer;font-size:14px;color:var(--text-muted);opacity:0.6;line-height:1;margin-left:4px;`;
    closeBtn.addEventListener("click", (e) => { e.stopPropagation(); this.closeBacklinkDrawer(); });

    // Scrollable body
    const body = this.backlinkDrawer.createEl("div");
    body.style.cssText = "flex:1;overflow-y:auto;min-height:0;";

    let rowIdx = 0;

    // ─ Highlight rows (colored left bar) ─────────────────────────────────────
    if (notePaths.length) {
      const secLbl = body.createEl("div");
      secLbl.style.cssText = `padding:4px 16px 2px;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${this.P};background:var(--background-secondary);`;
      secLbl.textContent = "In Your Notes";

      notePaths.forEach((filePath) => {
        const color = notePathToColor(filePath);
        const basename = filePath.split("/").pop()?.replace(/\.md$/, "") ?? filePath;
        const dirPath = filePath.split("/").slice(0, -1).join("/");

        const row = body.createEl("div");
        row.style.cssText = `
          display:flex;align-items:stretch;cursor:pointer;
          border-bottom:1px solid var(--background-modifier-border);
          transition:background 0.1s;
          animation:ss-drawer-row-in 0.22s cubic-bezier(0.34,1.2,0.64,1) both;
          animation-delay:${rowIdx++ * 30}ms;
        `;
        row.addEventListener("mouseenter", () => row.style.background = "var(--background-modifier-hover)");
        row.addEventListener("mouseleave", () => row.style.background = "");
        row.addEventListener("click", (e) => {
          e.stopPropagation();
          this.closeBacklinkDrawer();
          this.openNoteAtVerse(filePath, verseKey);
        });
        const bar = row.createEl("div");
        bar.style.cssText = `width:4px;flex-shrink:0;align-self:stretch;background:${color};`;
        const text = row.createEl("div");
        text.style.cssText = `flex:1;padding:10px 14px;display:flex;flex-direction:column;gap:2px;min-width:0;`;
        const nameEl = text.createEl("div");
        nameEl.textContent = basename;
        nameEl.style.cssText = `font-size:13px;font-weight:600;color:var(--text-normal);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
        if (dirPath) {
          const dirEl = text.createEl("div");
          dirEl.textContent = dirPath;
          dirEl.style.cssText = `font-size:10px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
        }
        const arrow = row.createEl("div");
        arrow.textContent = "›";
        arrow.style.cssText = `flex-shrink:0;font-size:20px;color:var(--text-muted);opacity:0.35;align-self:center;padding-right:14px;`;
      });
    }

    // ─ Cross-ref rows (swipeable, no colour bar) ──────────────────────
    if (xrefs.length) {
      const xSecLbl = body.createEl("div");
      xSecLbl.style.cssText = `padding:4px 16px 2px;font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);background:var(--background-secondary);`;
      xSecLbl.textContent = "Cross-References";

      xrefs.forEach((xref) => {
        // Per-xref book color for underlay and address
        const _xrefBookColor = contrastSafeText(getRefBookColor(xref));
        // Swiping left on a xref row flings it into the note
        const wrap = body.createEl("div");
        wrap.style.cssText = `position:relative;overflow:hidden;`;

        const underlay = wrap.createEl("div");
        underlay.setAttribute("data-ss-underlay", "1");
        underlay.style.cssText = `position:absolute;inset:0;background:${_xrefBookColor};display:flex;align-items:center;justify-content:flex-end;padding-right:20px;gap:8px;`;
        const uSent = underlay.createEl("span");
        uSent.textContent = "Quote";
        uSent.style.cssText = `font-size:11px;font-weight:700;color:#fff;opacity:0.5;transition:opacity 0.12s;`;
        const uQuill = underlay.createEl("span");
        uQuill.innerHTML = getIcon("embed-text-white-qwill", 40);
        uQuill.style.cssText = `line-height:1;opacity:0.5;transform:scale(0.85);transition:opacity 0.12s,transform 0.12s; display:flex;`;

        // Capture delay value before incrementing rowIdx — the rowIdx++ inside a
        // template literal evaluates at string-build time which is fine, but we
        // need the value separately now that it's on a wrapper, not xRow itself.
        const xRowDelay = rowIdx++ * 30;
        const xRow = wrap.createEl("div");
        xRow.style.cssText = `
          padding:9px 16px;background:var(--background-primary);
          border-bottom:1px solid var(--background-modifier-border);
          will-change:transform; cursor:pointer; position:relative;
        `;
        // Solid hover — no transparent bleed-through
        xRow.addEventListener("mouseenter", () => { if (!xRow.dataset.ssDragging) xRow.style.background = "var(--background-secondary)"; });
        xRow.addEventListener("mouseleave", () => xRow.style.background = "var(--background-primary)");

        // Right-edge affordance chevron — tells the user the row is swipeable.
        // wireDrawerSwipe will hide it the moment a drag begins (via peekAt).
        const swipeHint = xRow.createEl("span");
        swipeHint.setAttribute("data-ss-swipe-hint", "1");
        swipeHint.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="${this.PM}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
        swipeHint.style.cssText = `position:absolute;right:10px;top:50%;transform:translateY(-50%);opacity:0.45;pointer-events:none;transition:opacity 0.15s;display:flex;align-items:center;`;

        // ── Entry animation goes on a CHILD wrapper, never on xRow itself. ──────
        // If xRow carries the CSS animation and the animation keyframe touches
        // `transform` (ss-drawer-row-in does: translateY 6px → 0), then while
        // that animation is active (or fill-mode:both is holding its final frame)
        // the browser's animation engine owns the `transform` property and silently
        // ignores any JS writes to xRow.style.transform.  That is why the swipe
        // gesture worked logically but produced no visible slide in Bible mode —
        // wireDrawerSwipe's translateX(-Npx) was being overridden before it could
        // paint.  Putting the animation on a non-dragged inner div fixes this
        // completely without removing the stagger entrance effect.
        const xRowInner = xRow.createEl("div");
        xRowInner.style.cssText = `
          animation:ss-drawer-row-in 0.22s cubic-bezier(0.34,1.2,0.64,1) both;
          animation-delay:${xRowDelay}ms;
        `;

        const addrEl = xRowInner.createEl("div");
        addrEl.textContent = xref;
        const _xrefColor = contrastSafeText(getRefBookColor(xref));
        addrEl.style.cssText = `font-size:12px;font-weight:700;color:${_xrefColor};margin-bottom:2px;cursor:pointer;display:inline-block;padding:2px 4px;border-radius:4px;margin-left:-4px;transition:background 0.15s, opacity 0.2s;`;
        addrEl.addEventListener("mouseenter", () => addrEl.style.background = "var(--background-secondary)");
        addrEl.addEventListener("mouseleave", () => addrEl.style.background = "");
        addrEl.addEventListener("click", (e) => {
          e.stopPropagation();
          addrEl.style.opacity = "0.3"; setTimeout(() => addrEl.style.opacity = "1", 200);
          this.insertRefIntoNote(xref);
        });

        const previewEl = xRowInner.createEl("div");
        previewEl.textContent = "Loading…";
        previewEl.style.cssText = `font-size:11px;color:var(--text-muted);padding:2px 0;line-height:1.5;`;

        // Fetch actual verse text
        (async () => {
          try {
            const { getScripture } = await import("./fetcher");
            const parsed = parseScriptureRefs(xref);
            if (!parsed.length) { previewEl.textContent = xref; return; }
            const result = await getScripture(parsed[0], this.settings);
            if (previewEl.isConnected) {
              previewEl.textContent = result.text || xref;
            }
          } catch { previewEl.textContent = xref; }
        })();

        // Tap → navigate to this verse in Bible mode
        const onTap = () => {
          const parsed = parseScriptureRefs(xref);
          if (!parsed.length) return;
          const ref = parsed[0];
          const book = BIBLE_BOOKS.find(b => b.name === ref.book);
          if (book) {
            this.closeBacklinkDrawer();
            this.goTo(book.id, ref.chapter, `${ref.book} ${ref.chapter}:${ref.verseStart}`);
          }
        };

        // Long-press → shunt to Research mode
        // Use touchstart/mousedown separation to avoid double-fire on mobile
        let longTimer: ReturnType<typeof setTimeout> | null = null;
        let xRowTouchActive = false;
        let xRowTouchTimer: ReturnType<typeof setTimeout> | null = null;
        const cancelLong = () => { if (longTimer) { clearTimeout(longTimer); longTimer = null; } };
        const fireLong = () => {
          cancelLong();
          this.closeBacklinkDrawer();
          if (this.onOpenResearch) this.onOpenResearch(xref, false);
        };
        xRow.addEventListener("touchstart", () => {
          if (xRowTouchTimer) { clearTimeout(xRowTouchTimer); xRowTouchTimer = null; }
          xRowTouchActive = true;
          longTimer = setTimeout(fireLong, 600);
        }, { passive: true });
        xRow.addEventListener("touchmove", cancelLong, { passive: true });
        xRow.addEventListener("touchend", () => {
          cancelLong();
          if (xRowTouchTimer) clearTimeout(xRowTouchTimer);
          xRowTouchTimer = setTimeout(() => { xRowTouchActive = false; }, 500);
        }, { passive: true });
        xRow.addEventListener("touchcancel", () => {
          cancelLong();
          if (xRowTouchTimer) clearTimeout(xRowTouchTimer);
          xRowTouchTimer = setTimeout(() => { xRowTouchActive = false; }, 500);
        }, { passive: true });
        xRow.addEventListener("mousedown", () => { if (!xRowTouchActive) longTimer = setTimeout(fireLong, 600); });
        xRow.addEventListener("mouseup", () => { if (!xRowTouchActive) cancelLong(); });
        xRow.addEventListener("mousemove", () => { if (!xRowTouchActive) cancelLong(); });
        xRow.addEventListener("mouseleave", () => { if (!xRowTouchActive) cancelLong(); });

        const onEmbed = () => {
          const parsed = parseScriptureRefs(xref);
          if (!parsed.length) return;
          const style = getGlobalEmbedStyle(this.settings);
          const editor = this.getBestEditor();
          if (!editor) { this.showToast("Open a note first"); return; }
          embedAtCursor(editor, parsed[0], style, this.settings)
            .then(() => this.showToast(`Embedded: ${xref}`))
            .catch(console.error);
        };
        this.wireDrawerSwipe(xRow, wrap, onTap, onEmbed);
      });
    }

    // Safe-area pad
    const pad = body.createEl("div");
    pad.style.cssText = "height:env(safe-area-inset-bottom, 16px);";
  }

  /**
   * Swipe-left-to-embed for drawer cross-ref rows.
   *
   * The row slides left with the finger, revealing the purple underlay.
   * Peek (~25% width)  → quill brightens so user sees the option.
   * Commit (~45% width) → quill flashes, "Sent" appears, row flies off.
   * Release early       → row springs back.
   * Right-click (desktop) → animated half-peek; click purple = commit, anywhere else = cancel.
   *
   * IMPORTANT: we never write to dragEl.style.transition during normal state
   * (that would destroy the background hover transition). We only write it
   * for animated spring-back / fly-off, then immediately remove it afterward.
   */
  private wireDrawerSwipe(
    dragEl: HTMLElement,
    containerEl: HTMLElement,
    onTap: () => void,
    onEmbed: () => void
  ): void {
    // Inject quill-sent keyframe once
    if (!document.getElementById("ss-quill-kf")) {
      const s = document.createElement("style");
      s.id = "ss-quill-kf";
      s.textContent = `@keyframes ss-quill-pop{0%{transform:scale(0.85)}40%{transform:scale(1.4)}70%{transform:scale(0.95)}100%{transform:scale(1.15)}}`;
      document.head.appendChild(s);
    }

    const sentEl = containerEl.querySelector<HTMLElement>("[data-ss-underlay] span:first-child") as HTMLElement | null;
    const quillEl = containerEl.querySelector<HTMLElement>("[data-ss-underlay] span:last-child") as HTMLElement | null;

    // The affordance chevron lives on the drag target (xRow), not the container.
    const hintEl = dragEl.querySelector<HTMLElement>("[data-ss-swipe-hint]");

    let startX = 0, startY = 0, dx = 0;
    let dragging = false, axisLocked = false, isHoriz = false;
    let touchActive = false;

    const W = () => containerEl.offsetWidth || 300;
    const PEEK = 0.25;
    const COMMIT = 0.45;

    // Update the quill visual based on drag ratio (0 → 1).
    // Also hides the swipe-hint chevron the moment the user starts dragging
    // so it doesn't compete visually with the revealed underlay.
    const peekAt = (ratio: number) => {
      if (hintEl) hintEl.style.opacity = ratio > 0.04 ? "0" : "0.45";
      if (!quillEl) return;
      if (ratio <= 0) {
        quillEl.style.opacity = "0.5";
        quillEl.style.transform = "scale(0.85)";
        if (sentEl) { sentEl.style.opacity = "0.5"; sentEl.textContent = "Quote"; }
      } else if (ratio >= PEEK) {
        quillEl.style.opacity = "1";
        quillEl.style.transform = "scale(1.1)";
        if (sentEl) { sentEl.style.opacity = "1"; sentEl.textContent = "Quote"; }
      } else {
        const t = ratio / PEEK;
        quillEl.style.opacity = String(0.5 + t * 0.5);
        quillEl.style.transform = `scale(${0.85 + t * 0.25})`;
        if (sentEl) { sentEl.style.opacity = String(0.5 + t * 0.5); sentEl.textContent = "Quote"; }
      }
    };

    const commitFlash = (then: () => void) => {
      if (quillEl) {
        quillEl.style.animation = "ss-quill-pop 0.3s ease forwards";
        quillEl.style.opacity = "1";
      }
      if (sentEl) {
        sentEl.style.opacity = "1";
        sentEl.textContent = "Quoted!";
      }
      setTimeout(() => {
        if (quillEl) quillEl.style.animation = "";
        then();
      }, 320);
    };

    const springBack = () => {
      dragEl.dataset.ssDragging = "";
      dragEl.style.transition = "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)";
      dragEl.style.transform = "";
      dragEl.style.opacity = "";
      peekAt(0);
      const cleanup = () => {
        dragEl.style.transition = "";
        delete dragEl.dataset.ssDragging;
        dragEl.removeEventListener("transitionend", cleanup);
      };
      dragEl.addEventListener("transitionend", cleanup);
    };

    const flyOff = () => {
      commitFlash(() => {
        onEmbed();
        setTimeout(() => {
          if (dragEl.isConnected) springBack();
        }, 150);
      });
    };

    const onStart = (cx: number, cy: number) => {
      startX = cx; startY = cy; dx = 0;
      dragging = true; axisLocked = false; isHoriz = false;
    };

    const onMove = (cx: number, cy: number) => {
      if (!dragging) return;
      const ddx = cx - startX, ddy = cy - startY;
      if (!axisLocked) {
        if (Math.abs(ddx) < 4 && Math.abs(ddy) < 4) return;
        isHoriz = Math.abs(ddx) > Math.abs(ddy);
        axisLocked = true;
        if (isHoriz) dragEl.dataset.ssDragging = "1";
      }
      if (!isHoriz) return;
      dx = Math.min(0, ddx);
      // Direct style write (no transition active = immediate, no jank)
      dragEl.style.transform = `translateX(${dx}px)`;
      peekAt(Math.abs(dx) / W());
    };

    const onEnd = (isTap: boolean) => {
      if (!dragging) return;
      dragging = false;
      delete dragEl.dataset.ssDragging;

      // ✅ Tap detected
      if (isTap || Math.abs(dx) < 6) {
        dragEl.style.transform = "";
        peekAt(0);
        if (isTap) onTap();
        return;
      }

      // ✅ If it moved but wasn't horizontal (i.e., vertical scroll)
      if (!isHoriz) {
        dragEl.style.transform = "";
        peekAt(0);
        return;
      }

      if (Math.abs(dx) / W() >= COMMIT) { flyOff(); } else { springBack(); }
    };

    // ── Touch ────────────────────────────────────────────────────────────────
    let touchTimer: ReturnType<typeof setTimeout> | null = null;
    dragEl.addEventListener("touchstart", (e) => {
      if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
      touchActive = true;
      onStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    dragEl.addEventListener("touchmove", (e) => {
      onMove(e.touches[0].clientX, e.touches[0].clientY);
      if (isHoriz && Math.abs(dx) > 4) e.preventDefault();
    }, { passive: false });

    dragEl.addEventListener("touchend", (e) => {
      const tdx = e.changedTouches[0].clientX - startX;
      const tdy = e.changedTouches[0].clientY - startY;
      const wasTap = Math.abs(tdx) < 10 && Math.abs(tdy) < 10;
      // ✅ Block synthetic mousedown/mouseup that the browser fires ~300 ms after
      // touchend — these can land on freshly-loaded content and cause a second
      // unintended navigation before the user touches anything again.
      if (wasTap) this.blockSyntheticMouse();
      onEnd(wasTap);
      if (touchTimer) clearTimeout(touchTimer);
      touchTimer = setTimeout(() => { touchActive = false; touchTimer = null; }, 500);
    }, { passive: true });

    dragEl.addEventListener("touchcancel", () => {
      dragging = false; delete dragEl.dataset.ssDragging;
      springBack();
      if (touchTimer) clearTimeout(touchTimer);
      touchTimer = setTimeout(() => { touchActive = false; touchTimer = null; }, 500);
    }, { passive: true });

    // Block all synthetic clicks on mobile
    dragEl.addEventListener("click", (e) => {
      if (touchActive) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    // ── Mouse (desktop) ───────────────────────────────────────────────────────
    dragEl.addEventListener("mousedown", (e) => {
      if (touchActive || e.button !== 0) return;
      onStart(e.clientX, e.clientY);
    });
    dragEl.addEventListener("mousemove", (e) => {
      if (touchActive || e.buttons !== 1) return;
      onMove(e.clientX, e.clientY);
    });
    dragEl.addEventListener("mouseup", (e) => {
      if (touchActive || e.button !== 0) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const wasTap = Math.abs(dx) < 10 && Math.abs(dy) < 10;
      onEnd(wasTap);
    });
    dragEl.addEventListener("mouseleave", () => {
      if (touchActive || !dragging) return;
      onEnd(false);
    });

    // ── Right-click peek (desktop) ────────────────────────────────────────────
    dragEl.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (touchActive || dragging) return;
      const peekPx = -(W() * 0.36);
      dragEl.style.transition = "transform 0.2s cubic-bezier(0.34,1.3,0.64,1)";
      dragEl.style.transform = `translateX(${peekPx}px)`;
      peekAt(0.36);
      setTimeout(() => { dragEl.style.transition = ""; }, 220);

      const dismiss = (ev: MouseEvent) => {
        document.removeEventListener("mousedown", dismiss, true);
        const tgt = ev.target as Node;
        const inUnderlay = containerEl.querySelector("[data-ss-underlay]")?.contains(tgt);
        if (inUnderlay) {
          ev.preventDefault(); ev.stopPropagation();
          // Simulate a full commit from this peek position
          dragging = true; isHoriz = true; dx = peekPx;
          onEnd(false);
        } else {
          springBack();
        }
      };
      setTimeout(() => document.addEventListener("mousedown", dismiss, true), 30);
    });
  }

  /**
   * Opens a note file and scrolls to the first line containing verseKey.
   */
  private openNoteAtVerse(filePath: string, verseKey: string): void {
    this.app.workspace.openLinkText(filePath, "", false);
    // Give the file time to load, then find and scroll to the verse reference
    setTimeout(() => {
      const view = this.app.workspace.getMostRecentLeaf()?.view as any;
      const editor = view?.editor;
      if (!editor) return;
      const lineCount = editor.lineCount?.() ?? 0;
      for (let i = 0; i < lineCount; i++) {
        const line: string = editor.getLine(i) ?? "";
        if (line.includes(verseKey) || line.includes(verseKey.replace(" ", ""))) {
          editor.setCursor({ line: i, ch: 0 });
          editor.scrollIntoView?.({ from: { line: i, ch: 0 }, to: { line: i, ch: 0 } }, true);
          break;
        }
      }
    }, 450);
  }

  closeBacklinkDrawer(): void {
    if (!this.drawerOpen) return;
    this.drawerOpen = false;
    this.backlinkOverlay.style.background = "rgba(0,0,0,0)";
    this.backlinkDrawer.style.transform = "translateY(100%)";
    setTimeout(() => {
      if (!this.drawerOpen) this.backlinkOverlay.style.display = "none";
    }, 400);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private getBook(id: number): BookMeta | undefined {
    return BIBLE_BOOKS.find(b => b.id === id);
  }

  /** Extracts the word under the tap coordinates, ignoring punctuation */
  private getWordAtTap(x: number, y: number): string {
    let pos: any;
    if ((document as any).caretPositionFromPoint) pos = (document as any).caretPositionFromPoint(x, y);
    else if ((document as any).caretRangeFromPoint) pos = (document as any).caretRangeFromPoint(x, y);

    if (!pos?.offsetNode || pos.offsetNode.nodeType !== Node.TEXT_NODE) return "";
    const txt = pos.offsetNode.textContent || "";
    const start = txt.lastIndexOf(" ", pos.offset - 1) + 1;
    const end = txt.indexOf(" ", pos.offset);
    // Keep Latin, Greek, Hebrew chars & numbers; strip punctuation
    return txt.substring(start, end === -1 ? txt.length : end).replace(/[^\p{L}\p{N}]/gu, "").trim();
  }

  // advanceCursorAfterEmbed removed — embedAtCursor now handles cursor
  // advancement internally to ensure consecutive embeds flow downward.

  /**
   * After a touch-tap navigation, the browser fires synthetic mousedown/mouseup/click
   * events ~300 ms later at the same screen coordinates. If freshly-loaded content
   * (e.g. a new chapter's verse spans) sits at those coordinates, the events can
   * trigger a second unintended navigation.
   *
   * This helper installs a one-shot capture-phase mousedown blocker on the carousel
   * root for 600 ms — long enough to absorb the synthetic burst, short enough not
   * to interfere with the user's next deliberate click.
   */
  private blockSyntheticMouse(): void {
    const blocker = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
    };
    this.root.addEventListener("mousedown", blocker, { capture: true });
    setTimeout(() => { this.root.removeEventListener("mousedown", blocker, true); }, 600);
  }
}