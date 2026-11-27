import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(!ex){console.log('no exam');process.exit(1);}
const s=await ev(`(()=>{const n=x=>(x||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='提交'&&e.getBoundingClientRect().width>25);if(!v.length)return'nobtn';v[v.length-1].click();return'clicked';})()`,ex.ctx).catch(e=>String(e));
console.log('submit',s);
await sleep(3500);
// 确认：JS 点击
for(let k=0;k<8;k++){
 let hit=false;
 for(const f of await frames()){
  const c=await ev(`(()=>{const n=x=>(x||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('.ant-modal-confirm-btns .ant-btn-primary,button,div,span')].filter(e=>e.children.length<=1&&/^(确定|确认|确 定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>0);
  if(c){hit=true;break;}
 }
 if(hit){console.log('confirmed');break;}
 await sleep(1500);
}
await sleep(7000);
for(const f of await frames()){
 const t=await ev(`(()=>{const x=document.body.innerText.replace(/[ ]+/g,' ');const m=x.match(/(最终得分|测试满分|正确率)[^。]{0,70}/);return m?m[0]:'';})()`,f.ctx).catch(()=>"");
 if(t)console.log('RESULT',t);
}
const {data}=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId);
fs.writeFileSync("ut7-final2.png",Buffer.from(data,"base64"));
cdp.close();
