import { CDP, sleep } from "./cdp.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const pg=tabs.find(t=>/resource-detail\/20001221469/.test(t.url)&&t.type==="page");
if(!pg){console.log("NO COURSE TAB");process.exit(0);}
const cdp=await CDP.connect(pg.webSocketDebuggerUrl);
const ev=async(e)=>(await cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true})).result?.value;
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y}).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1});await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1});};
console.log("who:",JSON.stringify(await ev("(document.body.innerText.match(/[^\s|]{2,4}(?=[\s|]*$))/m)||''")));
const p=await ev(`(()=>{const e=[...document.querySelectorAll('*')].find(x=>/^(开始学习|继续学习)$/.test((x.innerText||'').trim())&&x.children.length===0);if(!e)return null;e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`);
console.log("learn btn:",JSON.stringify(p));
if(p){
  await mouse(p.x,p.y);
  await sleep(12000);
  const rd=(await(await fetch("http://127.0.0.1:9222/json/list")).json()).find(t=>/ucontent\.unipus\.cn/.test(t.url));
  console.log("reader:",rd?rd.url.slice(0,280):"NONE");
}
cdp.close();
