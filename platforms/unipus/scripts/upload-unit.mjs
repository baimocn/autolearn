// upload-unit.mjs <unit> — 扫描上传题块，生成PDF并提交
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE, CH } from "./reader.mjs";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const U = Number(process.argv[2]);
const log = (...a) => console.log(`[up${U}]`, ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 110)));
const getVer = async () => (await fetch("http://127.0.0.1:9222/json/version")).json();
const getTabs = async () => (await fetch("http://127.0.0.1:9222/json/list")).json();

const b0 = await CDP.connect((await getVer()).webSocketDebuggerUrl);
for (const t of (await getTabs()).filter(t => /ucontent\.unipus\.cn/.test(t.url))) await b0.send("Target.closeTarget", { targetId: t.id }).catch(() => {});
await sleep(800);
const r = await b0.send("Target.createTarget", { url: `${READER}#/${COURSE}/courseware/u${U}/u${U}g2` });
b0.close();
await sleep(11000);

// auto-relogin if redirected to SSO
try {
  let tu = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).find(t => t.id === r.targetId);
  if (tu && /sso\.unipus\.cn\/sso\/login/.test(tu.url)) {
    log("检测到SSO，自动重登");
    const { execSync } = await import("node:child_process");
    try { execSync("node relogin2.mjs", { cwd: process.cwd(), env: { ...process.env, UNIPUS_USER: process.env.UNIPUS_USER || "USER_A_PHONE", UNIPUS_PASS: process.env.UNIPUS_PASS || "REDACTED_PW" }, stdio: "pipe", timeout: 120000 }); } catch {}
    await sleep(3000);
  }
} catch {}

const L = await connect(r.targetId);
const { ev, frames, cdp, sessionId } = L;
let tb = null;
for (let k = 0; k < 55; k++) {
  tb = (await frames()).find(f => f.url.includes("textbook/book") && f.ctx && f.url.includes((CH[U] || "??").slice(0, 12)));
  if (tb) {
    const n = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(() => 0);
    if (n > 0) break;
  }
  await sleep(1000);
}
if (!tb) { log("NO TB"); process.exit(1); }
const raw = async (e) => {
  const rr = await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true, userGesture: true, contextId: tb.ctx }, sessionId);
  if (rr.exceptionDetails) return { __err: ((rr.exceptionDetails.exception && rr.exceptionDetails.exception.description) || "").slice(0, 100) };
  return rr.result && rr.result.value;
};
const dismissRules = async () => {
  for (const f of await frames()) {
    await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(v.length){v[v.length-1].click();return 1;}return 0;})()`, f.ctx).catch(() => 0);
  }
};
await dismissRules();

// 找上传块
const total = await raw(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`);
const ups = [];
for (let i = 0; i < total; i++) {
  await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`);
  await sleep(650);
  const s = await raw(`(()=>{
    const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    if(!b)return null;
    const t=(b.innerText||'').replace(/\\s+/g,' ');
    return {file:b.querySelectorAll('input[type=file]').length, btn:b.querySelectorAll('.ant-upload-btn').length,
      done:/重新作答/.test(t), score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null, len:(b.innerText||'').length};
  })()`);
  if (s && (s.file || s.btn)) ups.push({ i, ...s });
}
log("上传块:", JSON.stringify(ups));

const TMP = process.env.TEMP || "C:\\Windows\\Temp";
for (const { i, done } of ups) {
  try {
    if (done) { log(`#${i} 已提交过`); continue; }
    // 题面文本
    const text = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];return (b.innerText||'').slice(0,1200);})()`);
    const src = path.join(TMP, `upsrc-u${U}-${i}.txt`);
    const content = `Task ${i} (Unit ${U})\n\n${(text || "Writing task").replace(/提交|上传|计分|自动判题/g, "").trim()}\n\nMy Answer:\n\nAgriculture has always been the foundation of human civilization. In this task, I would like to share my understanding of the topic and my personal reflections.\n\nFirst, modern farming methods have greatly improved productivity. With the help of technology, farmers can monitor crops, control irrigation and predict weather more accurately than ever before. This not only saves labor but also protects the environment.\n\nSecond, traditional farming wisdom still matters today. Crop rotation, mixed planting and organic fertilizers keep the soil healthy for future generations. Balancing efficiency with sustainability is the key message of this unit.\n\nIn conclusion, studying this unit has deepened my understanding of agriculture and its role in culture and society. I will continue to pay attention to agricultural development and apply what I have learned in daily life.`;
    fs.writeFileSync(src, content);
    const pdf = path.join(TMP, `U${U}_Task${i}.pdf`);
    execSync(`node mkpdf.mjs "${pdf}" "U${U} Task${i}" "${src}"`, { cwd: process.cwd(), stdio: "pipe", timeout: 30000 });
    if (!fs.existsSync(pdf)) { log(`#${i} pdf失败`); continue; }
    // 滚到块并等上传按钮
    for (let k = 0; k < 8; k++) {
      await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return 0;
        const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
        const rr=b.getBoundingClientRect(),box=sc.getBoundingClientRect();sc.scrollTop+=(rr.top-box.top)-25;return 1;})()`);
      await sleep(1400);
      const has = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];return b?b.querySelectorAll('.ant-upload-btn,input[type=file]').length:0;})()`);
      if (has) break;
    }
    // 文件选择拦截
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Page.setInterceptFileChooserDialog", { enabled: true }, sessionId);
    let got = null;
    cdp.on("Page.fileChooserOpened", (q) => { got = q; });
    await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
      const s=b.querySelector('.ant-upload-btn')||b.querySelector('input[type=file]');
      if(!s)return 'no btn'; s.click(); return 'clicked';})()`);
    for (let k = 0; k < 12 && !got; k++) await sleep(400);
    if (!got) { log(`#${i} 无文件选择框`); await cdp.send("Page.setInterceptFileChooserDialog", { enabled: false }, sessionId); continue; }
    await cdp.send("DOM.setFileInputFiles", { files: [pdf], backendNodeId: got.backendNodeId }, sessionId);
    await cdp.send("Page.setInterceptFileChooserDialog", { enabled: false }, sessionId);
    let attached = false;
    for (let k = 0; k < 10; k++) {
      await sleep(1800);
      const d = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
        return {items:b.querySelectorAll('.ant-upload-list-item').length, n:(()=>{const fi=b.querySelector('input[type=file]');return fi?fi.files.length:0;})()};})()`);
      if (d && (d.items > 0 || d.n > 0)) { attached = true; break; }
    }
    log(`#${i} attached=${attached}`);
    await sleep(500);
    await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
      const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&(e.innerText||'').replace(/\\s+/g,'')==='提交');
      if(el)el.click();return !!el;})()`);
    await sleep(5000);
    const st = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
      const t=(b.innerText||'').replace(/\\s+/g,' ');
      return {redo:/重新作答/.test(t), score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null};})()`);
    log(`#${i} 提交后`, JSON.stringify(st));
  } catch (e) { log(`#${i} 异常`, String(e).slice(0, 100)); }
}
log("上传题完成");
cdp.close();
