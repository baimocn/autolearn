// run.mjs <unit> <i,i,...> — 批量：猜→交→读答案→重做→抄答案→交
import { connect, sleep } from "./utlib.mjs";

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
const idxs = (process.argv[3] || "").split(",").map(Number).filter((x) => !isNaN(x));

const L = await connect(TID);
const { ev, frames } = L;
const log = (...a) => console.log(...a);

let tb = null;
for (let k = 0; k < 30; k++) {
  tb = (await frames()).find((f) => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[u].slice(0, 12)));
  if (tb) break;
  await sleep(500);
}
if (!tb) { log("no frame"); process.exit(1); }
const ctx = tb.ctx;

const B = (i, body) => `(() => {
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  if(!b) return {err:'no block'};
  const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
  ${body}
})()`;

const go = async (i) => {
  await ev(`(() => { const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    if(b){const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
    const r=b.getBoundingClientRect(),box=sc.getBoundingClientRect(); sc.scrollTop += (r.top-box.top)-20;} return 1; })()`, ctx);
  await sleep(800);
};
const info = (i) => ev(B(i, `
  const t=(b.innerText||'').replace(/\\s+/g,' ');
  return { items:b.querySelectorAll('[class*=answer-question-box_questionItem]').length,
    inputs:b.querySelectorAll('input[type=text]').length, areas:b.querySelectorAll('textarea').length,
    tf:b.querySelectorAll('[class*=answer_optionTF]').length,
    score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null,
    redo:/重新作答/.test(t), sub:/提交/.test(t) };`), ctx);
const btn = (i, label) => ev(B(i, `
  const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&norm(e.innerText)===${JSON.stringify(label)});
  if(!el) return {err:'no btn'}; el.click(); return {ok:1};`), ctx);

for (const i of idxs) {
  await go(i);
  let inf = await info(i);
  if (!inf || inf.err) { log(`#${i} 无题块`); continue; }
  if (inf.score && Number(inf.score) >= 99.9) { log(`#${i} 已满分`); continue; }

  let mode = null;
  if (inf.tf >= 2) mode = "tf";
  else if (inf.areas > 0 && inf.inputs === 0) mode = "area";
  else if (inf.inputs > 0) mode = "fill";
  else if (inf.items > 0) mode = "choice";
  if (!mode) { log(`#${i} 跳过(无控件)`); continue; }

  if (mode === "area") {
    // 直接抄答案（若已有答案区），否则先提交一句占位
    const hasAns = await ev(B(i, `return /答案/.test(b.innerText||'');`), ctx);
    if (!hasAns) {
      await ev(B(i, `
        const els=[...b.querySelectorAll('textarea')];
        const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
        els.forEach(e=>{e.focus();set.call(e,'.');e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
        return {ok:1};`), ctx);
      await sleep(500); await btn(i, "提交"); await sleep(4500);
    }
    const ans = await ev(B(i, `
      const t=(b.innerText||''); const k=t.lastIndexOf('\\n答案');
      if(k<0) return '';
      return t.slice(k+3).replace(/^[\\s:：]*/,'').trim();`), ctx);
    if (!ans || String(ans).length < 8) { log(`#${i} area 无参考答案`); continue; }
    await btn(i, "重新作答"); await sleep(2500); await go(i);
    const f = await ev(B(i, `
      const els=[...b.querySelectorAll('textarea')];
      const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
      const v=${JSON.stringify(String(ans))};
      els.forEach(e=>{e.focus();set.call(e,v);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
      return {ok:1,n:els.length,len:els[0].value.length};`), ctx);
    await sleep(600); await btn(i, "提交"); await sleep(4500);
    let st = await info(i);
    log(`#${i} area 抄答案 ${JSON.stringify(f)} score=${st.score}`);
    continue;
  }

  // 第一次猜
  if (mode === "fill") {
    await ev(B(i, `
      const t=(b.innerText||''); const lines=t.split('\\n').map(s=>s.trim()).filter(Boolean);
      const els=[...b.querySelectorAll('input[type=text]')];
      const start=lines.findIndex(s=>/^(提交|预览)$/.test(s));
      const cand=[];
      for(let k=Math.max(0,start+1);k<lines.length;k++){
        const s=lines[k];
        if(/^\\d+[\\.、]/.test(s)) break;
        if(s.length>28||/[。，；：]/.test(s)) continue;
        cand.push(s);
      }
      const uniq=[...new Set(cand)];
      const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
      els.forEach((e,k)=>{const v=uniq[k%Math.max(1,uniq.length)]||'x';e.focus();set.call(e,v);
        e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
      return {ok:1,n:els.length,bank:uniq.slice(0,12)};`), ctx);
  } else if (mode === "choice") {
    await ev(B(i, `
      const items=[...b.querySelectorAll('[class*=answer-question-box_questionItem]')];
      items.forEach(it=>{const rows=[...it.querySelectorAll('[class*=chioceView_strongListView]')]; if(rows[0]) rows[0].click();});
      return {ok:1,n:items.length};`), ctx);
  } else if (mode === "tf") {
    await ev(B(i, `
      const items=[...b.querySelectorAll('[class*=answer-question-box_questionItem]')];
      items.forEach(it=>{
        const opts=[...it.querySelectorAll('[class*=answer_optionTF]')];
        const t=opts.find(e=>norm(e.innerText)==='T')||opts[0];
        if(!t) return;
        const rect=t.getBoundingClientRect();
        const o={bubbles:true,cancelable:true,view:window,clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2};
        t.dispatchEvent(new PointerEvent('pointerdown',o)); t.dispatchEvent(new MouseEvent('mousedown',o));
        t.dispatchEvent(new PointerEvent('pointerup',o)); t.dispatchEvent(new MouseEvent('mouseup',o));
        t.dispatchEvent(new MouseEvent('click',o));
      });
      return {ok:1,n:items.length};`), ctx);
  }
  await sleep(700);
  await btn(i, "提交");
  await sleep(4800);
  let st = await info(i);
  if (st.score && Number(st.score) >= 99.9) { log(`#${i} 猜中 ${st.score}`); continue; }

  // 读答案并重做
  if (mode === "fill") {
    const ans = await ev(B(i, `
      const t=(b.innerText||''); const k=t.lastIndexOf('\\n答案');
      if(k<0) return [];
      const lines=t.slice(k+3).split('\\n').map(s=>s.trim()).filter(Boolean);
      return lines.filter(s=>!/^\\(\\d+\\)$/.test(s)&&!/^答案[:：]?$/.test(s)&&!/你的答案|正确答案|你的得分/.test(s));`), ctx);
    const arr = Array.isArray(ans) ? ans : [];
    if (arr.length < st.inputs) { log(`#${i} 答案不足 ${arr.length}/${st.inputs} score=${st.score}`); continue; }
    await btn(i, "重新作答"); await sleep(2500); await go(i);
    await ev(B(i, `
      const els=[...b.querySelectorAll('input[type=text]')];
      const vals=${JSON.stringify(arr)};
      const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
      els.forEach((e,k)=>{const v=vals[k];e.focus();set.call(e,v);
        e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
      return {ok:1};`), ctx);
    await sleep(700); await btn(i, "提交"); await sleep(4800);
    st = await info(i);
    log(`#${i} fill 抄答案 score=${st.score}`);
  } else if (mode === "choice") {
    const keys = await ev(B(i, `
      const t=(b.innerText||''); const out=[]; const re=/正确答案[:：]?\\s*\\n?\\s*([^\\n]+)/g; let m;
      while((m=re.exec(t))) out.push(m[1].trim());
      return out;`), ctx);
    if (!Array.isArray(keys) || !keys.length) { log(`#${i} 取答案失败`); continue; }
    await btn(i, "重新作答"); await sleep(2500); await go(i);
    await ev(B(i, `
      const items=[...b.querySelectorAll('[class*=answer-question-box_questionItem]')];
      const ls=${JSON.stringify(keys)};
      for(let k=0;k<ls.length&&k<items.length;k++){
        const rows=[...items[k].querySelectorAll('[class*=chioceView_strongListView]')];
        const row=rows[ls[k].charCodeAt(0)-65]; if(row) row.click();
      }
      return {ok:1};`), ctx);
    await sleep(700); await btn(i, "提交"); await sleep(4800);
    st = await info(i);
    log(`#${i} choice 抄答案 ${keys.join("")} score=${st.score}`);
  } else if (mode === "tf") {
    const keys = await ev(B(i, `
      const items=[...b.querySelectorAll('[class*=answer-question-box_questionItem]')];
      return items.map(it=>{
        const lines=(it.innerText||'').split('\\n').map(s=>s.trim()).filter(Boolean);
        const k=lines.lastIndexOf('答案');
        if(k<0) return null;
        for(let j=k+1;j<lines.length;j++){ if(/^[TF]$/.test(lines[j])) return lines[j]; if(lines[j].length>3) break; }
        return null;
      });`), ctx);
    if (!Array.isArray(keys) || keys.some((x) => !x)) { log(`#${i} TF 答案不全 ${JSON.stringify(keys)}`); continue; }
    await btn(i, "重新作答"); await sleep(2500); await go(i);
    await ev(B(i, `
      const items=[...b.querySelectorAll('[class*=answer-question-box_questionItem]')];
      const ls=${JSON.stringify(keys)};
      for(let k=0;k<ls.length&&k<items.length;k++){
        const opts=[...items[k].querySelectorAll('[class*=answer_optionTF]')];
        const hit=opts.find(e=>norm(e.innerText)===ls[k]); if(!hit) continue;
        const rect=hit.getBoundingClientRect();
        const o={bubbles:true,cancelable:true,view:window,clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2};
        hit.dispatchEvent(new PointerEvent('pointerdown',o)); hit.dispatchEvent(new MouseEvent('mousedown',o));
        hit.dispatchEvent(new PointerEvent('pointerup',o)); hit.dispatchEvent(new MouseEvent('mouseup',o));
        hit.dispatchEvent(new MouseEvent('click',o));
      }
      return {ok:1};`), ctx);
    await sleep(900); await btn(i, "提交"); await sleep(4800);
    st = await info(i);
    log(`#${i} tf 抄答案 ${keys.join("")} score=${st.score}`);
  }
}
L.cdp.close();
