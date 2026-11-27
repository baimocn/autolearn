import { connect, sleep } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const tbf = (await frames()).find(x => /textbook\/book/.test(x.url) && x.ctx);
// 确保抽屉开
const closed = await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');return e&&e.getBoundingClientRect().width>3?1:0;})()`, tbf.ctx).catch(()=>0);
if (!closed) {
  const op = await ev(`(()=>{const e=document.querySelector('[class*=catalog_area-open-menu]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, tbf.ctx).catch(()=>null);
  const mx=op?op.x:22,my=op?op.y:183;
  await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x:mx,y:my,button:"left",buttons:1,clickCount:1},sessionId);
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:mx,y:my,button:"left",buttons:0,clickCount:1},sessionId);
  await sleep(2200);
}
const r = await ev(`(()=>{
 const items=[...document.querySelectorAll('[class*=i-tree-menu_tree-item]')];
 return items.slice(0,40).map(e=>{const b=e.getBoundingClientRect();const t=(e.innerText||'').replace(/\s+/g,' ').slice(0,50);
  return {cls:(e.className||'').toString().slice(0,70), t, x:Math.round(b.left+b.width/2), y:Math.round(b.top+b.height/2), w:Math.round(b.width), h:Math.round(b.height)};});
})()`, tbf.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1).slice(0,4000));
cdp.close();
