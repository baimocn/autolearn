// _vis.mjs <action> [args] — 视觉辅助：shot / click x y / state / scroll n / dom
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const A = process.argv[2] || "state";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
if (!rd) { console.log("NO READER"); process.exit(1); }
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const mouse = async (x,y) => {
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});
  await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);
};
const tb = () => frames().then(fs => fs.find(f => /textbook\/book/.test(f.url) && f.ctx));
if (A === "shot") {
  const out = process.argv[3] || "vis.png";
  const { data } = await cdp.send("Page.captureScreenshot",{format:"png"},sessionId);
  fs.writeFileSync(out, Buffer.from(data,"base64"));
  console.log("shot", out, Buffer.from(data,"base64").length);
} else if (A === "click") {
  const x = Number(process.argv[3]), y = Number(process.argv[4]);
  await mouse(x,y); console.log("clicked",x,y);
  await sleep(Number(process.argv[5]||1500));
  const out = process.argv[6] || "vis-after.png";
  const { data } = await cdp.send("Page.captureScreenshot",{format:"png"},sessionId);
  fs.writeFileSync(out, Buffer.from(data,"base64"));
  console.log("after-shot", out);
} else if (A === "scroll") {
  const n = Number(process.argv[3]||1), t = await tb();
  for (let k=0;k<n;k++) {
    await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(innerHeight*0.85));return 1;})()`, t.ctx).catch(()=>{});
    await sleep(900);
  }
  const { data } = await cdp.send("Page.captureScreenshot",{format:"png"},sessionId);
  fs.writeFileSync(process.argv[4]||"vis-scroll.png", Buffer.from(data,"base64"));
  console.log("scrolled",n);
} else if (A === "state") {
  const t = await tb();
  const r = await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    const ne=bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length;
    const mods=[...document.querySelectorAll('[class*=ant-modal-wrap]')].filter(e=>getComputedStyle(e).display!=='none').map(e=>(e.innerText||'').replace(/\s+/g,' ').slice(0,80));
    const dr=document.querySelector('[class*=catalog_drawer-close]');
    return {blocks:bs.length,nonempty:ne,txt:document.body.innerText.length,drawer:dr?Math.round(dr.getBoundingClientRect().width):0,mods:mods.slice(0,3),ch:location.href.slice(60,112)};})()`, t.ctx).catch(e=>String(e));
  console.log(JSON.stringify(r));
} else if (A === "blks") {
  const t = await tb();
  const r = await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
    return bs.map((b,i)=>{const x=(b.innerText||'').replace(/\s+/g,' ');return {i,len:x.length,head:x.slice(0,60)};});})()`, t.ctx).catch(e=>String(e));
  console.log(JSON.stringify(r,null,1).slice(0,6000));
}
cdp.close();
