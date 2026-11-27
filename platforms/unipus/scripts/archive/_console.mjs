import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
const fl0 = await L.frames();
const tb0 = fl0.find(f=>f.url.includes("textbook/book")&&f.ctx);
// attach to the OOPIF textbook target directly for console
const target = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).find(t=>t.type==="iframe"&&/textbook/.test(t.url));
const tids=[];
if(target) tids.push(target.id);
else {
  // enumerate child targets
  const ver=await (await fetch("http://127.0.0.1:9222/json/version")).json();
}
let con=null;
if(target){
  con = await L.cdp.send("Target.attachToTarget",{targetId:target.id,flatten:true});
  await L.cdp.send("Runtime.enable",{},con);
  await L.cdp.send("Log.enable",{},con).catch(()=>{});
  L.cdp.on("Runtime.exceptionThrown",(p)=>{ if(p.sessionId===con){ const d=p.exceptionDetails; console.log("EXC:",(d.exception&&d.exception.description||d.text).slice(0,220)); }});
  L.cdp.on("Log.entryAdded",(p)=>{ if(p.sessionId===con&&p.entry.level==="error") console.log("LOG:",(p.entry.text||"").slice(0,200),p.entry.url?p.entry.url.slice(0,80):""); });
}
await L.cdp.send("Page.reload",{},L.sessionId);
await sleep(14000);
console.log("--- console capture done ---");
L.cdp.close();
