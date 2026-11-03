// lib.mjs — 页面操作原语（基于 CDP 可信事件）
import { attachPage, attachTo, listChildTargets, sleep } from "./cdp.mjs";

export { sleep };

/** 在主页面内按可见文本找到元素，滚动到视口中央，返回中心坐标（视口坐标系） */
export async function rectOfText(page, text, { exact = false, nth = 0, tag = "*" } = {}) {
  const expr = `(() => {
    const norm = s => (s || "").replace(/\\s+/g, " ").trim();
    const want = ${JSON.stringify(text)};
    const exact = ${exact};
    const all = [...document.querySelectorAll(${JSON.stringify(tag)})].filter(el => {
      const t = norm(el.innerText || el.textContent);
      if (!t) return false;
      if (exact ? t !== want : !t.includes(want)) return false;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      const st = getComputedStyle(el);
      if (st.visibility === "hidden" || st.display === "none" || st.opacity === "0") return false;
      return true;
    });
    // 取最深的匹配（叶子优先），避免点到容器
    const leaves = all.filter(el => !all.some(o => o !== el && el.contains(o)));
    const pick = leaves[${nth}] || all[${nth}];
    if (!pick) return null;
    pick.scrollIntoView({ block: "center", inline: "center" });
    const r = pick.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height,
             txt: norm(pick.innerText || pick.textContent).slice(0, 80),
             cls: pick.className && pick.className.toString().slice(0, 60) };
  })()`;
  return page.eval(expr);
}

export async function clickText(page, text, opts = {}) {
  const r = await rectOfText(page, text, opts);
  if (!r) throw new Error(`未找到可点击文本: ${text}`);
  await page.clickAt(r.x, r.y);
  await sleep(opts.wait ?? 600);
  return r;
}

export async function clickSel(page, sel, { nth = 0, wait = 600 } = {}) {
  const r = await page.eval(`(() => {
    const el = document.querySelectorAll(${JSON.stringify(sel)})[${nth}];
    if (!el) return null;
    el.scrollIntoView({ block: "center", inline: "center" });
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2, w: r.width, h: r.height,
             txt: (el.innerText||'').slice(0,80) };
  })()`);
  if (!r) throw new Error(`未找到选择器: ${sel}`);
  await page.clickAt(r.x, r.y);
  await sleep(wait);
  return r;
}

/** 列出所有 target，返回页面 + iframe 会话映射 */
export async function mapTargets(cdp) {
  const ts = await listChildTargets(cdp);
  return ts.map((t) => ({ id: t.id, type: t.type, url: t.url }));
}

/** 等待某个 target 出现（如新标签页 / iframe），返回匹配的 targetInfo */
export async function waitForTarget(cdp, predicate, timeoutMs = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const ts = await listChildTargets(cdp);
    const hit = ts.find(predicate);
    if (hit) return hit;
    await sleep(400);
  }
  return null;
}

export function norm(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}
