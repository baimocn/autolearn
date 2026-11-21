import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const fl=await L.frames();
console.log("frames:",fl.length);
for(const f of fl){
  const c=await L.ev(`(()=>{const out=[];[...document.querySelectorAll('*')].forEach(e=>{const cn=(e.className||'').toString();if(/close|Close/.test(cn)){const b=e.getBoundingClientRect();if(b.width>2&&b.height>2)out.push({cls:cn.slice(0,50),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),tag:e.tagName});}});return out.slice(0,8);})()`,f.ctx).catch(()=>[]);
  if(c&&c.length)console.log("FRAME",f.url.slice(0,60),"->",JSON.stringify(c));
}
L.cdp.close();
