import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
const top=(await frames()).find(f=>/pc\.html/.test(f.url)&&f.ctx);
const tbf=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const offA=await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`,top.ctx).catch(()=>({ox:0,oy:0}));
const offB=await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/testing|exam/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`,tbf.ctx).catch(()=>({ox:0,oy:0}));
const OX=offA.ox+offB.ox, OY=offA.oy+offB.oy;
console.log('offA',JSON.stringify(offA),'offB',JSON.stringify(offB),'OX/OY',OX,OY);
// 提交（用 JS 直接点考试帧里的按钮，避免坐标问题）
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
const r=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='提交'&&e.getBoundingClientRect().width>25);if(!v.length)return 'nobtn';v[v.length-1].click();return 'clicked';})()`,ex.ctx).catch(e=>String(e));
console.log('JS submit',r);
await sleep(3500);
// 确认弹窗：真实坐标（加 OY）
for(let k=0;k<8;k++){
 let hit=false;
 for(const f of await frames()){
  const c=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('.ant-modal-confirm-btns .ant-btn-primary,button,div,span')].filter(e=>e.children.length<=1&&/^(确定|确认|确 定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,f.ctx).catch(()=>null);
  if(c){await mouse(c.x,c.y);console.log('confirmed @',JSON.stringify(c));hit=true;break;}
 }
 if(hit)break;
 await sleep(1500);
}
await sleep(6000);
// 成绩提交（JS 直接点）
let posted=false;
for(let k=0;k<12;k++){
 for(const f of await frames()){
  const x=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='成绩提交'&&e.getBoundingClientRect().width>25);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>0);
  if(x){posted=true;console.log('成绩提交 clicked');break;}
 }
 if(posted)break;
 await sleep(2000);
}
await sleep(5000);
for(const f of await frames()){
 const t=await ev(`(()=>{const x=document.body.innerText.replace(/[ ]+/g,' ');const m=x.match(/(最终得分|测试满分|本次成绩提交成功|提交成功|成绩提交成功)[^。]{0,60}/);return m?m[0]:'';})()`,f.ctx).catch(()=>"");
 if(t)console.log('RESULT',t);
}
const {data}=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId);
fs.writeFileSync("ut4-done.png",Buffer.from(data,"base64"));
cdp.close();
