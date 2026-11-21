import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);
const {ev,frames,cdp}=L;
const fl=await frames();
console.log('frames:');
for(const f of fl)console.log(' ',(f.url||'').slice(0,75),'ctx='+(f.ctx||'none'));
const ex=fl.find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(ex){
 const r=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');const m=t.match(/(\d+)\s*\/\s*(\d+)/);
  const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
  return {prog:m?m[0]:'n/a',items:items.length,txt:t.length};})()`,ex.ctx).catch(e=>'ERR '+String(e).slice(0,80));
 console.log('exam:',JSON.stringify(r));
}
cdp.close();
