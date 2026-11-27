import { connect } from "./utlib.mjs";
import fs from "node:fs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(!ex){console.log('no exam');process.exit(1);}
const r=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
 return items.map((q,i)=>{const t=(q.innerText||'').replace(/[ ]+/g,' ');
  const m=t.match(/(正确答案|参考答案)[:：]?\s*([A-D])/);
  const wrong=/答错|错误/.test(t); const right=/答对|正确/.test(t);
  return {i,ans:m?m[2]:'',wrong,right,tail:t.slice(-120)};});})()`,ex.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1).slice(0,5000));
fs.writeFileSync('ut-analysis.json',JSON.stringify(r,null,1));
cdp.close();
