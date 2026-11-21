import { connect } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp } = L;
const tbf = (await frames()).find(x => /textbook\/book/.test(x.url) && x.ctx);
const r = await ev(`(()=>{
 const titles=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')];
 const t2=titles.filter(e=>(e.innerText||'').replace(/\s+/g,'').startsWith('Unit2'));
 if(!t2.length) return {err:'no Unit2', sample:titles.slice(0,12).map(e=>(e.innerText||'').replace(/\s+/g,' ').slice(0,40))};
 const el=t2[0];
 const chain=[];let n=el;
 for(let i=0;i<6&&n;i++){chain.push({cls:(n.className||'').toString().slice(0,80), kids:n.children?n.children.length:0});n=n.parentElement;}
 // 找容器里所有文本节点
 let root=el; for(let i=0;i<5&&root.parentElement;i++) root=root.parentElement;
 const near=[...root.querySelectorAll('*')].filter(e=>e.children.length===0&&(e.innerText||'').trim().length>2).slice(0,30).map(e=>{const b=e.getBoundingClientRect();return {t:(e.innerText||'').trim().slice(0,40), cls:(e.className||'').toString().slice(0,50), x:Math.round(b.left+b.width/2), y:Math.round(b.top+b.height/2), w:Math.round(b.width)};});
 return {found:t2.length, chain, near};
})()`, tbf.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1).slice(0,5000));
cdp.close();
