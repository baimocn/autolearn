import { connect, sleep } from "./utlib.mjs";
import { CDP } from "./cdp.mjs";
const ver=await (await fetch("http://127.0.0.1:9222/json/version")).json();
const READER="https://ucontent.unipus.cn/_ipublishpc_default/pc.html?cid=1837944375799767040&theme=3264FA&aitutorialId=34657&cloudCurriculaId=356008&strategyId=4793137&schoolId=9341&source=cloud&sourceCallBackUrl=https://uai.unipus.cn/app/cmgt/resource-detail/?backId=1793504265186&courseResourceId=20001221469";
const ROUTE="#/course-v3:819008cfa01e0f2+xnkdxyy+20250801090513/courseware/u1/u1g2";
const boot=await CDP.connect(ver.webSocketDebuggerUrl);
const r=await boot.send("Target.createTarget",{url:READER+ROUTE});
const tid=r.targetId; boot.close();
const L=await connect(tid);
const {ev,frames}=L;
let tb=null;
for(let i=0;i<40;i++){ await sleep(1000); tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx); if(tb) break; }
if(!tb){ console.log("no tb"); process.exit(1); }
for(let i=0;i<25;i++){ await sleep(800); const n=await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`,tb.ctx).catch(()=>0); if(n>0) break; }
for(const f of await frames()){ await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(v.length)v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>{}); }
const n=await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`,tb.ctx);
const idx=[];
for(let i=0;i<n;i++){
  const isOral=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    if(!b)return 0; const g=b.querySelector('[data-ipublish-question-group-type]');
    return g&&/oral/.test(g.getAttribute('data-ipublish-question-group-type'))?1:0;})()`,tb.ctx).catch(()=>0);
  if(isOral) idx.push(i);
}
const res=[];
for(const i of idx){
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`,tb.ctx);
  await sleep(1600);
  const one=await ev(`(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  if(!b) return null;
  const g=b.querySelector('[data-ipublish-question-group-type]');
  const gt=g?g.getAttribute('data-ipublish-question-group-type'):'-';
  const res=[]; const q=s=>(s||'').replace(/\s+/g,' ').trim();
  const t=q(b.innerText);
  {
    const g=b.querySelector('[data-ipublish-question-group-type]');
    const gt=g?g.getAttribute('data-ipublish-question-group-type'):'-';
    if(!/oral/.test(gt)) return;
    const q=s=>(s||'').replace(/\\s+/g,' ').trim();
    const t=q(b.innerText);
    const parent=b.parentElement;
    res.push({i, gt,
      stub:t.slice(0,60).replace(/^计分 提交 /,''),
      hasStart:t.includes('点击开始'), hasReady:t.includes('准备录音'),
      hasRec:t.includes('开始录音'), hasStop:t.includes('结束录音')||t.includes('点击结束'),
      hasDone:t.includes('回放')||t.includes('重录'),
      subBtns:[...b.querySelectorAll('[class*=i-button_default-container]')].map(e=>q(e.innerText)),
      parentCls:String(parent.className).slice(0,40), parentId:parent.getAttribute('data-ipub-question-group-id')||''
    }
  return {i:${i}, gt, stub:t.slice(0,60).replace(/^计分 提交 /,''),
    hasStart:t.includes('点击开始'), hasReady:t.includes('准备录音'),
    hasRec:t.includes('开始录音'), hasStop:t.includes('结束录音')||t.includes('点击结束'),
    hasDone:t.includes('回放')||t.includes('重录'),
    subBtns:[...b.querySelectorAll('[class*=i-button_default-container]')].map(e=>q(e.innerText)),
    parentCls:String(b.parentElement.className).slice(0,40)};})()`,tb.ctx);
  if(one) res.push(one);
}
res.forEach(x=>console.log(JSON.stringify(x)));
L.cdp.close();
