import { CdpSession, listPageTargets } from "../src/cdp.js";

const target = (await listPageTargets(9335)).find((item) => item.url === "app://-/index.html");
if (!target) throw new Error("Codex main page unavailable");
const session = await CdpSession.connect(target, 9335);
try {
  const value = await session.evaluate(`(() => {
    const rect = (el) => { const r = el.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}; };
    const brief = (el) => ({tag:el.tagName,cls:typeof el.className==='string'?el.className.slice(0,150):'',testId:el.getAttribute('data-testid'),rect:rect(el)});
    const textbox = [...document.querySelectorAll('[role="textbox"][contenteditable="true"]')].find(el => el.getBoundingClientRect().width > 0);
    if (!textbox) return null;
    const ancestors=[];
    for (let node=textbox,i=0; node&&i<36;node=node.parentElement,i++) if (i>=22) ancestors.push({depth:i,self:brief(node),children:[...node.children].slice(0,6).map(brief)});
    return ancestors;
  })()`);
  console.log(JSON.stringify(value, null, 2));
} finally {
  session.close();
}
