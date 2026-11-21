// _sw.mjs <unit> — 抽屉里精确切单元并校验 chapterId
import { connect, sleep } from "./utlib.mjs";
import { CH } from "./reader.mjs";
const U = Number(process.argv[2]);
const log = (...a) => console.log("[sw]", ...a);
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const tbUrl = async () => {
  const f = (await frames()).find(x => /textbook\/book/.test(x.url) && x.ctx);
  return f ? f.url : "";
};
const hasCh = async () => (await tbUrl()).includes(CH[U]);
log("before:", (await tbUrl()).slice(60, 110));
for (let attempt = 0; attempt < 4; attempt++) {
  if (await hasCh()) { log("already on u" + U); break; }
  // 开抽屉
  const closed = await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');return e&&e.getBoundingClientRect().width>3?1:0;})()`, (await frames()).find(x=>/textbook\/book/.test(x.url)&&x.ctx).ctx).catch(()=>0);
  if (!closed) {
    const op = await ev(`(()=>{const e=document.querySelector('[class*=catalog_area-open-menu]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, (await frames()).find(x=>/textbook\/book/.test(x.url)&&x.ctx).ctx).catch(() => null);
    await mouse(op ? op.x : 22, op ? op.y : 183);
    await sleep(2200);
  }
  const tbf = (await frames()).find(x => /textbook\/book/.test(x.url) && x.ctx);
  if (!tbf) { log("no tb"); break; }
  // Unit N 标题：滚入视野后取坐标
  const p = await ev(`(()=>{const els=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].filter(e=>{const t=(e.innerText||'').replace(/\s+/g,'');return t.startsWith('Unit${U}')||t.startsWith('Unit ${U}');});if(!els.length)return null;const el=els[0];el.scrollIntoView({block:'center'});const b=el.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, tbf.ctx).catch(() => null);
  log("attempt" + attempt, "titlePos", JSON.stringify(p));
  if (!p) { await sleep(1500); continue; }
  await sleep(600);
  await mouse(p.x, p.y);
  await sleep(3500);
  // 若没跳转，点该标题下的第一个子节点
  if (!(await hasCh())) {
    const c = await ev(`(()=>{const els=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].filter(e=>{const t=(e.innerText||'').replace(/\s+/g,'');return t.startsWith('Unit${U}')||t.startsWith('Unit ${U}');});if(!els.length)return null;const head=els[0];let n=head.closest('[class*=i-tree-menu_tree-item]');if(!n)return null;const kids=n.parentElement?[...n.parentElement.children]:[];let cur=n;for(const k of kids){if(k===n){const i=kids.indexOf(k);const nx=kids[i+1];if(nx){const t=[...nx.querySelectorAll('*')].find(e=>(e.innerText||'').length>3&&e.getBoundingClientRect().width>30);if(t){t.scrollIntoView({block:'center'});const b=t.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};}}}}return null;})()`, tbf.ctx).catch(() => null);
    log("childPos", JSON.stringify(c));
    if (c) { await sleep(500); await mouse(c.x, c.y); await sleep(4000); }
  }
  log("after attempt" + attempt + ":", (await tbUrl()).slice(60, 110), "match", await hasCh());
}
// 关抽屉
const tbf = (await frames()).find(x => /textbook\/book/.test(x.url) && x.ctx);
if (tbf) {
  for (let k = 0; k < 2; k++) {
    const dp = await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, tbf.ctx).catch(() => null);
    if (!dp) break;
    await mouse(dp.x, dp.y); await sleep(900);
  }
}
const ok = await hasCh();
log("RESULT", ok ? "OK u" + U : "FAIL");
cdp.close();
process.exit(ok ? 0 : 2);
