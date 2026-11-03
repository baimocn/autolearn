// hep-status.mjs — 扫描 ICC 课程完成情况（课件 / 自测题 / 讨论题）
// 三个资源类型在三个不同微服务下，参数各不相同，见 reference/api.md
import { attach, cachedToken, post } from "./hepapi.mjs";
import fs from "node:fs";

const COURSE = process.env.HEP_COURSE || "5000006133";
const ROLE = process.env.HEP_ROLE || "5000045794";
const CUR = process.env.HEP_CUR || "5000719585";

const ctx = await attach();
const tok = cachedToken();
if (!tok) { console.error("缺少 token，先跑 grabToken()"); process.exit(1); }

const menu = await post(ctx, "/jeecg-personal/iccapi/v1/student/course/course_menu",
  { courseId: COURSE, courseRoleId: ROLE, courseUserRoleId: CUR, roleGroupId: 4 }, tok);
const chapters = menu.json?.result?.chapterList || [];

const rows = [];
for (const ch of chapters) {
  if (!ch.children?.length) continue;
  for (const k of ch.children) {
    const mid = String(k.menuid);
    let r, page = [], total = 0, done = 0, key = "";
    if (/课件/.test(k.title)) {
      key = "courseware";
      r = await post(ctx, "/jeecg-resource/iccapi/v1/student/resource/resource_list",
        { type: "0", orderBy: "", sequence: "", current: "1", courseId: COURSE, menuId: mid, courseToUserRoleId: CUR, searchKeyword: "", pageSize: "100" }, tok);
      page = r.json?.result?.pageList || [];
      total = r.json?.result?.allCount ?? page.length;
      done = page.filter((x) => (x.progress ?? 0) >= 1).length;
    } else if (/自测题/.test(k.title)) {
      key = "selftest";
      r = await post(ctx, "/jeecg-self-exam/iccapi/v1/student/self_test/self_test_list",
        { courseUserRoleId: CUR, courseInfoId: COURSE, roleGroupId: 4, type: "0", curPage: "1", pageSize: "100", menuId: mid }, tok);
      page = r.json?.result?.pageList || r.json?.result?.records || [];
      total = r.json?.result?.totalCount ?? page.length;
      done = page.filter((x) => (x.finishFlag === "Y" || x.examStatus === "2" || (x.progress ?? 0) >= 1)).length;
    } else {
      key = "forum";
      r = await post(ctx, "/jeecg-answer/iccapi/v1/student/disscussion/discussion_boards",
        { courseId: COURSE, menuId: mid, curPage: "1", pageSize: "100", courseToUserRoleId: CUR }, tok);
      page = r.json?.result?.pageList || r.json?.result?.records || [];
      total = r.json?.result?.totalCount ?? page.length;
      done = page.filter((x) => x.replyFlag === "Y" || x.isReply === "Y").length;
    }
    rows.push({ chapter: ch.title, kind: k.title, key, menuId: mid, total, done, items: page });
  }
}

fs.writeFileSync("hep-status.json", JSON.stringify(rows, null, 1));
let T = 0, D = 0;
for (const r of rows) {
  T += r.total; D += r.done;
  if (r.total) console.log(`${r.chapter.padEnd(22)} ${r.kind.padEnd(6)} ${r.done}/${r.total}${r.done < r.total ? "  ← 待做" : ""}`);
}
console.log(`\n合计 ${D}/${T}`);
ctx.cdp.close();
