import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const ex=(await L.frames()).find(f=>/\/exam\/|testing\//.test(f.url)&&f.ctx);
// 全部答 A / 填空 x
const n=await ev(`(async()=>{
  const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
  let a=0;
  for(const q of items){
    const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];
    if(rows.length){rows[0].click();a++;await new Promise(r=>setTimeout(r,120));continue;}
    const inp=q.querySelector('input,textarea');
    if(inp){const proto=inp.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto,'value').set.call(inp,'x');
      inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));a++;}
  }
  return a;})()`,ex.ctx);
console.log("answered events:",n);
await sleep(1200);
// 提交（帧内）
const sub=await ev(`(()=>{const n2=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n2(e.innerText)==='提交'&&e.getBoundingClientRect().width>10);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,ex.ctx);
console.log("submit:",sub);
await sleep(3000);
// 确定（ant-btn-primary）
let conf=0;
for(let k=0;k<6&&!conf;k++){
  conf=await ev(`(()=>{const b=document.querySelector('.ant-modal-confirm-btns .ant-btn-primary');if(!b)return 0;b.click();return 1;})()`,ex.ctx).catch(()=>0);
  if(!conf)await sleep(1200);
}
console.log("confirm:",conf);
await sleep(5000);
// 成绩提交（如果出现）
let posted=false;
for(let k=0;k<10;k++){
  const rr=await ev(`(()=>{const n2=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(成绩提交|提交成绩)$/.test(n2(e.innerText))&&e.getBoundingClientRect().width>12);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,ex.ctx).catch(()=>0);
  if(rr){console.log("成绩提交 clicked");posted=true;break;}
  await sleep(1500);
}
console.log("posted:",posted);
await sleep(3000);
const t=await ev(`(()=>{const t2=document.body.innerText;const m=t2.replace(/\s+/g,' ').match(/(本轮成绩|最终得分|提交成功|成绩提交成功|你的最终得分)[^。]{0,60}/);return m?m[0]:'';})()`,ex.ctx).catch(()=>"");
console.log("RESULT:",t);
const fs=await import("node:fs");
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
fs.writeFileSync("u2-ut-final.png",Buffer.from(data,"base64"));
L.cdp.close();
