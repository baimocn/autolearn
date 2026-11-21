import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb = (await L.frames()).find((f) => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[1].slice(0, 12)));
const { ev } = L;
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][25];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx);
await sleep(500);
// React onClick on the placeholder span (the cursor:pointer element)
const opened = await ev(`(async()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][25];
  const ph=b.querySelector('[class*=digEmptySelectView_placeholder]');
  if(!ph) return 'no-ph';
  const rk=Object.keys(ph).find(k=>k.startsWith('__reactProps'));
  if(rk&&ph[rk].onClick){ph[rk].onClick({stopPropagation(){},preventDefault(){},target:ph,currentTarget:ph,nativeEvent:{}});}
  else ph.click();
  await new Promise(r=>setTimeout(r,800));
  // find popup containers near body
  const pops=[...document.querySelectorAll('[class*=dropdown],[class*=popup],[class*=overlay],[class*=options],[class*=menu]')]
    .filter(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0)
    .map(e=>({cls:(e.className||'').toString().slice(0,50),txt:(e.innerText||'').replace(/\\s+/g,' ').slice(0,200)}));
  return pops.filter(p=>/[a-zA-Z]{4}/.test(p.txt)).slice(0,10);
})()`, tb.ctx);
console.log("POPUPS:", JSON.stringify(opened, null, 1));
L.cdp.close();
