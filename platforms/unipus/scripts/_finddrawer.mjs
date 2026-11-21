import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const r=await ev(`(()=>{const out=[];
 for(const e of document.querySelectorAll('[class*=catalog],[class*=drawer],[class*=area-open]')){
  const b=e.getBoundingClientRect();if(b.width<3||b.height<3)continue;
  out.push({cls:(e.className||'').toString().slice(0,70),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width),h:Math.round(b.height)});
 }return out.slice(0,20);})()`,tb.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1).slice(0,3000));
cdp.close();
