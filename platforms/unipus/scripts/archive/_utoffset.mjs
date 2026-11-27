import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
// 顶层找 ipub iframe rect
for(const f of await frames()){
 if(!/pc\.html/.test(f.url))continue;
 const r=await ev(`(()=>{return [...document.querySelectorAll('iframe')].map(e=>{const b=e.getBoundingClientRect();return{src:(e.src||'').slice(0,80),x:Math.round(b.left),y:Math.round(b.top),w:Math.round(b.width),h:Math.round(b.height)};});})()`,f.ctx).catch(()=>[]);
 console.log('TOP iframes',JSON.stringify(r));
}
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(ex){
 const r=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='提交'&&e.getBoundingClientRect().width>25);
  return {w:innerWidth,h:innerHeight,dpr:devicePixelRatio,btns:v.map(e=>{const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width)};})};})()`,ex.ctx).catch(e=>String(e));
 console.log('EXAM',JSON.stringify(r));
}
cdp.close();
