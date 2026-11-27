import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const CHOICES=["D","B","B","B","B","B","C","","","","","","B","A","C","D","B","B","C","D","B","B","C","C","A",""];
const CLOZE={7:"do justice to",8:"give way to",9:"stretch back",10:"immerse in",11:"the turn of the century"};
const TRANS="In recent years, rural leisure tourism in China has shown unprecedented momentum, vividly illustrating the concept that lucid waters and lush mountains are invaluable assets. Some regions have developed projects such as forest hiking and wild fruit picking; others have launched water activities like fishing and boating; still others have converted old farmhouses into homestays, allowing tourists to immerse themselves in rural life, staying in farmhouses, eating farm meals, and doing farm work. In the villages, people can get close to nature, feel the charm of the mountains and forests, and enjoy the coolness and comfort of the water. This form of tourism satisfies the people's yearning for and pursuit of a better life.";
const log=(...a)=>console.log('[fj4]',...a);
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const frame=async()=>(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
let ex=await frame();
// 1) 再次作答
let r=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='再次作答'&&e.getBoundingClientRect().width>20);if(!v.length)return'none';v[v.length-1].click();return'clicked';})()`,ex.ctx).catch(e=>String(e));
log('retry',r);
await sleep(4000);
ex=await frame();
// 2) 选择
const a=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];const ks=${JSON.stringify(CHOICES)};let c=0;
 items.forEach((q,i)=>{const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];if(!rows.length)return;const k=ks[i];const idx=(k&&"ABCD".includes(k[0]))?"ABCD".indexOf(k[0]):0;(rows[idx]||rows[0]).click();c++;});return c;})()`,ex.ctx).catch(e=>String(e));
log('choices',a);
// 3) 填空
const b=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];const ws=${JSON.stringify(CLOZE)};let c=0;
 Object.keys(ws).forEach(i=>{const q=items[Number(i)];if(!q)return;const el=q.querySelector('input[class*=answer_answerInput],input[type=text]');if(!el)return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,ws[i]);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new Event('blur',{bubbles:true}));c++;});return c;})()`,ex.ctx).catch(e=>String(e));
log('cloze',b);
// 4) 翻译
const c3=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];const q=items[25];if(!q)return 'no q25';const el=q.querySelector('textarea');if(!el)return 'no ta';
 Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,${JSON.stringify(TRANS)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new Event('blur',{bubbles:true}));return el.value.length;})()`,ex.ctx).catch(e=>String(e));
log('trans',c3);
await sleep(14000);
// 5) 提交 JS
const s1=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='提交'&&e.getBoundingClientRect().width>25);if(!v.length)return'none';v[v.length-1].click();return'clicked';})()`,ex.ctx).catch(e=>String(e));
log('submit',s1);
await sleep(4000);
// 6) 确认 JS（全帧）
for(let k=0;k<10;k++){
 let hit=false;
 for(const f of await frames()){
  const c=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('.ant-modal-confirm-btns .ant-btn-primary,button,div,span')].filter(e=>e.children.length<=1&&/^(确定|确认|确 定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>0);
  if(c){hit=true;break;}
 }
 if(hit){log('confirmed');break;}
 await sleep(1500);
}
await sleep(10000);
const d=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');const m=t.match(/最终得分是\s*([\d.]+)/);
 const n=s=>(s||'').replace(/[ ]+/g,'' );
 const btns=[...document.querySelectorAll('button,div,span,a')].filter(e=>e.children.length<=1&&e.getBoundingClientRect().width>15&&/^(答题解析|再次作答)$/.test(n(e.innerText))).map(e=>n(e.innerText));
 return {score:m?m[1]:'',btns:[...new Set(btns)],len:t.length};})()`,ex.ctx).catch(e=>String(e));
log('RESULT',JSON.stringify(d));
const {data}=await cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
fs.writeFileSync("u4-fj.png",Buffer.from(data,"base64"));
cdp.close();
