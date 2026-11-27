// _ut4full2.mjs — U4 UT 修正索引后全量作答（26 索引对齐）
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
// 按真实 DOM 索引：0-6 词汇选择、7-11 选词填空、12-19 术语、20-24 阅读、25 翻译
const CHOICES = ["D", "B", "B", "B", "B", "B", "C", "", "", "", "", "", "B", "A", "C", "D", "B", "B", "C", "D", "B", "B", "C", "C", "A", ""];
const CLOZE = { 7: "do justice to", 8: "give way to", 9: "stretch back", 10: "immerse in", 11: "the turn of the century" };
const TRANSLATION = "In recent years, rural leisure tourism in China has shown unprecedented momentum, vividly illustrating the concept that lucid waters and lush mountains are invaluable assets. Some regions have developed projects such as forest hiking and wild fruit picking; others have launched water activities like fishing and boating; still others have converted old farmhouses into homestays, allowing tourists to immerse themselves in rural life, staying in farmhouses, eating farm meals, and doing farm work. In the villages, people can get close to nature, feel the charm of the mountains and forests, and enjoy the coolness and comfort of the water. This form of tourism satisfies the people's yearning for and pursuit of a better life.";
const log = (...a) => console.log("[u4full2]", ...a);
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp } = L;
const ex = (await frames()).find(f => /testing\/diagnosis/.test(f.url) && f.ctx);
if (!ex) { log("no exam"); process.exit(1); }
// 1) 选择题（严格按索引）
const a = await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
 const ks=${JSON.stringify(CHOICES)};let c=0;const detail=[];
 items.forEach((q,i)=>{const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];
  if(!rows.length)return;const k=ks[i];const idx=(k&&"ABCD".includes(k[0]))?"ABCD".indexOf(k[0]):0;(rows[idx]||rows[0]).click();c++;detail.push(i+':'+(k||'A'));});
 return {c,detail:detail.join(',')};})()`, ex.ctx).catch(e => String(e));
log("choices", JSON.stringify(a));
// 2) 填空
const b = await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
 const ws=${JSON.stringify(CLOZE)};let c=0;
 Object.keys(ws).forEach(i=>{const q=items[Number(i)];if(!q)return;
  const el=q.querySelector('input[class*=answer_answerInput],input[type=text]');
  if(!el)return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,ws[i]);
  el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new Event('blur',{bubbles:true}));
  c++;});
 return c;})()`, ex.ctx).catch(e => String(e));
log("cloze", b);
// 3) 翻译
const c3 = await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
 const q=items[25];if(!q)return 'no q25';
 const el=q.querySelector('textarea');
 if(!el)return 'no textarea';
 Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,${JSON.stringify(TRANSLATION)});
 el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new Event('blur',{bubbles:true}));
 return 'filled '+el.value.length;})()`, ex.ctx).catch(e => String(e));
log("translation", c3);
await sleep(5000);
log("progress:", await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');const m=t.match(/(\\d+)\\s*\\/\\s*26/);return m?m[0]:'n/a';})()`, ex.ctx).catch(() => 'err'));
cdp.close();
