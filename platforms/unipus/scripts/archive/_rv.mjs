import { ensureReader } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
const fl = await L.frames();
const ex = fl.find(f => /testing\/(diagnosis|challenge)/.test(f.url) && f.ctx);
if (!ex) { console.log("NO EXAM FRAME"); console.log(fl.map(f=>f.url.slice(0,90))); L.cdp.close(); process.exit(0); }
const ev = async e => { const r = await L.cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true, contextId: ex.ctx }, L.sessionId); if (r.exceptionDetails) return { EXC: (r.exceptionDetails.exception?.description||"").slice(0,120) }; return r.result?.value; };
// close result dialog first? dump q0 outerHTML
const html = await ev(`(()=>{const q=document.querySelector('[class*=answer-question-box_questionItem]');return q?q.outerHTML.slice(0,4000):'NO Q';})()`);
console.log(html);
L.cdp.close();
