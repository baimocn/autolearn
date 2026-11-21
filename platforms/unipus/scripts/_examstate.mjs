import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(!ex){console.log('no exam frame');process.exit(1);}
const r=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');
 const m=t.match(/(\d+)\s*\/\s*(\d+)/);
 const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
 const types=items.map((q,i)=>{const rows=q.querySelectorAll('[class*=chioceView_strongListView]').length;const ins=q.querySelectorAll('input.answer_answerInput,textarea').length;return rows?'C':(ins?'F':'?');});
 return {prog:m?m[0]:'n/a',items:items.length,types:types.join(''),txt:t.length,
  hasSubmit:/提交/.test(t),hasAgain:/再次作答/.test(t)};})()`,ex.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1));
cdp.close();
