import { CDP, sleep } from "./cdp.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = tabs.find(t=>t.type==="page" && /unipus/.test(t.url));
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
await cdp.send("Page.enable");
const ev = async (expr) => (await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true})).result.value;
// navigate to my courses/tutorial area
await cdp.send("Page.navigate",{url:"https://uai.unipus.cn/portal"});
await sleep(5000);
// try to find course list via API from within page (cookies attached)
async function api(u){
  try{ const r = await ev(`fetch(${JSON.stringify(u)},{credentials:'include'}).then(r=>r.text()).catch(e=>'ERR:'+e)`); return r; }catch(e){ return "EVALERR"; }
}
// print body text summary and any course links
const links = await ev(`[...document.querySelectorAll('a')].map(a=>({t:(a.innerText||'').replace(/\s+/g,' ').trim().slice(0,40),h:a.href})).filter(x=>x.t).slice(0,40)`);
console.log("LINKS:", JSON.stringify(links,null,1));
const body = await ev("document.body.innerText.replace(/\n{2,}/g,'\n').slice(0,800)");
console.log("BODY:\n", body);
cdp.close();
