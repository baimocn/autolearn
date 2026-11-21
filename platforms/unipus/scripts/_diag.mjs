import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
for (const f of await frames()) {
  const t = await ev(`(()=>{const b=document.body;if(!b)return 'NOBODY';const x=b.innerText.replace(/\s+/g,' ');const modals=[...document.querySelectorAll('[class*=ant-modal],[class*=modal],[class*=dialog]')].map(e=>(e.innerText||'').replace(/\s+/g,' ').slice(0,80)).filter(Boolean);return JSON.stringify({len:x.length,head:x.slice(0,150),modals:modals.slice(0,5)});})()`, f.ctx).catch(e=>"ERR "+String(e).slice(0,60));
  console.log("["+(f.url||"").slice(0,55)+"]", t);
}
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
fs.writeFileSync("diag.png", Buffer.from(data, "base64"));
cdp.close();
