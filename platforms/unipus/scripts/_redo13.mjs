import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb = (await L.frames()).find((f) => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[1].slice(0, 12)));
const { ev } = L;
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][13];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx);
await sleep(500);
// list ibuttons + input readOnly/disabled
const before = await ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][13];
  return {btns:[...b.querySelectorAll('[class*=i-button]')].map(e=>({t:e.innerText.replace(/\\s+/g,''),cls:e.className.toString().slice(0,40)})),
    inputs:[...b.querySelectorAll('input[type=text]')].map(e=>({ro:e.readOnly,dis:e.disabled}))};
})()`, tb.ctx);
console.log("BEFORE:", JSON.stringify(before, null, 1));
// click 重新作答
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][13];
 const el=[...b.querySelectorAll('[class*=i-button_default-container]')].find(e=>e.innerText.replace(/\\s+/g,'')==='重新作答');
 if(el)el.click();return !!el;})()`, tb.ctx);
await sleep(1200);
// check confirm dialog in frame
const dlg = await ev(`[...document.querySelectorAll('[class*=modal],[class*=dialog],[class*=confirm],[role=dialog],[class*=pop]')].filter(e=>{const r=e.getBoundingClientRect();return r.width>100&&r.height>50;}).map(e=>({cls:e.className.toString().slice(0,40),txt:e.innerText.replace(/\\s+/g,' ').slice(0,120)})).slice(0,8)`, tb.ctx);
console.log("DIALOG:", JSON.stringify(dlg, null, 1));
// buttons visible in dialog (确定/取消)
const db = await ev(`[...document.querySelectorAll('button,[class*=i-button]')].filter(e=>{const t=e.innerText.replace(/\\s+/g,'');return /确定|确认|取消|重新作答/.test(t)&&e.getBoundingClientRect().width>0;}).map(e=>({t:e.innerText.replace(/\\s+/g,''),cls:e.className.toString().slice(0,40)}))`, tb.ctx);
console.log("DIALOG BUTTONS:", JSON.stringify(db, null, 1));
L.cdp.close();
