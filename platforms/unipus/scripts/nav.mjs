// nav.mjs — 单元切换（左侧目录抽屉 + “去学习”确认）
import { sleep } from "./cdp.mjs";

export async function hideModals(b) {
  return b.page.eval(`(() => {
    let s = document.getElementById('__agent_modal_hide__');
    if (!s) { s = document.createElement('style'); s.id = '__agent_modal_hide__'; document.head.appendChild(s); }
    s.textContent = '.ant-modal-wrap,.ant-modal-mask{display:none!important}';
    return 1;
  })()`);
}

export async function showModals(b) {
  return b.page.eval(`(() => { const s=document.getElementById('__agent_modal_hide__'); if(s) s.remove(); return 1; })()`);
}

export async function openDrawer(b) {
  let w = await b.R(`(()=>{const el=document.querySelector('.i-tree-menu_tree-menu__Pg8zY'); return el?Math.round(el.getBoundingClientRect().width):0;})()`);
  if (w > 50) return w;
  const h = await b.R(`(()=>{const el=document.querySelector('.catalog_area-close-menu__Q1QfP')||document.querySelector('[class*=catalog_area-open]'); if(!el) return null; const r=el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  if (h) { await b.refreshOffset(); await b.page.clickAt(b.offset.x + h.x, b.offset.y + h.y); await sleep(900); }
  return await b.R(`(()=>{const el=document.querySelector('.i-tree-menu_tree-menu__Pg8zY'); return el?Math.round(el.getBoundingClientRect().width):0;})()`);
}

/** 点击目标单元下某小节，触发“去学习”弹窗 */
export async function clickSection(b, chapterId) {
  await b.R(`(()=>{
    const sc=document.querySelector('.i-tree-menu_tree-menu__Pg8zY');
    const rows=[...document.querySelectorAll('[data-marker-id^="${chapterId}#"]')];
    if(!sc||!rows.length) return 0;
    const el=rows[0];
    const off=el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop;
    sc.scrollTop=Math.max(0, off-200);
    return 1;
  })()`);
  await sleep(500);
  const pos = await b.R(`(()=>{
    const sc=document.querySelector('.i-tree-menu_tree-menu__Pg8zY');
    const el=[...document.querySelectorAll('[data-marker-id^="${chapterId}#"]')]
      .find(e=>{const r=e.getBoundingClientRect(); return r.height>10 && r.top>200 && r.bottom<640;});
    if(!el) return {err:'sub not visible'};
    const rr=el.getBoundingClientRect();
    return {x:rr.left+rr.width/2, y:rr.top+rr.height/2, t:(el.innerText||'').trim().slice(0,24)};
  })()`);
  if (pos.err) return pos;
  await b.refreshOffset();
  await b.page.clickAt(b.offset.x + pos.x, b.offset.y + pos.y);
  await sleep(1500);
  return pos;
}

/** 弹窗里点“去学习”（JS 点击，避开遮罩拦截） */
export async function confirmGo(b) {
  const r = await b.page.eval(`(() => {
    const norm = s => (s || '').replace(/\\s+/g, ' ').trim();
    const el = [...document.querySelectorAll('button,span,div')]
      .filter(e => norm(e.innerText) === '去学习' && e.children.length <= 1).pop();
    if (!el) return { err: 'no 去学习' };
    el.click();
    return { ok: true };
  })()`);
  return r;
}

export async function gotoUnit(b, chapterId, { timeoutMs = 20000 } = {}) {
  const from = await b.R("location.pathname.split('/chapter/')[1]");
  if (from === chapterId) return { ok: true, chapter: from, already: true };

  await hideModals(b);
  const w = await openDrawer(b);
  if (!w) return { ok: false, err: "drawer not open" };

  // 若目标单元未展开则展开（点箭头）
  const ulH = await b.R(`(()=>{const r=document.querySelector('[data-marker-id="${chapterId}"]'); if(!r) return -1; const ul=r.closest('li').querySelector('ul'); return ul?Math.round(ul.getBoundingClientRect().height):0;})()`);
  if (ulH === 0) {
    const ar = await b.R(`(()=>{const r=document.querySelector('[data-marker-id="${chapterId}"]'); const a=r.closest('li').querySelector('a[role=checkbox]'); const rr=a.getBoundingClientRect(); return {x:rr.left+rr.width/2,y:rr.top+rr.height/2};})()`);
    await b.refreshOffset();
    await b.page.clickAt(b.offset.x + ar.x, b.offset.y + ar.y);
    await sleep(1000);
  }

  let clicked = await clickSection(b, chapterId);
  await confirmGo(b);

  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const cur = await b.R("location.pathname.split('/chapter/')[1]");
    if (cur === chapterId) {
      await hideModals(b);
      return { ok: true, chapter: cur, clicked };
    }
    await sleep(800);
  }
  return { ok: false, chapter: await b.R("location.pathname.split('/chapter/')[1]"), clicked };
}
