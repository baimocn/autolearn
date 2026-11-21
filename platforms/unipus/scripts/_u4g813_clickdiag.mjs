// _u4g813_clickdiag.mjs — 点击 UT 卡片后诊断：所有 frame 的弹窗/按钮/文本
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
let target = null;
for (const t of tabs) {
  const L0 = await connect(t.id);
  const fl = await L0.frames();
  const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
  const ch = tb ? (tb.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] : "";
  L0.cdp.close();
  if (ch === CH[4]) { target = t.id; break; }
}
const L = await connect(target);
const { ev, frames, cdp, sessionId } = L;
const fl = await frames();
const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
const raw = (e) => ev(e, tb.ctx);
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const CARD = "TYL6NCP0OCeQBcPc";
// 卡片树
const tree = await raw(`(()=>{const c=document.getElementById(${JSON.stringify(CARD)});if(!c)return null;
  const walk=(e,d)=>{const r=e.getBoundingClientRect();const rk=Object.keys(e).find(k=>k.startsWith('__reactProps'));
    return {tag:e.tagName,cls:(e.className||'').toString().slice(0,50),d,
      x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width),h:Math.round(r.height),
      hasOnClick:!!(rk&&e[rk].onClick),kids:d<3?[...e.children].map(k=>walk(k,d+1)):[]};};
  c.scrollIntoView({block:'center'});
  return walk(c,0);})()`).catch(e => ({ err: String(e).slice(0, 150) }));
console.log("卡片树:", JSON.stringify(tree, null, 1).slice(0, 2500));
await sleep(1200);
// 点 coverContainer
const p = await raw(`(()=>{const c=document.getElementById(${JSON.stringify(CARD)});
  const cc=c.querySelector('[class*=coverContainer]')||c;
  const r=cc.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width),h:Math.round(r.height)};})()`).catch(() => null);
console.log("点击点:", JSON.stringify(p));
if (p) { await mouse(p.x, p.y); }
await sleep(4500);
// 所有 frame 的界面
for (const f of await frames()) {
  if (!f.ctx) continue;
  const r = await ev(`(()=>{const t=(document.body.innerText||'').replace(/\\s+/g,' ');
    const btns=[...document.querySelectorAll('button,[class*=i-button],div[role=button]')].map(e=>({t:(e.innerText||'').replace(/\\s+/g,'').slice(0,16),w:Math.round(e.getBoundingClientRect().width),x:Math.round(e.getBoundingClientRect().left+e.getBoundingClientRect().width/2),y:Math.round(e.getBoundingClientRect().top+e.getBoundingClientRect().height/2)})).filter(x=>x.t&&x.w>15).slice(0,15);
    const modals=[...document.querySelectorAll('[class*=modal],[role=dialog],[class*=dialog],[class*=confirm]')].filter(e=>e.getBoundingClientRect().height>50).map(e=>({cls:(e.className||'').toString().slice(0,50),txt:(e.innerText||'').replace(/\\s+/g,' ').slice(0,200)}));
    return {url:location.href.slice(0,85),textLen:t.length,hasStart:/开始答题|再次作答|查看测试结果|考前须知/.test(t),
      hasScore:/最终得分|测试满分|正确率/.test(t),head:t.slice(0,180),btns,modals:modals.slice(0,5)};})()`, f.ctx).catch(() => null);
  console.log("FRAME", f.url.slice(0, 75), "=>", JSON.stringify(r).slice(0, 1300));
}
L.cdp.close();
