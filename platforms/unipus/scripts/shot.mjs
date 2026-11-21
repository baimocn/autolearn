// shot.mjs <unit> <block> <outfile> — 打开单元，滚到块，截图
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE, CH } from "./reader.mjs";
const U = Number(process.argv[2] || 1);
const I = Number(process.argv[3] || 0);
const OUT = process.argv[4] || `shot-u${U}-b${I}.png`;
const log = (...a) => console.log("[shot]", ...a);
const getVer = async () => (await fetch("http://127.0.0.1:9222/json/version")).json();
const getTabs = async () => (await fetch("http://127.0.0.1:9222/json/list")).json();
const b0 = await CDP.connect((await getVer()).webSocketDebuggerUrl);
for (const t of (await getTabs()).filter(t => /ucontent\.unipus\.cn/.test(t.url))) await b0.send("Target.closeTarget", { targetId: t.id }).catch(() => {});
await sleep(800);
const r = await b0.send("Target.createTarget", { url: `${READER}#/${COURSE}/courseware/u${U}/u${U}g2` });
b0.close();
await sleep(18000);
// relogin if needed
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
// 关规则弹窗
for (let i = 0; i < 4; i++) {
  for (const f of await frames()) {
    const r2 = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return 0;v[v.length-1].click();return 1;})()`, f.ctx).catch(() => 0);
    if (r2) await sleep(1200);
  }
}
// 关抽屉
for (const f of await frames()) {
  const r2 = await ev(`(()=>{const c=[...document.querySelectorAll('[class*=catalog_drawer-close],[class*=drawer_close],[class*=drawer-close],[class*=close]')].filter(e=>{const b=e.getBoundingClientRect();return b.width>4&&b.height>4;}).slice(0,3); if(c.length){c[0].click();return 1;} return 0;})()`, f.ctx).catch(()=>0);
  if (r2) await sleep(1200);
}
// 兜底：隐藏遮罩
for (const f of await frames()) { await ev(`(()=>{for(const m of document.querySelectorAll('[class*=backdrop],[class*=mask]')){m.style.display='none';m.style.pointerEvents='none';}return 1;})()`, f.ctx).catch(()=>0); }
// 滚到块
for (let k = 0; k < 10; k++) {
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx).catch(() => {});
  await sleep(1500);
}
await sleep(2500);
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
const fs = await import("node:fs");
fs.writeFileSync(OUT, Buffer.from(data, "base64"));
log("saved", OUT);
const info = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];
 return b?{len:(b.innerText||'').length, html:b.innerHTML.length, txt:(b.innerText||'').replace(/\\s+/g,' ').slice(0,160)}:null;})()`, tb.ctx).catch(() => null);
log("block:", JSON.stringify(info));
cdp.close();
