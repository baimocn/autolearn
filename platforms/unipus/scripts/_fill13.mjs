// _fill13.mjs — 用答案覆盖块13的6个 textarea，然后提交
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const ANS = [
  "a benchmark for other urban agricultural projects",
  "up in the air",
  "A minuscule shift",
  "teems with birds and insects",
  "preemptively intervene",
  "are incorporated into daily operations",
];
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
const fill = await ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][13];
  if(!b)return 'noblock';
  const ts=[...b.querySelectorAll('textarea')];
  const ks=${JSON.stringify(ANS)};
  ts.forEach((el,i)=>{
    const proto=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');
    proto.set.call(el, ks[i]||'answer');
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  });
  return ts.length;
})()`, tb.ctx).catch(e => String(e));
console.log("filled", fill);
await sleep(1200);
const check = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][13];return [...b.querySelectorAll('textarea')].map(t=>t.value.slice(0,45));})()`, tb.ctx).catch(() => []);
console.log("values", JSON.stringify(check));
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
fs.writeFileSync("fill13.png", Buffer.from(data, "base64"));
cdp.close();
