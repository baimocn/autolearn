import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(!ex){console.log('no exam');process.exit(1);}
const r=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='查看测试结果'&&e.getBoundingClientRect().width>20);if(!v.length)return'none';v[v.length-1].click();return'clicked';})()`,ex.ctx).catch(e=>String(e));
console.log('view',r);
await sleep(5000);
// 读解析内容
const d=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');return {len:t.length,head:t.slice(0,600),hasAns:/正确答案|参考答案|解析/.test(t)};})()`,ex.ctx).catch(e=>String(e));
console.log(JSON.stringify(d).slice(0,2000));
cdp.close();
