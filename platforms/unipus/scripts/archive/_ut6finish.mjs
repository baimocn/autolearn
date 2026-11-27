import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
let ex=null,n=0;
for(let k=0;k<15;k++){
 ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
 if(ex){n=await ev(`document.querySelectorAll('[class*=answer-question-box_questionItem]').length`,ex.ctx).catch(()=>0);if(n>=26)break;}
 await sleep(2000);
}
console.log('questions',n);
// 再答一遍（把所有题都点第一个选项，覆盖未答的）
const r=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];let c=0;
 items.forEach(q=>{const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];
  if(rows.length){const chosen=rows.find(x=>/selected|checked|active/.test(x.className||''))||rows[0];chosen.click();c++;return;}
  const tfs=[...q.querySelectorAll('[class*=answer_optionTF]')];if(tfs.length){tfs[0].click();c++;return;}
  const el=q.querySelector('input,textarea');if(el){const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,'Agriculture and sustainable development');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));c++;}});
 return c;})()`,ex.ctx).catch(e=>String(e));
console.log('answered',r);
await sleep(2500);
const prog=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');const m=t.match(/([0-9]+)\/26/);return m?m[0]:'n/a';})()`,ex.ctx).catch(()=>'err');
console.log('progress',prog);
// 提交
const s=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='提交'&&e.getBoundingClientRect().width>25);if(!v.length)return'nobtn';v[v.length-1].click();return'clicked';})()`,ex.ctx).catch(e=>String(e));
console.log('submit',s);
await sleep(3500);
for(let k=0;k<8;k++){
 let hit=false;
 for(const f of await frames()){
  const c=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('.ant-modal-confirm-btns .ant-btn-primary,button,div,span')].filter(e=>e.children.length<=1&&/^(确定|确认|确 定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>0);
  if(c){hit=true;break;}
 }
 if(hit){console.log('confirmed');break;}
 await sleep(1500);
}
await sleep(6000);
for(const f of await frames()){
 const t=await ev(`(()=>{const x=document.body.innerText.replace(/[ ]+/g,' ');const m=x.match(/(最终得分|测试满分|正确率|本次成绩提交成功)[^。]{0,70}/);return m?m[0]:'';})()`,f.ctx).catch(()=>"");
 if(t)console.log('RESULT',t);
}
const {data}=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId);
fs.writeFileSync("ut6-final.png",Buffer.from(data,"base64"));
cdp.close();
