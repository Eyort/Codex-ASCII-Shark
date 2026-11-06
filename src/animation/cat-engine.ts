import { CAT_ART } from "./cat-art.js";
import { catGlyphsAt, catPoseAt } from "./cat-motion.js";

export type CatOptions = {
  color: string;
  opacity: number;
  size: number;
  headSpeed: number;
  tailSpeed: number;
  paused: boolean;
};

export class CatEngine {
  private readonly context: CanvasRenderingContext2D;
  private readonly observer: ResizeObserver;
  private readonly motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  private options: CatOptions;
  private raf = 0;
  private lastFrame = 0;
  private elapsed = 0;
  private headPhase = 0;
  private tailPhase = 0;
  private width = 0;
  private height = 0;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, options: CatOptions, onStatus: (message: string) => void = () => undefined) {
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("Canvas 2D is unavailable");
    this.context = context;
    this.options = { ...options };
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.motionPreference.addEventListener("change", this.onMotionPreference);
    onStatus("ASCII 猫运行中");
    this.resize();
    this.schedule();
  }

  setOptions(options: Partial<CatOptions>) {
    this.options = { ...this.options, ...options };
    if (this.options.paused || this.motionPreference.matches) {
      cancelAnimationFrame(this.raf);
      this.draw();
    } else this.schedule();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    this.motionPreference.removeEventListener("change", this.onMotionPreference);
  }

  private resize() {
    const rect = this.context.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    this.width = rect.width;
    this.height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.context.canvas.width = Math.round(rect.width * dpr);
    this.context.canvas.height = Math.round(rect.height * dpr);
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  private schedule() {
    cancelAnimationFrame(this.raf);
    if (this.disposed || this.options.paused || this.motionPreference.matches) return;
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    if (this.disposed || this.options.paused || this.motionPreference.matches) return;
    const delta = Math.min(0.08, (now - this.lastFrame) / 1000);
    if (delta >= 1 / 30) {
      this.elapsed += delta;
      this.headPhase += delta * this.options.headSpeed;
      this.tailPhase += delta * this.options.tailSpeed;
      this.lastFrame = now;
      this.draw();
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  private draw() {
    if (this.width < 1 || this.height < 1) return;
    const context = this.context;
    context.clearRect(0, 0, this.width, this.height);
    const columns = CAT_ART[0]?.length ?? 96;
    const rows = CAT_ART.length;
    const cellWidth = Math.min(this.width * 0.88 / columns, this.height * 0.99 / (rows * 2)) * this.options.size;
    const cellHeight = cellWidth * 2;
    const left = (this.width - columns * cellWidth) / 2;
    const top = this.height - rows * cellHeight;
    context.save();
    context.fillStyle = /^#[\da-f]{6}$/i.test(this.options.color) ? this.options.color : "#657b73";
    context.font = `600 ${cellWidth * 2}px Consolas, "Cascadia Mono", monospace`;
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    const glyphs = catGlyphsAt(catPoseAt(this.elapsed, this.headPhase, this.tailPhase));
    for (const glyph of glyphs) {
      context.globalAlpha = this.options.opacity * glyph.alpha;
      context.fillText(glyph.char, left + glyph.x * cellWidth, top + glyph.y * cellHeight + cellWidth * 1.65);
    }
    context.restore();
  }

  private onMotionPreference = () => {
    if (this.motionPreference.matches) {
      cancelAnimationFrame(this.raf);
      this.draw();
    } else this.schedule();
  };
}
