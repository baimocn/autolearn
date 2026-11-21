import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const ex=(await L.frames()).find(f=>/\/exam\//.test(f.url)&&f.ctx);
// 在 challenge 帧点确定
const r=await ev(`(()=>{
  const modals=[...document.querySelectorAll('.ant-modal-wrap,[class*=modal]')];
  const holder=modals.find(m=>/你已完成本轮全部挑战/.test(m.innerText||''));
  if(!holder)return 'no-holder';
  const btns=[...holder.querySelectorAll('button')].filter(b=>(b.innerText||'').replace(/\s+/g,'')==='确定');
  if(!btns.length)return 'no-btn:'+holder.innerText.replace(/\s+/g,' ').slice(0,60);
  btns[btns.length-1].click();
  return 'clicked';
})()`,ex.ctx);
console.log("confirm:",r);
await sleep(4000);
// 成绩提交
let posted=false;
for(let k=0;k<8;k++){
  const rr=await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='成绩提交'&&e.getBoundingClientRect().width>12);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,ex.ctx).catch(()=>0);
  if(rr){console.log("成绩提交 clicked");posted=true;break;}
  await sleep(1600);
}
console.log("posted:",posted);
await sleep(3000);
const t=await ev(`(()=>{const t2=document.body.innerText;const m=t2.replace(/\s+/g,' ').match(/(本轮成绩|最终得分|提交成功|成绩提交成功)[^。]{0,60}/);return m?m[0]:'';})()`,ex.ctx).catch(()=>"");
console.log("RESULT:",t);
const fs=await import("node:fs");
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
fs.writeFileSync("u6-conf.png",Buffer.from(data,"base64"));
L.cdp.close();
