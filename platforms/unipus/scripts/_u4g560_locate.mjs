// _u4g560_locate.mjs — 只读：确认截图尺寸 + 定位「确定」超时弹窗按钮所在 frame 与精确坐标（不点击）
import { connect } from "./utlib.mjs";
import fs from "node:fs";
const log = (...a) => console.log("[u4g560-locate]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 160)));
// PNG 尺寸
const b = fs.readFileSync("shots/U4-u4g560-probe.png");
log("PNG size:", b.readUInt32BE(16), "x", b.readUInt32BE(20));
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(tabs[0].id);
const { ev, frames, cdp, sessionId } = L;
const vw = await ev("({w:innerWidth,h:innerHeight,dpr:devicePixelRatio})").catch(() => ({}));
log("viewport:", JSON.stringify(vw));
const fl = await frames();
for (const f of fl) {
  const q = await ev(`(()=>{
    const n=s=>(s||'').replace(/\\s+/g,'');
    const btns=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^确定$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);
    return btns.map(e=>{const r=e.getBoundingClientRect();const x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);
      const at=document.elementFromPoint(x,y);return {x,y,w:Math.round(r.width),h:Math.round(r.height),hit:at?(at.tagName+'.'+(at.className||'').toString().slice(0,40)):null};});
  })()`, f.ctx).catch(e => ({ err: String(e).slice(0, 120) }));
  log("frame", (f.url || "").slice(0, 70), "确定按钮:", JSON.stringify(q));
}
cdp.close();
