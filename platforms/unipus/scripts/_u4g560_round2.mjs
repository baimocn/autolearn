// _u4g560_round2.mjs — 第2轮(最终)：关两层弹窗 → 校验命中后点「打开精读模式」→ 音频/滚动 → finishNode → 带 JWT 核验 pass → 截图
import { connect } from "./utlib.mjs";
import { COURSE, CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[u4g560-r2]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 160)));
const ID = "oMrcWJawhYiLWVMS";
const U = 4;
const SHOT = "shots/U4-u4g560.png";
const E = JSON.stringify(ID);
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
let target = null;
for (const t of tabs) {
  const L0 = await connect(t.id);
  const fl = await L0.frames();
  const tb0 = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
  const ch = tb0 ? (tb0.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] : "";
  L0.cdp.close();
  if (ch === CH[U]) { target = t.id; break; }
}
if (!target) { log("NO U4 READER"); process.exit(2); }
const L = await connect(target);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const net = [];
const progResponses = []; // {id, url} 用于 getResponseBody
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
cdp.on("Network.requestWillBeSent", (p) => {
  const u = (p.request && p.request.url) || "";
  if (/course_progress/.test(u)) progResponses.push({ id: p.requestId, url: u, body: null });
  if (/finishNode|course_progress|readingtime/i.test(u)) net.push({ url: u.slice(-130), post: (p.request.postData || "").slice(0, 400) });
});
cdp.on("Network.loadingFinished", (p) => {
  const rec = progResponses.find(x => x.id === p.requestId);
  if (rec) { cdp.send("Network.getResponseBody", { requestId: p.requestId }, sessionId).then(b => { rec.body = b.body; }).catch(() => {}); }
});
const fl0 = await frames();
const tb = fl0.find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[U].slice(0, 12)));
if (!tb) { log("NO TB"); cdp.close(); process.exit(2); }
const raw = (e) => ev(e, tb.ctx);
const Q = (body) => `(()=>{const id=${E};${body}})()`;
fs.mkdirSync("shots", { recursive: true });

// —— healthy 探针（不满足则主动触发挂载：滚动+点击目标块+目录点击，不盲刷页面）——
let healthy = false, probe = {};
for (let k = 0; k < 24 && !healthy; k++) {
  probe = await raw(Q(`const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    return {blocks:bs.length,nonempty:bs.filter(x=>(x.innerText||'').replace(/\\s+/g,'').length>5).length,
      targetLen:(()=>{const b=document.getElementById(id);return b?(b.innerText||'').length:0;})()};`)).catch(() => ({}));
  if (tb.url.includes(CH[U]) && (probe.nonempty || 0) > 0) { healthy = true; log("HEALTHY ✓", JSON.stringify(probe)); break; }
  // 主动触发挂载（历史 recover 验证机制）
  if (k % 2 === 0) {
    const p = await raw(Q(`const b=document.getElementById(id);if(!b)return null;b.scrollIntoView({block:'center'});
      const r=b.getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};`)).catch(() => null);
    if (p) { await mouse(p.x + 0, p.y + 0); log(`挂载触发#${k}: 点击目标块 @`, JSON.stringify(p)); }
    // 目录点击第2个 Reading in detail
    const cat = await raw(`(()=>{const es=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].filter(x=>/Reading.*detail/i.test((x.innerText||'').replace(/\\s+/g,' ')));
      const e=es[1];if(!e)return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();
      return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),n:es.length};})()`).catch(() => null);
    if (cat) { await mouse(cat.x, cat.y); log(`挂载触发#${k}: 目录点击 Reading in detail #2`, JSON.stringify(cat)); }
  }
  await sleep(3000);
}
if (!healthy) { log("NOT HEALTHY（主动挂载后仍不满足），终止"); fs.writeFileSync("_u4g560-exec.json", JSON.stringify({ healthy, probe, net, shot: SHOT }, null, 1)); cdp.close(); process.exit(3); }

// —— 关两层弹窗：① 顶层「长时间未操作/确定」 ② textbook 帧「Unit test 4」✕ ——
const allFrames = () => frames();
const closeTop = async () => {
  for (const f of await allFrames()) {
    if (!/pc\.html/.test(f.url)) continue;
    const q = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
      const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^确定$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);
      if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();
      const x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);return{x,y,hit:document.elementFromPoint(x,y)?.tagName};})()`, f.ctx).catch(() => null);
    if (q && q.hit === "BUTTON") { await mouse(q.x, q.y); log("关顶层超时弹窗 @", JSON.stringify(q)); await sleep(1500); return true; }
  }
  return false;
};
const closeUnitTest = async () => {
  // ✕ 在 textbook iframe 内；坐标需加 iframe 偏移
  const off = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub|textbook/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`).catch(() => ({ ox: 0, oy: 0 }));
  const q = await raw(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
    if(!/考前须知/.test(document.body.innerText))return {gone:true};
    const v=[...document.querySelectorAll('button,div,span,a,i')].filter(e=>/acknowledge_closeBtn/.test((e.className||'').toString())&&e.getBoundingClientRect().width>8);
    if(!v.length)return {err:'no close btn'};const e=v[0];e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();
    const x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);const at=document.elementFromPoint(x,y);
    return {x,y,hit:at?at.tagName:null,hitCls:at?(at.className||'').toString().slice(0,40):''};})()`).catch(e => ({ err: String(e).slice(0, 120) }));
  log("Unit test 弹窗关闭按钮(frame内):", JSON.stringify(q), " iframe偏移:", JSON.stringify(off));
  if (q && !q.gone && !q.err && Number.isFinite(q.x)) {
    await mouse(q.x + (off.ox || 0), q.y + (off.oy || 0));
    log("已点 ✕ @", q.x + (off.ox || 0), q.y + (off.oy || 0));
    await sleep(1800);
  }
  return await raw(`/考前须知/.test(document.body.innerText)`).catch(() => true);
};
await closeTop();
let stillUT = true;
for (let k = 0; k < 3 && stillUT; k++) { stillUT = await closeUnitTest(); if (stillUT) await sleep(800); }
log("Unit test 弹窗仍在:", stillUT);
// 再清一层确认 + 清遮罩
await closeTop();
await raw(`(()=>{for(const m of document.querySelectorAll('[class*=backdrop],[class*=modalOverlay]')){m.style.display='none';m.style.pointerEvents='none';}return 1;})()`).catch(() => 0);

// 关弹窗后截图（视觉确认）
const s1 = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (s1.data) { fs.writeFileSync("shots/U4-u4g560-clean.png", Buffer.from(s1.data, "base64")); log("清弹窗后截图:", fs.statSync("shots/U4-u4g560-clean.png").size, "bytes"); }

// —— 定位「打开精读模式」：scrollIntoView + elementFromPoint 必须命中 pill 自身/子元素 ——
const off = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub|textbook/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`).catch(() => ({ ox: 0, oy: 0 }));
let opened = await raw(`/关闭精读模式/.test(document.body.innerText)`).catch(() => false);
let pillOK = null;
for (let k = 0; k < 6 && !opened; k++) {
  const p = await raw(Q(`const b=document.getElementById(id);
    if(!b)return {err:'no elem'};b.scrollIntoView({block:'center'});
    const pl=[...b.querySelectorAll('*')].find(e=>(e.innerText||'').replace(/\\s+/g,'')==='打开精读模式'&&e.getBoundingClientRect().width>10);
    if(!pl)return {err:'no pill'};pl.scrollIntoView({block:'center'});const r=pl.getBoundingClientRect();
    const x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);const at=document.elementFromPoint(x,y);
    const ok=!!at&&(pl===at||pl.contains(at)||at.contains(pl));
    return {x,y,w:Math.round(r.width),h:Math.round(r.height),ok,
      at:at?(at.tagName+'.'+(at.className||'').toString().slice(0,45)):null,
      atText:at?(at.innerText||'').replace(/\\s+/g,'').slice(0,40):''};`)).catch(e => ({ err: String(e).slice(0, 150) }));
  log(`pill#${k}:`, JSON.stringify(p));
  if (p && !p.err && p.ok && Number.isFinite(p.x)) {
    pillOK = p;
    await sleep(900);
    await mouse(p.x + (off.ox || 0), p.y + (off.oy || 0));
    log("点击 打开精读模式 @", p.x + (off.ox || 0), p.y + (off.oy || 0));
    await sleep(5500);
    await closeTop();
    opened = await raw(`/关闭精读模式/.test(document.body.innerText)`).catch(() => false);
    log("精读打开:", opened);
  } else if (p && p.at && /modal|backdrop|acknowledge|Overlay/i.test(p.at)) {
    log("仍有遮罩，重试关闭弹窗");
    await closeTop(); await closeUnitTest();
    await raw(`(()=>{for(const m of document.querySelectorAll('[class*=backdrop],[class*=modalOverlay]')){m.style.display='none';m.style.pointerEvents='none';}return 1;})()`).catch(() => 0);
    await sleep(1200);
  } else await sleep(1200);
}
// 打开后截图（确认界面已变）
const s2 = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (s2.data) { fs.writeFileSync("shots/U4-u4g560-opened.png", Buffer.from(s2.data, "base64")); log("打开后截图:", fs.statSync("shots/U4-u4g560-opened.png").size, "bytes"); }

// —— 音频拖尾 + ended（精读音频听完）——
const au = await raw(`(()=>{const as=[...document.querySelectorAll('audio')].filter(x=>isFinite(x.duration)&&x.duration>0);
  if(!as.length)return {err:'no audio with duration',total:document.querySelectorAll('audio').length};
  const a=as[as.length-1];const d=a.duration;a.pause();a.playbackRate=16;a.muted=true;
  a.currentTime=Math.max(0,d-1.2);try{a.play().catch(()=>{});}catch(e){}
  a.dispatchEvent(new Event('timeupdate'));return {n:as.length,d:Math.round(d),t:Math.round(a.currentTime)};})()`).catch(e => ({ err: String(e).slice(0, 150) }));
log("音频拖尾:", JSON.stringify(au));
await sleep(5000);
const auEnd = await raw(`(()=>{const as=[...document.querySelectorAll('audio')].filter(x=>isFinite(x.duration)&&x.duration>0);
  const a=as[as.length-1];if(!a)return {err:'no audio'};a.currentTime=a.duration;
  a.dispatchEvent(new Event('timeupdate'));a.dispatchEvent(new Event('ended'));
  return {t:Math.round(a.currentTime),d:Math.round(a.duration),ended:a.ended};})()`).catch(e => ({ err: String(e).slice(0, 150) }));
log("音频 ended:", JSON.stringify(auEnd));
await sleep(8000);
// 慢滚停留
for (let k = 0; k < 8; k++) {
  await raw(Q(`const e=document.getElementById(id);if(e)e.scrollIntoView({block:'center'});
    const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
    sc.scrollBy(0,Math.round(innerHeight*0.45));return 1;`)).catch(() => 0);
  await sleep(2600);
}
const hitFin = net.filter(x => /finishNode/.test(x.url) && new RegExp(ID).test(x.post));
log("相关上报:", net.length, " 命中 u4g560 finishNode:", hitFin.length);
const dom = await raw(Q(`const b=document.getElementById(id);const t=b?(b.innerText||b.textContent||''):'';
  return {nodeId:${E},exists:!!b,len:t.length,status:b?b.getAttribute('data-lexical-node-status'):null,
    head:t.replace(/\\s+/g,' ').slice(0,180),hasOpenPill:/打开精读模式/.test(t),
    bodyHasClose:/关闭精读模式/.test(document.body.innerText),unitTestGone:!/考前须知/.test(document.body.innerText)};`)).catch(e => ({ err: String(e).slice(0, 150) }));
log("DOM 证据:", JSON.stringify(dom, null, 1).slice(0, 900));

// —— 最终截图 ——
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(SHOT, Buffer.from(shot.data, "base64")); log("最终截图:", SHOT, fs.statSync(SHOT).size, "bytes"); }

// —— 核验 state.pass：优先用捕获到的真实 u4 进度响应体；若无则触发一次 SPA 路由刷新后重抓 ——
const findPass = () => {
  for (const r of progResponses) {
    if (!r.body || !/\/u4\//.test(r.url)) continue;
    try { const j = JSON.parse(r.body); const v = j.rt?.leafs?.["u4g560"]; if (v) return { src: "captured", unit: j.rt?.unit_id, state: v.state, pass: v.state?.pass, tab: v.tab_type }; } catch {}
  }
  return null;
};
let check = findPass();
if (!check) {
  // 触发 SPA 重新请求进度（切 hash 后再切回），等响应
  const top = (await frames()).find(f => /pc\.html/.test(f.url) && f.ctx);
  await ev(`location.hash='#/${COURSE}/courseware/u4/u4g558/u4g559/u4g560'`, top.ctx).catch(() => {});
  await sleep(7000);
  check = findPass();
}
if (!check) check = { err: "未捕获到 u4 course_progress 响应", captured: progResponses.length, urls: progResponses.map(r => r.url.slice(-70)) };
log("PASS CHECK:", JSON.stringify(check));
if (check && check.pass === 1) fs.writeFileSync("_u4g560-prog-live.json", JSON.stringify(JSON.parse(progResponses.find(r => /\/u4\//.test(r.url) && r.body).body), null, 1));

fs.writeFileSync("_u4g560-exec.json", JSON.stringify({ healthy, probe, stillUT, pillOK, opened, au, auEnd, hitFin, dom, net, check, shot: SHOT }, null, 1));
cdp.close();
