export type CropRect = { x: number; y: number; width: number; height: number };
const RAMP = "@%#*+=-:. ";

export function validateGrassDetail(detail: number): number {
  if (!Number.isFinite(detail) || detail < 0.5 || detail > 1.5) throw new Error("detail must be between 0.5 and 1.5");
  return detail;
}

export function mapLuminanceToGlyph(luminance: number): string {
  if (!Number.isFinite(luminance)) throw new Error("luminance must be finite");
  const index = Math.max(0, Math.min(RAMP.length - 1, Math.floor(Math.max(0, Math.min(255, luminance)) / 256 * RAMP.length)));
  return RAMP[index]!;
}

export function computeCoverCrop(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number): CropRect {
  if (![sourceWidth, sourceHeight, targetWidth, targetHeight].every(Number.isFinite) || Math.min(sourceWidth, sourceHeight, targetWidth, targetHeight) <= 0) throw new Error("dimensions must be positive finite numbers");
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;
  if (sourceAspect > targetAspect) {
    const width = sourceHeight * targetAspect;
    return { x: (sourceWidth - width) / 2, y: 0, width, height: sourceHeight };
  }
  const height = sourceWidth / targetAspect;
  return { x: 0, y: (sourceHeight - height) / 2, width: sourceWidth, height };
}

export function createGrassAsciiTexture(image: CanvasImageSource, width: number, height: number, detail: number): HTMLCanvasElement {
  validateGrassDetail(detail);
  if (![width, height].every(Number.isFinite) || width <= 0 || height <= 0) throw new Error("target size must be positive");
  const source = image as CanvasImageSource & { width: number; height: number };
  const crop = computeCoverCrop(source.width, source.height, width, height);
  const cellWidth = Math.max(3, Math.round(7 / detail));
  const cellHeight = Math.max(6, Math.round(12 / detail));
  const columns = Math.max(1, Math.ceil(width / cellWidth));
  const rows = Math.max(1, Math.ceil(height / cellHeight));
  const sample = document.createElement("canvas");
  sample.width = columns; sample.height = rows;
  const sampleContext = sample.getContext("2d", { willReadFrequently: true });
  if (!sampleContext) throw new Error("Canvas 2D is unavailable");
  sampleContext.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, columns, rows);
  const pixels = sampleContext.getImageData(0, 0, columns, rows).data;
  const texture = document.createElement("canvas");
  texture.width = columns * cellWidth; texture.height = rows * cellHeight;
  const context = texture.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable");
  context.font = `${cellHeight}px "Cascadia Mono", Consolas, monospace`;
  context.textBaseline = "top";
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const offset = (y * columns + x) * 4;
    const luminance = 0.2126 * pixels[offset]! + 0.7152 * pixels[offset + 1]! + 0.0722 * pixels[offset + 2]!;
    context.fillStyle = `rgb(${pixels[offset]},${pixels[offset + 1]},${pixels[offset + 2]})`;
    context.fillText(mapLuminanceToGlyph(luminance), x * cellWidth, y * cellHeight);
  }
  return texture;
}
