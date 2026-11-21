// enterunit.mjs <unit> <node> [reloads] — 深路由进单元 + 强制刷新，直到题目控件加载
import { connect, sleep } from "./utlib.mjs";
import { READER, COURSE, CH } from "./reader.mjs";
import fs from "node:fs";
const U = Number(process.argv[2]);
const NODE = process.argv[3];
const MAXR = Number(process.argv[4] || 3);
const log = (...a) => console.log(`[ent${U}]`, ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 110)));

const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
let rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
if (!rd) { log("NO READER"); process.exit(1); }
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;

// 1) 深路由
const url = `${READER}#/${COURSE}/courseware/u${U}/${NODE}`;
await cdp.send("Page.enable", {}, sessionId).catch(() => {});
await cdp.send("Page.navigate", { url }, sessionId).catch(e => log("nav err", String(e).slice(0, 60)));
await sleep(9000);

const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const probe = async () => {
  const tb = (await frames()).find(f => f.url.includes("textbook/book") && f.ctx);
  if (!tb) return { tb: false, blocks: 0, txt: 0 };
  const r = await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];const ne=bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length;return {blocks:bs.length,nonempty:ne,txt:document.body.innerText.length};})()`, tb.ctx).catch(() => ({ blocks: 0, txt: 0 }));
  return { tb: true, ...r };
};
const dismiss = async () => {
  for (let i = 0; i < 3; i++) {
    let hit = false;
    for (const f of await frames()) {
      const p = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(我知道了|知道了|继续学习|开始学习)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>20);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
      if (p) { await mouse(p.x, p.y); await sleep(1200); hit = true; break; }
    }
    if (!hit) break;
  }
};

// 2) 强制刷新循环
for (let r = 0; r <= MAXR; r++) {
  if (r > 0 || true) {
    await cdp.send("Page.reload", { ignoreCache: true }, sessionId).catch(() => {});
    log("force reload #" + (r + 1));
    await sleep(22000);
  }
  await dismiss();
  let st = await probe();
  // 再等最多 60s；"单元学习规则"弹窗会晚到，每轮都要点掉
  for (let k = 0; k < 12 && !(st.blocks > 0 && (st.nonempty || 0) > 0); k++) {
    await sleep(5000);
    await dismiss();
    // 兜底：JS 直点“我知道了”
    for (const f of await frames()) {
      await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const b=[...document.querySelectorAll('button,div,span,a')].find(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>10);if(b){b.click();return 1;}return 0;})()`, f.ctx).catch(() => 0);
    }
    st = await probe();
  }
  log("probe:", JSON.stringify(st));
  if (st.blocks > 0 && (st.nonempty||0) > 0) {
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
    if (data) fs.writeFileSync(`ent-u${U}.png`, Buffer.from(data, "base64"));
    log("HEALTHY blocks=" + st.blocks);
    cdp.close();
    process.exit(0);
  }
  // 页面正文提示（判断是否版本弹窗/非学习周期）
  const hint = await ev(`(()=>{const t=document.body.innerText.replace(/\\s+/g,' ');const m=t.match(/(版本更新|非单元学习周期|学习周期|限流|稍后再试|加载失败)[^。]{0,60}/);return m?m[0]:t.slice(0,120);})()`).catch(() => "");
  log("hint:", hint);
}
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (data) fs.writeFileSync(`ent-u${U}.png`, Buffer.from(data, "base64"));
log("FAILED blocks=0 after reloads");
cdp.close();
process.exit(2);
