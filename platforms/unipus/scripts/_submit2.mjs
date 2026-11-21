import { CDP, sleep } from "./cdp.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
console.log("pages:", tabs.filter(t=>t.type==="page").map(t=>t.url));
const page = tabs.find(t=>t.type==="page" && /sso|unipus/.test(t.url)) || tabs.find(t=>t.type==="page");
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
const ev = async (expr) => (await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true})).result.value;
console.log("url:", await ev("location.href"));
console.log("u:", await ev("document.getElementById('username')?.value"), "plen:", await ev("document.getElementById('password')?.value.length"));
const btns = await ev(`[...document.querySelectorAll('button')].map(b=>({t:b.innerText.replace(/\s+/g,''),cls:b.className.toString().slice(0,30)}))`);
console.log("btns:",JSON.stringify(btns));
const p = await ev(`(()=>{const e=document.querySelector('button.usso-btn-pri')||[...document.querySelectorAll('button')].find(b=>b.innerText.includes('登'));if(!e)return null;const b=e.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2};})()`);
console.log("point:",JSON.stringify(p));
if(p){
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x:p.x,y:p.y});
  await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x:p.x,y:p.y,button:"left",clickCount:1});
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:p.x,y:p.y,button:"left",clickCount:1});
}
for(let i=0;i<15;i++){
  await sleep(1000);
  const u = await ev("location.href");
  if(!/sso/.test(u)){console.log("LOGIN OK ->",u);break;}
  if(i===14) console.log("STILL:", u, "|", JSON.stringify(await ev("document.body.innerText.replace(/\s+/g,' ').slice(0,220)")));
}
cdp.close();
