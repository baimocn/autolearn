import { CDP, sleep } from "./cdp.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = tabs.find(t=>t.type==="page");
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
const ev = async (expr) => (await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true})).result.value;
await sleep(4000);
console.log("URL:", await ev("location.href"));
const ready = await ev("!!document.querySelector('#root') && document.querySelector('#root').children.length");
console.log("root children:", ready, "bodylen:", await ev("document.body.innerText.length"));
const c = await ev(`(()=>{
  const out=[];
  [...document.querySelectorAll('button,a,span,div')].forEach(e=>{
    const t=(e.innerText||'').replace(/\s+/g,'').trim();
    if(/进入|开始学习/.test(t)&&t.length<10&&e.children.length<=1){const b=e.getBoundingClientRect();if(b.width>0)out.push({t,x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)});}
  });
  return out.slice(0,15);
})()`);
console.log("ENTER:", JSON.stringify(c));
// check shadow / course link candidates
const links = await ev(`[...document.querySelectorAll('a')].map(a=>a.href).filter(h=>/course|tutorial|uai/.test(h)).slice(0,20)`);
console.log("LINKS:", JSON.stringify(links,null,1));
cdp.close();
