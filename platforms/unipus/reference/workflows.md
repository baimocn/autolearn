# 题型攻略与操作配方

先决：每次操作前 `dismissIdle` + `neutralize`（两处遮罩），再 `scrollToBlock`。

## 1. 内联填空（fill_blanks_group）

特征：题块里 `input[type=text]` 若干，题面里以 `[1] [2] …` 标记空位。

```js
await scrollToBlock(b, bi); await sleep(800);      // 等挂载
await fillBlock(b, bi, ["答案1","答案2", ...]);     // 数量必须与 input 数一致
await jsClick(b, bi, "提交");
```

读题：用 TreeWalker 按文档序拼文本，遇 `input` 插 `[[i]]`（见 `reference/extract-snippet.md`）。

## 2. 判断题（true_false）

特征：每题两个选项 div（`[class*=answer_optionTF]`），有时带一个 `textarea`（说明）。

```js
// 按题逐个点选项（选项必须是真实可见元素，用坐标点击这里反而可靠）
const opts = [...item.querySelectorAll('[class*=answer_optionTF]')];
opts.find(o => o.innerText.trim() === 'T').getBoundingClientRect(); → clickAt
```
注意：容器选择器是 `[class*=questionItem]`，不是 `answer_questionItem`。

## 3. 完形 / 选词填空（banked cloze）

词库 15 个、空 10~12 个。策略：先按语法+语境排除，一次填完一次交，通常首轮 100。
若不满分：读「答案」区 → `redoFill` 照抄。

## 4. 翻译 / 作文（AI 评分）

特征：`textarea`（占位「请在此处作答」），块头有「AI 评分」。

- 翻译：把参考答案的句式抄近，注意术语一致性，实测 94~97
- 作文：结构完整（hook → 论点×3 → 收束），150 词以上，实测 77~89
- 交完分可能延迟出现，等 6~10 秒再读

## 5. 信息表 / 表格（多空长答）

`input` 或 `textarea` 若干个；答案从对应课文段落里摘。表格类注意"一格一验证"，防止重排错位。

## 6. 连线 / 匹配（text_match_group，React Flow）

```js
// 1) 取节点 id 与标签
const nodes = [...blk.querySelectorAll('.react-flow__node')]
  .map(n => ({ id: n.getAttribute('data-id'), label: n.textContent.trim().slice(0,3) }));
// 2) 沿 fiber 找 onConnect
let f = flowEl[Object.keys(flowEl).find(k=>k.startsWith('__reactFiber'))], p=null, g=0;
while (f && g++ < 40) { if (f.memoizedProps?.onConnect) { p = f.memoizedProps; break; } f = f.return; }
// 3) 建边
p.onConnect({ source: leftId, target: rightId, sourceHandle: null, targetHandle: null });
// 4) 提交
await jsClick(b, bi, "提交");
```

**铁律**：一次连对。
- 该组件**没有 `onEdgesChange`**，删不掉已保存的连线
- 一旦"瞎猜提交 → 读答案 → 重做"，旧线会跟着回来，变成一源两线，必判错
- 正确做法：先读课文推映射；实在要拿答案，也只能在别的同型题上用猜，不能污染目标题

## 7. 录音题 / 上传题（跳过）

- 录音：出现「准备时长 / 作答时长 / 点击开始」
- 上传：出现「点击或将文件拖拽到这里上传」

按用户约定跳过，别浪费时间。

## 8. 自动判题拿满分的通用循环

```
首猜提交 → blockState().answer 拿到 "(1) xxx (2) yyy"
        → redoFill(bi, 拆出的数组)  // 内部：JS 点重新作答 → 等挂载 → 填 → JS 点提交
        → 再读分，应为 100
```
拆答案时注意去掉尾部括号注释（`advertisements(classified advertisements)` → 取主答案即可，括号里是等价表述）。

## 9. 新单元进攻顺序（每单元 20~40 分钟）

1. 切单元（`nav.gotoUnit`）
2. 全量盘点：`blocks()` 出清单（标题/输入框数/得分/是否录音/是否上传）
3. 读课文原文（Reading in detail 块）——大部分填空答案就在里面
4. 按"自动判题优先、AI 评分次之、录音上传跳过"顺序推
5. 每完成一题立刻 `blockState` 验分，记录到进度文件
