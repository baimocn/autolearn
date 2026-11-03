// upfull.mjs <unit> <blockIdx> <pdf>
import { connect, sleep } from "./utlib.mjs";
import path from "node:path";
const CH={1:"7840f299-1cce-403e-9320-d6ddf613cebf",2:"2c3ad11f-a37e-4a64-ba6a-6cfa256cc6be",3:"5f975081-b8b7-4799-9d9c-b83a53423e4f",4:"6c59c2ec-f8bd-46f8-8506-6a8b25ff9e7b",5:"bfb4fa0c-fbd4-436f-8b37-3b307810cf63",6:"1ed78c87-3e9c-4426-a2fb-4a155955a7bb",7:"bc8967a2-13b9-4a3f-a127-e368e228e9e5",8:"f8dc1090-7968-4eb7-b231-63da59732244"};
const u=Number(process.argv[2]), i=Number(process.argv[3]);
const file=path.resolve(process.argv[4]);
const fname=path.basename(file);
const L=await connect("D6816472D8507E6DCD80805A5A543A96");
const {ev,frames,cdp,sessionId,mouse}=L;

// 切章
let tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH[u].slice(0,12)));
if(!tb){
  const url=`https://ipub.unipus.cn/learner/textbook/book/0iws4u_bQkCFpqmfcTvdAg/chapter/${CH[u]}?bookVersionNumber=VTqvEEI`;
  await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));f.src='about:blank';return 1;})()`);
  await sleep(700);
  await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub|about/.test(e.src||''));f.src=${JSON.stringify(url)};return 1;})()`);
  for(let k=0;k<40;k++){await sleep(1000);tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH[u].slice(0,12)));if(tb)break;}
  await sleep(8000);
}
// 关弹窗/抽屉
const off=await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));const r=f.getBoundingClientRect();return {ox:Math.round(r.left),oy:Math.round(r.top)};})()`);
for(let r=0;r<2;r++){
  const p=await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,tb.ctx).catch(()=>null);
  if(p){ await mouse(p.x+off.ox,p.y+off.oy); await sleep(1200); } else break;
}
const dp=await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<4)return null;return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,tb.ctx).catch(()=>null);
if(dp){ await mouse(dp.x+off.ox,dp.y+off.oy); await sleep(800); }

// 滚到块
for(let k=0;k<6;k++){
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return 0;
    const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
    const r=b.getBoundingClientRect(),box=sc.getBoundingClientRect(); sc.scrollTop += (r.top-box.top)-25; return 1;})()`,tb.ctx);
  await sleep(1600);
  const n=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];return b?b.querySelectorAll('.ant-upload-btn').length:0;})()`,tb.ctx);
  if(n) break;
}
// 等 .ant-upload-btn 出现
let hasBtn=0;
for(let k=0;k<8;k++){
  hasBtn=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];return b?b.querySelectorAll('.ant-upload-btn').length:0;})()`,tb.ctx);
  if(hasBtn) break;
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return 0;
    const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
    const r=b.getBoundingClientRect(),box=sc.getBoundingClientRect(); sc.scrollTop += (r.top-box.top)-25; return 1;})()`,tb.ctx);
  await sleep(1500);
}
console.log("uploadBtns:",hasBtn);
// 上传
await cdp.send("Page.enable",{},sessionId);
await cdp.send("Page.setInterceptFileChooserDialog",{enabled:true},sessionId);
let got=null; cdp.on("Page.fileChooserOpened",(q)=>{got=q;});
const clicked=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const s=b&&b.querySelector('.ant-upload-btn'); if(!s)return 'no btn'; s.click(); return 'clicked';})()`,tb.ctx);
console.log("click:",clicked);
for(let k=0;k<12 && !got;k++) await sleep(400);
if(!got){ console.log("no chooser"); await cdp.send("Page.setInterceptFileChooserDialog",{enabled:false},sessionId); process.exit(1); }
await cdp.send("DOM.setFileInputFiles",{files:[file],backendNodeId:got.backendNodeId},sessionId);
await cdp.send("Page.setInterceptFileChooserDialog",{enabled:false},sessionId);
let ok=false, items=0;
for(let k=0;k<10;k++){
  await sleep(2000);
  const d=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    return {t:(b.innerText||''), items:b.querySelectorAll('.ant-upload-list-item').length,
      n:(()=>{const fi=b.querySelector('input[type=file]');return fi?fi.files.length:0;})()};})()`,tb.ctx);
  items=d.items;
  if(String(d.t).includes(fname)||d.items>0||d.n>0){ ok=true; console.log("attached:",fname,JSON.stringify(d).slice(0,120)); break; }
}
if(!ok){ console.log("attach not confirmed, still trying submit; items=",items); }
// 提交
const sub=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&(e.innerText||'').replace(/\\s+/g,'')==='提交');
  if(!el)return 'no submit'; el.click(); return 'ok';})()`,tb.ctx);
console.log("submit:",sub);
await sleep(5000);
const st=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  const t=(b.innerText||'').replace(/\\s+/g,' ');
  return {redo:/重新作答/.test(t), score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null, t:t.slice(0,120)};})()`,tb.ctx);
console.log("state:",JSON.stringify(st));
L.cdp.close();
