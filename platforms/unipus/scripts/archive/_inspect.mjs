import { CDP } from "./cdp.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = tabs.find(t=>t.type==="page");
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
const ev = async (expr) => (await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true})).result.value;
const info = await ev(`[...document.querySelectorAll('input')].map(e=>({type:e.type,name:e.name,id:e.id,ph:e.placeholder,vis:e.getBoundingClientRect().width>0}))`);
console.log(JSON.stringify(info,null,1));
console.log("tabs:", JSON.stringify(await ev(`[...document.querySelectorAll('*')].filter(e=>/密码登录|验证码登录/.test((e.innerText||'').trim())&&e.children.length===0).map(e=>e.innerText.trim()).slice(0,5)`)));
cdp.close();
