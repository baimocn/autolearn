import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
const exam=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(!exam){console.log('NO EXAM FRAME');cdp.close();process.exit(2);}
console.log('exam',exam.url.slice(0,95));
// 答满26题
const r=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];let n=0;
 items.forEach(q=>{
  const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];
  if(rows.length){rows[0].click();n++;return;}
  const tfs=[...q.querySelectorAll('[class*=answer_optionTF]')];
  if(tfs.length){tfs[0].click();n++;return;}
  const el=q.querySelector('input,textarea');
  if(el){const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
   Object.getOwnPropertyDescriptor(proto,'value').set.call(el,'Agriculture and sustainable development');
   el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));n++;}
 });return{items:items.length,answered:n};})()`,exam.ctx).catch(e=>String(e));
console.log('answer',JSON.stringify(r));
await sleep(2500);
const prog=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');const m=t.match(/([0-9]+)\/26/);return m?m[0]:'n/a';})()`,exam.ctx).catch(()=>'err');
console.log('progress',prog);
// 提交按钮（实时取坐标）
const sub=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='提交'&&e.getBoundingClientRect().width>25);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,exam.ctx).catch(()=>null);
console.log('submit',JSON.stringify(sub));
if(sub){await mouse(sub.x,sub.y);console.log('clicked submit');await sleep(3500);}
// 确认
for(let k=0;k<8;k++){
 let hit=false;
 for(const f of await frames()){
  const c=await ev(`(()=>{const b=document.querySelector('.ant-modal-confirm-btns .ant-btn-primary');if(!b)return 0;b.click();return 1;})()`,f.ctx).catch(()=>0);
  if(c){hit=true;break;}
 }
 if(hit){console.log('confirmed');break;}
 await sleep(1500);
}
await sleep(6000);
// 成绩提交
let posted=false;
for(let k=0;k<12;k++){
 for(const f of await frames()){
  const x=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='成绩提交'&&e.getBoundingClientRect().width>25);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>0);
  if(x){posted=true;break;}
 }
 if(posted){console.log('成绩提交');break;}
 await sleep(2000);
}
await sleep(4000);
for(const f of await frames()){
 const t=await ev(`(()=>{const x=document.body.innerText.replace(/[ ]+/g,' ');const m=x.match(/(最终得分|测试满分|本次成绩提交成功|提交成功|成绩提交成功)[^。]{0,60}/);return m?m[0]:'';})()`,f.ctx).catch(()=>"");
 if(t)console.log('RESULT',t);
}
const {data}=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId);
fs.writeFileSync("ut4-final.png",Buffer.from(data,"base64"));
cdp.close();
