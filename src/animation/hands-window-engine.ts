import { HANDS_ART } from "./hands-window-art.js";
import { handsGlyphsAt, handsPoseAt } from "./hands-window-motion.js";

export type HandsWindowOptions = { color: string; opacity: number; size: number; glyphSize: number; speed: number; paused: boolean };

export class HandsWindowEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly observer: ResizeObserver;
  private readonly reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  private options: HandsWindowOptions;
  private raf = 0;
  private last = 0;
  private elapsed = 0;
  private width = 0;
  private height = 0;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, options: HandsWindowOptions, status: (message: string) => void = () => undefined) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Canvas 2D is unavailable");
    this.ctx = ctx;
    this.options = { ...options };
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.reduced.addEventListener("change", this.onPreference);
    status("ASCII 双手与窗口运行中");
    this.resize();
    this.schedule();
  }

  setOptions(options: Partial<HandsWindowOptions>) {
    this.options = { ...this.options, ...options };
    if (this.options.paused || this.reduced.matches) { cancelAnimationFrame(this.raf); this.draw(); }
    else this.schedule();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    this.reduced.removeEventListener("change", this.onPreference);
  }

  private resize() {
    const rect = this.ctx.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    this.width = rect.width;
    this.height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.ctx.canvas.width = Math.round(rect.width * dpr);
    this.ctx.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  private schedule() {
    cancelAnimationFrame(this.raf);
    if (this.disposed || this.options.paused || this.reduced.matches) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    if (this.disposed || this.options.paused || this.reduced.matches) return;
    const delta = Math.min(0.08, (now - this.last) / 1000);
    if (delta >= 1 / 30) {
      this.elapsed += delta * this.options.speed;
      this.last = now;
      this.draw();
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  private draw() {
    if (this.width < 1 || this.height < 1) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    const cellW = Math.min(this.width * 0.99 / HANDS_ART[0]!.length, this.height * 0.92 / (HANDS_ART.length * 1.8)) * this.options.size;
    const cellH = cellW * 1.8;
    const left = (this.width - HANDS_ART[0]!.length * cellW) / 2;
    const top = (this.height - HANDS_ART.length * cellH) / 2;
    ctx.save();
    ctx.font = `600 ${cellW * 2.05 * this.options.glyphSize}px Consolas, "Cascadia Mono", monospace`;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    const color = /^#[\da-f]{6}$/i.test(this.options.color) ? this.options.color : "#ededed";
    for (const glyph of handsGlyphsAt(handsPoseAt(this.elapsed), this.options.glyphSize)) {
      ctx.fillStyle = glyph.part === "window" ? "#d5d5d5" : color;
      ctx.globalAlpha = this.options.opacity * glyph.alpha;
      ctx.fillText(glyph.char, left + glyph.x * cellW, top + glyph.y * cellH + cellW * 1.5);
    }
    ctx.restore();
  }

  private onPreference = () => { if (this.reduced.matches) { cancelAnimationFrame(this.raf); this.draw(); } else this.schedule(); };
}
