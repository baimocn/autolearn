import { connect, sleep } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
const r = await ev(`(()=>{
 const els=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')];
 return els.slice(0,60).map(e=>{const b=e.getBoundingClientRect();const t=(e.innerText||'').replace(/\s+/g,' ').slice(0,50);return{t,x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width)};});
})()`, tb.ctx).catch(e=>String(e));
console.log("titles",JSON.stringify(r,null,1).slice(0,3500));
const dr = await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');return e?{w:Math.round(e.getBoundingClientRect().width)}:null;})()`,tb.ctx).catch(()=>null);
console.log("drawer",JSON.stringify(dr));
cdp.close();
