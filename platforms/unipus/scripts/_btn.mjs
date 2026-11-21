import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
for(const f of await frames()){
 if(!/pc\.html/.test(f.url))continue;
 const r=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>e.children.length<=1&&e.getBoundingClientRect().width>10&&/^(我知道了|知道了|再想想|去学习)$/.test(n(e.innerText)));
  return v.map(e=>{const b=e.getBoundingClientRect();const cs=getComputedStyle(e);return{t:n(e.innerText),tag:e.tagName,x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width),h:Math.round(b.height),vis:cs.visibility,op:cs.opacity,pe:cs.pointerEvents};});})()`,f.ctx).catch(e=>String(e));
 console.log("TOP",JSON.stringify(r));
}
cdp.close();
