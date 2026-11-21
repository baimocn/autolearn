import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
if(!rd){console.log("NO READER");process.exit(0);}
const L=await connect(rd.id);
const {ev,cdp,sessionId}=L;
await cdp.send("Network.enable",{},sessionId).catch(()=>{});
await cdp.send("Page.reload",{},sessionId).catch(()=>{});
await sleep(18000);
// 抓取已完成的响应
const body=await ev(`(()=>{
  // 从 performance API 找到章节结构请求并同步取回（不可行）——改为扫描已有 DOM 数据
  // 更直接：window 上应该有章节树数据
  return 'use-network';
})()`).catch(()=>'');
// 改用 Network.getResponseBody 方式：重新捕获
const cap={};
cdp.on("Network.requestWillBeSent",(p)=>{ if(p.request&&p.request.url) cap[p.requestId]=p.request.url; });
await cdp.send("Page.reload",{},sessionId).catch(()=>{});
await sleep(20000);
const fs=await import("node:fs");
for(const [rid,url] of Object.entries(cap)){
  if(/getChapterInfo|getChapterTemplate|studentContent|getBookCatalog/.test(url)){
    try{
      const b=await cdp.send("Network.getResponseBody",{requestId:rid},sessionId);
      const name=url.match(/(getChapterInfo|getChapterTemplate|studentContent|getBookCatalog)/)[1];
      fs.writeFileSync(`tree-${name}.json`,b.body||"");
      console.log("saved tree-"+name+".json bytes="+(b.body||"").length,"url:",url.slice(0,110));
    }catch(e){}
  }
}
L.cdp.close();
