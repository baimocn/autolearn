/**
 * 示例：一个单元的完整作答循环骨架
 * 用法：node example.mjs <chapterId> [起始题块序号]
 * 前提：Chrome 已用调试端口启动并已登录，阅读器已打开该单元
 */
import { Book } from "./unipus.mjs";
import {
  dismissIdle, neutralize, scrollToBlock,
  fillBlock, fillArea, jsClick, blockState, redoFill,
} from "./fill.mjs";
import { sleep } from "./cdp.mjs";

const chapterId = process.argv[2];
const b = await Book.open("ucontent");

// 0) 环境准备
await dismissIdle(b);
await neutralize(b);
if (chapterId && (await b.curChapter()) !== chapterId) {
  const { gotoUnit } = await import("./nav.mjs");
  console.log("switch:", JSON.stringify(await gotoUnit(b, chapterId)));
  await b.waitReady({ minLen: 2000 });
}

// 1) 盘点
const blocks = await b.blocks();
console.table(blocks.map(x => ({ i: x.i, h: x.h, in: x.inputs, ta: x.editables, submit: x.submits, redo: x.regrade, score: x.graded })));

// 2) 单题作答示例（填空）
async function answerFill(bi, values) {
  await scrollToBlock(b, bi); await sleep(800);
  const n = await b.R(`(()=>{const blk=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${bi}];return blk?blk.querySelectorAll('input[type=text]').length:-1;})()`);
  if (n !== values.length) return { err: "mount mismatch", got: n, want: values.length };
  const f = await fillBlock(b, bi, values);
  if (f.err) return f;
  await jsClick(b, bi, "提交");
  await sleep(4000);
  return blockState(b, bi);
}

// 3) 自动判题拿满分（首猜 → 读答案 → 重做）
async function answerUntilFull(bi, guess) {
  const st = await answerFill(bi, guess);
  if (st.score && Number(st.score) >= 100) return st;
  if (!st.answer) return st;
  const parts = st.answer.replace(/^\(/, "").split(/\(\d+\)\s*/).map(s => s.trim()).filter(Boolean)
    .map(p => p.replace(/\([^)]*\)\s*$/, "").trim());
  if (parts.length !== guess.length) return { err: "answer parse mismatch", parts };
  await redoFill(b, bi, parts);
  await sleep(4000);
  return blockState(b, bi);
}

// 4) 开放式题（翻译 / 作文 / 简答）
async function answerOpen(bi, text) {
  await scrollToBlock(b, bi); await sleep(800);
  const f = await fillArea(b, bi, [text]);
  if (f.err) return f;
  await jsClick(b, bi, "提交");
  await sleep(7000);
  return blockState(b, bi);
}

export { answerFill, answerUntilFull, answerOpen };

if (process.argv[3] !== undefined) {
  console.log(await answerFill(Number(process.argv[3]), ["x"]));
}
