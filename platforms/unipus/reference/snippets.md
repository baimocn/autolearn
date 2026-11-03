# 常用代码片段

> 全部在 iframe 主世界执行（`b.R(...)`），可直接复制。

## 1. 带空位标记的题干提取

```js
const blocks = await b.R(`(() => {
  const norm = s => (s || '').replace(/\\s+/g, ' ').trim();
  const bs = [...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
  return bs.map((blk, i) => {
    const inputs = [...blk.querySelectorAll('input[type=text]')];
    let s = '';
    const w = document.createTreeWalker(blk, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) s += n.nodeValue;
      else if (n.tagName === 'INPUT' && n.type === 'text') s += ' [[' + inputs.indexOf(n) + ']] ';
      else if (n.tagName === 'BR') s += ' ';
    }
    return { i, inputs: inputs.length, ta: blk.querySelectorAll('textarea').length, text: norm(s) };
  });
})()`);
```

## 2. 题块标题归属（最近的前置 heading）

```js
const hs = [...document.querySelectorAll('h1,h2,h3,h4')];
const headOf = el => {
  let r = '';
  for (const h of hs) if (h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) r = h.innerText.trim();
  return r;
};
```
⚠️ 不要写成 `while (p) { p = p.previousElementSibling ... }`，找不到 heading 时会死循环，把渲染进程卡死（只能用 `taskkill /T /F` 杀 Chrome）。

## 3. 写入（React 兼容）

```js
const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
setter.call(el, value);
el.dispatchEvent(new Event('input', { bubbles: true }));
el.dispatchEvent(new Event('change', { bubbles: true }));
```
`textarea` 用 `HTMLTextAreaElement.prototype`。

## 4. 滚动到题块（真正的滚动容器）

```js
const sc = document.querySelector('.pc_center-left__MPwlq') || document.scrollingElement;
const r = blk.getBoundingClientRect(), box = sc.getBoundingClientRect();
sc.scrollTop += (r.top - box.top) - 30;
```

## 5. 会话恢复

```js
// 登录页：勾协议复选框 → 点登录 → 可能弹协议窗点「同意」
const cb = [...document.querySelectorAll('input[type=checkbox]')].find(b => !b.checked);
await page.clickAt(...rectOf(cb));
await page.clickAt(...rectOf(document.querySelector('button.btn-login')));
```

## 6. 截图（真 Chrome 可用，内置浏览器会 10MiB 报错）

```js
const r = await page.send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("shot.png", Buffer.from(r.data, "base64"));
```
截图是 1080 宽而视口 1280 → 图像学坐标 ≈ CSS 坐标 × 0.84，**别拿截图量坐标去点**。

## 7. 目录抽屉里的单元切换（五步）

```js
await hideModals(b);                       // 父页遮罩
await openDrawer(b);                       // 点凸起把手
// 展开目标单元（若折叠）：点该行 a[role=checkbox]
// 滚到该单元第一个小节：document.querySelectorAll('[data-marker-id^="<chapterId>#"]')
// JS 点小节标题 a[role=button] → 父页弹「当前单元还未完成」
await confirmGo(b);                        // JS 点「去学习」（真实点击无效）
// 轮询 location.pathname 里 chapterId 是否变了
```
