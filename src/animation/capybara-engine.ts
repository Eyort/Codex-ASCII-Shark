import { CAPYBARA_ART } from "./capybara-art.js";
import { capybaraGlyphsAt, capybaraPoseAt } from "./capybara-motion.js";

export type CapybaraOptions = { color: string; opacity: number; size: number; speed: number; paused: boolean };

export class CapybaraEngine {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly observer: ResizeObserver;
  private readonly reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  private options: CapybaraOptions;
  private elapsed = 0;
  private last = 0;
  private raf = 0;
  private width = 0;
  private height = 0;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, options: CapybaraOptions, status: (message: string) => void = () => undefined) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Canvas 2D is unavailable");
    this.ctx = ctx;
    this.options = { ...options };
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.reduced.addEventListener("change", this.onPreference);
    status("ASCII 卡皮巴拉运行中");
    this.resize();
    this.schedule();
  }

  setOptions(options: Partial<CapybaraOptions>) {
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
    const cols = CAPYBARA_ART[0]!.length;
    const rows = CAPYBARA_ART.length;
    const cellW = Math.min(this.width * 0.84 / cols, this.height * 0.87 / (rows * 1.85)) * this.options.size;
    const cellH = cellW * 1.85;
    const left = (this.width - cols * cellW) / 2;
    const top = this.height - rows * cellH + cellH * 0.1;
    const colors = { fur: /^#[\da-f]{6}$/i.test(this.options.color) ? this.options.color : "#625d57", orange: "#e97637", leaf: "#59964a", bubble: "#68a9d8" };
    ctx.save();
    ctx.font = `600 ${cellW * 2.2}px Consolas, "Cascadia Mono", monospace`;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    for (const glyph of capybaraGlyphsAt(capybaraPoseAt(this.elapsed))) {
      ctx.fillStyle = colors[glyph.color];
      ctx.globalAlpha = this.options.opacity * glyph.alpha;
      ctx.fillText(glyph.char, left + glyph.x * cellW, top + glyph.y * cellH + cellW * 1.5);
    }
    ctx.restore();
  }

  private onPreference = () => { if (this.reduced.matches) { cancelAnimationFrame(this.raf); this.draw(); } else this.schedule(); };
}
