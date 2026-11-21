// _u4g813_p3.mjs — 第3步：关目录抽屉(X) → robust healthy 探针(带异常详情) → 截图
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[p3]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0,150)));
const U=4, CH4=CH[U];
const SHOT="shots/U4-u4g813-probe3.png";
const tabs=(await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t=>t.type==="page"&&/ucontent\.unipus\.cn/.test(t.url));
let target=null;
for(const t of tabs){const L0=await connect(t.id);const fl=await L0.frames();const tb0=fl.find(f=>/textbook\/book/.test(f.url)&&f.ctx);const ch=tb0?(tb0.url.match(/chapter\/([0-9a-f-]+)/)||[])[1]:"";L0.cdp.close();if(ch===CH4){target=t.id;break;}}
if(!target){log("NO U4 READER");process.exit(2);}
const L=await connect(target);
const {ev,frames,cdp,sessionId}=L;
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
const snap=async p=>{const s=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId).catch(()=>({data:null}));if(s.data){fs.mkdirSync("shots",{recursive:true});fs.writeFileSync(p,Buffer.from(s.data,"base64"));return fs.statSync(p).size;}return 0;};
// evRaw: 返回 exceptionDetails 原文，便于定位 null 原因
const evRaw=async(expr,ctx)=>{const r=await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true,awaitPromise:true,userGesture:true,...(ctx?{contextId:ctx}:{})},sessionId).catch(e=>({err:String(e)}));return r;};

// ① 关目录抽屉：找 X / catalog close (视觉画面左上 X @~408,34)。用 DOM 找可点击关闭元素
const pc=(await frames()).find(f=>/pc\.html/.test(f.url)&&f.ctx);
let closed=null;
if(pc){
  // 列出所有可能关闭元素
  const cand=await evRaw(`(()=>{const out=[];[...document.querySelectorAll('*')].forEach(e=>{const c=String(e.className||'');if(/close|drawer|mask|catalog/i.test(c)){const b=e.getBoundingClientRect();if(b.width>5&&b.width<80&&b.height>5&&b.height<80)out.push({tag:e.tagName,cls:c.slice(0,70),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width),h:Math.round(b.height)});}});return out.slice(0,20);})()`,pc.ctx);
  log("关闭候选:",JSON.stringify(cand?.result?.value||cand));
  // 优先 catalog_drawer-close
  const q=await evRaw(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close],[class*=catalog-drawer-close],[class*=drawer_close]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width)};})()`,pc.ctx);
  const v=q?.result?.value;
  log("drawer-close:",JSON.stringify(v));
  if(v&&v.x){closed=v;await mouse(v.x,v.y);log("点抽屉 X @",v.x,v.y);await sleep(1500);}
}
await sleep(1000);
// ② robust healthy 探针（分步，捕获异常）
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
log("tb ctx:",tb?tb.url.slice(-70):"NONE");
let probe={};
if(tb){
  const expr=`(()=>{try{
    const bs=document.querySelectorAll('div.editor-question-block.questionBlockNode');
    let ne=0; bs.forEach(b=>{if((b.innerText||'').replace(/\s+/g,'').length>5)ne++;});
    const cards=document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]');
    const cardArr=[]; cards.forEach((c,i)=>{cardArr.push({i:i,id:c.id,status:c.getAttribute('data-lexical-node-status')});});
    const body=document.body.innerText||'';
    return {ok:true,blocks:bs.length,nonempty:ne,bodyLen:body.length,
      hasLogin:/登录|账号|密码|SSO/.test(body),hasLimit:/限流|稍后再试|非单元学习周期|加载失败/.test(body),
      hasUnitTest:/Unit test/i.test(body),cardCount:cards.length,cardArr:cardArr.slice(0,12),
      hasUT4:/Unit test 4/i.test(body)};
  }catch(e){return{ok:false,err:String(e)};}})()`;
  const r=await evRaw(expr,tb.ctx);
  log("RAW exceptionDetails:",JSON.stringify(r?.exceptionDetails||null).slice(0,300));
  probe=r?.result?.value||r?.exceptionDetails||{err:"no result"};
}
log("HEALTHY PROBE3:",JSON.stringify(probe,null,1));
log("截图:",SHOT,await snap(SHOT),"bytes");
fs.writeFileSync("_u4g813-p3.json",JSON.stringify({target,closed,probe,shot:SHOT},null,1));
cdp.close();
