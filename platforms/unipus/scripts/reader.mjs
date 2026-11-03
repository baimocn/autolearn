// reader.mjs — 复用一个 ucontent 阅读器标签，并把教材 iframe 切到指定章节
import { connect, sleep } from "./utlib.mjs";
import { CDP } from "./cdp.mjs";

let cfg;
try { cfg = await import("./config.mjs"); }
catch { throw new Error("缺少 scripts/config.mjs —— 请复制 config.example.mjs 为 config.mjs 并填入你的课程参数"); }

export const BOOK = cfg.BOOK;
export const BV = cfg.BV;
export const CH = cfg.CH;
export const READER = cfg.READER;
export const COURSE = cfg.COURSE;

export const log = (...a) => console.log(...a);

async function targets() {
  return (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter((t) => t.type === "page");
}

/** 找到（或新建）阅读器标签，返回 targetId */
export async function ensureReader(unit = 1) {
  const list = await targets();
  let t = list.find((x) => /ucontent\.unipus\.cn/.test(x.url));
  if (t) return t.id;
  const ver = await (await fetch("http://127.0.0.1:9222/json/version")).json();
  const boot = await CDP.connect(ver.webSocketDebuggerUrl);
  const r = await boot.send("Target.createTarget", { url: `${READER}#/${COURSE}/courseware/u${unit}/u${unit}g2` });
  boot.close();
  return r.targetId;
}

/** 把教材 iframe 换到指定单元章节，返回 textbook 帧 */
export async function openUnit(L, unit, tries = 40) {
  const { ev, frames } = L;
  const ch = CH[unit];
  const url = `https://ipub.unipus.cn/learner/textbook/book/${BOOK}/chapter/${ch}?bookVersionNumber=${BV}`;
  await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return 0;f.src='about:blank';return 1;})()`).catch(() => {});
  await sleep(600);
  const ok = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub|about/.test(e.src||''));if(!f)return 0;f.src=${JSON.stringify(url)};return 1;})()`).catch(() => 0);
  if (!ok) {
    // 兜底：整页重载到目标任务
    await ev(`location.href=${JSON.stringify(`${READER}#/${COURSE}/courseware/u${unit}/u${unit}g2`)}`).catch(() => {});
  }
  let tb = null;
  for (let i = 0; i < tries; i++) {
    await sleep(900);
    tb = (await frames()).find((f) => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(ch.slice(0, 12)));
    if (tb) break;
  }
  if (!tb) return null;
  for (let i = 0; i < 20; i++) {
    await sleep(700);
    const n = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(() => 0);
    if (n > 0) break;
  }
  // 关「本单元学习规则」弹窗
  for (const f of await frames()) {
    const r = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, f.ctx).catch(() => 0);
    if (r) log("  关规则弹窗");
  }
  await closeDrawer(L);
  // 等到真的有题块渲染出文字（骨架屏阶段 innerText 为空）
  for (let i = 0; i < 30; i++) {
    const ready = await ev(`(()=>{const a=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];return a.some(b=>(b.innerText||'').trim().length>20)?1:0;})()`, tb.ctx).catch(() => 0);
    if (ready) break;
    await sleep(800);
  }
  return tb;
}

/** 关掉左侧「目录」抽屉（它会盖住左半屏，吞掉点击） */
export async function closeDrawer(L) {
  const { ev, frames } = L;
  for (const f of await frames()) {
    const r = await ev(`(()=>{const c=[...document.querySelectorAll('[class*=catalog_drawer-close],[class*=drawer_close],[class*=drawer-close]')].filter(e=>e.getBoundingClientRect().width>0);
      if(c.length){c[0].click();return 1;} return 0;})()`, f.ctx).catch(() => 0);
    if (r) { log("  关目录抽屉"); await sleep(500); return true; }
  }
  return false;
}

/** 让第 i 个题块挂载（滚到视口内并等文本稳定） */
export async function mountBlock(L, tb, i, wait = 900) {
  const { ev } = L;
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx);
  await sleep(wait);
  return ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];return b?(b.innerText||'').replace(/\\s+/g,' ').trim():'';})()`, tb.ctx).catch(() => "");
}
