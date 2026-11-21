import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
for(const f of await frames()){
 if(!f.ctx)continue;
 const r=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');const m=t.match(/(最终得分|测试满分|正确率)[^。]{0,70}/);
  const n=x=>(x||'').replace(/[ ]+/g,'');
  const btns=[...document.querySelectorAll('button,div,span,a')].filter(e=>e.children.length<=1&&e.getBoundingClientRect().width>15&&/^(再次作答|查看测试结果|提交|成绩提交)$/.test(n(e.innerText))).map(e=>n(e.innerText));
  return {url:location.href.slice(0,60),score:m?m[0]:'',btns:[...new Set(btns)]};})()`,f.ctx).catch(()=>null);
 if(r&&(r.score||r.btns.length))console.log(JSON.stringify(r));
}
cdp.close();
