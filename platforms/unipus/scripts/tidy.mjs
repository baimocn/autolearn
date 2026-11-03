// tidy.mjs — 关掉学习规则弹窗 + 目录抽屉
import { connect, sleep } from "./utlib.mjs";
const L=await connect(process.argv[2]||"D6816472D8507E6DCD80805A5A543A96");
const {ev,frames,mouse}=L;
const off=await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return {ox:Math.round(r.left),oy:Math.round(r.top)};})()`).catch(()=>({ox:0,oy:0}));
// 1) 弹窗
for(let r=0;r<3;r++){
  let hit=false;
  for(const f of await frames()){
    const p=await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,f.ctx).catch(()=>null);
    if(p){ const it=/textbook/.test(f.url); await mouse(p.x+(it?off.ox:0),p.y+(it?off.oy:0)); console.log("modal closed"); hit=true; await sleep(1200); break; }
  }
  if(!hit) break;
}
// 2) 抽屉
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
if(tb){
  const dp=await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<4)return null;return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,tb.ctx).catch(()=>null);
  if(dp){ await mouse(dp.x+off.ox, dp.y+off.oy); console.log("drawer closed"); await sleep(800); }
  else console.log("drawer not open");
}
L.cdp.close();
