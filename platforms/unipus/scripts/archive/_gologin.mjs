import { CDP, sleep } from "./cdp.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = tabs.find(t=>t.type==="page");
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
const ev = async (expr) => (await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true})).result.value;
// find 登录 button
const r = await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');
  const c=[...document.querySelectorAll('button,a,div,span')].filter(e=>{const t=n(e.innerText);const b=e.getBoundingClientRect();return (t==='登 录'||t==='登录')&&b.width>20&&b.height>10;});
  if(!c.length)return null;const e=c[c.length-1];const b=e.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2};})()`);
console.log("login btn:",JSON.stringify(r));
if(r){
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x:r.x,y:r.y});
  await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x:r.x,y:r.y,button:"left",clickCount:1});
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:r.x,y:r.y,button:"left",clickCount:1});
}
await sleep(6000);
console.log("URL after:", await ev("location.href"));
console.log("has user input:", await ev("!!document.querySelector('input[name=username]')"));
console.log("body:", JSON.stringify(await ev("document.body.innerText.slice(0,200)")));
cdp.close();
