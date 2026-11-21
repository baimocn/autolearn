import { CDP, sleep } from "./cdp.mjs";
const ver=await(await fetch("http://127.0.0.1:9222/json/version")).json();
const boot=await CDP.connect(ver.webSocketDebuggerUrl);
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
for(const t of tabs.filter(t=>/ucontent/.test(t.url)))await boot.send("Target.closeTarget",{targetId:t.id}).catch(()=>{});
const r=await boot.send("Target.createTarget",{url:"https://uai.unipus.cn/app/cmgt/resource-detail/20001198976"});
boot.close();
await sleep(9000);
const pg=(await(await fetch("http://127.0.0.1:9222/json/list")).json()).find(t=>t.id===r.targetId);
const cdp=await CDP.connect(pg.webSocketDebuggerUrl);
const ev=async e=>(await cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true})).result?.value;
// find Unit 2 tab and its active state before click
const before=await ev(`(()=>{
  const tab=[...document.querySelectorAll('[class*=tabDefaultModeContainer]')].find(e=>(e.innerText||'').replace(/\s+/g,' ').startsWith('Unit 2'));
  if(!tab)return null;
  const b=tab.getBoundingClientRect();
  return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),cls:tab.className.toString().slice(0,80)};
})()`);
console.log("TAB2 BEFORE:",JSON.stringify(before));
if(before){
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x:before.x,y:before.y});
  await sleep(150);
  await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x:before.x,y:before.y,button:"left",clickCount:1});
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:before.x,y:before.y,button:"left",clickCount:1});
  await sleep(4000);
}
const after=await ev(`(()=>{
  const tab=[...document.querySelectorAll('[class*=tabDefaultModeContainer]')].find(e=>(e.innerText||'').replace(/\s+/g,' ').startsWith('Unit 2'));
  const act=[...document.querySelectorAll('[class*=tabDefaultModeContainer]')].map(e=>({u:(e.innerText||'').slice(0,6),active:/active|selected|checked/i.test(e.className)}));
  const learn=[...document.querySelectorAll('*')].filter(e=>/^(开始学习|继续学习|去学习)$/.test((e.innerText||'').trim())&&e.children.length===0).map(e=>({t:e.innerText.trim(),y:Math.round(e.getBoundingClientRect().top)}));
  return {cls2:tab?tab.className.toString().slice(0,80):null, act:act.slice(0,8), learn:learn.slice(0,4)};
})()`);
console.log("AFTER:",JSON.stringify(after,null,1));
cdp.close();
