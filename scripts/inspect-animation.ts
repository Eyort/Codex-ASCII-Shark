import { CdpSession, listPageTargets } from "../src/cdp.js";

const target = (await listPageTargets(9335)).find((item) => item.url === "app://-/index.html");
if (!target) throw new Error("Codex main page unavailable");
const session = await CdpSession.connect(target, 9335);
try {
  const result = await session.evaluate(`(() => {
    const canvas = document.getElementById('ascii-shark-background-canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return { mounted: false };
    const r = canvas.getBoundingClientRect();
    const context = canvas.getContext('2d');
    let visibleSamples = 0;
    if (context) {
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 3; i < pixels.length; i += 4 * 64) if (pixels[i] > 0) visibleSamples++;
    }
    return { mounted: true, rect: { x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height) }, visibleSamples };
  })()`);
  console.log(JSON.stringify(result));
} finally { session.close(); }
