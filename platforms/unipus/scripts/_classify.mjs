// 精确盘点某单元题块：题型/控件/状态
import { ensureReader, openUnit, mountBlock, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const U = Number(process.argv[2] || 1);
const tid = await ensureReader(U);
const L = await connect(tid);
let tb = (await L.frames()).find((f) => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[U].slice(0, 12)));
if (!tb) tb = await openUnit(L, U);
if (!tb) { console.log("NO FRAME"); L.cdp.close(); process.exit(1); }
const { ev } = L; const ctx = tb.ctx;
const total = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, ctx);
console.log("Unit", U, "题块数:", total);
const rows = [];
for (let i = 0; i < total; i++) {
  await mountBlock(L, tb, i, 250);
  const r = await ev(`(()=>{
    const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    if(!b) return null;
    const t=(b.innerText||'').replace(/\\s+/g,' ');
    const has=sel=>b.querySelectorAll(sel).length;
    const base=(b.getAttribute('data-base')||b.getAttribute('class')||'');
    // detect question type from data attributes / class hints
    const hints=[...b.attributes].map(a=>a.name+'='+a.value).join(' ');
    return {
      inputs:has('input[type=text]'), areas:has('textarea'),
      items:has('[class*=questionItem]'), tf:has('[class*=answer_optionTF]'),
      selects:has('[class*=dropdown],[class*=select],[class*=Select]'),
      bank:has('[class*=questionViewOptionsItem]'),
      video:has('video'), audio:has('audio'), file:has('input[type=file]'),
      mic: /录音|麦克风|长按/.test(t)?1:0,
      match:/连线|匹配/.test(t)?1:0,
      score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]||'',
      submit:/提交/.test(t)?1:0, redo:/重新作答/.test(t)?1:0,
      head:t.slice(0,30)
    };
  })()`, ctx).catch(()=>null);
  rows.push({ i, ...r });
}
for (const x of rows) {
  if (!x) { console.log(`#${''} NULL`); continue; }
  const tags=[];
  if(x.video)tags.push('VIDEO'); if(x.audio)tags.push('AUDIO'); if(x.file)tags.push('UPLOAD');
  if(x.mic)tags.push('MIC'); if(x.match)tags.push('MATCH');
  if(x.tf)tags.push('tf'); if(x.bank)tags.push('bank'); if(x.selects)tags.push('dropdown');
  if(x.areas)tags.push(`area${x.areas}`); if(x.inputs)tags.push(`input${x.inputs}`);
  if(x.items)tags.push(`item${x.items}`);
  console.log(`#${String(x.i).padStart(2)} ${(x.score ? ('['+x.score+']') : '[  ]').padEnd(7)} ${x.submit?'S':'.'}${x.redo?'R':'.'} ${tags.join(',').padEnd(28)} ${x.head}`);
}
L.cdp.close();
