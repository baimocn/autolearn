import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(!ex){console.log('no exam');process.exit(1);}
const r=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
 return [7,8,9,10,11,25].map(i=>{const q=items[i];if(!q)return{i,missing:true};
  const t=(q.innerText||'').replace(/[ ]+/g,' ');
  const opts=[...q.querySelectorAll('[class*=questionViewOptionsItem]')].map(e=>e.innerText.trim());
  return {i,stem:t.slice(0,600),opts};});})()`,ex.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1).slice(0,6000));
cdp.close();
