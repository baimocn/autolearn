// auditprog.mjs — 直接调用权威进度接口，逐单元统计未完成节点
import { connect } from "./utlib.mjs";
import { ensureReader, COURSE, log } from "./reader.mjs";
import fs from "node:fs";

const USER = "c81712bd863e44a6b73c4ca69cfa9de5";
let AUTH = "";
try { AUTH = JSON.parse(fs.readFileSync("auth-headers.json", "utf8")).authorization || ""; } catch {}
const tid = process.env.TID || (await ensureReader(1));
const L = await connect(tid);
const { ev } = L;

// 课程结构（节点名/类型）
let meta = {};
try {
  const raw = JSON.parse(fs.readFileSync("course-raw.json", "utf8"));
  let c = raw.course; if (typeof c === "string") c = JSON.parse(c);
  const walk = (ns) => (ns || []).forEach((x) => { meta[x.id] = { name: x.name || "", base: x.base || "", num: Number(x.question_num || 0) }; if (x.children) walk(x.children); });
  c.units.forEach((u) => walk(u.children));
} catch (e) { log("meta 读取失败:", e.message); }

const out = {};
for (let n = 1; n <= 8; n++) {
  const txt = await ev(`fetch('/course/api/v2/course_progress/${COURSE}/u${n}/${USER}/default',{credentials:'include',headers:${JSON.stringify(AUTH ? { authorization: AUTH } : {})}}).then(r=>r.text()).catch(e=>'ERR:'+e.message)`);
  if (!txt || String(txt).startsWith("ERR")) { log(`u${n} 取进度失败: ${String(txt).slice(0, 60)}`); continue; }
  let j; try { j = JSON.parse(txt); } catch { log(`u${n} 解析失败`); continue; }
  fs.writeFileSync(`prog-u${n}.json`, txt);
  const L2 = j.rt?.leafs || {};
  const rows = Object.entries(L2).filter(([id, v]) => v.tab_type !== "text");
  const done = rows.filter(([, v]) => v.state?.pass >= 1);
  const miss = rows.filter(([, v]) => !(v.state?.pass >= 1));
  out[`u${n}`] = { total: rows.length, done: done.length, miss: miss.map(([id, v]) => ({ id, base: meta[id]?.base || "", name: meta[id]?.name || "", num: meta[id]?.num || 0, tab: v.tab_type })) };
  log(`u${n}: ${done.length}/${rows.length} 完成，缺 ${miss.length}`);
  const byBase = {};
  for (const m of out[`u${n}`].miss) byBase[m.base || "(空)"] = (byBase[m.base || "(空)"] || 0) + 1;
  for (const [k, v] of Object.entries(byBase)) log(`    - ${k}: ${v}`);
}
fs.writeFileSync("audit.json", JSON.stringify(out, null, 1));
L.cdp.close();
