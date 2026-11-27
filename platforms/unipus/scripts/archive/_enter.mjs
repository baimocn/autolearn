import { CDP, sleep } from "./cdp.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = tabs.find(t=>t.type==="page" && /unipus/.test(t.url));
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
const ev = async (expr) => (await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true})).result.value;
// click the course card containing 新农科大学英语 with progress
const p = await ev(`(()=>{
  const all=[...document.querySelectorAll('*')];
  const card=all.find(e=>e.innerText && e.innerText.includes('已学任务') && e.getBoundingClientRect().width>100);
  if(!card) return null;
  // find clickable ancestor
  let t=card; for(let i=0;i<6;i++){ if(!t.parentElement)break; t=t.parentElement; const b=t.getBoundingClientRect(); if(b.width>200) break;}
  const b=t.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2, tag:t.tagName, cls:(t.className||'').toString().slice(0,50)};
})()`);
console.log("card point:",JSON.stringify(p));
if(p){
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x:p.x,y:p.y});
  await sleep(200);
  await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x:p.x,y:p.y,button:"left",clickCount:1});
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:p.x,y:p.y,button:"left",clickCount:1});
}
await sleep(7000);
const ts = await (await fetch("http://127.0.0.1:9222/json/list")).json();
console.log("PAGES AFTER:");
ts.filter(t=>t.type==="page").forEach(t=>console.log(" ",t.url.slice(0,160)));
cdp.close();
