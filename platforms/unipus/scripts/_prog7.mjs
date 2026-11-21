import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(!ex){console.log('no exam');process.exit(1);}
const r=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');
 const m=t.match(/(\d+)\s*\/\s*(\d+)/);
 const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
 const sel=items.filter(q=>q.querySelector('[class*=itemSelected],[class*=selected],[class*=active]')).length;
 return {prog:m?m[0]:'n/a',items:items.length,selected:sel};})()`,ex.ctx).catch(e=>String(e));
console.log(JSON.stringify(r));
cdp.close();
