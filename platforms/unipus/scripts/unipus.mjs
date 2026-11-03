// unipus.mjs — 教材阅读器操作原语
// 设计：所有读取走 CDP executionContext（跨域 iframe 无阻碍）；所有点击走 CDP 可信鼠标事件
import { attachPage, sleep } from "./cdp.mjs";
import { findContentFrame, evalInFrame, collectContexts } from "./frame.mjs";
import { BOOK as CFG_BOOK } from "./config.mjs";

export class Book {
  constructor(cdp, page) {
    this.cdp = cdp;
    this.page = page;
  }

  static async open(urlHint = "ucontent") {
    const { cdp, page } = await attachPage(urlHint);
    const b = new Book(cdp, page);
    await b.locate();
    return b;
  }

  /** 定位教材 iframe（body 文本最长的 frame） */
  async locate() {
    const frames = await findContentFrame(this.cdp, this.page);
    const book = frames.find((f) => f.len > 500);
    if (!book) throw new Error("未找到教材 iframe");
    this.frameId = book.frameId;
    this.ctx = book.ctx;
    await this.refreshOffset();
    return this;
  }

  /** 等待 iframe 就绪（重试直到有可用的执行上下文且正文非空） */
  async waitReady({ minLen = 500, timeoutMs = 20000 } = {}) {
    const t0 = Date.now();
    let lastErr = null;
    while (Date.now() - t0 < timeoutMs) {
      try {
        const frames = await findContentFrame(this.cdp, this.page);
        const book = frames.find((f) => f.len >= minLen);
        if (book) {
          this.frameId = book.frameId;
          this.ctx = book.ctx;
          await this.refreshOffset();
          return true;
        }
      } catch (e) { lastErr = e; }
      await sleep(500);
    }
    throw new Error("iframe 未就绪: " + (lastErr ? lastErr.message : "timeout"));
  }

  /** 切换到指定章节（章节 id），并等待渲染完成 */
  async gotoChapter(chapterId, bookId = CFG_BOOK) {
    const url = `https://ipub.unipus.cn/learner/textbook/book/${bookId}/chapter/${chapterId}?bookVersionNumber=VTqvEEI`;
    await this.page.send("Page.navigate", { url, frameId: this.frameId });
    await sleep(800);
    await this.waitReady({ minLen: 2000, timeoutMs: 25000 });
    return this.curChapter();
  }

  curChapter() {
    return this.R("location.pathname.split('/chapter/')[1]");
  }

  async refreshOffset() {
    this.offset = await this.page.eval(`(() => {
      const f = document.querySelector('#ipublish-pc-book-easy-iframe');
      if (!f) return { x: 0, y: 0 };
      const r = f.getBoundingClientRect();
      return { x: r.left, y: r.top };
    })()`);
    return this.offset;
  }

  /** 在教材 iframe 内执行 JS（主世界，可访问 React 状态） */
  R(expr) {
    return evalInFrame(this.cdp, this.page, this.ctx, expr);
  }

  /** 找元素并滚动到视野中央，返回 iframe 内视口坐标 */
  rect(expr) {
    return this.R(`(() => {
      const el = (${expr});
      if (!el) return null;
      if (el.scrollIntoView) el.scrollIntoView({ block: 'center', inline: 'nearest' });
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return null;
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height,
               top: r.top, bottom: r.bottom };
    })()`);
  }

  /** 真实鼠标点击 iframe 内元素 */
  async clickEl(expr, { wait = 500 } = {}) {
    const r = await this.rect(expr);
    if (!r) throw new Error("元素不可见/不存在: " + expr.slice(0, 80));
    await this.refreshOffset();
    await this.page.clickAt(this.offset.x + r.x, this.offset.y + r.y);
    await sleep(wait);
    return r;
  }

  /** 按可见文本点击（取叶子节点） */
  async clickText(text, { exact = false, nth = 0, wait = 500 } = {}) {
    const t = JSON.stringify(text);
    const expr = `(() => {
      const norm = s => (s || '').replace(/\\s+/g, ' ').trim();
      const want = ${t}, exact = ${exact}, nth = ${nth};
      const all = [...document.querySelectorAll('button, a, li, div, span, p, h1, h2, h3, h4, [role=menuitem]')].filter(el => {
        const tx = norm(el.innerText || el.textContent);
        if (!tx) return false;
        if (exact ? tx !== want : !tx.includes(want)) return false;
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return false;
        const st = getComputedStyle(el);
        if (st.visibility === 'hidden' || st.display === 'none') return false;
        return true;
      });
      const leaves = all.filter(el => !all.some(o => o !== el && el.contains(o)));
      return (leaves[nth] || all[nth]) || null;
    })()`;
    return this.clickEl(expr, { wait });
  }

  /** 教材正文纯文本 */
  text() {
    return this.R("document.body.innerText");
  }

  /** 所有题块索引信息 */
  blocks() {
    return this.R(`(() => {
      const norm = s => (s || '').replace(/\\s+/g, ' ').trim();
      const hs = [...document.querySelectorAll('h1,h2,h3,h4')];
      const headOf = el => { let r = ''; for (let k = 0; k < hs.length; k++) { if (hs[k].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) r = norm(hs[k].innerText); } return r; };
      const bs = [...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
      const out = [];
      for (let i = 0; i < bs.length; i++) {
        const b = bs[i];
        out.push({
          i, h: headOf(b),
          inputs: b.querySelectorAll('input[type=text]').length,
          editables: b.querySelectorAll('[contenteditable=true]').length,
          submits: [...b.querySelectorAll('button')].filter(x => norm(x.innerText) === '提交').length,
          regrade: [...b.querySelectorAll('button')].filter(x => norm(x.innerText) === '重新作答').length,
          graded: (b.innerText.match(/得分[:：]\\s*(\\d+(\\.\\d+)?)/) || [])[1] ?? null,
          text: norm(b.innerText).slice(0, 1200),
        });
      }
      return out;
    })()`);
  }
}
