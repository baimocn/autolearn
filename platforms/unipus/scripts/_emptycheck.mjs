import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
if(!tb){console.log('no tb');process.exit(1);}
const r=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
 const empties=bs.map((b,i)=>({i,len:(b.innerText||'').replace(/\s+/g,'').length,spin:b.querySelectorAll('.ant-spin-nested-loading').length,tag:b.querySelector('[data-ipublish-question-group-type]')?b.querySelector('[data-ipublish-question-group-type]').getAttribute('data-ipublish-question-group-type'):''})).filter(x=>x.len<5);
 return {total:bs.length,empties:empties,txt:document.body.innerText.length};})()`,tb.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1).slice(0,1500));
cdp.close();
