import { CDP, sleep } from "./cdp.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
tabs.filter(t=>t.type==="page").forEach(t=>console.log("TAB:",t.url.slice(0,100)));
const page = tabs.find(t => t.type === "page");
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
const ev = async e => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
console.log("URL:", await ev("location.href"));
console.log("BODY:", JSON.stringify(await ev("(document.body.innerText||'').replace(/\n{2,}/g,'\n').slice(0,600)")));
cdp.close();
