import { CDP, sleep } from "./cdp.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const pg=tabs.find(t=>/resource-detail\/20001198976/.test(t.url));
const cdp=await CDP.connect(pg.webSocketDebuggerUrl);
const ev=async e=>(await cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true})).result?.value;
// Unit 2 should still be active from previous debug
const learn=await ev(`[...document.querySelectorAll('*')].filter(e=>/^(开始学习|继续学习|去学习|进入学习)$/.test((e.innerText||'').trim())&&e.children.length===0).map(e=>{const b=e.getBoundingClientRect();return{t:e.innerText.trim(),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),visible:b.width>0};})`);
console.log("LEARN BTNS:",JSON.stringify(learn));
const tgt=learn.find(l=>l.visible);
if(tgt){
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x:tgt.x,y:tgt.y});
  await sleep(120);
  await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x:tgt.x,y:tgt.y,button:"left",clickCount:1});
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:tgt.x,y:tgt.y,button:"left",clickCount:1});
}
await sleep(9000);
const rd=(await(await fetch("http://127.0.0.1:9222/json/list")).json()).find(t=>/ucontent\.unipus\.cn/.test(t.url));
console.log("READER:", rd?(rd.url.split("#")[1]||"").slice(-45):"NONE");
cdp.close();
