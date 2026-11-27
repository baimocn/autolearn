import { CDP, sleep } from "./cdp.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const pg=tabs.find(t=>/resource-detail\/20001198976/.test(t.url));
const cdp=await CDP.connect(pg.webSocketDebuggerUrl);
const ev=async e=>(await cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true})).result?.value;
// ensure Unit 2 active
const tb=await ev(`(()=>{const tab=[...document.querySelectorAll('[class*=tabDefaultModeContainer]')].find(e=>(e.innerText||'').replace(/\s+/g,' ').startsWith('Unit 2'));
 if(!tab)return null;const b=tab.getBoundingClientRect();
 return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`);
if(tb){await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x:tb.x,y:tb.y,button:"left",clickCount:1});
 await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:tb.x,y:tb.y,button:"left",clickCount:1});}
await sleep(3500);
console.log("BODY:",JSON.stringify(await ev("(document.body.innerText||'').replace(/\n{2,}/g,'|').slice(0,700)")));
// clickable things with y>560
const els=await ev(`(()=>{
  const out=[];
  [...document.querySelectorAll('button,a,[class*=btn],[class*=button],[class*=link],[class*=item],[class*=card]')].forEach(e=>{
    const b=e.getBoundingClientRect();
    if(b.top<560||b.width<10)return;
    const t=(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,30);
    if(t)out.push({t,tag:e.tagName,cls:(e.className||'').toString().slice(0,40),y:Math.round(b.top)});
  });
  return out.slice(0,25);})()`);
console.log(JSON.stringify(els,null,1));
cdp.close();
