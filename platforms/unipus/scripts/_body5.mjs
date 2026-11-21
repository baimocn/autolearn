import { CDP, sleep } from "./cdp.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const pg=tabs.find(t=>/resource-detail\/20001198976/.test(t.url));
if(!pg){console.log("NO TAB");process.exit(0);}
const cdp=await CDP.connect(pg.webSocketDebuggerUrl);
const ev=async e=>(await cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true})).result?.value;
await sleep(2000);
const txt=await ev("(document.body?document.body.innerText:'')");
console.log("BODYLEN:",txt?txt.length:"null");
console.log((txt||"").replace(/\n{2,}/g,"|").slice(0,900));
cdp.close();
