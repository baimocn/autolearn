import { connect, sleep } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
tabs.filter(t=>t.type==="page").forEach(t=>console.log("PAGE:", t.url.slice(0,150)));
const rd = tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
if(!rd){console.log("NO READER TAB");process.exit(0);}
const L = await connect(rd.id);
const { ev, frames } = L;
console.log("READER URL:", await ev("location.href"));
const fl = await frames();
for(const f of fl){
  if(/sso|login/i.test(f.url)) console.log("!! FRAME AT LOGIN:", f.url.slice(0,120));
}
const tb = fl.find(f=>f.url.includes("textbook/book"));
if(tb){
  const n = await L.ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(()=>"err");
  console.log("textbook blocks:", n);
}
L.cdp.close();
