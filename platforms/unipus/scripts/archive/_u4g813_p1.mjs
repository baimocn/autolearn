// _u4g813_p1.mjs — 第1步只读探针：healthy + 当前画面截图 (无点击)
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[p1]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0,150)));
const U = 4, CH4 = CH[U];
const SHOT = "shots/U4-u4g813-probe.png";
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
let target = null, chap = "";
for (const t of tabs) {
  const L0 = await connect(t.id);
  const fl = await L0.frames();
  const tb0 = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
  const ch = tb0 ? (tb0.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] : "";
  L0.cdp.close();
  log("tab", t.id.slice(0,8), "chap=", ch);
  if (ch === CH4) { target = t.id; chap = ch; break; }
}
if (!target) { log("NO U4 READER (chapter!=CH4)"); process.exit(2); }
log("U4 reader:", target, "chap:", chap);
const L = await connect(target);
const { ev, frames, cdp, sessionId } = L;
const fl = await frames();
log("frames:", JSON.stringify(fl.map(f => ({ u: f.url.slice(0, 95), ctx: !!f.ctx })), null, 1));
const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH4.slice(0,12)));
if (!tb) { log("NO TB ctx"); cdp.close(); process.exit(3); }
const raw = e => ev(e, tb.ctx).catch(err => ({ err: String(err).slice(0,140) }));
// healthy 探针
const probe = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
  const ne=bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5);
  const body=document.body.innerText||'';
  const cards=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')].map((c,i)=>({i,id:c.id,status:c.getAttribute('data-lexical-node-status'),txt:(c.innerText||'').replace(/\s+/g,' ').slice(0,40)}));
  return {chapterOK:${JSON.stringify(tb.url.includes(CH4))},chapterId:(location.pathname.match(/chapter\/([0-9a-f-]+)/)||[])[1]||null,
    blocks:bs.length,nonempty:ne.length,bodyLen:body.length,
    hasLogin:/登录|账号|密码|SSO/.test(body),hasLimit:/限流|稍后再试|非单元学习周期|加载失败/.test(body),
    hasUnitTest:/Unit test/i.test(body),hasScore:/最终得分|正确率|测试满分/.test(body),
    cards, statusSet:[...new Set(bs.map(x=>x.getAttribute('data-lexical-node-status')))],
    ruleBtn:[...document.querySelectorAll('button,div,span,a')].filter(x=>/^(我知道了|知道了)$/.test((x.innerText||'').replace(/\s+/g,''))&&x.getBoundingClientRect().width>15).length};})()`);
log("HEALTHY PROBE:", JSON.stringify(probe, null, 1));
// 顶层帧文本
const pc = fl.find(f => /pc\.html/.test(f.url) && f.ctx);
let pcTxt = "";
if (pc) pcTxt = String(await ev(`(document.body.innerText||'').replace(/\s+/g,' ').slice(0,400)`, pc.ctx).catch(()=> "") || "");
log("PC 文本:", pcTxt);
// 截图
fs.mkdirSync("shots", { recursive: true });
const s = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({data:null}));
if (s.data) { fs.writeFileSync(SHOT, Buffer.from(s.data,"base64")); log("截图:", SHOT, fs.statSync(SHOT).size, "bytes"); }
fs.writeFileSync("_u4g813-p1.json", JSON.stringify({target,chap,probe,pcTxt,shot:SHOT}, null, 1));
cdp.close();
