import { CDP, sleep } from "./cdp.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = tabs.find(t=>t.type==="page");
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
const ev = async (expr) => (await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true})).result.value;
// still filled?
console.log("u:", await ev("document.getElementById('username')?.value"), "plen:", await ev("document.getElementById('password')?.value.length"), "agree:", await ev("document.getElementById('agreement')?.checked"));
const p = await ev(`(()=>{const e=[...document.querySelectorAll('button')].find(b=>b.innerText.replace(/\s+/g,'')==='登录'&&!b.disabled);if(!e)return null;e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2};})()`);
console.log("click at:",JSON.stringify(p));
await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x:p.x,y:p.y});
await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x:p.x,y:p.y,button:"left",clickCount:1});
await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:p.x,y:p.y,button:"left",clickCount:1});
for(let i=0;i<15;i++){
  await sleep(1000);
  const u = await ev("location.href");
  if(!/sso/.test(u)){console.log("LOGIN OK ->",u);break;}
  if(i===14) console.log("STILL:", u, "|", JSON.stringify(await ev("document.body.innerText.replace(/\s+/g,' ').slice(0,220)")));
}
cdp.close();
