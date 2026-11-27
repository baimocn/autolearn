import { CDP } from "./cdp.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = tabs.find(t=>t.type==="page");
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
const ev = async (expr) => (await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true})).result.value;
const btns = await ev(`[...document.querySelectorAll('button')].map(e=>{const b=e.getBoundingClientRect();return {t:(e.innerText||'').replace(/\s+/g,''),cls:e.className.toString().slice(0,40),w:Math.round(b.width),h:Math.round(b.height),disabled:e.disabled};})`);
console.log(JSON.stringify(btns,null,1));
cdp.close();
