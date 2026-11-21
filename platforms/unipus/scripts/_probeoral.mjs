// _probeoral.mjs <chain> — 深路由进单个节点，报告块内容与控件
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE } from "./reader.mjs";
const ROUTE = process.argv[2];
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
await cdp.send("Page.enable", {}, sessionId).catch(()=>{});
await cdp.send("Page.navigate", { url: `${READER}#/${COURSE}/courseware/${ROUTE}` }, sessionId);
await sleep(11000);
for (const f of await frames()) {
  await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');for(const b of document.querySelectorAll('button,div,span,a')){if(/^(我知道了|知道了)$/.test(n(b.innerText)))b.click();}return 1;})()`, f.ctx).catch(()=>{});
}
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx);
if (!tb) { console.log("NO TB"); process.exit(1); }
const r = await ev(`(()=>{
 const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
 const rec=[...document.querySelectorAll('[class*=record_]')].map(e=>(e.className||'').toString().slice(0,60));
 const txt=document.body.innerText.replace(/\s+/g,' ');
 return {blocks:bs.length, lens:bs.map(b=>(b.innerText||'').replace(/\s+/g,'').length), rec:rec.slice(0,8),
  hasOral:/录音|麦克风|朗读|个人陈述|Read aloud/i.test(txt), head:txt.slice(0,300)};
})()`, tb.ctx).catch(e=>"ERR "+String(e).slice(0,100));
console.log("ROUTE", ROUTE);
console.log(JSON.stringify(r,null,1).slice(0,2200));
cdp.close();
