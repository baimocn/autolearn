import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
const fl=await L.frames();
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:(r.exceptionDetails.exception&&r.exceptionDetails.exception.description||"").slice(0,150)};return r.result?.value;};
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
await sleep(800);
// 1) read answers
const ans=await ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];
  const t=(b.innerText||'');
  const paren=[]; const re=/\(\s*(\d+)\s*\)\s*\n?([^\n(]+)/g; let m;
  while((m=re.exec(t))) paren[Number(m[1])-1]=m[2].trim();
  if(paren.filter(Boolean).length>=2) return paren.filter(Boolean);
  return [];})()`);
console.log("ANS:",JSON.stringify(ans));
// 2) click 重新作答 if present
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];
  const el=[...b.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\s+/g,''))==='重新作答');
  if(el){el.click();return 1;}return 0;})()`);
await sleep(2200);
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
await sleep(1000);
// 3) fill inputs
const f=await ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];
  const els=[...b.querySelectorAll('input[type=text]')];const vals=${JSON.stringify(ans)};
  const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  els.forEach((e,k)=>{e.focus();set.call(e,vals[k]??'x');
    e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
  return els.map(e=>e.value);})()`);
console.log("FILLED:",JSON.stringify(f));
// 4) submit
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];
  const el=[...b.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\s+/g,''))==='提交');
  if(el)el.click();return !!el;})()`);
await sleep(5000);
const sc=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];
  const t=(b.innerText||'').replace(/\s+/g,' ');
  return {score:(t.match(/得分[:：]?\s*(\d+(\.\d+)?)/)||[])[1]??null, redo:/重新作答/.test(t)};})()`);
console.log("SCORE:",JSON.stringify(sc));
L.cdp.close();
