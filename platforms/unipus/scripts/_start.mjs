import { CDP, sleep } from "./cdp.mjs";
const before = (await (await fetch("http://127.0.0.1:9222/json/list")).json());
const page = before.find(t=>t.type==="page" && /resource-detail/.test(t.url));
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
const ev = async (expr) => (await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true})).result.value;
const p = await ev(`(()=>{const e=[...document.querySelectorAll('*')].find(x=>{const t=(x.innerText||'').trim();return t==='开始学习'&&x.children.length===0;});if(!e)return null;const b=e.getBoundingClientRect();return{x:b.left+b.width/2,y:b.top+b.height/2,tag:e.tagName,cls:(e.className||'').toString().slice(0,40)};})()`);
console.log("btn:",JSON.stringify(p));
if(p){
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x:p.x,y:p.y});
  await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x:p.x,y:p.y,button:"left",clickCount:1});
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:p.x,y:p.y,button:"left",clickCount:1});
}
await sleep(8000);
const after = (await (await fetch("http://127.0.0.1:9222/json/list")).json());
after.filter(t=>t.type==="page").forEach(t=>console.log("TAB:",t.url.slice(0,250)));
cdp.close();
