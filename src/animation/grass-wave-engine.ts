import { createGrassAsciiTexture } from "./grass-texture.js";
import { getGrassDurationSeconds, getGrassStripCount } from "./grass-wave-model.js";

export type GrassWaveOptions = { detail: number; speed: number; opacity: number; paused: boolean };

export class GrassWaveEngine {
  readonly ready: Promise<void>;
  private readonly root = document.createElement("div");
  private readonly style = document.createElement("style");
  private readonly image = new Image();
  private readonly observer: ResizeObserver;
  private resizeTimer = 0;
  private options: GrassWaveOptions;
  private destroyed = false;

  constructor(private readonly host: HTMLElement, sourceUrl: string, options: GrassWaveOptions) {
    this.options = { ...options };
    this.root.className = "ascii-grass-wave";
    this.root.setAttribute("aria-hidden", "true");
    Object.assign(this.root.style, { position: "absolute", inset: "0", overflow: "hidden", pointerEvents: "none", zIndex: "0", opacity: String(options.opacity) });
    this.style.textContent = `@keyframes ascii-grass-sway { 0%,100% { transform: translate3d(-1.4%,0,0) skewY(-0.35deg) } 50% { transform: translate3d(1.4%,0,0) skewY(0.35deg) } } .ascii-grass-strip { position:absolute; left:-2%; width:104%; background-repeat:no-repeat; transform-origin:center; animation-name:ascii-grass-sway; animation-timing-function:ease-in-out; animation-iteration-count:infinite; }`;
    this.style.id = "ascii-grass-wave-style";
    document.head.append(this.style);
    host.append(this.root);
    this.image.decoding = "async";
    this.ready = new Promise<void>((resolve) => {
      this.image.onload = () => { if (!this.destroyed) this.render(); resolve(); };
      this.image.onerror = () => { this.root.remove(); this.style.remove(); resolve(); };
    });
    this.image.src = sourceUrl;
    this.observer = new ResizeObserver(() => {
      window.clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => this.render(), 120);
    });
    this.observer.observe(host);
  }

  resize(): void { this.render(); }
  setPaused(paused: boolean): void {
    if (this.options.paused === paused) return;
    this.options.paused = paused; for (const strip of this.root.children) (strip as HTMLElement).style.animationPlayState = paused ? "paused" : "running";
  }
  setSpeed(speed: number): void {
    if (this.options.speed === speed) return;
    this.options.speed = speed;
    const base = getGrassDurationSeconds(speed);
    [...this.root.children].forEach((strip, index) => { (strip as HTMLElement).style.animationDuration = `${(base * (0.88 + (index % 5) * 0.06)).toFixed(2)}s`; });
  }
  setOpacity(opacity: number): void {
    const next = Math.max(0, Math.min(1, opacity));
    if (this.options.opacity === next) return;
    this.options.opacity = next; this.root.style.opacity = String(next);
  }
  setDetail(detail: number): void { if (this.options.detail === detail) return; this.options.detail = detail; this.render(); }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    window.clearTimeout(this.resizeTimer);
    this.observer.disconnect();
    this.image.onload = null; this.image.onerror = null;
    this.root.remove(); this.style.remove();
  }

  private render(): void {
    if (this.destroyed || !this.image.complete || !this.image.naturalWidth) return;
    const rect = this.host.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const texture = createGrassAsciiTexture(this.image, rect.width, rect.height, this.options.detail).toDataURL("image/png");
    const count = getGrassStripCount(rect.height, this.options.detail);
    this.root.replaceChildren();
    for (let index = 0; index < count; index++) {
      const strip = document.createElement("div");
      strip.className = "ascii-grass-strip";
      const phase = index / count;
      const duration = getGrassDurationSeconds(this.options.speed) * (0.88 + (index % 5) * 0.06);
      Object.assign(strip.style, { top: `${phase * 100}%`, height: `${Math.ceil(100 / count) + 1}%`, backgroundImage: `url("${texture}")`, backgroundSize: `100% ${count * 100}%`, backgroundPosition: `center ${count === 1 ? 0 : phase * 100 / (1 - 1 / count)}%`, animationDuration: `${duration.toFixed(2)}s`, animationDelay: `${(-phase * duration).toFixed(2)}s`, animationPlayState: this.options.paused ? "paused" : "running", opacity: String(0.30 + ((index * 13) % 20) / 100) });
      this.root.append(strip);
    }
    this.root.style.opacity = String(this.options.opacity);
  }
}
