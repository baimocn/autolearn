import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
tabs.filter(t=>t.type==="page").forEach(t=>console.log("TAB:",t.url.slice(0,100)));
const rd=tabs.find(t=>/ucontent/.test(t.url));
if(!rd){console.log("NO READER");process.exit(0);}
const L=await connect(rd.id);
const fl=await L.frames();
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
console.log("tb:",tb?tb.url.slice(73,110):"none");
if(tb){
  const n=await L.cdp.send("Runtime.evaluate",{expression:"document.querySelectorAll('div.editor-question-block.questionBlockNode').length",returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId).then(r=>r.result?.value).catch(()=>"?");
  console.log("blocks:",n);
}
L.cdp.close();
