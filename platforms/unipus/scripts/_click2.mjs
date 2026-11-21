import { CDP, sleep } from "./cdp.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = tabs.find(t=>t.type==="page");
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
const ev = async (expr) => (await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true})).result.value;
const all = await ev(`(()=>{const out=[];[...document.querySelectorAll('*')].forEach(e=>{const rk=Object.keys(e).find(k=>k.startsWith('__reactProps'));if(rk&&e[rk].onClick){const b=e.getBoundingClientRect();if(b.width>0)out.push({t:(e.innerText||'').replace(/\s+/g,' ').trim().slice(0,26),cls:(e.className||'').toString().slice(0,40),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)});}});return out.slice(28,60);})()`);
console.log(JSON.stringify(all,null,1));
cdp.close();
