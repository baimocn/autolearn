import { CDP, sleep } from "./cdp.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = tabs.find(t => t.type === "page" && /resource-detail/.test(t.url));
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
const ev = async e => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
for(let k=0;k<10;k++){
  await sleep(2000);
  const rs = await ev("document.readyState");
  const bl = await ev("document.body?document.body.innerText.length:null");
  if(bl>100)break;
}
console.log("ready:",await ev("document.readyState"), "len:",await ev("document.body?document.body.innerText.length:null"));
console.log("BODY:", JSON.stringify(await ev("(document.body&&document.body.innerText||'').replace(/\n{2,}/g,'\n').slice(0,500)")));
// buttons containing 学习
console.log("BTNS:", JSON.stringify(await ev(`[...document.querySelectorAll('button,div[role=button],a')].map(b=>(b.innerText||'').replace(/\s+/g,'').slice(0,20)).filter(t=>/学习|进入/.test(t)).slice(0,10)`)));
cdp.close();
