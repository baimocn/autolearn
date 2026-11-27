import { CDP, sleep } from "./cdp.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
let page = tabs.find(t=>t.type==="page");
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
const ev = async (expr) => (await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true})).result.value;
const before = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t=>t.type==="page").length;
// click the title text 新农科大学英语 inside the card (span at ~334,309). Try real mouse.
for(const [x,y] of [[334,309],[450,330],[640,330]]){
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y});
  await sleep(150);
  await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",clickCount:1});
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",clickCount:1});
  await sleep(2500);
  const now = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t=>t.type==="page");
  const u = await ev("location.href");
  console.log(`click ${x},${y} -> href=${u.slice(0,90)} pages=${now.length}`);
  if(now.length>before || !/course-management/.test(u)) { now.forEach(t=>console.log("   TAB:",t.url.slice(0,150))); break; }
}
cdp.close();
