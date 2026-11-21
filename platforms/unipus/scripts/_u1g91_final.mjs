// _u1g91_final.mjs — 重新作答 → 按6个正确答案重选下拉 → 提交 → 截图 + DOM 证据
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[u1g91-fin]", ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 120)));
const I = 25;
const SHOT = "shots/U1-u1g91.png";
// 答案（完整文本，修复 innerText 吞 s 的问题）
const ANSWERS = [
  "proposed by China in 2013",
  "lighter than grain yet more precious",
  "grown in the Yangtze River basin for millennia",
  "though small in size",
  "rich in spiritual symbolism and ritual value",
  "a nation with a profound culture and a long history of farming",
];
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
let target = null;
for (const t of tabs) {
  const L0 = await connect(t.id);
  const fl = await L0.frames();
  const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
  const ch = tb ? (tb.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] : "";
  L0.cdp.close();
  if (ch === CH[1]) { target = t.id; break; }
}
const L = await connect(target);
const { ev, frames, cdp, sessionId } = L;
const fl = await frames();
const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
const raw = (e) => ev(e, tb.ctx);
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const net = [];
await cdp.send("Network.enable", {}, sessionId).catch(() => {});
cdp.on("Network.requestWillBeSent", (p) => {
  const u = (p.request && p.request.url) || "";
  if (/answer|submitScore|course_progress|question|finishNode/i.test(u)) net.push({ url: u.slice(-130), post: (p.request.postData || "").slice(0, 500) });
});
// healthy 探针
let healthy = false, probeLast = {};
for (let k = 0; k < 10 && !healthy; k++) {
  probeLast = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const b=bs[${I}];return {blocks:bs.length,nonempty:bs.filter(x=>(x.innerText||'').replace(/\\s+/g,'').length>5).length,
      targetLen:b?(b.innerText||'').length:0,redo:b?/重新作答/.test(b.innerText||''):false};})()`).catch(() => ({}));
  if (probeLast.nonempty > 0 && tb.url.includes(CH[1])) { healthy = true; log("HEALTHY ✓", JSON.stringify(probeLast)); break; }
  await sleep(1500);
}
if (!healthy) { log("NOT HEALTHY"); cdp.close(); process.exit(3); }
// ① 重新作答
const redo = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];
  const el=[...b.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\\s+/g,''))==='重新作答');
  if(!el)return 0;el.scrollIntoView({block:'center'});el.click();return 1;})()`).catch(() => 0);
log("重新作答:", redo);
await sleep(3500);
// ② 逐个下拉按答案选（React onClick 打开 → 全局 optionItem 精确/包含匹配）
const picked = await raw(`(async()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];
  const trigs=[...b.querySelectorAll('[class*=digEmptySelectView_selectTrigger]')];
  const wants=${JSON.stringify(ANSWERS)};
  const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
  const result=[];
  for(let k=0;k<trigs.length;k++){
    const t=trigs[k];
    const rk=Object.keys(t).find(x=>x.startsWith('__reactProps'));
    try{if(rk&&t[rk].onClick)t[rk].onClick({stopPropagation(){},preventDefault(){},target:t,currentTarget:t,nativeEvent:{}});else t.click();}catch(e){t.click();}
    await new Promise(r=>setTimeout(r,650));
    const opts=[...document.querySelectorAll('[class*=digEmptySelectView_optionItem]')].filter(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0);
    const w=wants[k];
    const hit=opts.find(o=>norm(o.innerText)===norm(w))||opts.find(o=>norm(o.innerText).includes(norm(w)))||opts.find(o=>norm(w).includes(norm(o.innerText)))||opts[0];
    if(hit){
      const ork=Object.keys(hit).find(x=>x.startsWith('__reactProps'));
      try{if(ork&&hit[ork].onClick)hit[ork].onClick({stopPropagation(){},preventDefault(){},target:hit,currentTarget:hit,nativeEvent:{}});else hit.click();}catch(e){hit.click();}
      result.push({k,want:w,got:norm(hit.innerText).slice(0,55)});
    } else result.push({k,want:w,got:'NO_OPTION'});
    await new Promise(r=>setTimeout(r,300));
  }
  return result;})()`).catch(e => ({ err: String(e).slice(0, 150) }));
log("按答案选择:", JSON.stringify(picked, null, 1).slice(0, 2000));
await sleep(800);
// 检查6个是否都填了
const filled = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];
  return [...b.querySelectorAll('[class*=digEmptySelectView_selectTrigger]')].map(e=>(e.innerText||'').replace(/\\s+/g,' ').slice(0,50));})()`).catch(() => []);
log("6个下拉当前值:", JSON.stringify(filled));
// ③ 提交 + 确认
const sub = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];
  const el=[...b.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\\s+/g,''))==='提交');
  if(!el)return 0;el.scrollIntoView({block:'center'});el.click();return 1;})()`).catch(() => 0);
log("提交:", sub);
await sleep(2500);
for (let k = 0; k < 5; k++) {
  let hit = false;
  for (const f of await frames()) {
    const c = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(确定|确认)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>18);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
    if (c) { await mouse(c.x, c.y); hit = true; await sleep(1500); break; }
  }
  if (!hit) break;
}
await sleep(6000);
// ④ 最终状态
const st = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];
  const t=(b.innerText||'').replace(/\\s+/g,' ');
  return {len:t.length,score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null,
    redo:/重新作答/.test(t),sub:/提交/.test(t),hasAnswer:/答案|正确答案/.test(t),text:t.slice(0,500)};})()`).catch(() => ({}));
log("最终状态:", JSON.stringify(st, null, 1).slice(0, 1000));
log("相关网络:", net.length, JSON.stringify(net.slice(0, 8)).slice(0, 1500));
// ⑤ DOM 证据
const dom = await raw(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];
  const t=(b.innerText||'').replace(/\\s+/g,' ');
  return {blockIndex:${I},anchor:b.getAttribute('data-lexical-node-anchor'),status:b.getAttribute('data-lexical-node-status'),
    len:t.length,score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null,
    redo:/重新作答/.test(t),sub:/提交/.test(t),hasAnswer:/答案|正确答案/.test(t),text:t.slice(0,420)};})()`).catch(e => ({ err: String(e).slice(0, 150) }));
log("DOM 证据:", JSON.stringify(dom, null, 1).slice(0, 1200));
// ⑥ 截图
fs.mkdirSync("shots", { recursive: true });
const shot = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId).catch(() => ({ data: null }));
if (shot.data) { fs.writeFileSync(SHOT, Buffer.from(shot.data, "base64")); log("截图已存:", SHOT, fs.statSync(SHOT).size, "bytes"); }
fs.writeFileSync("_u1g91-final.json", JSON.stringify({ healthy, probeLast, redo, picked, filled, st, net, dom, shot: SHOT }, null, 1));
cdp.close();
