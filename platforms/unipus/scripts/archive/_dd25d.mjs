import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb = (await L.frames()).find((f) => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[1].slice(0, 12)));
const { ev } = L;
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][25];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx);
await sleep(400);
const res = await ev(`(async()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][25];
  const trig=b.querySelector('[class*=digEmptySelectView_selectTrigger]');
  const rk=Object.keys(trig).find(k=>k.startsWith('__reactProps'));
  try{ trig[rk].onClick({stopPropagation(){},preventDefault(){},target:trig,currentTarget:trig,nativeEvent:{}});}catch(e){trig.click();}
  await new Promise(r=>setTimeout(r,800));
  // enumerate all select-related visible containers with their option-like leaves
  const groups=[];
  [...document.querySelectorAll('[class*=digEmptySelect],[class*=selectOption],[class*=select-option],[class*=select_option]')].forEach(e=>{
    const cls=(e.className||'').toString();
    const t=(e.innerText||'').replace(/\\s+/g,' ').trim();
    const r=e.getBoundingClientRect();
    if(r.width>0&&r.height>0&&t&&/[a-zA-Z]{3}/.test(t)&&t.length<200) groups.push({cls:cls.slice(0,60),t});
  });
  return groups.slice(0,15);
})()`, tb.ctx);
console.log("OPENED:", JSON.stringify(res, null, 1));
L.cdp.close();
