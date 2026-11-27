// _u4g569_patient.mjs — 决定性尝试：单次 reload + 耐心轮询(不反复刷) + 展开折叠/滚动触发渲染
// 一旦 healthy 且有录音控件，输出状态；随后由外层运行 _oralall.mjs 作答
import { connect, sleep } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const log = (...a) => console.log("[patient]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0, 150)));
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
const clean = async () => {
  for (const f of await frames()) {
    if (!/pc\.html/.test(f.url)) continue;
    const p = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(()=>null);
    if (p) { await mouse(p.x,p.y); await sleep(1000); }
  }
  const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
  if(tb){const c=await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,tb.ctx).catch(()=>null);if(c){await mouse(c.x,c.y);await sleep(800);}}
};
const tbFrame = async () => (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
const raw = (e,tb) => ev(e, tb.ctx);
const expandScroll = async (tb) => {
  // 展开折叠区（oral6-u4.log 证明必要）
  await raw(`(async()=>{const cols=[...document.querySelectorAll('[class*=collapsible-container]')];let n=0;for(const c of cols){const body=c.querySelector('[class*=collapsible-content]');if(!body)continue;if(body.getBoundingClientRect().height<20){const head=c.querySelector('[class*=collapsible-head]');if(head){const rk=Object.keys(head).find(k=>k.startsWith('__reactProps'));try{if(rk&&head[rk].onClick)head[rk].onClick({stopPropagation(){},preventDefault(){},target:head,currentTarget:head,nativeEvent:{}});else head.click();}catch(e){head.click();}n++;await new Promise(r=>setTimeout(r,250));}}}return n;})()`, tb).catch(()=>0);
  for(let s=0;s<10;s++){await raw(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(innerHeight*0.8));return 1;})()`,tb).catch(()=>{});await sleep(700);}
};
const probe = async (tb) => {
  const chap=(tb.url.match(/chapter\/([0-9a-f-]+)/)||[])[1]||"";
  const r = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const ne=bs.filter(b=>(b.innerText||'').replace(/\\s+/g,'').length>5).length;
    const recs=[];const states=['点击开始','准备录音','开始录音','回放','重录','我的回放','重新作答','提交','得分','答案'];
    bs.forEach((b,i)=>{const t=(b.innerText||'').replace(/\\s+/g,' ');const rec=b.querySelector('[class*=record_record-prepare],[class*=record_record-recording],[class*=record_]')?1:0;const hit=states.filter(x=>t.indexOf(x)>=0);if(rec||hit.length)recs.push({i,rec,hit,score:(t.match(/得分[^0-9]*([0-9.]+)/)||[])[1]||null,tail:t.slice(-55)});});
    return{blocks:bs.length,nonempty:ne,statuses:[...new Set(bs.map(x=>x.getAttribute('data-lexical-node-status')))],recs};})()`, tb).catch(e=>({err:String(e).slice(0,140)}));
  return { chap, ...r };
};
// 单次 reload（冷却已过），其后只轮询等待，不反复刷新
await cdp.send("Page.reload", { ignoreCache:true }, sessionId).catch(()=>{});
await sleep(16000);
let st = null, tb = null;
for(let k=0;k<16;k++){
  await clean();
  tb = await tbFrame();
  if(tb){
    await expandScroll(tb);
    st = await probe(tb);
    log(`poll#${k}: nonempty=${st.nonempty} recs=${(st.recs||[]).length} statuses=${JSON.stringify(st.statuses)} chap=${st.chap===CH[4]?"OK":"BAD"}`);
    if(st.nonempty>0 && (st.recs||[]).some(r=>r.rec)) break;
  } else log(`poll#${k}: no tb`);
  await sleep(4500);
}
const healthy = !!(st && st.nonempty>0 && st.chap===CH[4]);
const hasRec = !!(st && (st.recs||[]).some(r=>r.rec));
log("FINAL healthy:",healthy,"hasRec:",hasRec);
// 截图
fs.mkdirSync("shots",{recursive:true});
const shot=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId).catch(()=>({data:null}));
if(shot.data){fs.writeFileSync("shots/U4-u4g569.png",Buffer.from(shot.data,"base64"));log("截图:",fs.statSync("shots/U4-u4g569.png").size,"bytes");}
fs.writeFileSync("_u4g569-patient.json",JSON.stringify({st,healthy,hasRec,shot:"shots/U4-u4g569.png"},null,1));
cdp.close();
process.exit(healthy&&hasRec?0:2);
