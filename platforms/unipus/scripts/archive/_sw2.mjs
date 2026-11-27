// _sw2.mjs <unit> — 展开 Unit N 并点其第一个子节点，校验 chapterId
import { connect, sleep } from "./utlib.mjs";
import { CH } from "./reader.mjs";
const U = Number(process.argv[2]);
const log = (...a) => console.log("[sw2]", ...a);
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
const okU = async () => (await tbUrl()).includes(CH[U]);
log("before hasCh:", await okU());
for (let attempt = 0; attempt < 3; attempt++) {
  if (await okU()) break;
  const tbf = (await frames()).find(x => /textbook\/book/.test(x.url) && x.ctx);
  if (!tbf) { log("no tb"); break; }
  // 开抽屉
  const closed = await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');return e&&e.getBoundingClientRect().width>3?1:0;})()`, tbf.ctx).catch(()=>0);
  if (!closed) {
    const op = await ev(`(()=>{const e=document.querySelector('[class*=catalog_area-open-menu]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, tbf.ctx).catch(() => null);
    await mouse(op ? op.x : 22, op ? op.y : 183);
    await sleep(2000);
  }
  const tb2 = (await frames()).find(x => /textbook\/book/.test(x.url) && x.ctx);
  // 找到 Unit N 标题并滚入视野
  const u = await ev(`(()=>{const els=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].filter(e=>{const t=(e.innerText||'').replace(/\s+/g,'');return t.startsWith('Unit${U}');});if(!els.length)return null;const el=els[0];el.scrollIntoView({block:'center'});const b=el.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),txt:(el.innerText||'').replace(/\s+/g,' ').slice(0,40)};})()`, tb2.ctx).catch(() => null);
  log("unit title", JSON.stringify(u));
  if (!u) { await ev(`(()=>{const sc=document.querySelector('[class*=i-tree-menu_tree-menu]');if(sc)sc.scrollTop+=400;return 1;})()`, tb2.ctx).catch(()=>{}); await sleep(1200); continue; }
  await sleep(500);
  await mouse(u.x, u.y);
  await sleep(2000);
  if (await okU()) { log("title click navigated"); break; }
  // 点第一个子节点（y 大于 unit 标题的第一条 title-flex）
  const c = await ev(`(()=>{
    const els=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')];
    const norm=e=>(e.innerText||'').replace(/\s+/g,'');
    const ue=els.find(e=>norm(e).startsWith('Unit${U}'));
    if(!ue)return null;
    const uy=ue.getBoundingClientRect().top;
    const cand=els.filter(e=>{const b=e.getBoundingClientRect();return b.top>uy+5&&b.top<uy+120&&b.width>40;});
    if(!cand.length)return null;
    const el=cand[0];el.scrollIntoView({block:'center'});const b=el.getBoundingClientRect();
    return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),txt:(el.innerText||'').replace(/\s+/g,' ').slice(0,50),n:cand.length};
  })()`, tb2.ctx).catch(() => null);
  log("child", JSON.stringify(c));
  if (c) { await sleep(500); await mouse(c.x, c.y); await sleep(4000); }
  log("after attempt" + attempt, "hasCh:", await okU());
}
// 关抽屉
const tbf = (await frames()).find(x => /textbook\/book/.test(x.url) && x.ctx);
if (tbf) for (let k = 0; k < 2; k++) {
  const dp = await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, tbf.ctx).catch(() => null);
  if (!dp) break;
  await mouse(dp.x, dp.y); await sleep(900);
}
const ok = await okU();
log("RESULT", ok ? "OK u" + U : "FAIL", (await tbUrl()).slice(60, 105));
cdp.close();
process.exit(ok ? 0 : 2);
