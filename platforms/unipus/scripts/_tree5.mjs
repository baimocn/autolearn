import { connect, sleep } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const mouse=async(x,y)=>{
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});
  await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);
};
// 打开抽屉
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
let c=await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');return e&&e.getBoundingClientRect().width>3?1:0;})()`,tb.ctx).catch(()=>0);
console.log('drawer open?',c);
if(!c){
  const op=await ev(`(()=>{const e=document.querySelector('[class*=catalog_area-open-menu]');if(!e)return null;const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,tb.ctx).catch(()=>null);
  console.log('opener',JSON.stringify(op));
  if(op){await mouse(op.x,op.y);await sleep(2200);}
}
const r=await ev(`(()=>{const els=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')];return els.slice(0,50).map(e=>{const b=e.getBoundingClientRect();return{t:(e.innerText||'').replace(/\s+/g,' ').slice(0,45),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width)};});})()`,tb.ctx).catch(e=>String(e));
console.log('titles:',JSON.stringify(r,null,1).slice(0,3500));
cdp.close();
