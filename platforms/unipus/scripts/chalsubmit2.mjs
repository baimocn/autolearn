import { connect, sleep } from "./utlib.mjs";
const U=Number(process.argv[2]);
const TID=process.env.TID||"84B74FE42AFBE800BB4140C151D85DA8";
const log=(...a)=>console.log(...a);
const L=await connect(TID);
const {ev,frames}=L;
const getCf=async()=>{ for(let k=0;k<12;k++){ const f=(await frames()).find(x=>/testing\/(challenge|diagnosis)\/book/.test(x.url)&&x.ctx); if(f) return f; await sleep(700);} return null; };
let cf=await getCf();
if(!cf){ log("!! 无挑战帧"); process.exit(1); }
const clickIn=async(ctx,txt)=>{
  return await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>e.children.length<=1&&n(e.innerText)===${JSON.stringify(txt)}&&e.getBoundingClientRect().width>18&&e.getBoundingClientRect().height>12);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,ctx).catch(()=>0);
};
log("提交:",await clickIn(cf.ctx,"提交"));
await sleep(2500);
for(const t of ["确定","确认"]){
  const r=await clickIn(cf.ctx,t);
  if(r){ log("确认:",t); break; }
}
await sleep(4000);
cf=await getCf();
const t1=String(await ev(`document.body.innerText`,cf.ctx)||"").replace(/\s+/g," ");
const k1=t1.indexOf("成绩");
log("结果:", t1.slice(Math.max(0,k1-160), k1+260));
// 成绩提交
const r3=await clickIn(cf.ctx,"成绩提交");
log("成绩提交:",r3);
await sleep(3500);
const t2=String(await ev(`document.body.innerText`,cf.ctx)||"").replace(/\s+/g," ");
const k2=t2.indexOf("成绩");
log("最终:", t2.slice(Math.max(0,k2-120), k2+240));
L.cdp.close();
