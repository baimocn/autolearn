import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const all = await frames();
for (const f of all) {
  const t = await ev(`(()=>{const x=document.body?document.body.innerText.replace(/\s+/g,' '):'';return x.slice(0,260);})()`, f.ctx).catch(()=>"");
  if (t) console.log("[" + (f.url||"").slice(0,60) + "]\n  " + t + "\n");
}
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
fs.writeFileSync("u5-state.png", Buffer.from(data, "base64"));
console.log("shot saved");
cdp.close();
