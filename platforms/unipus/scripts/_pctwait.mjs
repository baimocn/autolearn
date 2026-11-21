import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
if(!rd){console.log("NO READER");process.exit(0);}
const L=await connect(rd.id);
const fl=await L.frames();
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx||tb.ctx},L.sessionId);return r.result?.value;};
for(let k=0;k<8;k++){
  const p=await ev(`(()=>{const out=[];[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].forEach(e=>{const t=(e.innerText||'').replace(/\s+/g,' ').trim();const m=t.match(/(\d+(?:\.\d+)?)\s*%\s*$/);if(m)out.push(t);});return out.slice(0,15);})()`);
  console.log("t+"+(k*5)+"s pct sections:",JSON.stringify(p));
  if(p&&p.length)break;
  await new Promise(r=>setTimeout(r,5000));
}
L.cdp.close();
