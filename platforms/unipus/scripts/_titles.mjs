import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const r=await ev(`(()=>{const els=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')];return els.map(e=>{const b=e.getBoundingClientRect();return{t:(e.innerText||'').replace(/[ ]+/g,' ').slice(0,60),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width)};}).filter(x=>x.w>20).slice(0,70);})()`,tb.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1).slice(0,6500));
cdp.close();
