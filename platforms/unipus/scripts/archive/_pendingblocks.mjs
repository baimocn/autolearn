import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const r=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];const out=[];
 bs.forEach((b,i)=>{const t=(b.innerText||'').replace(/[ ]+/g,' ');
  const sub=[...b.querySelectorAll('[class*=i-button_default-container]')].find(e=>(e.innerText||'').replace(/[ ]+/g,'')==='提交');
  if(sub){const q=sub.getBoundingClientRect();out.push({i,head:t.slice(0,55),score:(t.match(/得分[^0-9]*([0-9.]+)/)||[])[1]||null,btn:{x:Math.round(q.left+q.width/2),y:Math.round(q.top+q.height/2)},file:b.querySelectorAll('input[type=file]').length,len:t.length});}
 });return out;})()`,tb.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1));
cdp.close();
