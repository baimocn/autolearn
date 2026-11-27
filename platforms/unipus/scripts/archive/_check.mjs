import { connect } from "./utlib.mjs";
import { sleep } from "./cdp.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
if (!rd) { console.log("NO READER"); process.exit(1); }
const L = await connect(rd.id);
const { ev, frames, cdp } = L;
const fs = await frames();
console.log("FRAMES:");
fs.forEach(f => console.log(" ", (f.url||"").slice(0,120), "ctx=", f.ctx));
const info = await ev(`(()=>{const t=document.body.innerText.slice(0,300);return {url:location.href.slice(0,140), hasLogin:/登录|账号|密码/.test(t), text:t.replace(/\s+/g,' ').slice(0,200)};})()`).catch(e=>String(e));
console.log("TOP:", JSON.stringify(info));
const tb = fs.find(f => /textbook\/book/.test(f.url) && f.ctx);
if (tb) {
  const n = await ev(`(()=>{const b=document.querySelectorAll('div.editor-question-block.questionBlockNode');return {blocks:b.length, txt:document.body.innerText.length};})()`, tb.ctx).catch(e=>String(e));
  console.log("TB:", JSON.stringify(n), tb.url.slice(0,110));
} else console.log("NO TB FRAME");
cdp.close();
