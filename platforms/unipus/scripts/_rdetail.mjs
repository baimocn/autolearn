import { CDP, sleep } from "./cdp.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = tabs.find(t=>t.type==="page");
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
await cdp.send("Page.enable");
await cdp.send("Network.enable");
const ev = async (expr) => (await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true})).result.value;
const u0 = "https://uai.unipus.cn/app/cmgt/resource-detail/20001198976";
await cdp.send("Page.navigate",{url:u0});
await sleep(9000);
console.log("URL:", await ev("location.href"));
// iframes on this page
console.log("FRAMES:", JSON.stringify(await ev("[...document.querySelectorAll('iframe')].map(f=>({src:f.src.slice(0,200),id:f.id}))")));
console.log("BODY:", JSON.stringify(await ev("document.body.innerText.slice(0,500)")));
cdp.close();
