import { connect, sleep } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const tb = (await frames()).find(f => f.url.includes("textbook/book") && f.ctx);
if (!tb) { console.log("NO TB"); process.exit(1); }
const r = await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
 const info=bs.map((b,i)=>({i,cls:(b.className||'').slice(0,40),len:(b.innerText||'').replace(/\s+/g,'').length}));
 return {n:bs.length, empty:info.filter(x=>x.len<5).length, sample:info.slice(0,8), bodyLen:document.body.innerText.length};})()`, tb.ctx);
console.log(JSON.stringify(r, null, 1));
cdp.close();
