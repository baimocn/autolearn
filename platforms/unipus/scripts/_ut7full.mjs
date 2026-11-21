// _ut7full.mjs — U7 UT 全量作答：20选择题 + 5填空 + 翻译
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const CHOICES = { 0: "B", 1: "D", 2: "C", 3: "B", 4: "A", 5: "C", 6: "D", 12: "B", 13: "C", 14: "C", 15: "A", 16: "C", 17: "C", 18: "C", 19: "B", 20: "C", 21: "D", 22: "B", 23: "A", 24: "A" };
const CLOZE = { 7: "tune in", 8: "reach out", 9: "all told", 10: "teem with", 11: "up in the air" };
const TRANSLATION = "Ecological conservation consists of protection and restoration. Protection refers to the preservation and maintenance of biological species and their habitats, while restoration involves the breeding and reproduction of endangered species, as well as the recovery, improvement, and reconstruction of degraded ecosystems. Based on ecological principles, it monitors the interactions between humans and ecosystems, including ecological surveys and monitoring, the feeding and breeding of wild animals and plants, and the coordination of relationships between humans and the biosphere. Its purpose is to protect the habitats on which biological species and different biological communities on Earth depend, and to maintain the sustainable use and permanent maintenance of natural resources.";
const log = (...a) => console.log("[u7full]", ...a);
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp } = L;
const ex = (await frames()).find(f => /testing\/diagnosis/.test(f.url) && f.ctx);
if (!ex) { log("no exam"); process.exit(1); }
// 1) 选择题
const a = await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
 const ks=${JSON.stringify(CHOICES)};let c=0;
 items.forEach((q,i)=>{const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];
  if(!rows.length)return;const k=ks[i];const idx=(k&&"ABCD".includes(k[0]))?"ABCD".indexOf(k[0]):0;(rows[idx]||rows[0]).click();c++;});
 return c;})()`, ex.ctx).catch(e => String(e));
log("choices", a);
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
await sleep(3000);
const prog = await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');const m=t.match(/(\\d+)\\s*\\/\\s*26/);return m?m[0]:'n/a';})()`, ex.ctx).catch(() => 'err');
log("progress", prog);
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("ut7-filled.png", Buffer.from(data, "base64"));
cdp.close();
