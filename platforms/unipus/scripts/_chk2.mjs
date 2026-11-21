import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
if(!rd){console.log("NO READER TAB");process.exit(0);}
console.log("hash:",(rd.url.split("#")[1]||"").slice(-45));
const L=await connect(rd.id);
const fl=await L.frames();
for(const f of fl){ if(/textbook|ipub/.test(f.url)) console.log("FRAME:",f.url.slice(60,150)); }
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
if(tb){
  const n=await L.ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`,tb.ctx).catch(()=>0);
  console.log("blocks:",n);
  const h=await L.ev(`document.body.innerText.slice(0,120)`,tb.ctx).catch(()=>"");
  console.log("tb head:",JSON.stringify(h));
}
L.cdp.close();
