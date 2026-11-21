import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(!ex){console.log('no exam');process.exit(1);}
// 点返回回成绩页
const r=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='返回'&&e.getBoundingClientRect().width>20);if(!v.length)return'none';v[v.length-1].click();return'clicked';})()`,ex.ctx).catch(e=>String(e));
console.log('back',r);
await sleep(5000);
const d=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');const m=t.match(/最终得分是\s*([\d.]+)/);return {score:m?m[1]:'',len:t.length};})()`,ex.ctx).catch(e=>String(e));
console.log(JSON.stringify(d));
cdp.close();
