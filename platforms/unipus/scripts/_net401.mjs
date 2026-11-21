import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
await L.cdp.send("Network.enable",{},L.sessionId);
const reqs=new Map(); const out=[];
L.cdp.on("Network.requestWillBeSent",(p)=>{ if(p.request&&p.request.url) reqs.set(p.requestId,p.request.url); });
L.cdp.on("Network.responseReceived",(p)=>{
  const u=reqs.get(p.requestId)||"";
  if(/question|block|content|node|leaf|chapter|textbook|exam|paper/i.test(u)&&/unipus/.test(u)){
    out.push({s:p.response.status,u:u.slice(0,130)});
  }
});
await L.cdp.send("Page.reload",{},L.sessionId);
await sleep(15000);
console.log("捕获",out.length,"条:");
out.forEach(o=>console.log(o.s,o.u));
L.cdp.close();
