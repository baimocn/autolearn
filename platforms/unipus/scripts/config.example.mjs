// config.example.mjs — 复制为 config.mjs 并填入你自己的课程参数（config.mjs 已被 .gitignore 忽略）
//
// 这些值从浏览器地址栏 / DevTools 里就能拿到：
//   READER  打开教材阅读器时的整条 URL（含 cid / cloudCurriculaId / courseResourceId 等）
//   COURSE  地址栏 # 后面 /course-v3: 开头的那一段
//   BOOK    教材 iframe 地址里的 bookId，形如 /learner/textbook/book/<BOOK>/chapter/...
//   BV      bookVersionNumber
//   CH      单元号 -> chapterId 的映射（8 个单元就是 8 条 UUID）

export const READER = "https://ucontent.unipus.cn/_ipublishpc_default/pc.html?cid=<YOUR_CID>&theme=<THEME>&aitutorialId=<ID>&cloudCurriculaId=<ID>&strategyId=<ID>&schoolId=<ID>&source=cloud&sourceCallBackUrl=<URL>&courseResourceId=<ID>";
export const COURSE = "course-v3:<YOUR_COURSE_HASH>";
export const BOOK = "<YOUR_BOOK_ID>";
export const BV = "<YOUR_BOOK_VERSION>";
export const CH = {
  1: "<CHAPTER_UUID_1>",
  2: "<CHAPTER_UUID_2>",
  3: "<CHAPTER_UUID_3>",
  4: "<CHAPTER_UUID_4>",
  5: "<CHAPTER_UUID_5>",
  6: "<CHAPTER_UUID_6>",
  7: "<CHAPTER_UUID_7>",
  8: "<CHAPTER_UUID_8>",
};
