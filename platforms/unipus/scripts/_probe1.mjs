import { connect } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp } = L;
for (const f of await frames()) {
  if (!/pc\.html|textbook\/book/.test(f.url)) continue;
  const r = await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];const ne=bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length;const mods=[...document.querySelectorAll('[class*=ant-modal]')].map(e=>(e.innerText||'').replace(/\s+/g,' ').slice(0,50)).filter(Boolean);const cl=document.querySelector('[class*=catalog_drawer-close]');return JSON.stringify({blocks:bs.length,nonempty:ne,txt:document.body.innerText.length,drawer:cl?Math.round(cl.getBoundingClientRect().width):0,mods:mods.slice(0,3)});})()`, f.ctx).catch(e=>"ERR");
  console.log("["+(f.url||"").slice(0,48)+"]", r);
}
cdp.close();
