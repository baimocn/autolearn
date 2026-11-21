import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb=null;
for(let k=0;k<25&&!tb;k++){tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx&&f.url.includes(CH[1].slice(0,12)));if(!tb)await sleep(700);}
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return null;return r.result?.value;};
// slow full-page scroll to trigger lazy mount, then rescan
const total=await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`);
for(let i=0;i<total;i++){
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
  await sleep(280);
}
await sleep(1500);
const rows=await ev(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map((b,i)=>{
  const t=(b.innerText||'').replace(/\s+/g,' ');
  return {i,inp:b.querySelectorAll('input[type=text]').length,area:b.querySelectorAll('textarea').length,
    dig:b.querySelectorAll('[class*=digEmptyView_blankView]').length,
    score:(t.match(/得分[:：]?\s*(\d+(\.\d+)?)/)||[])[1]||'',sub:/提交/.test(t)?1:0,redo:/重新作答/.test(t)?1:0};
})`);
rows.forEach(x=>console.log(`#${String(x.i).padStart(2)} inp=${String(x.inp).padStart(2)} dig=${String(x.dig).padStart(2)} area=${x.area} ${(x.score||'').padEnd(5)} ${x.sub?'S':'.'}${x.redo?'R':'.'}`));
L.cdp.close();
