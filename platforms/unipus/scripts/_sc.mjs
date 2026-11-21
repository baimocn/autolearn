import { ensureReader } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
const fl = await L.frames();
const ex = fl.find(f => /testing\/(diagnosis|challenge)/.test(f.url) && f.ctx);
if (!ex) { console.log("NO EXAM FRAME"); console.log(fl.map(f=>f.url.slice(55,100))); L.cdp.close(); process.exit(0); }
const ev = async e => { const r = await L.cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true, contextId: ex.ctx }, L.sessionId); if (r.exceptionDetails) return { EXC: (r.exceptionDetails.exception?.description||"").slice(0,100) }; return r.result?.value; };
const btns = await ev(`[...document.querySelectorAll('[class*=i-button],button')].map(b=>({t:(b.innerText||'').replace(/\s+/g,'').slice(0,14),w:Math.round(b.getBoundingClientRect().width)})).filter(x=>x.t)`);
console.log("BTNS:", JSON.stringify(btns));
const body = await ev(`document.body.innerText.replace(/\s+/g,' ')`);
console.log("HAS 成绩提交:", body.includes("成绩提交"), "| HAS 得分:", /得分[:：]?\s*\d/.test(body), "| HAS 最终得分:", body.includes("最终得分"));
const m = body.match(/(最终得分|得分|成绩)[:：]?\s*\d+(\.\d+)?/g);
console.log("SCORE TEXTS:", JSON.stringify(m));
L.cdp.close();
