import { CdpSession, listPageTargets } from "../src/cdp.js";

const targets = await listPageTargets(9335);
const target = targets.find((item) => item.url === "app://-/index.html");
if (!target) throw new Error("Codex main page is not available through local CDP");
const session = await CdpSession.connect(target, 9335);
try {
  const layout = await session.evaluate(`(() => {
    const rect = (el) => { const r = el.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}; };
    const sidebar = document.querySelector("aside.app-shell-left-panel");
    const mains = [...document.querySelectorAll("main")].map((el) => ({className:el.className,rect:rect(el),composers:el.querySelectorAll('[role="textbox"][contenteditable="true"]').length}));
    const composers = [...document.querySelectorAll('[role="textbox"][contenteditable="true"]')].map((el) => {
      const ancestors=[];
      for (let node=el,depth=0; node && depth<12; node=node.parentElement,depth++) ancestors.push({tag:node.tagName,className:typeof node.className==='string'?node.className.slice(0,120):'',testId:node.getAttribute('data-testid'),rect:rect(node)});
      return {ancestors};
    });
    const modes = [...document.querySelectorAll('button[aria-label]')].filter((el) => /切换模式|switch mode/i.test(el.getAttribute('aria-label')||'')).map((el) => el.getAttribute('aria-label'));
    const canvas = document.getElementById("ascii-shark-background-canvas");
    return {viewport:{w:innerWidth,h:innerHeight},sidebar:sidebar&&rect(sidebar),mains,composers,modes,canvas:canvas&&rect(canvas)};
  })()`);
  console.log(JSON.stringify(layout, null, 2));
} finally {
  session.close();
}
