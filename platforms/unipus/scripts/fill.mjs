// fill.mjs — 填空 + 提交原语（React 兼容写入 + CDP 可信点击）
import { Book } from "./unipus.mjs";
import { sleep } from "./cdp.mjs";

export async function dismissIdle(b) {
  return b.R(`(() => {
    const norm = s => (s || '').replace(/\\s+/g, ' ').trim();
    if (!document.body || !document.body.innerText.includes('长时间未操作')) return 'none';
    const el = [...document.querySelectorAll('button,span,div')]
      .filter(e => norm(e.innerText) === '确定' && e.children.length <= 1).pop();
    if (!el) return 'no btn';
    el.click();
    return 'dismissed';
  })()`);
}

export async function neutralize(b) {
  return b.R(`(() => {
    let s = document.getElementById('__agent_mask__');
    if (!s) { s = document.createElement('style'); s.id = '__agent_mask__'; document.head.appendChild(s); }
    s.textContent = '[class*=scrollToHashMask],[class*=LoadingMask]{display:none!important;pointer-events:none!important}';
    return 1;
  })()`);
}

export async function fillBlock(b, bi, values) {
  await b.R(`(() => { const blk=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${bi}]; if(blk) blk.scrollIntoView({block:'start'}); return 1; })()`);
  await sleep(350);
  const res = await b.R(`(() => {
    const bs = [...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const blk = bs[${bi}];
    if (!blk) return { err: 'no block' };
    const inputs = [...blk.querySelectorAll('input[type=text]')];
    const vals = ${JSON.stringify(values)};
    if (inputs.length !== vals.length) return { err: 'count mismatch', got: inputs.length, want: vals.length };
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    const done = [];
    for (let i = 0; i < inputs.length; i++) {
      const el = inputs[i];
      el.focus();
      setter.call(el, vals[i]);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.blur();
      done.push(el.value);
    }
    return { ok: true, values: done };
  })()`);
  return res;
}

export async function submitBlock(b, bi, label = "提交") {
  await dismissIdle(b);
  await neutralize(b);
  await scrollToBlock(b, bi);
  await sleep(300);
  const EXPR = (action) => `(() => {
    const norm = s => (s || '').replace(/\\s+/g, ' ').trim();
    const blk = [...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${bi}];
    if (!blk) return { err: 'no block' };
    const cands = [...blk.querySelectorAll('div,button,a,span')].filter(e => norm(e.innerText) === ${JSON.stringify(label)});
    // 取最内层可点击容器（class 含 i-button 优先）
    const btn = cands.find(e => /i-button_default-container/.test(String(e.className))) || cands[cands.length - 1];
    if (!btn) return { err: 'no ${label} element' };
    ${action === "scroll" ? "blk.scrollIntoView({ block: 'start' }); return { ok: true };" : `const r = btn.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) return { err: 'offscreen', top: Math.round(r.top), bottom: Math.round(r.bottom) };
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };`}
  })()`;
  const s = await b.R(EXPR("scroll"));
  if (s.err) return s;
  await sleep(300);
  const rect = await b.R(EXPR("rect"));
  if (!rect || rect.err) return rect || { err: "none" };
  await b.refreshOffset();
  await b.page.clickAt(b.offset.x + rect.x, b.offset.y + rect.y);
  return { clicked: true, x: Math.round(rect.x), y: Math.round(rect.y) };
}

export async function blockState(b, bi) {
  return b.R(`(() => {
    const bs = [...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const blk = bs[${bi}];
    if (!blk) return null;
    const t = blk.innerText.replace(/\\s+/g, ' ');
    return { score: (t.match(/得分[:：]\\s*(\\d+(\\.\\d+)?)/) || [])[1] ?? null,
             hasSub: [...blk.querySelectorAll('button')].some(x => (x.innerText || '').trim() === '提交'),
             hasRedo: [...blk.querySelectorAll('button')].some(x => (x.innerText || '').trim() === '重新作答'),
             answer: (t.match(/答案\\s*(.{0,300})/) || [])[1] || null,
             text: t.slice(0, 500) };
  })()`);
}

export async function fillArea(b, bi, texts) {
  return b.R(`(() => {
    const blk = [...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${bi}];
    if (!blk) return { err: 'no block' };
    const areas = [...blk.querySelectorAll('textarea')];
    const vals = ${JSON.stringify(texts)};
    if (areas.length < vals.length) return { err: 'fewer textareas', got: areas.length, want: vals.length };
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    const done = [];
    for (let i = 0; i < vals.length; i++) {
      const el = areas[i];
      el.focus();
      setter.call(el, vals[i]);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.blur();
      done.push(el.value.length);
    }
    return { ok: true, lens: done };
  })()`);
}

/** 重新作答 → 等输入框挂载 → 填写 → 提交 */
export async function redoFill(b, bi, values, { timeoutMs = 8000 } = {}) {
  const st = await blockState(b, bi);
  if (st && st.text && st.text.includes("重新作答")) {
    await submitBlock(b, bi, "重新作答");
  }
  await b.R(`(() => { const blk=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${bi}]; if(blk) blk.scrollIntoView({block:'start'}); return 1; })()`);
  const t0 = Date.now();
  let n = 0;
  while (Date.now() - t0 < timeoutMs) {
    n = await b.R(`(()=>{const blk=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${bi}];return blk?blk.querySelectorAll('input[type=text]').length:-1;})()`);
    if (n === values.length) break;
    await sleep(400);
  }
  if (n !== values.length) return { err: "inputs not ready", got: n, want: values.length };
  const f = await fillBlock(b, bi, values);
  if (f.err) return f;
  return submitBlock(b, bi);
}

/** 把某个题块滚到内容容器可视区（真正的滚动发生在 .pc_center-left） */
export async function scrollToBlock(b, bi) {
  return b.R(`(() => {
    const blk = [...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${bi}];
    if (!blk) return { err: 'no block' };
    const sc = document.querySelector('.pc_center-left__MPwlq') || document.scrollingElement;
    const r = blk.getBoundingClientRect();
    const box = sc.getBoundingClientRect();
    sc.scrollTop += (r.top - box.top) - 30;
    return { ok: true, scrollTop: Math.round(sc.scrollTop) };
  })()`);
}

/** JS 直接点击题块内的按钮（提交 / 重新作答），避开坐标与遮挡问题 */
export async function jsClick(b, bi, label) {
  return b.R(`(() => {
    const norm = s => (s || '').replace(/\\s+/g, ' ').trim();
    const blk = [...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${bi}];
    if (!blk) return { err: 'no block' };
    const el = [...blk.querySelectorAll('div')]
      .find(e => /i-button_default-container/.test(String(e.className)) && norm(e.innerText) === ${JSON.stringify(label)});
    if (!el) return { err: 'no ' + ${JSON.stringify(label)} };
    el.click();
    return { ok: true };
  })()`);
}

/** redo + fill + submit（全程 JS 点击） */
export async function redoFillFast(b, bi, values, { timeoutMs = 9000 } = {}) {
  await dismissIdle(b);
  await neutralize(b);
  await jsClick(b, bi, '重新作答');
  await scrollToBlock(b, bi);
  const t0 = Date.now();
  let n = 0;
  while (Date.now() - t0 < timeoutMs) {
    n = await b.R(`(()=>{const blk=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${bi}];return blk?blk.querySelectorAll('input[type=text]').length:-1;})()`);
    if (n === values.length) break;
    await sleep(400);
  }
  if (n !== values.length) return { err: 'inputs not ready', got: n, want: values.length };
  const f = await fillBlock(b, bi, values);
  if (f.err) return f;
  return jsClick(b, bi, '提交');
}
