import { connect } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp } = L;
for (const f of await frames()) {
  if (!/pc\.html/.test(f.url)) continue;
  const r = await ev(`(()=>{
    const n=s=>(s||'').replace(/\s+/g,'');
    const hits=[...document.querySelectorAll('*')].filter(e=>n(e.innerText)==='我知道了');
    const wrap=document.querySelector('.ant-modal-wrap');
    return {hits:hits.map(e=>{const b=e.getBoundingClientRect();return {tag:e.tagName,cls:(e.className||'').toString().slice(0,60),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width),h:Math.round(b.height),vis:getComputedStyle(e).visibility};}),
      wrap:wrap?{cls:wrap.className.toString().slice(0,60),disp:getComputedStyle(wrap).display,op:getComputedStyle(wrap).opacity}:null,
      bodyLen:document.body.innerText.length};
  })()`, f.ctx).catch(e=>"ERR "+String(e).slice(0,80));
  console.log(JSON.stringify(r,null,1).slice(0,3000));
}
cdp.close();
