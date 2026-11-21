import { connect, sleep } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const top = (await frames()).find(f => /pc\.html/.test(f.url) && f.ctx);
const r = await ev(`(()=>{
 const n=s=>(s||'').replace(/\s+/g,'');
 const all=[...document.querySelectorAll('*')].filter(e=>n(e.innerText)==='我知道了');
 return all.map(e=>{const b=e.getBoundingClientRect();return {tag:e.tagName, cls:(e.className||'').toString().slice(0,70), x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width),h:Math.round(b.height), kids:e.children.length};});
})()`, top.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1).slice(0,3000));
cdp.close();
