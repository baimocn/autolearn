import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const {cdp,sessionId}=L;
await cdp.send("Network.enable",{},sessionId).catch(()=>{});
const cap={};
cdp.on("Network.requestWillBeSent",(p)=>{if(p.request&&p.request.url)cap[p.requestId]=p.request.url;});
await cdp.send("Page.reload",{},sessionId).catch(()=>{});
await sleep(20000);
const fs=await import("node:fs");
for(const [rid,url] of Object.entries(cap)){
  if(/course\/api\/course\/|getCourseTree|node.*tree|lms\/course/.test(url)){
    try{
      const b=await cdp.send("Network.getResponseBody",{requestId:rid},sessionId);
      const nm=(url.match(/([a-zA-Z-]+)\?|\/([a-zA-Z-]+)$/)||[])[1]||"tree";
      fs.writeFileSync(`ctree-${nm}.json`,b.body||"");
      console.log("saved ctree bytes="+(b.body||"").length,url.slice(0,120));
    }catch(e){}
  }
}
L.cdp.close();
