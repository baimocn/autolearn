import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
for(let k=0;k<30;k++){
 const fl=await frames();
 console.log(k,'frames',fl.map(f=>(f.url||'').slice(0,55)));
 const tb=fl.find(f=>/textbook\/book/.test(f.url)&&f.ctx);
 if(tb){
  const st=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];const ne=bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length;return {blocks:bs.length,nonempty:ne,txt:document.body.innerText.length,ch:location.href.slice(60,110)};})()`,tb.ctx).catch(e=>String(e));
  console.log('TB',JSON.stringify(st));
  break;
 }
 await sleep(2000);
}
cdp.close();
