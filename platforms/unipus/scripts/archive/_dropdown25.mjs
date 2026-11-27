import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb = (await L.frames()).find((f) => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[1].slice(0, 12)));
const { ev } = L;
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][25];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx);
await sleep(600);
const info = await ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][25];
  // find elements showing 请选择
  const sels=[];
  [...b.querySelectorAll('*')].forEach(e=>{
    const own=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();
    if(own.includes('请选择')){sels.push({tag:e.tagName,cls:(e.className||'').toString().slice(0,60),cursor:getComputedStyle(e).cursor});}
  });
  // click first selector to open options list
  return {sels:sels.slice(0,8), html:b.innerHTML.length};
})()`, tb.ctx);
console.log("SELECTORS:", JSON.stringify(info, null, 1));

// open first dropdown by clicking its container
await ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][25];
  const el=[...b.querySelectorAll('*')].find(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.includes('请选择')));
  (el.closest('[class*=selector],[class*=dropdown],[class*=Select]')||el).click();
  return 1;
})()`, tb.ctx);
await sleep(1200);
// options now in DOM (could be portal); list them
const opts = await ev(`(()=>{
  const out=[];
  [...document.querySelectorAll('[class*=option],[class*=item],[role=option],li')].forEach(e=>{
    const t=(e.innerText||'').trim();
    if(t&&t.length<40&&!/请选择|小题|提交|得分|登录/.test(t)){const r=e.getBoundingClientRect();if(r.width>0)out.push(t);}
  });
  return [...new Set(out)].slice(0,30);
})()`, tb.ctx);
console.log("OPENED OPTIONS:", JSON.stringify(opts, null, 1));
L.cdp.close();
