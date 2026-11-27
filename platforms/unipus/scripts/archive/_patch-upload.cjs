const fs = require("fs");
let s = fs.readFileSync("patient2.mjs", "utf8");
if (s.includes("const doUpload")) { console.log("already"); process.exit(0); }

// 1) 注入 upload 处理器（放在 proc 定义之前）
const anchor = "const proc = async (i) => {";
const uploadFn = `const doUpload = async (i) => {
  const fsx = await import("node:fs");
  const pathx = await import("node:path");
  const { execSync } = await import("node:child_process");
  const TMP = process.env.TEMP || "C:\\\\Windows\\\\Temp";
  // 题面文本
  const txt = await tiny(\`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][\${i}];return (b.innerText||'').slice(0,800);})()\`) || "Writing task";
  const src = pathx.join(TMP, "upsrc-" + i + ".txt");
  fsx.writeFileSync(src, "Task (Unit " + (TARGET_U || "cur") + ")\\n\\n" + String(txt).replace(/提交|上传|计分|自动判题/g, "").trim() + "\\n\\nMy Answer:\\n\\nAgriculture has always been the foundation of human civilization. In this task, I have studied the key points of this unit and would like to share my understanding. Modern farming methods have greatly improved productivity, while traditional wisdom keeps the soil healthy for future generations. Balancing efficiency with sustainability is the main message of this unit. In conclusion, this unit has deepened my understanding of agriculture and its role in culture and society.");
  const pdf = pathx.join(TMP, "U" + (TARGET_U || "cur") + "_Task" + i + ".pdf");
  try { execSync('node mkpdf.mjs "' + pdf + '" "Task" "' + src + '"', { cwd: process.cwd(), stdio: "pipe", timeout: 30000 }); } catch (e) { return { r: "upload", note: "pdf-fail" }; }
  if (!fsx.existsSync(pdf)) return { r: "upload", note: "pdf-missing" };
  // 滚到块
  for (let k = 0; k < 6; k++) {
    await ev(\`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][\${i}];if(!b)return 0;
      const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
      const rr=b.getBoundingClientRect(),box=sc.getBoundingClientRect();sc.scrollTop+=(rr.top-box.top)-25;return 1;})()\`, tb.ctx).catch(()=>0);
    await sleep(1300);
    const has = await tiny(\`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][\${i}];return b?b.querySelectorAll('.ant-upload-btn,input[type=file]').length:0;})()\`);
    if (has) break;
  }
  await cdp.send("Page.enable", {}, sessionId).catch(() => {});
  await cdp.send("Page.setInterceptFileChooserDialog", { enabled: true }, sessionId).catch(() => {});
  let got = null;
  cdp.on("Page.fileChooserOpened", (q) => { got = q; });
  await tiny(\`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][\${i}];
    const s2=b.querySelector('.ant-upload-btn')||b.querySelector('input[type=file]');
    if(!s2)return 0; s2.click(); return 1;})()\`);
  for (let k = 0; k < 14 && !got; k++) await sleep(400);
  if (!got) { await cdp.send("Page.setInterceptFileChooserDialog", { enabled: false }, sessionId).catch(() => {}); return { r: "upload", note: "no-chooser" }; }
  await cdp.send("DOM.setFileInputFiles", { files: [pdf], backendNodeId: got.backendNodeId }, sessionId);
  await cdp.send("Page.setInterceptFileChooserDialog", { enabled: false }, sessionId).catch(() => {});
  let attached = false;
  for (let k = 0; k < 10; k++) {
    await sleep(1600);
    const d = await tiny(\`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][\${i}];
      return {items:b.querySelectorAll('.ant-upload-list-item').length, n:(()=>{const fi=b.querySelector('input[type=file]');return fi?fi.files.length:0;})()};})()\`);
    if (d && (d.items > 0 || d.n > 0)) { attached = true; break; }
  }
  await sleep(400);
  const sub = await tiny(\`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][\${i}];
    const el=[...b.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\\\\s+/g,''))==='提交');
    if(el){el.click();return 1;}return 0;})()\`);
  await sleep(6000);
  for (const f of await frames()) await ev(\`(()=>{const n=s2=>(s2||'').replace(/\\\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(确认|确定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>18);if(v.length){v[v.length-1].click();return 1;}return 0;})()\`, f.ctx).catch(() => 0);
  await sleep(1500);
  const fin = await tiny(\`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][\${i}];
    const t=(b.innerText||'').replace(/\\\\s+/g,' ');
    return {redo:/重新作答/.test(t), score:(t.match(/得分[:：]?\\\\s*(\\\\d+(\\\\.\\\\d+)?)/)||[])[1]??null};})()\`);
  return { r: "done", kind: "upload", attached, sub, score: fin && fin.score };
};
const proc = async (i) => {`;
s = s.replace(anchor, uploadFn);
// 2) proc 中 upload 分支改为调用
s = s.replace('if (["upload", "media", "text"].includes(kind)) return { r: kind, len: s.len };',
  'if (kind === "upload") { try { return await doUpload(i); } catch (e) { return { r: "upload", note: String(e).slice(0,60) }; } }\n  if (["media", "text"].includes(kind)) return { r: kind, len: s.len };');
fs.writeFileSync("patient2.mjs", s);
console.log("patched upload handler");
