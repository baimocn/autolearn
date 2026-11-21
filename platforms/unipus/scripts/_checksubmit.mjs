import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const r=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][18];return (b.innerText||'').replace(/[ ]+/g,' ').slice(0,250);})()`,tb.ctx).catch(e=>String(e));
console.log("block18:",r);
// 找确认弹窗按钮
for(const f of await frames()){
 const x=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>e.children.length<=1&&e.getBoundingClientRect().width>15&&/^(确定|确认|确 定)$/.test(n(e.innerText)));return v.map(e=>{const b=e.getBoundingClientRect();return{t:n(e.innerText),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};});})()`,f.ctx).catch(()=>[]);
 if(x&&x.length)console.log("confirm btns",JSON.stringify(x));
}
cdp.close();
