import { ensureReader, READER, COURSE } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const route = process.argv[2] || "u1g22/u1g147/u1g158/u1g31";
const tid = await ensureReader(1);
const L = await connect(tid);
await L.cdp.send("Page.enable", {}, L.sessionId);
const target = `${READER}#/${COURSE}/courseware/${route}`;
await L.cdp.send("Page.navigate", { url: target }, L.sessionId).catch(()=>{});
let tb=null, n=0;
for(let k=0;k<40;k++){
  await sleep(1200);
  tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);
  if(!tb)continue;
  n=await L.ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`,tb.ctx).catch(()=>0)||0;
  if(n>0)break;
}
console.log("blocks:",n);
if(n>0){
  const raw=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);return r.result?.value;};
  for(let step=0;step<30;step++){await raw(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollTop+=420;return 1;})()`);await sleep(550);}
  const lens=await raw(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map(b=>(b.innerText||'').length)`);
  console.log("LENS:",JSON.stringify(lens));
}
L.cdp.close();
