import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
for(const f of await frames()){
 if(!f.ctx)continue;
 const r=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');
  const btns=[...document.querySelectorAll('button,div,span,a')].filter(e=>e.children.length<=1&&e.getBoundingClientRect().width>15&&/解析|答案|查看|再次作答/.test(n(e.innerText))).map(e=>{const b=e.getBoundingClientRect();return{t:n(e.innerText).slice(0,20),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};});
  return btns.slice(0,10);})()`,f.ctx).catch(()=>[]);
 if(r&&r.length)console.log((f.url||'').slice(0,55),JSON.stringify(r));
}
cdp.close();
