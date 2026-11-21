// _u4g560_hdr.mjs — 只读：抓 course_progress 完整请求头 + 响应体（用浏览器会话核验 pass）
import { connect } from "./utlib.mjs";
import fs from "node:fs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[hdr]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 160)));
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(tabs[0].id);
const { ev, frames, cdp, sessionId } = L;
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
const ids = [];
cdp.on("Network.responseReceived", (p) => { if (/course_progress/.test(p.response?.url || "")) ids.push(p.requestId); });
cdp.on("Network.requestWillBeSent", (p) => {
  if (/course_progress/.test(p.request?.url || "")) {
    log("HEADERS:", JSON.stringify(p.request?.headers || {}, null, 1).slice(0, 1200));
    log("URL:", p.request?.url);
  }
});
// 触发 SPA 重新请求进度
await ev(`(()=>{const a=document.createElement('a');a.href='#';return 1;})()`).catch(() => {});
await cdp.send("Page.reload", {}, sessionId).catch(() => {});
await sleep(12000);
log("捕获响应数:", ids.length);
for (const id of ids.slice(-1)) {
  try {
    const b = await cdp.send("Network.getResponseBody", { requestId: id }, sessionId);
    const j = JSON.parse(b.body);
    const v = j.rt?.leafs?.["u4g560"];
    log("u4g560 state:", JSON.stringify(v?.state), "tab:", v?.tab_type);
    fs.writeFileSync("_u4g560-prog-live.json", b.body);
  } catch (e) { log("getResponseBody err:", String(e).slice(0, 120)); }
}
cdp.close();
