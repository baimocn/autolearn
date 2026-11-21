import { CDP, sleep } from "./cdp.mjs";
// 1) open course page in new tab
const ver = await (await fetch("http://127.0.0.1:9222/json/version")).json();
const boot = await CDP.connect(ver.webSocketDebuggerUrl);
const r = await boot.send("Target.createTarget",{url:"https://uai.unipus.cn/app/cmgt/resource-detail/20001198976"});
boot.close();
await sleep(8000);
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const pg = tabs.find(t=>t.id===r.targetId);
const cdp = await CDP.connect(pg.webSocketDebuggerUrl);
const ev = async e => (await cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true})).result?.value;
// 2) click 开始学习
const p = await ev(`(()=>{const e=[...document.querySelectorAll('*')].find(x=>(x.innerText||'').trim()==='开始学习'&&x.children.length===0);if(!e)return null;const b=e.getBoundingClientRect();return{x:b.left+b.width/2,y:b.top+b.height/2};})()`);
console.log("btn:",JSON.stringify(p));
if(p){
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x:p.x,y:p.y});
  await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x:p.x,y:p.y,button:"left",clickCount:1});
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:p.x,y:p.y,button:"left",clickCount:1});
}
await sleep(9000);
const tabs2 = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs2.find(t=>/ucontent\.unipus\.cn/.test(t.url) && t.id!==r.targetId);
console.log("reader tab:", rd ? rd.url.slice(80,200) : "none");
// 3) check block6 in that reader
if(rd){
  const L2 = await import("./utlib.mjs").then(m=>m.connect(rd.id));
  for(let k=0;k<15;k++){
    await sleep(1000);
    const fl=await L2.frames();
    const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
    if(!tb)continue;
    const len=await L2.ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];return (b.innerText||'').length;})()`,tb.ctx).catch(()=>0);
    if(len>80){console.log("B6 READY len="+len);break;}
    await L2.ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];if(b)b.scrollIntoView({block:'center'});return 1;})()`,tb.ctx).catch(()=>0);
  }
  L2.cdp.close();
}
