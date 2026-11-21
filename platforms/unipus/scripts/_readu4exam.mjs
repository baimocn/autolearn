import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(!ex){console.log('no exam');process.exit(1);}
const r=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');const m=t.match(/最终得分是\s*([\d.]+)/);
 const n=s=>(s||'').replace(/[ ]+/g,'');
 const btns=[...document.querySelectorAll('button,div,span,a')].filter(e=>e.children.length<=1&&e.getBoundingClientRect().width>15&&/^(答题解析|再次作答|查看测试结果)$/.test(n(e.innerText))).map(e=>n(e.innerText));
 return {score:m?m[1]:'',len:t.length,btns:[...new Set(btns)],head:t.slice(0,150)};})()`,ex.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1));
cdp.close();
