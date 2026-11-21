// shot2.mjs <unit> <block> <outfile> [closeX,closeY] — 关抽屉+滚块+截图（真鼠标关抽屉）
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE, CH } from "./reader.mjs";
import fs from "node:fs";
const U = Number(process.argv[2] || 1);
const I = Number(process.argv[3] || 0);
const OUT = process.argv[4] || `shot-u${U}-b${I}.png`;
const CX = process.argv[5] ? Number(process.argv[5]) : null;
const CY = process.argv[6] ? Number(process.argv[6]) : null;
const log = (...a) => console.log("[shot2]", ...a);
const getVer = async () => (await fetch("http://127.0.0.1:9222/json/version")).json();
const getTabs = async () => (await fetch("http://127.0.0.1:9222/json/list")).json();
const b0 = await CDP.connect((await getVer()).webSocketDebuggerUrl);
for (const t of (await getTabs()).filter(t => /ucontent\.unipus\.cn/.test(t.url))) await b0.send("Target.closeTarget", { targetId: t.id }).catch(() => {});
await sleep(800);
const r = await b0.send("Target.createTarget", { url: `${READER}#/${COURSE}/courseware/u${U}/u${U}g2` });
b0.close();
await sleep(18000);
try {
  const { execSync } = await import("node:child_process");
  const tu = (await getTabs()).find(t => t.id === r.targetId);
  if (tu && /sso\.unipus\.cn\/sso\/login/.test(tu.url)) {
    log("SSO, relogin");
    try { execSync("node relogin2.mjs", { cwd: process.cwd(), env: { ...process.env, UNIPUS_USER: "USER_A_PHONE", UNIPUS_PASS: "REDACTED_PW" }, stdio: "pipe", timeout: 120000 }); } catch {}
    await sleep(3000);
  }
} catch {}
const L = await connect(r.targetId);
const { ev, frames, cdp, sessionId } = L;
let tb = null;
for (let k = 0; k < 110 && !tb; k++) {
  tb = (await frames()).find(f => f.url.includes("textbook/book") && f.ctx && f.url.includes((CH[U] || "??").slice(0, 12)));
  if (tb) { const n = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(() => 0); if (n > 0) break; }
  await sleep(1000);
}
if (!tb) { log("NO TB"); process.exit(1); }
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
// 关抽屉（如给了坐标）
if (CX !== null && CY !== null) { await mouse(CX, CY); await sleep(1500); log("clicked close", CX, CY); }
// 规则弹窗
for (let i = 0; i < 4; i++) {
  let hit = false;
  for (const f of await frames()) {
    const p = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
    if (p) { await mouse(p.x, p.y); await sleep(1200); hit = true; break; }
  }
  if (!hit) break;
}
// 滚到块
for (let k = 0; k < 10; k++) {
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx).catch(() => {});
  await sleep(1500);
}
await sleep(2500);
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
fs.writeFileSync(OUT, Buffer.from(data, "base64"));
log("saved", OUT);
const info = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];
 return b?{len:(b.innerText||'').length, html:b.innerHTML.length, hasFile:b.querySelectorAll('input[type=file]').length, hasVideo:b.querySelectorAll('video').length, hasAudio:b.querySelectorAll('audio').length, hasCanvas:b.querySelectorAll('canvas').length, hasTextarea:b.querySelectorAll('textarea').length, txt:(b.innerText||'').replace(/\\s+/g,' ').slice(0,120)}:null;})()`, tb.ctx).catch(() => null);
log("block:", JSON.stringify(info));
cdp.close();
