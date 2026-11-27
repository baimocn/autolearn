import fs from "node:fs";
// _u4g560_net.mjs — 只读：监听当前页面实际 course_progress 请求（含正确 open_id / auth），并读一条响应体
import { connect } from "./utlib.mjs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[net]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 160)));
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(tabs[0].id);
const { ev, frames, cdp, sessionId } = L;
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
const seen = [];
cdp.on("Network.requestWillBeSent", (p) => {
  const u = p.request?.url || "";
  if (/course_progress/.test(u)) {
    seen.push({ url: u, auth: p.request?.headers?.authorization || p.request?.headers?.Authorization || "" });
    log("REQ:", u);
    log("  auth:", (p.request?.headers?.authorization || "").slice(0, 60));
  }
});
// 触发一次路由刷新让 SPA 重发进度请求
await cdp.send("Page.enable", {}, sessionId).catch(() => {});
await ev(`location.hash=location.hash`).catch(() => {});
await sleep(6000);
// 也用顶层帧主动 fetch 一次，带浏览器自动 cookie，看 401 是否与缺 XHR header 有关
const top = (await frames()).find(f => /pc\.html/.test(f.url) && f.ctx);
const test = await ev(`(async()=>{const r=await fetch('/course/api/v2/course_progress/course-v3:819008cfa01e0f2+xnkdxyy+20250801090513/u4/5cb554a204db411aa8958f116769407f/default',{credentials:'include',headers:{'X-Requested-With':'XMLHttpRequest'}});return {s:r.status,t:(await r.text()).slice(0,80)};})()`, top.ctx).catch(e => ({ err: String(e).slice(0, 120) }));
log("主动 fetch:", JSON.stringify(test));
log("共捕获 course_progress 请求:", seen.length);
fs.writeFileSync?.("_u4g560-net.json", JSON.stringify(seen, null, 1));
cdp.close();
