import { CDP, sleep } from "./cdp.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const pg=tabs.find(t=>/sso\/login/.test(t.url)&&t.type==="page");
if(!pg){console.log("NO LOGIN TAB:",tabs.filter(t=>t.type==="page").map(t=>t.url.slice(0,60)).join(" | "));process.exit(0);}
const cdp=await CDP.connect(pg.webSocketDebuggerUrl);
const ev=async(e)=>(await cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true})).result?.value;
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y}).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1});await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1});};
// 列出所有含“登 录/登录”的元素
const btns=await ev(`[...document.querySelectorAll('button,div,span,a')].map(e=>({t:(e.innerText||'').replace(/\s+/g,''),cls:(e.className||'').toString().slice(0,40),x:Math.round(e.getBoundingClientRect().left+e.getBoundingClientRect().width/2),y:Math.round(e.getBoundingClientRect().top+e.getBoundingClientRect().height/2),w:Math.round(e.getBoundingClientRect().width)})).filter(x=>/^(登录|登 录)$/.test(x.t)&&x.w>30)`);
console.log("BTN CANDIDATES:",JSON.stringify(btns,null,1));
// 点最后一个（最内层）
if(btns.length){
  const b=btns[btns.length-1];
  await mouse(b.x,b.y);
  console.log("clicked",b.x,b.y);
  for(let i=0;i<12;i++){
    await sleep(1500);
    const u=await ev("location.href");
    if(!/sso\/login/.test(u)){console.log("LOGIN OK ->",u.slice(0,80));break;}
    if(i===11)console.log("STILL:",JSON.stringify(await ev("document.body.innerText.replace(/\s+/g,' ').slice(0,100)")));
  }
}
cdp.close();
