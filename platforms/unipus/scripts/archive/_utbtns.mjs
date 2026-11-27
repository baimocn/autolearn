import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
for(const f of await frames()){
 const r=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');return [...document.querySelectorAll('button,div,span,a')].filter(e=>e.children.length<=1&&e.getBoundingClientRect().width>15&&/开始答题|再次作答|查看测试结果|成绩提交|提交|确定|查看|返回/.test(n(e.innerText))).map(e=>{const b=e.getBoundingClientRect();return{t:n(e.innerText).slice(0,20),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};}).slice(0,15);})()`,f.ctx).catch(()=>[]);
 if(r&&r.length)console.log((f.url||'').slice(0,60),JSON.stringify(r));
}
cdp.close();
