import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const ex=(await L.frames()).find(f=>/challenge|exam/.test(f.url)&&f.ctx);
const r=await ev(`(()=>{const c=document.querySelector('[class*=test-paper-modal-close]');if(!c)return 0;c.click();return 1;})()`,ex.ctx).catch(()=>0);
console.log("result dialog closed:",r);
L.cdp.close();
