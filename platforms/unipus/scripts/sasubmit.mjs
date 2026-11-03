// sasubmit.mjs <unit> <blockIdx> <answerFile> — 填简答并用 React onClick 提交
import { connect } from "./utlib.mjs";
import { pickVisible } from "./vislib.mjs";
import { READER, COURSE } from "./reader.mjs";
import fs from "node:fs";

const U = Number(process.argv[2]);
const IDX = Number(process.argv[3]);
const ANS = fs.readFileSync(process.argv[4], "utf8").replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (m) => console.log(`[${new Date().toLocaleTimeString()}] ${m}`);

const tid = await pickVisible();
const L = await connect(tid);
const { ev, frames, cdp, sessionId } = L;

const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
if (!tb) { log("无教材帧"); process.exit(1); }

// 去遮罩
await ev(`(()=>{for(const m of document.querySelectorAll('.ant-modal-wrap,.ant-modal-mask,[class*=backdrop]')){m.style.display='none';m.style.pointerEvents='none';}return 1;})()`).catch(() => {});
await ev(`(()=>{for(const m of document.querySelectorAll('[class*=backdrop]')){m.style.display='none';m.style.pointerEvents='none';}return 1;})()`, tb.ctx).catch(() => {});

// 展开折叠 + 滚到块
for (let r = 0; r < 6; r++) {
  const n = await ev(`(()=>{let k=0;for(const c of document.querySelectorAll('[class*=collapsible-container]')){const b=c.querySelector('[class*=collapsible-content]');if(b&&b.getBoundingClientRect().height<20){const h=c.querySelector('[class*=collapsible-head]');if(h){h.click();k++;}}}return k;})()`, tb.ctx).catch(() => 0);
  if (!n) break; await sleep(1200);
}
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx).catch(() => {});
await sleep(1800);

const fill = await ev(`(()=>{const a=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];const b=a[${IDX}];
 const ta=b.querySelector('textarea'); if(!ta)return 'no ta';
 const setter=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;
 setter.call(ta,${JSON.stringify(ANS)});
 ta.dispatchEvent(new Event('input',{bubbles:true}));
 ta.dispatchEvent(new Event('change',{bubbles:true}));
 ta.blur();
 return 'filled '+ta.value.length;})()`, tb.ctx);
log("fill: " + fill);
await sleep(1500);

const sub = await ev(`(()=>{const a=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];const b=a[${IDX}];
 const el=[...b.querySelectorAll('*')].find(e=>String(e.className).includes('i-button_default-container')&&(e.innerText||'').replace(/\\s+/g,'')==='提交');
 if(!el)return 'no btn';
 const k=Object.keys(el).find(k=>k.startsWith('__reactProps'));
 if(!k||!el[k].onClick)return 'no onClick';
 el[k].onClick({preventDefault(){},stopPropagation(){},nativeEvent:{},currentTarget:el,target:el});
 return 'submitted';})()`, tb.ctx);
log("submit: " + sub);
await sleep(3000);

// 确认框
for (const f of await frames()) {
  const c = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>(n(e.innerText)==='确定'||n(e.innerText)==='确认')&&e.getBoundingClientRect().width>18);
   if(!v.length)return 0;const el=v[v.length-1];const k=Object.keys(el).find(k=>k.startsWith('__reactProps'));
   if(k&&el[k].onClick){el[k].onClick({preventDefault(){},stopPropagation(){},nativeEvent:{},currentTarget:el,target:el});return 'rclick';}el.click();return 'click';})()`, f.ctx).catch(() => 0);
  if (c) { log("confirm: " + c); break; }
}
await sleep(3500);
const st = await ev(`(()=>{const a=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];return (a[${IDX}].innerText||'').replace(/\\s+/g,' ').slice(0,60);})()`, tb.ctx);
log("state: " + st);
L.cdp.close();
