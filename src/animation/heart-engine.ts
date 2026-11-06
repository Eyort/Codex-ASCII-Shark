export type HeartOptions = {
  color: string;
  opacity: number;
  size: number;
  beatSpeed: number;
  ringSpeed: number;
  paused: boolean;
};

type Crop = { x: number; y: number; width: number; height: number };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const smoothstep = (a: number, b: number, value: number) => {
  const t = clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Renders the reference heart as a crisp, animated character grid with ASCII wake rings. */
export class HeartEngine {
  private readonly context: CanvasRenderingContext2D;
  private readonly observer: ResizeObserver;
  private readonly motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  private readonly image = new Image();
  private readonly sourceCanvas = document.createElement("canvas");
  private sourcePixels: ImageData | null = null;
  private outlineDistance: Float32Array | null = null;
  private crop: Crop | null = null;
  private options: HeartOptions;
  private raf = 0;
  private lastFrame = 0;
  private lastRendered = 0;
  private elapsed = 0;
  private ready = false;
  private disposed = false;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private onStatus: (message: string) => void;

  constructor(canvas: HTMLCanvasElement, sourceUrl: string, options: HeartOptions, onStatus: (message: string) => void = () => undefined) {
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("Canvas 2D is unavailable");
    this.context = context;
    this.options = { ...options };
    this.onStatus = onStatus;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.motionPreference.addEventListener("change", this.onMotionPreference);
    this.image.decoding = "async";
    this.image.onload = () => {
      if (this.disposed) return;
      try {
        this.prepareSource();
        this.ready = true;
        this.onStatus("参考图已载入 · 清晰 ASCII 字符随心跳变化，五层波纹向外扩散");
        this.resize();
        this.schedule();
      } catch (error) {
        this.onStatus(error instanceof Error ? error.message : "无法处理心脏参考图");
      }
    };
    this.image.onerror = () => this.onStatus("心脏参考图未找到，请确认 references/heart-reference.png 存在");
    this.image.src = sourceUrl;
  }

  setOptions(options: Partial<HeartOptions>) {
    this.options = { ...this.options, ...options };
    if (options.paused !== undefined) {
      if (this.options.paused) cancelAnimationFrame(this.raf);
      else this.schedule();
    }
    if (this.options.paused || this.motionPreference.matches) this.draw();
    else this.schedule();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    this.motionPreference.removeEventListener("change", this.onMotionPreference);
    this.image.onload = null;
    this.image.onerror = null;
  }

  private prepareSource() {
    const width = this.image.naturalWidth;
    const height = this.image.naturalHeight;
    this.sourceCanvas.width = width;
    this.sourceCanvas.height = height;
    const sourceContext = this.sourceCanvas.getContext("2d", { willReadFrequently: true });
    if (!sourceContext) throw new Error("Canvas 2D is unavailable");
    sourceContext.drawImage(this.image, 0, 0);
    const pixels = sourceContext.getImageData(0, 0, width, height);
    let minX = width; let minY = height; let maxX = 0; let maxY = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const luminance = 0.2126 * pixels.data[index]! + 0.7152 * pixels.data[index + 1]! + 0.0722 * pixels.data[index + 2]!;
      if (luminance < 224) {
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    }
    if (maxX <= minX || maxY <= minY) throw new Error("No ASCII heart art was found in the reference image");
    const pad = Math.round(Math.min(maxX - minX, maxY - minY) * 0.035);
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropWidth = Math.min(width, maxX + pad + 1) - cropX;
    const cropHeight = Math.min(height, maxY + pad + 1) - cropY;

    // Keep source cells near their original resolution. Character glyphs are redrawn below, not blurred as a bitmap.
    const sampleWidth = Math.min(cropWidth, 420);
    const sampleHeight = Math.max(1, Math.round(cropHeight * sampleWidth / cropWidth));
    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = sampleWidth;
    sampleCanvas.height = sampleHeight;
    const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
    if (!sampleContext) throw new Error("Canvas sampling context is unavailable");
    sampleContext.imageSmoothingEnabled = false;
    sampleContext.drawImage(this.image, cropX, cropY, cropWidth, cropHeight, 0, 0, sampleWidth, sampleHeight);
    const sampled = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight);
    for (let i = 0; i < sampled.data.length; i += 4) {
      const luminance = 0.2126 * sampled.data[i]! + 0.7152 * sampled.data[i + 1]! + 0.0722 * sampled.data[i + 2]!;
      sampled.data[i + 3] = Math.round(clamp((238 - luminance) * 1.55, 0, 255) * sampled.data[i + 3]! / 255);
    }
    this.sourcePixels = sampled;
    this.crop = { x: cropX, y: cropY, width: sampleWidth, height: sampleHeight };
    this.outlineDistance = this.buildOutlineDistance(sampled);
  }

  private resize() {
    const rect = this.context.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    this.width = rect.width;
    this.height = rect.height;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.context.canvas.width = Math.round(rect.width * this.dpr);
    this.context.canvas.height = Math.round(rect.height * this.dpr);
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.draw();
  }

  private schedule() {
    cancelAnimationFrame(this.raf);
    if (!this.ready || this.disposed || this.options.paused || this.motionPreference.matches) return;
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    if (this.disposed || this.options.paused || this.motionPreference.matches) return;
    if (now - this.lastRendered < 1000 / 30) {
      this.raf = requestAnimationFrame(this.frame);
      return;
    }
    this.lastRendered = now;
    this.elapsed += Math.min(0.08, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  };

  private draw() {
    if (!this.ready || !this.crop || !this.sourcePixels || this.width < 1 || this.height < 1) return;
    const { width, height } = this.crop;
    const scale = Math.min(this.width * 0.76 / width, this.height * 0.90 / height) * this.options.size;
    const period = 3.25 / Math.max(0.35, this.options.beatSpeed);
    const beatPhase = (this.elapsed % period) / period;
    const systole = Math.exp(-Math.pow((beatPhase - 0.18) / 0.085, 2));
    const rebound = Math.exp(-Math.pow((beatPhase - 0.32) / 0.10, 2));
    const beat = systole * 0.95 + rebound * 0.36;
    const color = /^#([\da-f]{6})$/i.exec(this.options.color)?.[1] ?? "a86370";
    const red = Number.parseInt(color.slice(0, 2), 16);
    const green = Number.parseInt(color.slice(2, 4), 16);
    const blue = Number.parseInt(color.slice(4, 6), 16);

    this.context.clearRect(0, 0, this.width, this.height);
    this.context.save();
    this.context.translate(this.width * 0.5, this.height * 0.49);
    this.context.scale(scale, scale);
    this.context.translate(-width / 2, -height / 2);
    this.drawRipples(period, beatPhase, width, height, red, green, blue);
    this.drawAsciiHeart(width, height, beat, red, green, blue);
    this.context.restore();
  }

  private drawAsciiHeart(width: number, height: number, beat: number, red: number, green: number, blue: number) {
    const source = this.sourcePixels!.data;
    const columns = Math.ceil(width / 6);
    const rows = Math.ceil(height / 8.2);
    const cellWidth = width / columns;
    const cellHeight = height / rows;
    const fontSize = Math.max(5, cellHeight * 1.15);
    // Preserve the reference's mark language: light edges use punctuation; dense regions use @ and #.
    const ramp = ".:=+*#%@";
    const sampleOffsets = [-0.4, -0.2, 0, 0.2, 0.4];
    this.context.font = `${fontSize}px Consolas, "Courier New", monospace`;
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";
    this.context.fillStyle = `rgb(${red} ${green} ${blue})`;

    // Each cell is sampled from the original ASCII image, then drawn as a crisp text glyph.
    for (let row = 0; row < rows; row++) {
      const v = (row + 0.5) / rows;
      const vesselWeight = 1 - smoothstep(0.08, 0.37, v);
      const vesselY = Math.sin(this.elapsed * 2.15 + v * 8.5) * height * 0.004 * vesselWeight * (0.35 + beat * 0.85);
      const lowerWeight = smoothstep(0.54, 0.90, v);
      const rowBeat = Math.sin(this.elapsed * 2.15 + 0.7);
      for (let column = 0; column < columns; column++) {
        const u = (column + 0.5) / columns;
        const side = Math.sign(u - 0.5);
        const branch = smoothstep(0.02, 0.16, Math.abs(u - 0.5)) * vesselWeight;
        const vesselX = side * Math.sin(this.elapsed * 2.15 + v * 7 + side * 0.55) * width * 0.006 * branch * (0.35 + beat);
        const sourceU = (u - 0.5) / (1 - beat * 0.035) + 0.5 - vesselX / width;
        const sourceV = (v - 0.51) / (1 + beat * 0.035) + 0.51 - vesselY / height - lowerWeight * rowBeat * beat * 0.0045;
        const centerX = sourceU * width;
        const centerY = sourceV * height;
        let ink = 0;
        let samples = 0;
        for (const oy of sampleOffsets) for (const ox of sampleOffsets) {
          const sx = Math.round(centerX + ox * cellWidth);
          const sy = Math.round(centerY + oy * cellHeight);
          if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;
          ink += source[(sy * width + sx) * 4 + 3]! / 255;
          samples++;
        }
        if (!samples) continue;
        const density = ink / samples;
        if (density < 0.035) continue;

        // A slow local shimmer nudges neighboring glyph densities so the ASCII texture visibly lives.
        const randomSeed = Math.sin((column + 1) * 127.1 + (row + 1) * 311.7) * 43758.5453;
        const cellPhase = (randomSeed - Math.floor(randomSeed)) * Math.PI * 2;
        const phase = this.elapsed * 1.55 + cellPhase;
        const tonalDensity = Math.pow(density, 0.52);
        const glyphPulse = Math.sin(phase) * 0.72 + Math.sin(this.elapsed * 0.67 + cellPhase * 1.83) * 0.28;
        const glyphShift = Math.round(glyphPulse * (0.55 + beat * 1.25));
        const glyphIndex = clamp(Math.round(tonalDensity * (ramp.length - 1)) + glyphShift, 0, ramp.length - 1);
        const glyph = ramp[glyphIndex]!;
        const breathe = 0.96 + 0.04 * Math.sin(this.elapsed * 1.1 + cellPhase);
        this.context.globalAlpha = clamp((this.options.opacity + 0.18) * (0.9 + tonalDensity * 0.1) * breathe, 0, 1);
        this.context.fillText(glyph, (column + 0.5) * cellWidth, (row + 0.5) * cellHeight);
      }
    }
  }

  private buildOutlineDistance(image: ImageData) {
    const { width, height, data } = image;
    const left = new Int16Array(height).fill(-1);
    const right = new Int16Array(height).fill(-1);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! > 18) {
        if (left[y] < 0) left[y] = x;
        right[y] = x;
      }
    }
    for (let y = 0; y < height; y++) {
      if (left[y] >= 0) continue;
      let before = y - 1; let after = y + 1;
      while (before >= 0 && left[before] < 0) before--;
      while (after < height && left[after] < 0) after++;
      if (before >= 0 && after < height) {
        const t = (y - before) / (after - before);
        left[y] = Math.round(left[before]! + (left[after]! - left[before]!) * t);
        right[y] = Math.round(right[before]! + (right[after]! - right[before]!) * t);
      } else if (before >= 0 || after < height) {
        const nearest = before >= 0 ? before : after;
        left[y] = left[nearest]!;
        right[y] = right[nearest]!;
      }
    }
    const mask = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      if (left[y] < 0) continue;
      let lo = width; let hi = 0;
      for (let oy = Math.max(0, y - 2); oy <= Math.min(height - 1, y + 2); oy++) {
        if (left[oy]! >= 0) { lo = Math.min(lo, left[oy]!); hi = Math.max(hi, right[oy]!); }
      }
      for (let x = lo; x <= hi; x++) mask[y * width + x] = 1;
    }
    const distance = new Float32Array(width * height);
    const diagonal = Math.SQRT2;
    for (let i = 0; i < distance.length; i++) distance[i] = mask[i] ? 0 : 1e6;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (x > 0) distance[i] = Math.min(distance[i]!, distance[i - 1]! + 1);
      if (y > 0) {
        distance[i] = Math.min(distance[i]!, distance[i - width]! + 1);
        if (x > 0) distance[i] = Math.min(distance[i]!, distance[i - width - 1]! + diagonal);
        if (x + 1 < width) distance[i] = Math.min(distance[i]!, distance[i - width + 1]! + diagonal);
      }
    }
    for (let y = height - 1; y >= 0; y--) for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (x + 1 < width) distance[i] = Math.min(distance[i]!, distance[i + 1]! + 1);
      if (y + 1 < height) {
        distance[i] = Math.min(distance[i]!, distance[i + width]! + 1);
        if (x > 0) distance[i] = Math.min(distance[i]!, distance[i + width - 1]! + diagonal);
        if (x + 1 < width) distance[i] = Math.min(distance[i]!, distance[i + width + 1]! + diagonal);
      }
    }
    return distance;
  }

  private drawRipples(period: number, beatPhase: number, width: number, height: number, red: number, green: number, blue: number) {
    if (!this.outlineDistance) return;
    const beatAge = beatPhase >= 0.18 ? (beatPhase - 0.18) * period : (beatPhase + 0.82) * period;
    const lifetime = Math.min(1.75, period * 0.48);
    if (beatAge >= lifetime) return;
    const spreadRate = clamp(this.options.ringSpeed / 0.42, 0.25, 2.2);
    const travel = Math.min(width, height) * 0.19 * spreadRate;
    const waves = [
      { delay: 0, strength: 1.4, glyphs: "+=*" },
      { delay: 0.17, strength: 1.12, glyphs: "*=+" },
      { delay: 0.34, strength: 0.88, glyphs: "=+:" },
      { delay: 0.51, strength: 0.67, glyphs: ":." },
      { delay: 0.68, strength: 0.48, glyphs: ".:" },
    ];
    const spacingX = 7;
    const spacingY = 9;
    this.context.font = "9px Consolas, monospace";
    this.context.textBaseline = "middle";
    this.context.textAlign = "center";
    this.context.fillStyle = `rgb(${red} ${green} ${blue})`;
    for (const wave of waves) {
      const age = beatAge - wave.delay;
      if (age < 0 || age >= lifetime) continue;
      const progress = age / lifetime;
      const front = 8 + travel * (1 - Math.pow(1 - progress, 2.1));
      const band = 4.5 + (1 - progress) * 1.5;
      const fade = Math.pow(1 - progress, 1.45);
      for (let y = 0, row = 0; y < height; y += spacingY, row++) for (let x = 0, col = 0; x < width; x += spacingX, col++) {
        const distance = this.outlineDistance[y * width + x]!;
        const offset = Math.abs(distance - front);
        if (distance < 0.6 || offset > band) continue;
        const feather = 1 - smoothstep(band * 0.48, band, offset);
        const wobble = Math.sin(col * 1.7 + row * 0.63 + age * 8);
        this.context.globalAlpha = clamp(this.options.opacity * wave.strength * 0.38 * fade * feather * (0.8 + (wobble + 1) * 0.1), 0, 0.4);
        this.context.fillText(wave.glyphs[(col + row * 3 + Math.floor(age * 12)) % wave.glyphs.length]!, x, y);
      }
    }
  }

  private onMotionPreference = () => {
    if (this.motionPreference.matches) {
      cancelAnimationFrame(this.raf);
      this.draw();
    } else this.schedule();
  };
}
