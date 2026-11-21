// _u4g569_round2.mjs — 第2轮：冷却后恢复健康态 + 核验实时 state.pass + 视觉截图
import { connect, sleep } from "./utlib.mjs";
import { CH, COURSE } from "./reader.mjs";
import fs from "node:fs";
const log = (...a) => console.log("[r2]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0, 140)));
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
if (!rd) { log("NO READER"); process.exit(1); }
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type:"mouseMoved",x,y }, sessionId).catch(()=>{});
  await cdp.send("Input.dispatchMouseEvent", { type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1 }, sessionId);
};
// 关规则弹窗（视觉已确认按钮，用真实坐标）
const clean = async () => {
  for (const f of await frames()) {
    if (!/pc\.html/.test(f.url)) continue;
    const p = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(()=>null);
    if (p) { await mouse(p.x,p.y); await sleep(1200); }
  }
};
const probe = async () => {
  const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
  if (!tb) return { tb:false, blocks:0, nonempty:0, chap:"" };
  const chap = (tb.url.match(/chapter\/([0-9a-f-]+)/)||[])[1]||"";
  const r = await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];const ne=bs.filter(b=>(b.innerText||'').replace(/\\s+/g,'').length>5).length;const st=[...new Set(bs.map(x=>x.getAttribute('data-lexical-node-status')))];return{blocks:bs.length,nonempty:ne,statuses:st,bodyLen:(document.body.innerText||'').length};})()`, tb.ctx).catch(e=>({err:String(e).slice(0,120)}));
  return { tb:true, chap, ...r };
};
// ① 刷新恢复（冷却已过：距上次空壳记录 ~7h，>7min）
log("刷页恢复 ...");
await cdp.send("Page.reload", { ignoreCache:true }, sessionId).catch(()=>{});
await sleep(20000);
for (let k=0;k<4;k++){
  await clean();
  await sleep(3000);
  const s = await probe();
  log(`probe#${k}:`, JSON.stringify(s));
  if (s.nonempty>0) break;
  if (k<3){ await cdp.send("Page.reload",{ignoreCache:true},sessionId).catch(()=>{}); await sleep(18000); }
}
const fin = await probe();
const healthy = fin.nonempty>0 && fin.chap===CH[4];
log("HEALTHY:", healthy, "nonempty=",fin.nonempty,"chap=",fin.chap);

// ② 核验实时 state.pass（JWT + OPENID，权威进度接口）
const top = (await frames()).find(f => /pc\.html/.test(f.url) && f.ctx);
const tok = await ev(`(()=>{let t='';try{for(const S of [localStorage,sessionStorage]){for(const k of Object.keys(S)){const v=S.getItem(k)||'';if(/^eyJ/.test(v))t=v;else{try{const j=JSON.parse(v);for(const kk of Object.keys(j)){if(typeof j[kk]==='string'&&/^eyJ/.test(j[kk]))t=j[kk];}}catch(e){}}}}}catch(e){}return t;})()`, top&&top.ctx).catch(()=>"");
log("token len:", (tok||"").length);
const OPENID = "5cb554a204db411aa8958f116769407f";
const url = `/course/api/v2/course_progress/${COURSE}/u4/${OPENID}/default`;
const r = await ev(`(async()=>{try{const r=await fetch(${JSON.stringify(url)},{credentials:'include',headers:${JSON.stringify(tok?{Authorization:tok}:{})}});const t=await r.text();let j={};try{j=JSON.parse(t);}catch(e){}const v=j.rt?.leafs?.['u4g569'];return{status:r.status,found:!!v,state:v?v.state:null,pass:v?v.state?.pass:null,pass2:v?v.state?.pass2:null,tab:v?v.tab_type:null,raw:t.slice(0,90)};}catch(e){return{err:String(e).slice(0,120)};}})()`, top&&top.ctx).catch(e=>({err:String(e).slice(0,140)}));
log("实时进度 u4g569:", JSON.stringify(r));

// ③ 视觉截图
fs.mkdirSync("shots",{recursive:true});
const shot = await cdp.send("Page.captureScreenshot",{format:"png"},sessionId).catch(()=>({data:null}));
if(shot.data){ fs.writeFileSync("shots/U4-u4g569.png",Buffer.from(shot.data,"base64")); log("截图:",fs.statSync("shots/U4-u4g569.png").size,"bytes"); }
// 写执行记录
fs.writeFileSync("_u4g569-round2.json",JSON.stringify({fin,healthy,progress:r,shot:"shots/U4-u4g569.png"},null,1));
cdp.close();
