// _u4g813_p2.mjs — 第2步：关规则弹窗(视觉已核对@720,663) + 关目录抽屉 → 截图 → 重新探针
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[p2]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0,150)));
const U = 4, CH4 = CH[U];
const SHOT = "shots/U4-u4g813-probe2.png";
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
let target = null;
for (const t of tabs) { const L0=await connect(t.id); const fl=await L0.frames(); const tb0=fl.find(f=>/textbook\/book/.test(f.url)&&f.ctx); const ch=tb0?(tb0.url.match(/chapter\/([0-9a-f-]+)/)||[])[1]:""; L0.cdp.close(); if(ch===CH4){target=t.id;break;} }
if(!target){log("NO U4 READER");process.exit(2);}
const L = await connect(target);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
const snap = async p => { const s=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId).catch(()=>({data:null})); if(s.data){fs.mkdirSync("shots",{recursive:true});fs.writeFileSync(p,Buffer.from(s.data,"base64"));return fs.statSync(p).size;} return 0; };

// ① 点顶层「我知道了」(视觉核对 @720,663)，用 DOM 元素定位 + scrollIntoView，但按画面坐标点击
const pc = (await frames()).find(f=>/pc\.html/.test(f.url)&&f.ctx);
let ack = null;
if(pc) ack = await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width)};})()`, pc.ctx).catch(e=>({err:String(e).slice(0,120)}));
log("我知道了 DOM 坐标:", JSON.stringify(ack));
if(ack && ack.x){ await mouse(720,663); log("按视觉点击 我知道了 @720,663"); await sleep(1500); }
// 再点一次兜底(若仍存在)
for(let i=0;i<3;i++){ let hit=false; for(const f of await frames()){ if(!/pc\.html|textbook/.test(f.url))continue; const q=await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,f.ctx).catch(()=>null); if(q){await mouse(q.x,q.y);log(`dismiss#${i} @`,q.x,q.y);await sleep(1200);hit=true;break;} } if(!hit)break; }
// ② 关目录抽屉（X 按钮 @408,34 视觉核对）
let drawer=null;
for(const f of await frames()){ if(!/pc\.html/.test(f.url))continue; drawer=await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close],[class*=drawer-close]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width)};})()`,f.ctx).catch(()=>null); if(drawer)break; }
log("抽屉关闭按钮:", JSON.stringify(drawer));
await sleep(800);
log("关弹窗后截图:", SHOT, await snap(SHOT), "bytes");
// ③ 重新探针(简化表达式，避免上轮 null)
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
let probe={err:"no tb"};
if(tb){ probe = await ev(`(()=>{
  const bs=document.querySelectorAll('div.editor-question-block.questionBlockNode');
  const ne=[...bs].filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length;
  const cards=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')].map((c,i)=>({i:id:c.id,status:c.getAttribute('data-lexical-node-status')}));
  const body=document.body.innerText||'';
  return {chapterOK:true,blocks:bs.length,nonempty:ne,bodyLen:body.length,
    hasLogin:/登录|账号|密码|SSO/.test(body),hasLimit:/限流|稍后再试|非单元学习周期|加载失败/.test(body),
    hasUnitTest:/Unit test/i.test(body),cards:cards.length,cardIds:cards,
    ruleLeft:document.querySelectorAll('button').length};})()`, tb.ctx).catch(e=>({err:String(e).slice(0,160)})); }
log("PROBE2:", JSON.stringify(probe,null,1));
fs.writeFileSync("_u4g813-p2.json",JSON.stringify({target,ack,drawer,probe,shot:SHOT},null,1));
cdp.close();
