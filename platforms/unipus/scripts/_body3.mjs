import { CDP, sleep } from "./cdp.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = tabs.find(t=>t.type==="page");
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
const ev = async (expr) => (await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true})).result.value;
console.log("URL:", await ev("location.href"));
console.log("BODYLEN:", await ev("document.body.innerText.length"));
console.log("BODY:", JSON.stringify(await ev("document.body.innerText")));
// try reload then wait
await cdp.send("Page.enable");
await cdp.send("Page.reload",{ignoreCache:false});
await sleep(8000);
console.log("--- after reload ---");
console.log("URL:", await ev("location.href"));
console.log("BODYLEN:", await ev("document.body.innerText.length"));
console.log("BODY:", JSON.stringify(await ev("document.body.innerText.slice(0,1200)")));
cdp.close();
