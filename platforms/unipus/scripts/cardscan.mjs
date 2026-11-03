import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const TID=process.env.TID||"84B74FE42AFBE800BB4140C151D85DA8";
const L=await connect(TID);
const {ev,frames}=L;
await sleep(1200);
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const seen={};
const sh=await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;return Math.round(sc.scrollHeight);})()`,tb.ctx);
console.log("scrollHeight:",sh);
for(let y=0;y<sh;y+=900){
  await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollTop=${y};return 1;})()`,tb.ctx);
  await sleep(260);
  const r=await ev(`(()=>[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')].map(c=>({a:c.getAttribute('data-lexical-node-anchor'),s:c.getAttribute('data-lexical-node-status'),t:(c.innerText||'').replace(/\\s+/g,' ').slice(0,40)})))()`,tb.ctx).catch(()=>[]);
  (r||[]).forEach(x=>{ if(x.a&&!seen[x.a]) seen[x.a]=x; });
}
console.log("发现的卡片:");
Object.entries(seen).forEach(([k,v])=>console.log("  ",k,"status="+v.s,"|",v.t));
fs.writeFileSync("cards-seen.json",JSON.stringify(seen,null,1));
L.cdp.close();
