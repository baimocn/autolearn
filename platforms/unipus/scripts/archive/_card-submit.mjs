import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const ex=(await L.frames()).find(f=>/\/exam\/|testing\//.test(f.url)&&f.ctx);
// 找答题卡里的提交按钮
const info=await ev(`(()=>{
  const card=[...document.querySelectorAll('[class*=answer-card_container]')];
  const out=[];
  card.forEach(c=>{[...c.querySelectorAll('button,div,span')].forEach(e=>{
    if(e.children.length<=1){const t=(e.innerText||'').replace(/\s+/g,'');if(/^(提交|保存进度)$/.test(t)){const b=e.getBoundingClientRect();out.push({t,w:Math.round(b.width),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)});}}});
  });
  return out;})()`,ex.ctx);
console.log("card btns:",JSON.stringify(info));
// JS 点提交
const r=await ev(`(()=>{const card=[...document.querySelectorAll('[class*=answer-card_container]')][0];if(!card)return 'no-card';
  const btns=[...card.querySelectorAll('button,div,span')].filter(e=>e.children.length<=1&&(e.innerText||'').replace(/\s+/g,'')==='提交');
  if(!btns.length)return 'no-btn';btns[btns.length-1].click();return 'clicked';})()`,ex.ctx);
console.log("submit:",r);
await sleep(3500);
// 确认
let conf=0;
for(const f of await L.frames()){
  conf=await ev(`(()=>{const b=document.querySelector('.ant-modal-confirm-btns .ant-btn-primary');if(!b)return 0;b.click();return 1;})()`,f.ctx).catch(()=>0);
  if(conf){console.log("confirm @",f.url.slice(40,60));break;}
}
console.log("confirm:",conf);
await sleep(5000);
// 成绩提交
let posted=false;
for(let k=0;k<10;k++){
  for(const f of await L.frames()){
    const rr=await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(成绩提交|提交成绩)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>12);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>0);
    if(rr){console.log("成绩提交 clicked");posted=true;break;}
  }
  if(posted)break;
  await sleep(1500);
}
console.log("posted:",posted);
await sleep(3000);
for(const f of await L.frames()){
  const t=await ev(`(()=>{const t2=document.body.innerText;const m=t2.replace(/\s+/g,' ').match(/(本轮成绩|最终得分|提交成功|你的最终得分)[^。]{0,60}/);return m?m[0]:'';})()`,f.ctx).catch(()=>"");
  if(t)console.log("RESULT:",t);
}
L.cdp.close();
