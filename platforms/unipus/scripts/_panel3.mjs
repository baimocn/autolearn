import { CDP, sleep } from "./cdp.mjs";
const ver=await(await fetch("http://127.0.0.1:9222/json/version")).json();
const boot=await CDP.connect(ver.webSocketDebuggerUrl);
const tabs0=await(await fetch("http://127.0.0.1:9222/json/list")).json();
for(const t of tabs0.filter(t=>/ucontent/.test(t.url)))await boot.send("Target.closeTarget",{targetId:t.id}).catch(()=>{});
const r=await boot.send("Target.createTarget",{url:"https://uai.unipus.cn/app/cmgt/resource-detail/20001198976"});
boot.close();
await sleep(9000);
const pg=(await(await fetch("http://127.0.0.1:9222/json/list")).json()).find(t=>t.id===r.targetId);
const cdp=await CDP.connect(pg.webSocketDebuggerUrl);
const ev=async e=>(await cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true})).result?.value;
const tb=await ev(`(()=>{const tab=[...document.querySelectorAll('[class*=tabDefaultModeContainer]')].find(e=>(e.innerText||'').replace(/\s+/g,' ').startsWith('Unit 2'));
 if(!tab)return null;const b=tab.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`);
console.log("tab2:",JSON.stringify(tb));
if(tb){await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x:tb.x,y:tb.y,button:"left",clickCount:1});
 await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:tb.x,y:tb.y,button:"left",clickCount:1});}
await sleep(3500);
console.log("ACTIVE:",JSON.stringify(await ev(`[...document.querySelectorAll('[class*=tabDefaultModeContainer]')].map(e=>({u:(e.innerText||'').slice(0,6),a:/active/i.test(e.className)})).filter(x=>x.a)`)));
console.log("BODY:",JSON.stringify(await ev("(document.body.innerText||'').replace(/\n{2,}/g,'|').slice(0,650)")));
const els=await ev(`(()=>{
  const out=[];
  [...document.querySelectorAll('button,a,[class*=btn],[class*=button],[class*=link],[class*=item],[class*=card],[class*=study]')].forEach(e=>{
    const b=e.getBoundingClientRect();
    if(b.top<500||b.width<10)return;
    const t=(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,26);
    if(t)out.push({t,tag:e.tagName,cls:(e.className||'').toString().slice(0,38),y:Math.round(b.top)});
  });
  return out.slice(0,22);})()`);
console.log(JSON.stringify(els,null,1));
cdp.close();
