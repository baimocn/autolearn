import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const r=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
 return {n:bs.length, sample:bs.slice(0,6).map((b,i)=>{const t=(b.innerText||'').replace(/\s+/g,' ');return{i,len:t.length,rec:b.querySelector('[class*=record_record-prepare],[class*=record_record-recording]')?1:0,redo:/重新作答/.test(t),my:/我的回放/.test(t),ai:/AI 评分/.test(t),score:(t.match(/得分[:：]\s*(\d+(\.\d+)?)/)||[])[1]||null,head:t.slice(0,55)};})};})()`,tb.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1).slice(0,3000));
cdp.close();
