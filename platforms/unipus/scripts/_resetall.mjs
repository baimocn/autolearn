import { ensureReader, openUnit, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const U=Number(process.argv[2]||1);
const tid = await ensureReader(U);
const L = await connect(tid);
const tb = await openUnit(L, U);   // forces iframe src reset + full render + dismiss popups
if(!tb){console.log("NO TB");process.exit(1);}
const ev=async e=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);if(r.exceptionDetails)return{EXC:r.exceptionDetails.text};return r.result?.value;};
const n=await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`);
console.log("blocks after openUnit:",n);
L.cdp.close();
