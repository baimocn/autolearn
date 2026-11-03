import { connect, sleep } from "./utlib.mjs";
import { CDP } from "./cdp.mjs";
const idxs=(process.argv[2]||"20,21,22").split(",").map(Number);
const ver=await (await fetch("http://127.0.0.1:9222/json/version")).json();
const READER="https://ucontent.unipus.cn/_ipublishpc_default/pc.html?cid=1837944375799767040&theme=3264FA&aitutorialId=34657&cloudCurriculaId=356008&strategyId=4793137&schoolId=9341&source=cloud&sourceCallBackUrl=https://uai.unipus.cn/app/cmgt/resource-detail/?backId=1793504265186&courseResourceId=20001221469";
const boot=await CDP.connect(ver.webSocketDebuggerUrl);
const r=await boot.send("Target.createTarget",{url:READER+"#/course-v3:819008cfa01e0f2+xnkdxyy+20250801090513/courseware/u1/u1g2"});
const tid=r.targetId; boot.close();
const L=await connect(tid);
const {ev,frames}=L;
let tb=null;
for(let i=0;i<40;i++){ await sleep(1000); tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx); if(tb) break; }
for(let i=0;i<25;i++){ await sleep(700); const n=await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`,tb.ctx).catch(()=>0); if(n>0) break; }
for(const f of await frames()){ await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(v.length)v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>{}); }
for(const i of idxs){
  for(let k=0;k<3;k++){ await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`,tb.ctx); await sleep(1200); }
  const t=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    return b?(b.innerText||'').replace(/\\s+/g,' ').slice(0,120):'';})()`,tb.ctx);
  console.log(`#${i}:`, String(t).slice(0,110));
}
L.cdp.close();
