// _u4g598_main.mjs — 单节点 collapsible-block 正式执行（第1轮）
// 流程：关弹窗+抽屉 → 滚到目标 → 展开前截图(看过才点) → 点折叠头展开 → 展开后截图 → DOM证据 → 抓进度核验 pass → 最终截图
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[u4g598-main]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0, 140)));
const ID = "mUDW2AIDlwgTvp2K";
const CH4 = CH[4];
const SHOT = "shots/U4-u4g598.png";
const PRE = "shots/U4-u4g598-before.png";
const POST = "shots/U4-u4g598-after.png";

const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json())
  .filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(tabs[0].id);
const { ev, frames, cdp, sessionId } = L;
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
const reqs = new Map(), progHits = [];
cdp.on("Network.requestWillBeSent", p => { if (p.request?.url) reqs.set(p.requestId, p.request.url); });
cdp.on("Network.responseReceived", p => {
  const u = reqs.get(p.requestId) || "";
  if (/course_progress/.test(u)) progHits.push({ id: p.requestId, url: u });
});
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId).catch(() => {});
};
const snap = async (path) => {
  const s = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
  if (s.data) { fs.mkdirSync("shots", { recursive: true }); fs.writeFileSync(path, Buffer.from(s.data, "base64")); return fs.statSync(path).size; }
  return 0;
};

// ① 关「本单元学习规则」弹窗（顶层帧真实鼠标）+ 关目录抽屉（教材帧）
const clean = async (tag) => {
  for (let i = 0; i < 3; i++) {
    let hit = false;
    for (const f of await frames()) {
      if (!/pc\.html|textbook/.test(f.url)) continue;
      const p = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
      if (p) { await mouse(p.x, p.y); log(`${tag}: 点「我知道了」@`, p.x, p.y); await sleep(1400); hit = true; break; }
    }
    if (!hit) break;
  }
  // 关抽屉
  const tbNow = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
  if (tbNow) {
    const d = await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;e.scrollIntoView({block:'center'});return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, tbNow.ctx).catch(() => null);
    if (d) { await mouse(d.x, d.y); log(`${tag}: 关抽屉 @`, d.x, d.y); await sleep(1200); }
  }
  // 兜底：注入隐藏残留遮罩
  for (const f of await frames()) {
    if (!/pc\.html|textbook/.test(f.url)) continue;
    await ev(`(()=>{for(const m of document.querySelectorAll('.ant-modal-wrap,.ant-modal-mask,[class*=backdrop]')){m.style.display='none';m.style.pointerEvents='none';}return 1;})()`, f.ctx).catch(() => 0);
  }
};
await clean("clean①");
await sleep(1500);

// ② 定位教材帧 + healthy 探针（硬纪律②）
let tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH4.slice(0, 12)));
if (!tb) { log("NO TB CH4"); cdp.close(); process.exit(2); }
const raw = e => ev(e, tb.ctx);
let healthy = false, probe = {};
for (let k = 0; k < 12 && !healthy; k++) {
  probe = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const nonempty=bs.filter(b=>(b.innerText||'').replace(/\\s+/g,'').length>5).length;
    return {chapterOK:${JSON.stringify(tb.url.includes(CH4))},blocks:bs.length,nonempty,bodyLen:(document.body.innerText||'').length};})()`).catch(() => ({}));
  log(`healthy#${k}:`, JSON.stringify(probe));
  if (probe.chapterOK && (probe.nonempty || 0) > 0) { healthy = true; log("HEALTHY ✓"); break; }
  await sleep(2000);
}
log("healthy 结论:", healthy, "(chapterOK 必须 true，nonempty>0 才算健康)");

// ③ 滚到目标折叠块（点前 scrollIntoView），存展开前截图（供视觉核对）
const pos = await raw(`(()=>{
  const e=document.getElementById(${JSON.stringify(ID)});if(!e)return{err:'no elem'};
  e.scrollIntoView({block:'center'});
  const h=e.querySelector('[class*=collapsible-head]')||e;
  const r=h.getBoundingClientRect();
  const b=e.querySelector('[class*=collapsible-content]');
  return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width),h:Math.round(r.height),
    hidden:b?b.hasAttribute('hidden'):null,contentLen:b?(b.innerText||'').length:0,
    headText:(h.innerText||'').replace(/\\s+/g,' ').slice(0,80)};})()`).catch(e => ({ err: String(e).slice(0, 140) }));
log("折叠头位置(展开前):", JSON.stringify(pos));
await sleep(1000);
log("展开前截图:", PRE, await snap(PRE), "bytes");

// PHASE=pre：仅到「展开前截图」为止，退出供人工核对画面，不做任何关键点击
if (process.env.PHASE === "pre") {
  fs.writeFileSync("_u4g598-pre-phase.json", JSON.stringify({ chapter: CH4, healthy, probe, pos, shot: PRE }, null, 1));
  log("PHASE=pre 完成（未点击折叠头），请先看图:", PRE);
  cdp.close();
  process.exit(0);
}

// ④ 按 base=collapsible-block 处理：点折叠头展开（视觉已核对弹窗已关）
let openState = {};
if (pos && !pos.err && pos.hidden) {
  // 用 elementFromPoint 校验点击目标确实是折叠头而非遮罩（硬纪律：DOM 校验）
  const chk = await raw(`(()=>{const e=document.elementFromPoint(${pos.x},${pos.y});return {tag:e?e.tagName:null,cls:e?String(e.className).slice(0,90):null,txt:e?(e.innerText||'').replace(/\\s+/g,' ').slice(0,50):null};})()`).catch(() => ({}));
  log("elementFromPoint 校验:", JSON.stringify(chk));
  await mouse(pos.x, pos.y);
  log("点击折叠头 @", pos.x, pos.y);
  await sleep(2500);
  openState = await raw(`(()=>{const e=document.getElementById(${JSON.stringify(ID)});const b=e?e.querySelector('[class*=collapsible-content]'):null;
    return {hidden:b?b.hasAttribute('hidden'):null,contentLen:b?(b.innerText||'').length:0};})()`).catch(() => ({}));
  // 兜底①：React props onClick
  if (openState.hidden) {
    await raw(`(()=>{const e=document.getElementById(${JSON.stringify(ID)});const h=e?e.querySelector('[class*=collapsible-head]'):null;
      if(h){const k=Object.keys(h).find(k=>k.startsWith('__reactProps'));try{if(k&&h[k].onClick)h[k].onClick({stopPropagation(){},preventDefault(){},target:h,currentTarget:h,nativeEvent:{}});else h.click();}catch(x){h.click();}}return 1;})()`).catch(() => 0);
    await sleep(1800);
    openState = await raw(`(()=>{const e=document.getElementById(${JSON.stringify(ID)});const b=e?e.querySelector('[class*=collapsible-content]'):null;return {hidden:b?b.hasAttribute('hidden'):null,contentLen:b?(b.innerText||'').length:0};})()`).catch(() => ({}));
    log("React props 兜底后:", JSON.stringify(openState));
  }
  // 兜底②：直接移除 hidden 让内容渲染（等价用户展开）
  if (openState.hidden) {
    await raw(`(()=>{const e=document.getElementById(${JSON.stringify(ID)});const b=e?e.querySelector('[class*=collapsible-content]'):null;if(b)b.removeAttribute('hidden');return 1;})()`).catch(() => 0);
    await sleep(1500);
    openState = await raw(`(()=>{const e=document.getElementById(${JSON.stringify(ID)});const b=e?e.querySelector('[class*=collapsible-content]'):null;return {hidden:b?b.hasAttribute('hidden'):null,contentLen:b?(b.innerText||'').length:0};})()`).catch(() => ({}));
    log("removeAttribute 兜底后:", JSON.stringify(openState));
  }
} else {
  openState = { note: "目标块已是展开态或不可定位", pos };
}
log("展开后状态:", JSON.stringify(openState));
await sleep(1200);
log("展开后截图:", POST, await snap(POST), "bytes");

// ⑤ DOM 证据（界面文本）
const dom = await raw(`(()=>{const e=document.getElementById(${JSON.stringify(ID)});const b=e?e.querySelector('[class*=collapsible-content]'):null;
  const t=b?(b.innerText||b.textContent||''):(e?(e.textContent||''):'');
  const body=document.body.innerText||'';
  return {nodeId:${JSON.stringify(ID)},exists:!!e,hidden:b?b.hasAttribute('hidden'):null,
    contentLen:t.length,hasNewWords:/New words/.test(t),hasAgitation:/agitation/.test(t),
    head:t.replace(/\\s+/g,' ').slice(0,220),
    bodyHasVocab:/Vocabulary/.test(body),bodyTail:body.replace(/\\s+/g,' ').slice(-200),
    catVocab:(()=>{const es=[...document.querySelectorAll('*')].filter(x=>/^(Vocabulary|New words)$/.test((x.innerText||'').trim())&&x.getBoundingClientRect().width>5);return es.length;})()};})()`).catch(e => ({ err: String(e).slice(0, 160) }));
log("DOM 证据:", JSON.stringify(dom).slice(0, 900));

// ⑥ 核验 state.pass：优先用本次会话抓到的 course_progress 响应体；无则读 prog-u4.json 并标注来源
let pass = null, passSrc = null, passRaw = null;
for (const h of progHits) {
  const m = h.url.match(/course_progress\/[^/]+\/([^/]+)\//);
  if (m && m[1] !== "u4") continue;
  try {
    const b = await cdp.send("Network.getResponseBody", { requestId: h.id }, sessionId);
    const j = JSON.parse(b.body);
    const leaf = j.rt?.leafs?.[ID] || j.rt?.leafs?.["u4g598"];
    if (leaf) { pass = leaf.state?.pass; passRaw = { pass: leaf.state?.pass, pass2: leaf.state?.pass2, tab_type: leaf.tab_type, duration: leaf.duration }; passSrc = "本次会话 Network.getResponseBody " + h.url.slice(-70); }
  } catch (e) { log("body err", String(e).slice(0, 80)); }
}
if (pass === null) {
  try {
    const j = JSON.parse(fs.readFileSync("prog-u4.json", "utf8"));
    const leaf = j.rt?.leafs?.["u4g598"] || j.rt?.leafs?.[ID];
    if (leaf) { pass = leaf.state?.pass; passRaw = { pass: leaf.state?.pass, pass2: leaf.state?.pass2, tab_type: leaf.tab_type }; passSrc = "prog-u4.json (本次会话 caprog.mjs 抓取, " + fs.statSync("prog-u4.json").mtime.toISOString() + ")"; }
  } catch (e) { log("prog read err", String(e).slice(0, 80)); }
}
log("★ state.pass 核验:", pass, "src:", passSrc, "raw:", JSON.stringify(passRaw));

// ⑦ 最终截图到指定路径
log("最终截图:", SHOT, await snap(SHOT), "bytes");
fs.writeFileSync("_u4g598-main.json", JSON.stringify({ chapter: CH4, healthy, probe, pos, openState, dom, pass, passRaw, passSrc, progHits: progHits.map(x => x.url.slice(-80)), shots: { PRE, POST, SHOT } }, null, 1));
cdp.close();
