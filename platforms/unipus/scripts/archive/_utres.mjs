import { ensureReader } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
const fl = await L.frames();
const ex = fl.find(f => /testing\/(diagnosis|challenge)/.test(f.url) && f.ctx);
if (!ex) { console.log("NO EXAM"); L.cdp.close(); process.exit(0); }
const ev = async e => { const r = await L.cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true, contextId: ex.ctx }, L.sessionId); if (r.exceptionDetails) return { EXC: (r.exceptionDetails.exception?.description||"").slice(0,100) }; return r.result?.value; };
// click 查看测试结果
const c = await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const el=[...document.querySelectorAll('[class*=i-button_default-container]')].find(e=>n(e.innerText)==='查看测试结果');if(!el)return 0;el.click();return 1;})()`);
console.log("clicked 查看测试结果:", c);
await sleep(3000);
const dlg = await ev(`(()=>{const d=[...document.querySelectorAll('[class*=dialog],[class*=modal],[class*=result]')].find(e=>e.getBoundingClientRect().height>100);return d?d.innerText.replace(/\s+/g,' ').slice(0,700):'none';})()`);
console.log("DIALOG:", dlg);
const ans = await ev(`(()=>{const t=document.body.innerText;return {hasAnswer:/正确答案/.test(t), hasScore:/(得分|成绩)[:：]?\s*\d+/.test(t), m:(t.replace(/\s+/g,' ').match(/(得分|成绩|分数)[:：]?\s*\d+(\.\d+)?/g)||[]).slice(0,5)};})()`);
console.log("ANS:", JSON.stringify(ans));
L.cdp.close();
