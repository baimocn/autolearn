import { connect, sleep } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp } = L;
// 顶层弹窗
for (const f of await frames()) {
  if (!/pc\.html/.test(f.url)) continue;
  const r = await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>e.children.length<=1&&e.getBoundingClientRect().width>15&&/^(再想想|去学习|我知道了|知道了|确 定|确定)$/.test(n(e.innerText)));return v.map(e=>{const b=e.getBoundingClientRect();return{t:n(e.innerText),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};});})()`, f.ctx).catch(()=>[]);
  console.log("TOP buttons:", JSON.stringify(r));
}
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
const d = await ev(`(()=>{
 const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
 const b=bs[2]; if(!b)return 'no block2';
 const t=(b.innerText||'').replace(/\s+/g,' ');
 const recEls=[...b.querySelectorAll('[class*=record_]')].map(e=>(e.className||'').toString().slice(0,55));
 const btns=[...b.querySelectorAll('[class*=i-button]')].map(e=>({t:(e.innerText||'').replace(/\s+/g,'').slice(0,20)}));
 const prep=b.querySelector('[class*=record_record-prepare]');
 let pp=null; if(prep){const r=prep.getBoundingClientRect();pp={x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width),h:Math.round(r.height)};}
 return {len:t.length,tail:t.slice(-120),recEls,btns,prepPos:pp};
})()`, tb.ctx).catch(e=>"ERR "+String(e).slice(0,100));
console.log("BLOCK#2:", JSON.stringify(d,null,1).slice(0,2000));
cdp.close();
