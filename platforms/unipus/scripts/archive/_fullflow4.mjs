import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const CHOICES=["D","B","B","B","B","B","C","","","","","","B","A","C","D","B","B","C","D","B","B","C","C","A",""];
const CLOZE={7:"do justice to",8:"give way to",9:"stretch back",10:"immerse in",11:"the turn of the century"};
const TRANS="In recent years, rural leisure tourism in China has shown unprecedented momentum, vividly illustrating the concept that lucid waters and lush mountains are invaluable assets. Some regions have developed projects such as forest hiking and wild fruit picking; others have launched water activities like fishing and boating; still others have converted old farmhouses into homestays, allowing tourists to immerse themselves in rural life, staying in farmhouses, eating farm meals, and doing farm work. In the villages, people can get close to nature, feel the charm of the mountains and forests, and enjoy the coolness and comfort of the water. This form of tourism satisfies the people's yearning for and pursuit of a better life.";
const log=(...a)=>console.log('[ff4]',...a);
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
let ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(!ex){log('no exam');process.exit(1);}
// 1) 返回成绩页
await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='返回'&&e.getBoundingClientRect().width>20);if(v.length)v[v.length-1].click();return 1;})()`,ex.ctx).catch(()=>{});
await sleep(4000);
// 2) 再次作答
ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='再次作答'&&e.getBoundingClientRect().width>20);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,ex.ctx).catch(()=>0);
await sleep(4000);
// 3) 填答案
ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
const a=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];const ks=${JSON.stringify(CHOICES)};let c=0;
 items.forEach((q,i)=>{const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];if(!rows.length)return;const k=ks[i];const idx=(k&&"ABCD".includes(k[0]))?"ABCD".indexOf(k[0]):0;(rows[idx]||rows[0]).click();c++;});return c;})()`,ex.ctx).catch(e=>String(e));
log('choices',a);
const b=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];const ws=${JSON.stringify(CLOZE)};let c=0;
 Object.keys(ws).forEach(i=>{const q=items[Number(i)];if(!q)return;const el=q.querySelector('input[class*=answer_answerInput],input[type=text]');if(!el)return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,ws[i]);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new Event('blur',{bubbles:true}));c++;});return c;})()`,ex.ctx).catch(e=>String(e));
log('cloze',b);
const c3=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];const q=items[25];if(!q)return 'no q25';const el=q.querySelector('textarea');if(!el)return 'no ta';
 Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,${JSON.stringify(TRANS)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new Event('blur',{bubbles:true}));return el.value.length;})()`,ex.ctx).catch(e=>String(e));
log('trans',c3);
await sleep(12000);
// 4) 提交（真实坐标）
const pos=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='提交'&&e.getBoundingClientRect().width>25);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width)};})()`,ex.ctx).catch(()=>null);
log('submit pos',JSON.stringify(pos));
if(pos){await mouse(pos.x,pos.y);log('clicked');await sleep(4000);}
// 5) 确认（真实坐标）
for(let k=0;k<8;k++){
 let hit=false;
 for(const f of await frames()){
  const p=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('.ant-modal-confirm-btns .ant-btn-primary,button,div,span')].filter(e=>e.children.length<=1&&/^(确定|确认|确 定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];const r=e.getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`,f.ctx).catch(()=>null);
  if(p){await mouse(p.x,p.y);log('confirmed at',JSON.stringify(p));hit=true;break;}
 }
 if(hit)break;
 await sleep(1500);
}
await sleep(8000);
const d=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');const m=t.match(/最终得分是\s*([\d.]+)/);return {score:m?m[1]:'',len:t.length};})()`,ex.ctx).catch(e=>String(e));
log('result',JSON.stringify(d));
const {data}=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId);
fs.writeFileSync("u4-final-submit.png",Buffer.from(data,"base64"));
cdp.close();
