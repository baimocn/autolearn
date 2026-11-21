// _u4g560_diag2.mjs — 只读诊断：Unit test 弹窗关闭按钮 / 各 frame origin / 进度 API 正确路径 / 目标块精读 pill
import { connect } from "./utlib.mjs";
import { COURSE, CH } from "./reader.mjs";
const log = (...a) => console.log("[diag2]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 160)));
const ID = "oMrcWJawhYiLWVMS";
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(tabs[0].id);
const { ev, frames, cdp, sessionId } = L;
const fl = await frames();
for (const f of fl) {
  const info = await ev(`(()=>({href:location.href.slice(0,120),origin:location.origin,
    unitTest:/考前须知|Unit test 4/.test(document.body.innerText),
    closeX:[...document.querySelectorAll('button,div,span,a,i,svg')].filter(e=>{const r=e.getBoundingClientRect();return r.width>8&&r.width<50&&r.height>8&&r.height<50&&/×|✕|✖|close/i.test((e.className||'').toString()+(e.getAttribute('aria-label')||''));}).slice(0,5).map(e=>{const r=e.getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),cls:(e.className||'').toString().slice(0,50)};}),
    hasOpenPill:/打开精读模式/.test(document.body.innerText),
    hasClosePill:/关闭精读模式/.test(document.body.innerText),
    audioN:document.querySelectorAll('audio').length}))()`, f.ctx).catch(e => ({ err: String(e).slice(0, 120) }));
  log("FRAME", (f.url || "").slice(0, 70), JSON.stringify(info));
}
// 在 pc.html 顶层帧调进度 API（完整路径带 open_id）
const top = fl.find(f => /pc\.html/.test(f.url) && f.ctx);
const OPENID = "5cb554a204db411aa8958f116769407f";
for (const path of [
  `/course/api/v2/course_progress/${COURSE}/u4/${OPENID}/default`,
  `https://ucontent.unipus.cn/course/api/v2/course_progress/${COURSE}/u4/${OPENID}/default`,
]) {
  const r = await ev(`fetch(${JSON.stringify(path)},{credentials:'include'}).then(async r=>({status:r.status,ct:(r.headers.get('content-type')||''),txt:(await r.text()).slice(0,160)})).catch(e=>({err:String(e).slice(0,120)}))`, top.ctx).catch(e => ({ err: String(e).slice(0, 120) }));
  log("API", path.slice(0, 90), "=>", JSON.stringify(r));
}
// 目标块内 pill 的祖先链与 elementFromPoint 真实命中
const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
const pill = await ev(`(()=>{const b=document.getElementById(${JSON.stringify(ID)});if(!b)return{err:'no b'};
  const p=[...b.querySelectorAll('*')].find(e=>(e.innerText||'').replace(/\\s+/g,'')==='打开精读模式'&&e.getBoundingClientRect().width>10);
  if(!p)return{err:'no pill'};p.scrollIntoView({block:'center'});const r=p.getBoundingClientRect();
  const x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);const at=document.elementFromPoint(x,y);
  return {x,y,w:Math.round(r.width),h:Math.round(r.height),tag:p.tagName,cls:(p.className||'').toString().slice(0,60),
    at:at?(at.tagName+'.'+(at.className||'').toString().slice(0,50)):null, atText:at?(at.innerText||'').replace(/\\s+/g,'').slice(0,50):''};})()`, tb.ctx).catch(e => ({ err: String(e).slice(0, 150) }));
log("PILL:", JSON.stringify(pill));
cdp.close();
