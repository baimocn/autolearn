// up.mjs <unit> <blockIdx> [pdf] — 上传题：展开折叠区 → (无 pdf 则 dump 题面) / (有 pdf 则上传并提交)
import { connect, sleep } from "./utlib.mjs";
import { ensureReader, openUnit, log } from "./reader.mjs";
import path from "node:path";

const U = Number(process.argv[2]);
const I = Number(process.argv[3]);
const PDF = process.argv[4] ? path.resolve(process.argv[4]) : null;
const FNAME = PDF ? path.basename(PDF) : null;

const tid = process.env.TID || (await ensureReader(U));
const L = await connect(tid);
const tb = await openUnit(L, U);
if (!tb) { log("!! 无教材帧（多半掉登录）"); process.exit(1); }
const { ev, cdp, sessionId } = L;
const BLK = `[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}]`;

// 1) 由外到内展开所有包住该块的折叠容器
for (let k = 0; k < 4; k++) {
  const r = await ev(`(()=>{const b=${BLK};if(!b)return 0;
    const cs=[...document.querySelectorAll('[class*=collapsible-container]')].filter(c=>c.contains(b));
    for(const c of cs){const body=c.querySelector('[class*=collapsible-content]');
      if(body&&body.getBoundingClientRect().height<20){const hd=c.querySelector('[class*=collapsible-head]');if(hd){hd.click();return 1;}}}
    return 0;})()`, tb.ctx).catch(() => 0);
  if (!r) break;
  log("  ⇩ 展开折叠区");
  await sleep(2200);
}

// 2) 等块渲染出内容
let text = "";
for (let k = 0; k < 12; k++) {
  await ev(`(()=>{const b=${BLK};if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx).catch(() => {});
  await sleep(1500);
  text = await ev(`(()=>{const b=${BLK};return b?(b.innerText||'').replace(/\\s+/g,' ').trim():'';})()`, tb.ctx).catch(() => "");
  if (text && text.length > 5) break;
}
if (!text) { log("!! 块仍为空，放弃"); process.exit(2); }

if (!PDF) { log("TEXT:", text); L.cdp.close(); process.exit(0); }

log("题面:", text.slice(0, 100));

// 3) 等上传按钮
let btn = 0;
for (let k = 0; k < 10; k++) {
  btn = await ev(`(()=>{const b=${BLK};return b?b.querySelectorAll('.ant-upload-btn').length:0;})()`, tb.ctx).catch(() => 0);
  if (btn) break;
  await ev(`(()=>{const b=${BLK};if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx).catch(() => {});
  await sleep(1500);
}
log("uploadBtns:", btn);
if (!btn) { log("!! 没有上传按钮"); process.exit(3); }

// 4) 拦截文件选择 → 塞文件
await cdp.send("Page.enable", {}, sessionId);
await cdp.send("Page.setInterceptFileChooserDialog", { enabled: true }, sessionId);
let got = null;
cdp.on("Page.fileChooserOpened", (q) => { got = q; });
const clicked = await ev(`(()=>{const b=${BLK};const s=b&&b.querySelector('.ant-upload-btn');if(!s)return 'no btn';s.click();return 'clicked';})()`, tb.ctx);
log("click:", clicked);
for (let k = 0; k < 15 && !got; k++) await sleep(400);
if (!got) { log("!! 没捕获到文件选择框"); await cdp.send("Page.setInterceptFileChooserDialog", { enabled: false }, sessionId); process.exit(4); }
await cdp.send("DOM.setFileInputFiles", { files: [PDF], backendNodeId: got.backendNodeId }, sessionId);
await cdp.send("Page.setInterceptFileChooserDialog", { enabled: false }, sessionId);

// 5) 确认附件已挂上
let attached = false;
for (let k = 0; k < 15; k++) {
  await sleep(2000);
  const d = await ev(`(()=>{const b=${BLK};const t=(b.innerText||'');return {has:t.includes(${JSON.stringify(FNAME)}),items:b.querySelectorAll('.ant-upload-list-item').length};})()`, tb.ctx).catch(() => ({ has: false, items: 0 }));
  if (d.has || d.items > 0) { attached = true; log(`  附件已挂上（items=${d.items}）`); break; }
}
if (!attached) log("  ⚠ 未确认附件，仍尝试提交");

// 6) 提交 + 确定
const sub = await ev(`(()=>{const b=${BLK};const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&(e.innerText||'').replace(/\\s+/g,'')==='提交');if(!el)return 'no';el.click();return 'ok';})()`, tb.ctx);
log("submit:", sub);
await sleep(3000);
for (const f of await L.frames()) {
  const r = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>e.children.length<=1&&(n(e.innerText)==='确定'||n(e.innerText)==='确认')&&e.getBoundingClientRect().width>18);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, f.ctx).catch(() => 0);
  if (r) { log("  ✓ 确认提交"); break; }
}
await sleep(6000);

const st = await ev(`(()=>{const b=${BLK};const t=(b.innerText||'').replace(/\\s+/g,' ');
  return JSON.stringify({redo:/重新作答|重新提交/.test(t), score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null, tail:t.slice(-120)});})()`, tb.ctx);
log("state:", st);
L.cdp.close();
