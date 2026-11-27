import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
const ver = await (await fetch("http://127.0.0.1:9222/json/version")).json();
const b = await CDP.connect(ver.webSocketDebuggerUrl);
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
let t = tabs.find(x => x.url === "about:blank");
if (!t) { const r = await b.send("Target.createTarget", { url: "about:blank" }); t = { id: r.targetId }; }
await b.send("Target.activateTarget", { targetId: t.id }).catch(()=>{});
await sleep(500);
const L = await connect(t.id);
const { ev, cdp, sessionId } = L;
await cdp.send("Page.navigate", { url: "https://uai.unipus.cn/portal" }, sessionId).catch(()=>{});
await sleep(9000);
const r = await ev(`(()=>{const t=document.body.innerText.replace(/\s+/g,' ');return {url:location.href, txt:t.slice(0,1200)};})()`).catch(e=>String(e));
console.log(JSON.stringify(r, null, 1));
cdp.close(); b.close();
