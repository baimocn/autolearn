const fs = require("fs");
let s = fs.readFileSync("cha_run.mjs", "utf8");
const oldBlock = `  // 确定弹窗（嵌套帧 DOM 找不到 → 用换算坐标：截图 1.355x，确定≈(712,525)）
  await mouse(712, 525);
  log("confirm @712,525");`;
if (!s.includes(oldBlock)) { console.log("OLD CONFIRM BLOCK NOT FOUND"); process.exit(1); }
const newBlock = [
  "  // 确定弹窗：优先 JS 点 .ant-btn-primary（u6 验证），兜底坐标",
  "  let conf = 0;",
  "  for (let k = 0; k < 6 && !conf; k++) {",
  "    conf = await ev(`(()=>{const b=document.querySelector('.ant-modal-confirm-btns .ant-btn-primary');if(!b)return 0;b.click();return 1;})()`, ex.ctx).catch(()=>0);",
  "    if (!conf) { await sleep(1200); }",
  "  }",
  "  if (!conf) { await mouse(712, 525); log(\"confirm fallback @712,525\"); }",
  "  else log(\"confirm via ant-btn-primary\");"
].join("\n");
s = s.replace(oldBlock, newBlock);
fs.writeFileSync("cha_run.mjs", s);
console.log("patched confirm via cjs");
