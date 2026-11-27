import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(!ex){console.log('no exam');process.exit(1);}
const t=await ev(`document.body.innerText.replace(/[ ]+/g,' ')`,ex.ctx).catch(()=>"");
// 当前是否有提交按钮
const hasSubmit=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='提交'&&e.getBoundingClientRect().width>25);return v.length;})()`,ex.ctx).catch(()=>0);
console.log('submit buttons',hasSubmit);
if(hasSubmit>0){
 // 点提交
 const r=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='提交'&&e.getBoundingClientRect().width>25);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,ex.ctx).catch(()=>0);
 console.log('clicked submit',r);
 await sleep(3500);
 // 确认（全帧 JS）
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
}
const d=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');const m=t.match(/最终得分是\s*([\d.]+)/);return {score:m?m[1]:'',len:t.length,hasSubmit:/提交/.test(t)};})()`,ex.ctx).catch(e=>String(e));
console.log(JSON.stringify(d));
cdp.close();
