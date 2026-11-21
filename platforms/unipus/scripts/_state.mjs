import { CDP, sleep } from "./cdp.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = tabs.find(t=>t.type==="page");
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
const ev = async (expr) => (await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true})).result.value;
console.log("URL:", await ev("location.href"));
await sleep(2000);
const body = await ev("document.body.innerText.replace(/\n{2,}/g,'\n').slice(0,1000)");
console.log("BODY:\n",body);
// iframes
console.log("IFRAMES:", JSON.stringify(await ev("[...document.querySelectorAll('iframe')].map(f=>f.src.slice(0,120))")));
cdp.close();
