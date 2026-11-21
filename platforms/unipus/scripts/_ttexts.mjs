import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const fl=await L.frames();
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
const ev=async(e)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);return r.result?.value;};
const names=await ev(`[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].map(e=>(e.innerText||'').replace(/\s+/g,' ').trim()).filter(Boolean)`);
const clean=names.map(n=>n.replace(/[0-9.]+%$/,'').trim());
console.log(JSON.stringify(clean));
const targets=["Viewing and ynthe izing","Viewing and di cu ing","Thinking globally","Writing strategies"].map(t=>t.replace(/\s+/g,''));
console.log("targets:",JSON.stringify(targets));
targets.forEach(t=>{
  const hit=clean.find(c=>c.replace(/\s+/g,'').includes(t)||t.includes(c.replace(/\s+/g,'')));
  console.log(t,"=>",hit||"NOT FOUND");
});
L.cdp.close();
