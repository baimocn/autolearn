import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
const { ev, frames }=L;
// dismiss 我知道了 in every frame
for(const f of await frames()){
  await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');
    const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);
    if(!v.length)return 0; v[v.length-1].click(); return 1;})()`, f.ctx).catch(()=>0);
}
await sleep(800);
// verify modal gone on top
const m=await ev(`[...document.querySelectorAll('[class*=modal],[role=dialog]')].filter(x=>x.getBoundingClientRect().height>100&&/我知道了/.test(x.innerText)).length`);
console.log("rules modal left:", m);
L.cdp.close();
