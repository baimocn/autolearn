// _u4g813_diag.mjs — 只读诊断：u4 渲染态 + quiz-paper-link 卡片（UT.png = Unit test 4）
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
const tabs = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => t.type === "page" && /ucontent\.unipus\.cn/.test(t.url));
let target = null;
for (const t of tabs) {
  const L0 = await connect(t.id);
  const fl = await L0.frames();
  const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
  const ch = tb ? (tb.url.match(/chapter\/([0-9a-f-]+)/) || [])[1] : "";
  L0.cdp.close();
  if (ch === CH[4]) { target = t.id; break; }
}
console.log("u4 reader:", target);
const L = await connect(target);
const fl = await L.frames();
const tb = fl.find(f => /textbook\/book/.test(f.url) && f.ctx);
const d = await L.ev(`(()=>{
  const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
  const body=document.body.innerText||'';
  const cards=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')].map((c,i)=>{
    const img=c.querySelector('img');let src='';try{src=decodeURIComponent(img?img.src:'');}catch(e){src=img?img.src:'';}
    const r=c.getBoundingClientRect();
    return {i,id:c.id,status:c.getAttribute('data-lexical-node-status'),
      imgTail:src.slice(-60),top:Math.round(r.top),left:Math.round(r.left),w:Math.round(r.width),h:Math.round(r.height)};
  });
  return {bodyLen:body.length,hasLogin:/登录|账号|密码|SSO/.test(body),hasLimit:/限流|稍后再试|非单元学习周期|加载失败/.test(body),
    blocks:bs.length,textNonempty:bs.filter(x=>(x.textContent||'').replace(/\\s+/g,'').length>5).length,
    innerNonempty:bs.filter(x=>(x.innerText||'').replace(/\\s+/g,'').length>5).length,
    statuses:[...new Set(bs.map(x=>x.getAttribute('data-lexical-node-status')))],
    cards, hasUnitTest:/Unit test/i.test(body),
    utRows:[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].filter(x=>/Unit test/i.test(x.innerText||'')).map(x=>(x.innerText||'').replace(/\\s+/g,' ').trim().slice(0,30)).slice(0,4),
    ruleBtns:[...document.querySelectorAll('button,div,span,a')].filter(x=>/^(我知道了|知道了)$/.test((x.innerText||'').replace(/\\s+/g,''))&&x.getBoundingClientRect().width>15).length};})()`, tb.ctx).catch(e => ({ err: String(e).slice(0, 200) }));
console.log(JSON.stringify(d, null, 1).slice(0, 3500));
L.cdp.close();
