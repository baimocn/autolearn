// _u4g569_state.mjs — 监听 SPA 自身 course_progress 响应核验 state.pass + 诊断 u4g569 录音块
import { connect, sleep } from "./utlib.mjs";
import { CH, COURSE } from "./reader.mjs";
import fs from "node:fs";
const log = (...a) => console.log("[state]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0, 150)));
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const reqs = {}, progIds = [];
await cdp.send("Network.enable", {}, sessionId).catch(()=>{});
cdp.on("Network.requestWillBeSent", p => { if (p.request?.url) reqs[p.requestId] = p.request.url; });
cdp.on("Network.responseReceived", p => { if (/course_progress/.test(reqs[p.requestId]||"") || /course_progress/.test(p.response?.url||"")) progIds.push(p.requestId); });
// 触发 SPA 重发进度：reload
log("reload 触发进度请求 ...");
await cdp.send("Page.reload", {}, sessionId).catch(()=>{});
await sleep(18000);
// 关弹窗
const mouse = async (x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
for (const f of await frames()) {
  if (!/pc\.html/.test(f.url)) continue;
  const p = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(()=>null);
  if (p) { await mouse(p.x,p.y); await sleep(1200); }
}
await sleep(4000);
// 读进度响应体
let passInfo = { err: "no course_progress response captured", captured: progIds.length };
for (const id of progIds.slice(-15)) {
  try {
    const b = await cdp.send("Network.getResponseBody", { requestId: id }, sessionId);
    const j = JSON.parse(b.body);
    if (j.rt?.unit_id === "u4") {
      const v = j.rt?.leafs?.["u4g569"];
      passInfo = { src:"SPA-response", unit:j.rt.unit_id, found:!!v, state:v?v.state:null, pass:v?v.state?.pass:null, pass2:v?v.state?.pass2:null, tab:v?v.tab_type:null, captured:progIds.length };
      break;
    }
  } catch {}
}
log("PASS核验:", JSON.stringify(passInfo));
// 诊断题块 / u4g569 录音控件
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
const chap = tb ? (tb.url.match(/chapter\/([0-9a-f-]+)/)||[])[1] : "";
let dom = { err:"no tb" };
if (tb) {
  dom = await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const ne=bs.filter(b=>(b.innerText||'').replace(/\\s+/g,'').length>5).length;
    const states=['点击开始','准备录音','开始录音','结束录音','点击结束','回放','重录','我的回放','重新作答','得分','答案','提交'];
    const recs=[];
    bs.forEach((b,i)=>{const t=(b.innerText||'').replace(/\\s+/g,' ');const rec=b.querySelector('[class*=record_record-prepare],[class*=record_record-recording],[class*=record_]')?1:0;
      const hit=states.filter(x=>t.indexOf(x)>=0);if(rec||hit.length)recs.push({i,rec,hit,score:(t.match(/得分[^0-9]*([0-9.]+)/)||[])[1]||null,tail:t.slice(-70)});});
    const body=document.body.innerText||'';
    return{blocks:bs.length,nonempty:ne,statuses:[...new Set(bs.map(x=>x.getAttribute('data-lexical-node-status')))],
      bodyLen:body.length,hasLimit:/限流|稍后再试|非单元学习周期|加载失败/.test(body),recs};})()`, tb.ctx).catch(e=>({err:String(e).slice(0,150)}));
}
log("DOM:", JSON.stringify(dom));
const healthy = (dom.nonempty||0)>0 && chap===CH[4];
log("HEALTHY:", healthy, "chap:", chap);
fs.writeFileSync("_u4g569-state.json", JSON.stringify({ passInfo, chap, healthy, dom }, null, 1));
cdp.close();
