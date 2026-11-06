import { CdpSession, listPageTargets } from "../src/cdp.js";

const target = (await listPageTargets(9335)).find((item) => item.url === "app://-/index.html");
if (!target) throw new Error("Codex main page unavailable");
const session = await CdpSession.connect(target, 9335);
try {
  const result = await session.evaluate(`(() => {
    const canvas = document.getElementById('ascii-shark-background-canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return { mounted: false };
    const context = canvas.getContext('2d');
    if (!context) return { mounted: true, error: 'no context' };
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] > 40) { r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]; n++; }
    }
    if (!n) return { mounted: true, coloredPixels: 0 };
    return { mounted: true, coloredPixels: n, avg: [Math.round(r / n), Math.round(g / n), Math.round(b / n)] };
  })()`);
  console.log(JSON.stringify(result));
} finally { session.close(); }
