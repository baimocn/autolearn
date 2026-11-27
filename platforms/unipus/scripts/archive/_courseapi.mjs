import { connect, sleep } from "./utlib.mjs";
import { COURSE } from "./reader.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp } = L;
const top = (await frames()).find(f => /pc\.html/.test(f.url) && f.ctx);
console.log("top ctx", top && top.ctx);
const r = await ev(`(async()=>{
  try{
    const r1 = await fetch('/api/course/${COURSE}/default', {credentials:'include'});
    const j = await r1.json();
    const u = j.units||j.data?.units||[];
    return u.map(x=>({id:x.id, name:x.name, start:x.startTime||x.start, end:x.endTime||x.end, status:x.status, pass:x.passNum, total:x.totalNum}));
  }catch(e){return 'ERR '+String(e).slice(0,120);}
})()`, top.ctx).catch(e=>String(e));
console.log(JSON.stringify(r).slice(0, 2000));
cdp.close();
