import { CDP, sleep } from "./cdp.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const pg=tabs.find(t=>/resource-detail\/20001198976/.test(t.url));
const cdp=await CDP.connect(pg.webSocketDebuggerUrl);
const ev=async e=>(await cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true})).result?.value;
// click richName Unit 2
const p=await ev(`(()=>{
  const els=[...document.querySelectorAll('[class*=richName_name-item]')].filter(e=>(e.innerText||'').trim()==='Unit 2');
  if(!els.length)return null;const e=els[0];e.scrollIntoView({block:'center'});
  const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`);
console.log("richName Unit2:",JSON.stringify(p));
if(p){await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x:p.x,y:p.y,button:"left",clickCount:1});
 await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:p.x,y:p.y,button:"left",clickCount:1});}
await sleep(4000);
console.log("BODY:",JSON.stringify(await ev("(document.body&&document.body.innerText||'').replace(/\n{2,}/g,'|').slice(0,500)")));
const learn=await ev(`[...document.querySelectorAll('*')].filter(e=>/^(开始学习|继续学习)$/.test((e.innerText||'').trim())&&e.children.length===0).map(e=>{const b=e.getBoundingClientRect();return{t:e.innerText.trim(),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),vis:b.width>0};})`);
console.log("LEARN:",JSON.stringify(learn));
const tgt=(learn||[]).find(l=>l.vis);
if(tgt){
  await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x:tgt.x,y:tgt.y,button:"left",clickCount:1});
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:tgt.x,y:tgt.y,button:"left",clickCount:1});
  await sleep(9000);
  const rd=(await(await fetch("http://127.0.0.1:9222/json/list")).json()).find(t=>/ucontent\.unipus\.cn/.test(t.url));
  console.log("READER HASH:", rd?(rd.url.split("#")[1]||"").slice(-42):"NONE");
}
cdp.close();
