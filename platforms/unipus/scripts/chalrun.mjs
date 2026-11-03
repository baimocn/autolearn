// chalrun.mjs <unit> start|dump|ans|submit
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const U=Number(process.argv[2]);
const CMD=process.argv[3]||"start";
const ARG=process.argv[4];
const CH={1:"7840f299-1cce-403e-9320-d6ddf613cebf",2:"2c3ad11f-a37e-4a64-ba6a-6cfa256cc6be",3:"5f975081-b8b7-4799-9d9c-b83a53423e4f",4:"6c59c2ec-f8bd-46f8-8506-6a8b25ff9e7b",5:"bfb4fa0c-fbd4-436f-8b37-3b307810cf63",6:"1ed78c87-3e9c-4426-a2fb-4a155955a7bb",7:"bc8967a2-13b9-4a3f-a127-e368e228e9e5",8:"f8dc1090-7968-4eb7-b231-63da59732244"}[U];
const BOOK="0iws4u_bQkCFpqmfcTvdAg",BV="VTqvEEI";
const TID=process.env.TID||"84B74FE42AFBE800BB4140C151D85DA8";
const log=(...a)=>console.log(...a);
const L=await connect(TID);
const {ev,frames,mouse}=L;
const chalFrame=async()=>(await frames()).find(f=>/testing\/(challenge|diagnosis)\/book/.test(f.url)&&f.ctx);

if(CMD==="start"){
  // 切章 + 找卡 + 点开 + 开始挑战
  await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return 0;f.src='about:blank';return 1;})()`).catch(()=>{});
  await sleep(600);
  await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub|about/.test(e.src||''));if(!f)return 0;f.src=${JSON.stringify(`https://ipub.unipus.cn/learner/textbook/book/${BOOK}/chapter/${CH}?bookVersionNumber=${BV}`)};return 1;})()`);
  let tb=null;
  for(let i=0;i<40;i++){ await sleep(900); tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH.slice(0,12))); if(tb) break; }
  if(!tb){ log("!! 无教材帧"); process.exit(1); }
  await sleep(7000);
  const off=await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));const r=f.getBoundingClientRect();return {ox:Math.round(r.left),oy:Math.round(r.top)};})()`).catch(()=>({ox:0,oy:0}));
  for(const f of await frames()){
    const p=await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,f.ctx).catch(()=>null);
    if(p){ await mouse(p.x+off.ox,p.y+off.oy); await sleep(1200); }
  }
  const findQ=`(()=>{const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];
    const c=cs.find(e=>{const im=e.querySelector('img');return im&&/挑战/.test(decodeURIComponent(im.src||''));});
    if(!c)return null; const b=c.getBoundingClientRect();
    return {top:Math.round(b.top),bot:Math.round(b.bottom),x:Math.round(b.left+b.width/2),y:Math.round(b.top+Math.min(60,b.height/2))};})()`;
  const svQ=`(()=>{const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];
    const c=cs.find(e=>{const im=e.querySelector('img');return im&&/挑战/.test(decodeURIComponent(im.src||''));});
    if(!c)return 0; c.scrollIntoView({block:'center'}); return 1;})()`;
  let p=null;
  for(let k=0;k<30;k++){
    p=await ev(findQ,tb.ctx).catch(()=>null);
    if(!p){ await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollTop+=700;return 1;})()`,tb.ctx).catch(()=>{}); await sleep(400); continue; }
    if(p.top>100 && p.bot<600) break;
    await ev(svQ,tb.ctx).catch(()=>{});
    await sleep(400);
  }
  if(!p){ log("!! 未找到挑战卡"); process.exit(1); }
  log("card top",p.top);
  let clicked=false;
  for(let attempt=0;attempt<3&&!clicked;attempt++){
    await mouse(p.x+off.ox, p.y+off.oy);
    for(let k=0;k<14;k++){
      await sleep(1000);
      for(const f of await frames()){
        const r=await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='开始挑战'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,f.ctx).catch(()=>null);
        if(r){ const it=/textbook/.test(f.url); await mouse(r.x+(it?off.ox:0), r.y+(it?off.oy:0)); clicked=true; log("开始挑战 clicked @",r.x,r.y,"in",f.url.slice(40,70)); break; }
      }
      if(clicked) break;
    }
    if(!clicked) log("  第",attempt+1,"次点击未见弹窗，重试");
  }
  if(!clicked){ log("!! 未找到开始挑战按钮"); process.exit(1); }
  await sleep(8000);
}
const cf=await chalFrame();
if(!cf){ log("!! 无挑战帧"); process.exit(1); }
await sleep(2000);
log("challenge 帧:", cf.url.slice(55,120));
const body=String(await ev(`document.body.innerText`, cf.ctx)||"");
fs.writeFileSync(`chal-U${U}-body.txt`, body);
log("body len:", body.length);
if(CMD==="start"||CMD==="dump"){
  log("---- 正文 ----");
  log(body.replace(/\n{2,}/g,"\n").slice(0,1800));
}
L.cdp.close();
