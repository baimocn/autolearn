import { ensureReader, READER, COURSE, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const U=Number(process.argv[2]||1);
const tid = await ensureReader(U);
const L = await connect(tid);
await L.cdp.send("Page.enable",{},L.sessionId);
await L.cdp.send("Page.navigate",{url:`${READER}#/${COURSE}/courseware/u${U}/u${U}g2`},L.sessionId).catch(()=>{});
await sleep(3000);
await L.cdp.send("Page.reload",{},L.sessionId).catch(()=>{});
let tb=null,total=0,ok6=0;
for(let k=0;k<40;k++){
  await sleep(1000);
  const fl=await L.frames();
  tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx&&f.url.includes(CH[U].slice(0,12)));
  if(!tb)continue;
  total=await L.ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`,tb.ctx).catch(()=>0)||0;
  if(total>0){
    ok6=await L.ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];return (b.innerText||'').length;})()`,tb.ctx).catch(()=>0)||0;
    if(ok6>80)break;
    // nudge scroll
    await L.ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];if(b)b.scrollIntoView({block:'center'});return 1;})()`,tb.ctx).catch(()=>0);
  }
}
console.log("route u"+U+"g2: blocks="+total,"block6.len="+ok6);
if(ok6>0){
  const t=await L.ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];return (b.innerText||'').replace(/\s+/g,' ').slice(0,150);})()`,tb.ctx);
  console.log("B6:",t);
}
L.cdp.close();
