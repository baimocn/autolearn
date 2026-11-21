// _u4g813_r1.mjs — 第1轮正式执行：关抽屉 → 滚到 UT4 卡片 → 截图(视觉核对) → 点卡片 → DOM 证据 → 最终截图
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[r1]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0,160)));
const U=4, CH4=CH[U], CARD="TYL6NCP0OCeQBcPc";
const SHOT="shots/U4-u4g813.png", PRE="shots/U4-u4g813-pre.png";
const tabs=(await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t=>t.type==="page"&&/ucontent\.unipus\.cn/.test(t.url));
let target=null;
for(const t of tabs){const L0=await connect(t.id);const fl=await L0.frames();const tb0=fl.find(f=>/textbook\/book/.test(f.url)&&f.ctx);const ch=tb0?(tb0.url.match(/chapter\/([0-9a-f-]+)/)||[])[1]:"";L0.cdp.close();if(ch===CH4){target=t.id;break;}}
if(!target){log("NO U4 READER");process.exit(2);}
const L=await connect(target);
const {ev,frames,cdp,sessionId}=L;
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
const snap=async p=>{const s=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId).catch(()=>({data:null}));if(s.data){fs.mkdirSync("shots",{recursive:true});fs.writeFileSync(p,Buffer.from(s.data,"base64"));return fs.statSync(p).size;}return 0;};
const evRaw=async(expr,ctx)=>{const r=await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true,awaitPromise:true,userGesture:true,...(ctx?{contextId:ctx}:{})},sessionId).catch(e=>({err:String(e)}));return r?.result?.value;};

// ① healthy 探针（chapter 匹配 + 卡片存在；U4 题块已知空壳，卡片为静态 decorator）
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH4.slice(0,12)));
if(!tb){log("NO TB CH4");cdp.close();process.exit(3);}
const raw=e=>evRaw(e,tb.ctx);
let healthy=false,probe={};
for(let k=0;k<10&&!healthy;k++){
  probe=await raw(`(()=>{try{const bs=document.querySelectorAll('div.editor-question-block.questionBlockNode');let ne=0;bs.forEach(b=>{if((b.innerText||'').replace(/\s+/g,'').length>5)ne++;});
    const c=document.getElementById(${JSON.stringify(CARD)});const body=document.body.innerText||'';
    return {chapterOK:${JSON.stringify(tb.url.includes(CH4))},blocks:bs.length,nonempty:ne,bodyLen:body.length,
      hasLogin:/登录|账号|密码|SSO/.test(body),hasLimit:/限流|稍后再试|非单元学习周期|加载失败/.test(body),
      cardExists:!!c,cardStatus:c?c.getAttribute('data-lexical-node-status'):null};}catch(e){return{err:String(e)};}})()`)||{};
  log(`probe#${k}:`,JSON.stringify(probe));
  if(probe.chapterOK&&probe.cardExists&&!probe.hasLogin&&!probe.hasLimit){healthy=true;log("HEALTHY ✓ (卡片存在/章节匹配/无登录无限流)");break;}
  await sleep(2000);
}
if(!healthy){log("NOT HEALTHY，终止");cdp.close();process.exit(4);}

// ② 关规则弹窗 + 关目录抽屉（视觉已核对 X @408,34）
const dismiss=async()=>{for(const f of await frames()){if(!/pc\.html|textbook/.test(f.url))continue;const q=await evRaw(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,f.ctx);if(q){await mouse(q.x,q.y);log("dismiss 我知道了 @",q.x,q.y);await sleep(1200);return;}}};
await dismiss();await sleep(500);
// 关抽屉：用 elementFromPoint @408,34 校验后点击 X
const pc=(await frames()).find(f=>/pc\.html/.test(f.url)&&f.ctx);
let dx=null;
if(pc)dx=await evRaw(`(()=>{const e=document.elementFromPoint(408,34);if(!e)return null;const b=e.getBoundingClientRect();return{tag:e.tagName,cls:String(e.className||'').slice(0,60),txt:(e.innerText||'').trim().slice(0,20),x:408,y:34,w:Math.round(b.width),h:Math.round(b.height)};})()`,pc.ctx);
log("X @408,34 elementFromPoint:",JSON.stringify(dx));
if(dx){await mouse(408,34);log("点抽屉 X @408,34");await sleep(1500);}
await sleep(800);

// ③ 滚动到 UT4 卡片 → 截图 PRE（视觉核对）→ elementFromPoint 校验 → 点卡片
const cardPos=await raw(`(()=>{const c=document.getElementById(${JSON.stringify(CARD)});if(!c)return{err:'no card'};c.scrollIntoView({block:'center'});
  const cc=c.querySelector('[class*=coverContainer]')||c;const b=cc.getBoundingClientRect();
  return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width),h:Math.round(b.height),status:c.getAttribute('data-lexical-node-status'),
    txt:(c.innerText||'').replace(/\s+/g,' ').slice(0,60)};})()`);
log("卡片位置:",JSON.stringify(cardPos));
await sleep(1000);
log("PRE 截图:",PRE,await snap(PRE),"bytes");
const chk=await raw(`(()=>{const e=document.elementFromPoint(${cardPos.x},${cardPos.y});return e?{tag:e.tagName,cls:String(e.className||'').slice(0,60),txt:(e.innerText||'').replace(/\s+/g,' ').slice(0,40)}:null;})()`);
log("卡片中心 elementFromPoint:",JSON.stringify(chk));
if(cardPos&&cardPos.x){await mouse(cardPos.x,cardPos.y);log("点击 UT4 卡片 @",cardPos.x,cardPos.y);}
await sleep(4500);
await dismiss();

// ④ 全帧 DOM 证据
const frameEv=[];
for(const f of await frames()){
  if(!f.ctx)continue;
  const d=await evRaw(`(()=>{try{const t=(document.body.innerText||'').replace(/\s+/g,' ');
    const btns=[...document.querySelectorAll('button,[class*=i-button],div[role=button]')].map(e=>({t:(e.innerText||'').replace(/\s+/g,'').slice(0,18),w:Math.round(e.getBoundingClientRect().width),x:Math.round(e.getBoundingClientRect().left+e.getBoundingClientRect().width/2),y:Math.round(e.getBoundingClientRect().top+e.getBoundingClientRect().height/2)})).filter(x=>x.t&&x.w>15).slice(0,20);
    const modals=[...document.querySelectorAll('[class*=modal],[role=dialog],[class*=dialog],[class*=confirm]')].filter(e=>e.getBoundingClientRect().height>50).map(e=>({txt:(e.innerText||'').replace(/\s+/g,' ').slice(0,240)}));
    return {url:location.href.slice(0,90),textLen:t.length,hasStart:/开始答题|再次作答|查看测试结果|考前须知/.test(t),
      hasScore:/最终得分|测试满分|正确率/.test(t),hasSubmitScore:/成绩提交/.test(t),head:t.slice(0,240),btns,modals:modals.slice(0,4)};}catch(e){return{err:String(e)};}})()`,f.ctx);
  frameEv.push({frame:f.url.slice(0,90),d});
  log("FRAME",f.url.slice(0,70),"=>",JSON.stringify(d).slice(0,1200));
}
// ⑤ 最终截图
log("最终截图:",SHOT,await snap(SHOT),"bytes");
fs.writeFileSync("_u4g813-r1.json",JSON.stringify({target,healthy,probe,cardPos,chk,frameEv,shot:SHOT,pre:PRE},null,1));
cdp.close();
