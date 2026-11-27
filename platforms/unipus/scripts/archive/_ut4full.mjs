// _ut4full.mjs — U4 UT 第三遍：20选择题 + 5填空 + 翻译，全部按知识作答
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const CHOICES = ["D", "B", "B", "B", "B", "B", "C", "B", "A", "C", "D", "B", "B", "C", "D", "B", "B", "C", "C", "A"];
const CLOZE = ["do justice to", "give way to", "stretch back", "immerse in", "the turn of the century"];
const TRANSLATION = "In recent years, rural leisure tourism in China has shown unprecedented momentum, vividly illustrating the concept that lucid waters and lush mountains are invaluable assets. Some regions have developed projects such as forest hiking and wild fruit picking; others have launched water activities like fishing and boating; still others have converted old farmhouses into homestays, allowing tourists to immerse themselves in rural life, staying in farmhouses, eating farm meals, and doing farm work. In the villages, people can get close to nature, feel the charm of the mountains and forests, and enjoy the coolness and comfort of the water. This form of tourism satisfies the people's yearning for and pursuit of a better life.";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp } = L;
let ex = (await frames()).find(f => /testing\/diagnosis/.test(f.url) && f.ctx);
if (!ex) { console.log("no exam"); process.exit(1); }
// 点再次作答
const r = await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='再次作答'&&e.getBoundingClientRect().width>20);if(!v.length)return'none';v[v.length-1].click();return'clicked';})()`, ex.ctx).catch(e => String(e));
console.log("retry", r);
await sleep(3000);
for (let k = 0; k < 6; k++) {
  let hit = false;
  for (const f of await frames()) {
    const c = await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('.ant-modal-confirm-btns .ant-btn-primary,button,div,span')].filter(e=>e.children.length<=1&&/^(确定|确认|继续作答)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, f.ctx).catch(() => 0);
    if (c) { hit = true; break; }
  }
  if (hit) break;
  await sleep(1500);
}
let n = 0;
for (let k = 0; k < 25; k++) {
  ex = (await frames()).find(f => /testing\/diagnosis/.test(f.url) && f.ctx);
  if (ex) n = await ev(`document.querySelectorAll('[class*=answer-question-box_questionItem]').length`, ex.ctx).catch(() => 0);
  if (n >= 26) break;
  await sleep(2000);
}
console.log("questions", n);
if (!ex || n < 20) { cdp.close(); process.exit(2); }
// 1) 选择题
const a = await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
 const ks=${JSON.stringify(CHOICES)};let c=0;
 items.forEach((q,i)=>{const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];
  if(!rows.length)return;const k=ks[i];const idx=(k&&"ABCD".includes(k[0]))?"ABCD".indexOf(k[0]):0;(rows[idx]||rows[0]).click();c++;});
 return c;})()`, ex.ctx).catch(e => String(e));
console.log("choices", a);
// 2) 填空题（i7-i11 各一个 input）
const b = await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
 const words=${JSON.stringify(CLOZE)};let c=0;
 [7,8,9,10,11].forEach((qi,k)=>{
  const q=items[qi];if(!q)return;
  const el=q.querySelector('input.answer_answerInput,input[type=text]');
  if(!el)return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,words[k]);
  el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new Event('blur',{bubbles:true}));
  c++;});
 return c;})()`, ex.ctx).catch(e => String(e));
console.log("cloze", b);
// 3) 翻译
const c3 = await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
 const q=items[25];if(!q)return 'no q25';
 const el=q.querySelector('textarea');
 if(!el)return 'no textarea';
 Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,${JSON.stringify(TRANSLATION)});
 el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new Event('blur',{bubbles:true}));
 return 'filled '+el.value.length;})()`, ex.ctx).catch(e => String(e));
console.log("translation", c3);
await sleep(3000);
const prog = await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');const m=t.match(/(\\d+)\\s*\\/\\s*(\\d+)/);return m?m[0]:'n/a';})()`, ex.ctx).catch(() => 'err');
console.log("progress", prog);
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("ut4-third.png", Buffer.from(data, "base64"));
cdp.close();
