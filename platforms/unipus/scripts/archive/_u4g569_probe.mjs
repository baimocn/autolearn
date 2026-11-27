// _u4g569_probe.mjs — 探针：当前章节 / 题块健康 / u4g569 实时 state.pass / 截图
import { connect, sleep } from "./utlib.mjs";
import { CH, COURSE } from "./reader.mjs";
import fs from "node:fs";
const log = (...a) => console.log("[probe]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0, 120)));

const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
if (!rd) { log("NO READER"); process.exit(1); }
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const fl = await frames();
log("frames:", fl.map(f => (f.url || "").slice(0, 90)).join(" | "));

const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
const top = fl.find(f => /pc\.html/.test(f.url) && f.ctx);
log("tb?", !!tb, "top?", !!top, "tb.url:", tb && tb.url);

// chapter from tb url
const chap = tb ? (tb.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] : "";
log("chapter:", chap, "expect CH[4]:", CH[4], "match:", chap === CH[4]);

// healthy probe on tb
let dom = { err: "no tb" };
if (tb) {
  dom = await ev(`(()=>{
    const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const ne=bs.filter(b=>(b.innerText||'').replace(/\\s+/g,'').length>5).length;
    const statuses=[...new Set(bs.map(x=>x.getAttribute('data-lexical-node-status')))];
    const body=document.body.innerText||'';
    return {blocks:bs.length,nonempty:ne,statuses,bodyLen:body.length,
      hasOral:/点击开始|准备录音|我的回放|重录|开始录音/.test(body),
      hasLogin:/登录|账号|密码|SSO/.test(body),
      hasLimit:/限流|稍后再试|非单元学习周期|加载失败/.test(body),
      hasAnswer:/答案/.test(body),
      sample:body.slice(0,300)};
  })()`, tb.ctx).catch(e => ({ err: String(e).slice(0, 150) }));
}
log("DOM:", JSON.stringify(dom));
const healthy = !!(dom && dom.nonempty > 0) && chap === CH[4];
log("HEALTHY:", healthy, "(nonempty>0 && chapter match)");

// live progress via course_progress API from top frame
if (top) {
  const txt = await ev(`(async()=>{try{
    const r=await fetch('/course/api/v2/course_progress/${COURSE}/u4/default',{credentials:'include'});
    return {status:r.status,body:(await r.text()).slice(0,200)};
  }catch(e){return {err:String(e).slice(0,120)};}})()`, top.ctx).catch(e => ({ err: String(e).slice(0, 100) }));
  log("progress u4/default:", JSON.stringify(txt).slice(0, 320));
}

// screenshot
fs.mkdirSync("shots", { recursive: true });
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) {
  fs.writeFileSync("shots/U4-u4g569.png", Buffer.from(shot.data, "base64"));
  log("截图:", fs.statSync("shots/U4-u4g569.png").size, "bytes");
}
cdp.close();
