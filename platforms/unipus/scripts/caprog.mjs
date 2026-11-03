import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const TID=process.argv[2]||"84B74FE42AFBE800BB4140C151D85DA8";
const L=await connect(TID);
const {cdp,sessionId}=L;
try{ await cdp.send("Network.enable",{},sessionId); }catch(e){}
const reqs={};
cdp.on("Network.requestWillBeSent",(p)=>{ if(p.request?.url) reqs[p.requestId]=p.request.url; });
const done=[];
cdp.on("Network.responseReceived",(p)=>{ if(/course_progress/.test(reqs[p.requestId]||"")) done.push(p.requestId); });
await cdp.send("Page.reload",{},sessionId);
await sleep(20000);
console.log("捕获进度响应:",done.length);
for(const id of done.slice(0,9)){
  try{
    const b=await cdp.send("Network.getResponseBody",{requestId:id},sessionId);
    const txt=b.body||"";
    const name=(reqs[id].match(/course_progress\/[^/]+\/([^/]+)\//)||[])[1]||"x";
    fs.writeFileSync(`prog-${name}.json`,txt);
    console.log(" saved prog-"+name+".json len="+txt.length);
  }catch(e){ console.log(" body err",e.message.slice(0,60)); }
}
L.cdp.close();
