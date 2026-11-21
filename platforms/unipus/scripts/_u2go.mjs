import { CDP, sleep } from "./cdp.mjs";
const ver=await(await fetch("http://127.0.0.1:9222/json/version")).json();
const boot=await CDP.connect(ver.webSocketDebuggerUrl);
const tabs0=await(await fetch("http://127.0.0.1:9222/json/list")).json();
for(const t of tabs0.filter(t=>/ucontent/.test(t.url)))await boot.send("Target.closeTarget",{targetId:t.id}).catch(()=>{});
const r=await boot.send("Target.createTarget",{url:"https://uai.unipus.cn/app/cmgt/resource-detail/20001198976"});
boot.close();
await sleep(9000);
const cdp=await CDP.connect((await(await fetch("http://127.0.0.1:9222/json/list")).json()).find(t=>t.id===r.targetId).webSocketDebuggerUrl);
const ev=async e=>(await cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true})).result?.value;
// 1) top tab Unit 2
let p=await ev(`(()=>{const e=[...document.querySelectorAll('[class*=tabDefaultModeContainer]')].find(x=>(x.innerText||'').replace(/\s+/g,' ').startsWith('Unit 2'));if(!e)return null;const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`);
if(p){await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x:p.x,y:p.y,button:"left",clickCount:1});await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:p.x,y:p.y,button:"left",clickCount:1});}
await sleep(3000);
// 2) richName Unit 2
p=await ev(`(()=>{const e=[...document.querySelectorAll('[class*=richName_name-item]')].find(x=>(x.innerText||'').trim()==='Unit 2');if(!e)return null;e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`);
console.log("richName:",JSON.stringify(p));
if(p){await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x:p.x,y:p.y,button:"left",clickCount:1});await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:p.x,y:p.y,button:"left",clickCount:1});}
await sleep(4000);
// 3) list ALL buttons on page
const btns=await ev(`[...document.querySelectorAll('button,[class*=i-button],[class*=btn],[class*=study],[class*=go]')].map(e=>{const b=e.getBoundingClientRect();return{t:(e.innerText||'').replace(/\s+/g,' ').slice(0,16),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width),vis:b.width>0&&b.top>0};}).filter(x=>x.vis&&x.t&&x.w>20).slice(0,20)`);
console.log("BTNS:",JSON.stringify(btns,null,1));
// 4) click the one that says 开始学习 first, else 继续学习 that is NOT at header (y>300)
const cand=(btns||[]).find(b=>b.t==='开始学习')|| (btns||[]).find(b=>b.t==='继续学习'&&b.y>250);
console.log("CAND:",JSON.stringify(cand));
if(cand){
  await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x:cand.x,y:cand.y,button:"left",clickCount:1});
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:cand.x,y:cand.y,button:"left",clickCount:1});
  await sleep(9000);
  const rd=(await(await fetch("http://127.0.0.1:9222/json/list")).json()).find(t=>/ucontent\.unipus\.cn/.test(t.url));
  console.log("HASH:",rd?(rd.url.split("#")[1]||"").slice(-42):"NONE");
}
cdp.close();
