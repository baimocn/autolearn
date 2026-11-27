import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
// 遍历帧，看 (629,511) 命中什么
for(const f of await L.frames()){
  const hit=await ev(`(()=>{const e=document.elementFromPoint(629,511);if(!e)return null;return {tag:e.tagName,cls:(e.className||'').toString().slice(0,50),txt:(e.innerText||'').replace(/\s+/g,'').slice(0,20)};})()`,f.ctx).catch(()=>null);
  if(hit)console.log("HIT@",f.url.slice(38,62),"=>",JSON.stringify(hit));
}
// 也测 629,477
for(const f of await L.frames()){
  const hit=await ev(`(()=>{const e=document.elementFromPoint(629,477);if(!e)return null;return {tag:e.tagName,cls:(e.className||'').toString().slice(0,50),txt:(e.innerText||'').replace(/\s+/g,'').slice(0,20)};})()`,f.ctx).catch(()=>null);
  if(hit)console.log("HIT477@",f.url.slice(38,62),"=>",JSON.stringify(hit));
}
L.cdp.close();
