import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
const ver=await(await fetch("http://127.0.0.1:9222/json/version")).json();
const boot=await CDP.connect(ver.webSocketDebuggerUrl);
const r=await boot.send("Target.createTarget",{url:"https://uai.unipus.cn/app/cmgt/resource-detail/20001198976"});
boot.close();
await sleep(15000);
const pg=(await(await fetch("http://127.0.0.1:9222/json/list")).json()).find(t=>t.id===r.targetId);
const cdp=await CDP.connect(pg.webSocketDebuggerUrl);
const ev=async(e)=>(await cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true})).result?.value;
// 点 继续学习/开始学习
const p=await ev(`(()=>{const e=[...document.querySelectorAll('*')].find(x=>/^(继续学习|开始学习)$/.test((x.innerText||'').trim())&&x.children.length===0);if(!e)return null;e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`);
console.log("learn btn:",JSON.stringify(p));
if(p){
  await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x:p.x,y:p.y,button:"left",clickCount:1});
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:p.x,y:p.y,button:"left",clickCount:1});
}
await sleep(14000);
cdp.close();
const rd=(await(await fetch("http://127.0.0.1:9222/json/list")).json()).find(t=>/ucontent/.test(t.url));
if(!rd){console.log("NO READER");process.exit(1);}
console.log("reader hash:",(rd.url.split("#")[1]||"").slice(-42));
const L=await connect(rd.id);
const fl=await L.frames();
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
if(!tb){console.log("NO TB");process.exit(1);}
// 关我知道了
for(let k=0;k<4;k++){
  let hit=false;
  for(const f of await L.frames()){
    const q=await L.cdp.send("Runtime.evaluate",{expression:`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,returnByValue:true,awaitPromise:true,contextId:f.ctx},L.sessionId).then(r2=>r2.result?.value).catch(()=>null);
    if(q){await L.cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x:q.x,y:q.y,button:"left",clickCount:1},L.sessionId);await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:q.x,y:q.y,button:"left",clickCount:1},L.sessionId);console.log("closed modal");hit=true;break;}
  }
  if(!hit)break;
  await sleep(1200);
}
// 检查顽固块 #7/8/10/19 是否出现提交
await sleep(3000);
for(const idx of [7,8,10,19]){
  const s=await L.cdp.send("Runtime.evaluate",{expression:`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${idx}];
    if(!b)return null;
    const t=(b.innerText||'');
    return {len:t.length, sub:[...b.querySelectorAll('[class*=i-button]')].map(e=>(e.innerText||'').replace(/\s+/g,'')).filter(Boolean).slice(0,4),
      ctrl:b.querySelectorAll('textarea,input,[class*=blankView]').length};})()`,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId).then(r3=>r3.result?.value).catch(()=>null);
  console.log("block",idx,JSON.stringify(s));
}
L.cdp.close();
