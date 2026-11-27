import { ensureReader } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
const fl = await L.frames();
const ex = fl.find(f => /testing\/(diagnosis|challenge)/.test(f.url) && f.ctx);
if (!ex) { console.log("NO EXAM FRAME"); L.cdp.close(); process.exit(0); }
const ev = async e => { const r = await L.cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true, contextId: ex.ctx }, L.sessionId); if (r.exceptionDetails) return { EXC: (r.exceptionDetails.exception?.description||"").slice(0,120) }; return r.result?.value; };
const dlg = await ev(`(()=>{
  const d=document.querySelector('[class*=diagnosis-test-paper-result-dialog]');
  if(!d)return null;
  const btns=[...d.querySelectorAll('[class*=i-button],button')].map(b=>({t:(b.innerText||'').replace(/\s+/g,''),cls:b.className.toString().slice(0,44)}));
  return {text:(d.innerText||'').replace(/\s+/g,' ').slice(0,400), btns};
})()`);
console.log(JSON.stringify(dlg,null,1));
// also progress in answer card
const card=await ev(`(()=>{const c=document.querySelector('[class*=answer-card_container]');return c?c.innerText.replace(/\s+/g,' ').slice(0,150):'';})()`);
console.log("CARD:",card);
L.cdp.close();
