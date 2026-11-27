// _u4g573_collapse.mjs — 检查目标块的折叠容器祖先 + 全局折叠容器状态 + 逐块状态
import { connect, sleep } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const log = (...a) => console.log("[g573-col]", ...a);
const ANCHOR = "VhDiwq6t7LToLXyo";
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(tabs[0].id);
const { ev, frames } = L;
const tb = (await frames()).find(f => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[4].slice(0, 12)));
const raw = e => ev(e, tb.ctx);
const r = await raw(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
  const b=bs.find(x=>(x.getAttribute('data-lexical-node-anchor')||'').startsWith(${JSON.stringify(ANCHOR)}));
  if(!b)return{err:'no target'};
  // 祖先折叠容器
  let e=b,anc=[];
  while(e&&e!==document.body){ if(/collapsible/i.test((e.className||'').toString())) anc.push({cls:(e.className||'').toString().slice(0,80),tag:e.tagName,id:e.id||'',hidden:e.hasAttribute('hidden'),h:Math.round(e.getBoundingClientRect().height)}); e=e.parentElement; }
  // 全局折叠容器
  const cols=[...document.querySelectorAll('[class*=collapsible-container]')].map(c=>{const bd=c.querySelector('[class*=collapsible-content]');return{cls:(c.className||'').toString().slice(0,60),h:Math.round(c.getBoundingClientRect().height),bodyH:bd?Math.round(bd.getBoundingClientRect().height):null,hidden:bd?bd.hasAttribute('hidden'):null,containsTarget:c.contains(b)};});
  // 逐块状态
  const per=bs.map((x,i)=>({i,s:x.getAttribute('data-lexical-node-status'),len:(x.innerText||'').length,anchor:(x.getAttribute('data-lexical-node-anchor')||'').slice(0,16)}));
  // 目标块 HTML 片段
  return{targetIdx:bs.indexOf(b),anc,cols:cols.slice(0,12),colTotal:cols.length,per,
    targetHTML:b.outerHTML.slice(0,600),
    scroll:{scTop:document.scrollingElement.scrollTop,scH:document.scrollingElement.scrollHeight,innerH:innerHeight},
    bodyLen:(document.body.innerText||'').length};})()`).catch(e => ({ err: String(e).slice(0, 200) }));
log(JSON.stringify(r, null, 1).slice(0, 4500));
fs.writeFileSync("_u4g573-collapse.json", JSON.stringify(r, null, 1));
L.cdp.close();
