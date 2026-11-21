const fs = require("fs");
let s = fs.readFileSync("unitfull.mjs", "utf8");
// 全部等待参数按"慢网"放大
s = s.replace("const SCROLL_SEC = Number(process.env.SCROLL_SEC || 8);",
  "const SCROLL_SEC = Number(process.env.SCROLL_SEC || 10);");
s = s.replace("await sleep(11000);", "await sleep(18000);");
s = s.replace("const refindTb = async (tries = 55) => {", "const refindTb = async (tries = 110) => {");
s = s.replace("  await scrollBlk(i); await sleep(700);", "  await scrollBlk(i); await sleep(1200);");
s = s.replace("    await sleep(4200);", "    await sleep(7000);");
s = s.replace("    await sleep(SCROLL_SEC * 1000);", "    await sleep(SCROLL_SEC * 1000);");
// 章节加载：等 blocks>0 更久（refindTb 里已 110s）
// 提交后等待加长
s = s.replace("    await sleep(5000);\n    await confirmOk(); await sleep(1000); await dismissRules();\n    st = await state(i);",
  "    await sleep(7000);\n    await confirmOk(); await sleep(1500); await dismissRules();\n    st = await state(i);");
s = s.replace("      await btn(i, \"提交\");\n      await sleep(5000);\n      await confirmOk(); await sleep(1000); await dismissRules();",
  "      await btn(i, \"提交\");\n      await sleep(7000);\n      await confirmOk(); await sleep(1500); await dismissRules();");
fs.writeFileSync("unitfull.mjs", s);
console.log("waits enlarged");
