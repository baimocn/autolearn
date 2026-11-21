// _u4g560_verify.mjs — 独立核验 state.pass：从页面 storage 取 JWT → 带 Authorization fetch u4 进度 → 也尝试触发 SPA 重发
import { connect } from "./utlib.mjs";
import { COURSE } from "./reader.mjs";
import fs from "node:fs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[verify]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 160)));
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(tabs[0].id);
const { ev, frames, cdp, sessionId } = L;
const prog = [];
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
cdp.on("Network.responseReceived", (p) => { if (/course_progress/.test(p.response?.url || "")) prog.push(p.requestId); });
const top = (await frames()).find(f => /pc\.html/.test(f.url) && f.ctx);
// ① 从 storage 找 JWT
const tok = await ev(`(()=>{let t='';try{for(const S of [localStorage,sessionStorage]){for(const k of Object.keys(S)){const v=S.getItem(k)||'';
  if(/^eyJ/.test(v))t=v;else{try{const j=JSON.parse(v);for(const kk of Object.keys(j)){if(typeof j[kk]==='string'&&/^eyJ/.test(j[kk]))t=j[kk];}}catch(e){}}}}}catch(e){}return t;})()`, top.ctx).catch(() => "");
log("token len:", (tok || "").length, "head:", (tok || "").slice(0, 20));
const OPENID = "5cb554a204db411aa8958f116769407f";
const url = `/course/api/v2/course_progress/${COURSE}/u4/${OPENID}/default`;
const r = await ev(`(async()=>{try{const r=await fetch(${JSON.stringify(url)},{credentials:'include',headers:${JSON.stringify(tok ? { Authorization: tok } : {})}});
  const t=await r.text();let j={};try{j=JSON.parse(t);}catch(e){}const v=j.rt?.leafs?.['u4g560'];
  return{status:r.status,tokLen:${(tok || "").length},found:!!v,state:v?v.state:null,pass:v?v.state?.pass:null,tab:v?v.tab_type:null,raw:t.slice(0,90)};
}catch(e){return{err:String(e).slice(0,120)};}})()`, top.ctx).catch(e => ({ err: String(e).slice(0, 150) }));
log("直接 fetch u4:", JSON.stringify(r));
// ② 触发 SPA 重发进度（reload），再抓响应体
if (!r || r.status !== 200 || !r.found) {
  log("触发 Page.reload 让 SPA 重发进度 ...");
  await cdp.send("Page.reload", {}, sessionId).catch(() => {});
  await sleep(14000);
  for (const id of prog.slice(-12)) {
    try {
      const b = await cdp.send("Network.getResponseBody", { requestId: id }, sessionId);
      const j = JSON.parse(b.body);
      if (j.rt?.unit_id === "u4") {
        const v = j.rt?.leafs?.["u4g560"];
        log("reload 后 u4 响应: pass =", v?.state?.pass, " state =", JSON.stringify(v?.state));
        fs.writeFileSync("_u4g560-verify.json", JSON.stringify({ src: "reload-response", unit: j.rt?.unit_id, state: v?.state, pass: v?.state?.pass, tab: v?.tab_type, direct: r }, null, 1));
        cdp.close(); process.exit(0);
      }
    } catch {}
  }
  log("未抓到 u4 响应，captured:", prog.length);
  fs.writeFileSync("_u4g560-verify.json", JSON.stringify({ err: "未抓到 u4 响应", captured: prog.length, direct: r }, null, 1));
} else {
  fs.writeFileSync("_u4g560-verify.json", JSON.stringify({ src: "direct-fetch", ...r }, null, 1));
}
cdp.close();
