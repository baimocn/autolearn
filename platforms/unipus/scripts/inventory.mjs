// inventory.mjs <unit> — 权威盘点：hydrate 等待 + 逐块定位 + 文本稳定判定
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";

const BOOK = (await import("./config.mjs")).BOOK, BV = "VTqvEEI";
const TID = "D6816472D8507E6DCD80805A5A543A96";
const CH = {
  1: "7840f299-1cce-403e-9320-d6ddf613cebf",
  2: "2c3ad11f-a37e-4a64-ba6a-6cfa256cc6be",
  3: "5f975081-b8b7-4799-9d9c-b83a53423e4f",
  4: "6c59c2ec-f8bd-46f8-8506-6a8b25ff9e7b",
  5: "bfb4fa0c-fbd4-436f-8b37-3b307810cf63",
  6: "1ed78c87-3e9c-4426-a2fb-4a155955a7bb",
  7: "bc8967a2-13b9-4a3f-a127-e368e228e9e5",
  8: "f8dc1090-7968-4eb7-b231-63da59732244",
};
const u = Number(process.argv[2]);

const L = await connect(TID);
const { ev, frames } = L;
const log = (...a) => console.log(...a);

const BLK = `(function(i){
  const b = [...document.querySelectorAll('div.editor-question-block.questionBlockNode')][i];
  if (!b) return null;
  const t = (b.innerText || '').replace(/\\s+/g, ' ');
  const kind = /准备时长|作答时长|点击开始/.test(t) ? 'speak'
    : /得分|提交|重新作答|计分/.test(t) ? 'q' : 'content';
  return {
    i, kind, len: t.length, txt: t.slice(0, 300),
    inputs: b.querySelectorAll('input[type=text]').length,
    areas: b.querySelectorAll('textarea').length,
    ce: b.querySelectorAll('[contenteditable=true]').length,
    flow: b.querySelectorAll('.react-flow__node').length,
    file: b.querySelectorAll('input[type=file]').length,
    table: b.querySelectorAll('table').length, tds: b.querySelectorAll('td').length,
    sub: /提交/.test(t), redo: /重新作答/.test(t), done: /得分/.test(t),
    score: (t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/) || [])[1] ?? null,
  };
})`;

const url = `https://ipub.unipus.cn/learner/textbook/book/${BOOK}/chapter/${CH[u]}?bookVersionNumber=${BV}`;
await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return 0;f.src=${JSON.stringify(url)};return 1;})()`);
let tb = null, n = 0;
for (let k = 0; k < 45; k++) {
  await sleep(1000);
  tb = (await frames()).find((f) => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[u].slice(0, 12)));
  if (tb) { n = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(() => 0); if (n >= 3) break; }
}
if (!tb) { log(`U${u}: 帧未就绪`); process.exit(1); }
for (let k = 0; k < 25; k++) {
  const ok = await ev(`(()=>{const b=document.querySelectorAll('div.editor-question-block.questionBlockNode')[0];return b&&(b.innerText||'').length>50?1:0;})()`, tb.ctx).catch(() => 0);
  if (ok) break;
  await sleep(1000);
}
await sleep(1500);
log(`U${u}: blocks=${n} hydrated`);

const out = [];
for (let i = 0; i < n; i++) {
  let s = null, prevLen = -1;
  for (let t = 0; t < 6; t++) {
    await ev(`(() => {
      const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
      if(!b) return 0;
      const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
      const r=b.getBoundingClientRect(), box=sc.getBoundingClientRect();
      sc.scrollTop += (r.top-box.top)-20;
      return 1;
    })()`, tb.ctx);
    await sleep(t === 0 ? 900 : 1300);
    s = await ev(`${BLK}(${i})`, tb.ctx).catch(() => null);
    if (!s) continue;
    if (s.len > 0 && s.len === prevLen) break;
    prevLen = s.len;
  }
  out.push(s);
  if (!s) { log(`#${i} null`); continue; }
  const tag = s.done ? "✓" + (s.score ?? "?") : s.kind === "speak" ? "口试" : s.sub ? "待做" : s.redo ? "已交" : s.len ? "内容" : "空";
  log(`#${s.i} [${tag}] in=${s.inputs} ta=${s.areas} ce=${s.ce} flow=${s.flow} tbl=${s.table}/${s.tds} file=${s.file} | ${s.txt.slice(0, 70)}`);
}
fs.writeFileSync(`inv-U${u}.json`, JSON.stringify(out, null, 1));
const todo = out.filter((x) => x && x.kind === "q" && !x.done).length;
log(`U${u} 汇总：待做 ${todo} / 口试 ${out.filter((x) => x && x.kind === "speak").length} / 已交 ${out.filter((x) => x && x.done).length}`);
L.cdp.close();
