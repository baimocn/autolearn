// fillblock.mjs <unit> <block> — 两阶段：交占位揭答案 → 重做抄答案 → 提交
// 解析只在“答案”区内做 (k)\n值 配对，避免把正文空位标记当答案
import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";

const U = Number(process.argv[2] || 1);
const IDX = Number(process.argv[3] || 0);
const tid = await ensureReader(U);
const L = await connect(tid);
let tb = null;
for (let k = 0; k < 20 && !tb; k++) {
  tb = (await L.frames()).find((f) => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[U].slice(0, 12)));
  if (!tb) await sleep(800);
}
if (!tb) { console.log("NO TB"); process.exit(1); }
const ev = async (e) => {
  const r = await L.cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true, userGesture: true, contextId: tb.ctx }, L.sessionId);
  if (r.exceptionDetails) return { __err: ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text || "").slice(0, 160) };
  return r.result && r.result.value;
};
const scroll = () => ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
const getBtn = (label) => ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];
  const el=[...b.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\\s+/g,''))===${JSON.stringify(label)});
  if(el){el.click();return 1;}return 0;})()`);
const state = () => ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];
  if(!b) return {__err:'no'};
  const t=(b.innerText||'').replace(/\\s+/g,' ');
  return {len:(b.innerText||'').length,
    inp:b.querySelectorAll('input[type=text]').length, area:b.querySelectorAll('textarea').length,
    dig:b.querySelectorAll('[class*=digEmptyView_blankView]').length,
    dd:b.querySelectorAll('[class*=digEmptySelectView_selectTrigger]').length,
    tf:b.querySelectorAll('[class*=answer_optionTF]').length, items:b.querySelectorAll('[class*=questionItem]').length,
    video:b.querySelectorAll('video').length, audio:b.querySelectorAll('audio').length, file:b.querySelectorAll('input[type=file]').length,
    score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null, redo:/重新作答/.test(t), sub:/提交/.test(t)};})()`);
const getInpVals = () => ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];return [...b.querySelectorAll('input[type=text]')].map(e=>e.value);})()`);
const fillInputs = (vals) => ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];
  const els=[...b.querySelectorAll('input[type=text]')];const vals=${JSON.stringify(vals)};
  const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  els.forEach((e,k)=>{e.focus();set.call(e,vals[k]??('answer '+(k+1)));
    e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
  return els.map(e=>e.value);})()`);
const fillAreas = (v) => ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];
  const els=[...b.querySelectorAll('textarea')];
  const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
  els.forEach((e,k)=>{e.focus();set.call(e,${JSON.stringify(v)});
    e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
  return els.length;})()`);
const getText = () => ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${IDX}];return (b.innerText||'');})()`);
const confirmOk = () => ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
  const el=[...document.querySelectorAll('button,[class*=i-button]')].filter(e=>/^(确认|确定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>0);
  if(el.length){el[el.length-1].click();return 1;}return 0;})()`);

await scroll(); await sleep(900);
let st = await state();
if (st.__err) { console.log("NO BLOCK"); L.cdp.close(); process.exit(1); }
console.log("STATE0:", JSON.stringify(st));
if (st.score !== null && Number(st.score) >= 99.9) { console.log("ALREADY FULL"); L.cdp.close(); process.exit(0); }

// —— 阶段1：保证已提交一次（揭示答案区）——
if (st.sub) {
  const nInp = st.inp, nArea = st.area;
  if (nInp > 0) await fillInputs(Array.from({ length: nInp }, (_, k) => "x" + (k + 1)));
  if (nArea > 0) await fillAreas("This is my answer. I have thought about the question and written my response here with the key points.");
  await sleep(400);
  await getBtn("提交");
  await sleep(5000);
  await confirmOk(); await sleep(1200);
  st = await state();
  console.log("AFTER1:", JSON.stringify(st));
}

// —— 阶段2：读答案区并解析 ——
const text = await getText();
const sec = text.lastIndexOf("\n答案");
const answers = [];
if (sec >= 0) {
  const tail = text.slice(sec + 3);
  const lines = tail.split("\n").map(s => s.trim());
  // 形态A：(k) 单独一行，值在随后一行
  for (let i = 0; i < lines.length; i++) {
    const mm = /^\((\d+)\)$/.exec(lines[i]);
    if (mm) {
      let v = "";
      for (let j = i + 1; j < lines.length; j++) {
        if (/^\(\d+\)$/.test(lines[j]) || /^答案[:：]?$/.test(lines[j])) break;
        v = lines[j]; break;
      }
      if (v) answers[Number(mm[1]) - 1] = v;
    }
  }
  // 形态B：连续值行
  if (answers.filter(Boolean).length < 2) {
    answers.length = 0;
    const flat = lines.filter(Boolean)
      .filter(s => !/^\(\d+\)$/.test(s) && !/^答案[:：]?$/.test(s) && !/你的答案|你的得分/.test(s));
    flat.forEach(l => answers.push(l));
  }
}
console.log("ANS(", answers.filter(Boolean).length, "):", JSON.stringify(answers.slice(0, 14)));

// —— 阶段3：重做→填正确答案→提交——
if (answers.filter(Boolean).length) {
  if (st.redo) { await getBtn("重新作答"); await sleep(2500); await scroll(); await sleep(1200); }
  const st2 = await state();
  const nInp = st2.inp || st.inp, nArea = st2.area || st.area;
  if (nInp > 0) {
    const f = await fillInputs(answers.length >= nInp ? answers : Array.from({ length: nInp }, (_, k) => answers[k] ?? "answer " + (k + 1)));
    console.log("FILLED:", JSON.stringify(f));
  }
  if (nArea > 0) await fillAreas(answers.join("\n"));
  await sleep(400);
  await getBtn("提交");
  await sleep(5000);
  await confirmOk(); await sleep(1200);
  const st3 = await state();
  console.log("RESULT:", JSON.stringify(st3));
} else {
  console.log("NO REF ANSWERS — 保持已提交态 score=" + st.score);
}
L.cdp.close();
