import { connect } from "./utlib.mjs";
import { pickVisible } from "./vislib.mjs";
import { READER, COURSE } from "./reader.mjs";
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const U=Number(process.argv[2]);
const tid=await pickVisible(); const L=await connect(tid); const {ev,frames,cdp,sessionId}=L;
const click=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId).catch(()=>{});await sleep(90);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId).catch(()=>{});};
await cdp.send("Page.navigate",{url:`${READER}#/${COURSE}/courseware/u${U}/u${U}g2`},sessionId).catch(()=>{});
await sleep(1500); await cdp.send("Page.reload",{},sessionId).catch(()=>{}); await sleep(14000);
for(let k=0;k<3;k++){ if(!(await ev(`/本单元学习规则/.test(document.body.innerText)`).catch(()=>false)))break; await click(639,462); await sleep(1100); }
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
for(let r=0;r<6;r++){ const n=await ev(`(()=>{let k=0;for(const c of document.querySelectorAll('[class*=collapsible-container]')){const b=c.querySelector('[class*=collapsible-content]');if(b&&b.getBoundingClientRect().height<20){const h=c.querySelector('[class*=collapsible-head]');if(h){h.click();k++;}}}return k;})()`,tb.ctx).catch(()=>0); if(!n)break; await sleep(1200); }
const n=await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`,tb.ctx);
for(let i=0;i<n;i++){
  const g=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return '';const q=b.querySelector('[data-ipublish-question-group-type]');return q?q.getAttribute('data-ipublish-question-group-type'):'';})()`,tb.ctx).catch(()=>"");
  if(!/short_answer/.test(g||""))continue;
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`,tb.ctx);
  await sleep(1800);
  const st=await ev(`(()=>{const a=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];const b=a[${i}];
   const p=b.parentElement;const prompt=(p.children[0]?.innerText||'').replace(/\\s+/g,' ').trim().slice(0,220);
   return JSON.stringify({txt:(b.innerText||'').replace(/\\s+/g,' ').slice(0,40),ta:b.querySelectorAll('textarea').length,prompt});})()`,tb.ctx);
  console.log("#"+i,st);
}
L.cdp.close();
