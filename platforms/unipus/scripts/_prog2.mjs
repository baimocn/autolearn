import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(ex){
 const r=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');const m=t.match(/(\d+)\s*\/\s*(\d+)\s*\n*\s*进度/)||t.match(/(\d+)\s*\/\s*(\d+)/);
  const empties=[...document.querySelectorAll('[class*=answer_answerInput]')].map(e=>({v:e.value,w:Math.round(e.getBoundingClientRect().width)}));
  return {m:m?m[0]:'',inputs:empties.length,sample:empties.slice(0,6)};})()`,ex.ctx).catch(e=>String(e));
 console.log(JSON.stringify(r));
}
cdp.close();
