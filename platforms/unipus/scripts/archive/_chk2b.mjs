import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
console.log("hash:",(rd.url.split("#")[1]||"").slice(-45));
const L=await connect(rd.id);
const fl=await L.frames();
for(const f of fl) if(/textbook|ipub/.test(f.url)) console.log("FRAME:",f.url.slice(55,140));
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
if(tb){
  for(let k=0;k<5;k++){
    const n=await L.ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`,tb.ctx).catch(()=>-1);
    const t=await L.ev(`(document.body.innerText||'').length`,tb.ctx).catch(()=>-1);
    console.log(`try${k}: blocks=${n} bodylen=${t}`);
    if(n>0)break;
    await new Promise(r=>setTimeout(r,2000));
  }
}
L.cdp.close();
