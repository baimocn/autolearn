import { ensureReader } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
const fl = await L.frames();
const ex = fl.find(f => /testing\/(diagnosis|challenge)/.test(f.url) && f.ctx);
if (!ex) { console.log("NO EXAM"); L.cdp.close(); process.exit(0); }
const ev = async e => { const r = await L.cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true, contextId: ex.ctx }, L.sessionId); if (r.exceptionDetails) return { EXC: (r.exceptionDetails.exception?.description||"").slice(0,100) }; return r.result?.value; };
const btns = await ev(`[...document.querySelectorAll('[class*=i-button],button')].map(b=>({t:(b.innerText||'').replace(/\s+/g,'').slice(0,20),w:Math.round(b.getBoundingClientRect().width),y:Math.round(b.getBoundingClientRect().top)})).filter(x=>x.t&&x.w>20)`);
console.log("ALL BTNS:", JSON.stringify(btns, null, 1));
const full = await ev(`(()=>{const d=[...document.querySelectorAll('[class*=dialog],[class*=modal],[class*=result]')].find(e=>e.getBoundingClientRect().height>100);return d?d.innerText.replace(/\n{2,}/g,'|'):'none';})()`);
console.log("FULL TEXT:", String(full).slice(0, 1800));
L.cdp.close();
