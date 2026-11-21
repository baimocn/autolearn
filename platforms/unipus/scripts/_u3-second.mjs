import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const mouse=async(x,y)=>{await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},L.sessionId).catch(()=>{});await L.cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},L.sessionId);await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},L.sessionId);};
// 点开始挑战（真鼠标，弹窗按钮 CSS≈866/1.355=639, 752/1.355=555）
await mouse(639,555);
await sleep(5000);
let ex=null;
for(let k=0;k<20;k++){ex=(await L.frames()).find(f=>/\/exam\//.test(f.url)&&f.ctx);if(ex)break;await sleep(1000);}
if(!ex){console.log("no exam");process.exit(0);}
console.log("exam:",ex.url.slice(45,80));
const n=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];return items.length;})()`,ex.ctx);
console.log("items:",n);
const picks=[1,1,3,1,1]; // B B D B B
const r=await ev(`(async()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];const idx=${JSON.stringify(picks)};const out=[];
 for(let i=0;i<items.length;i++){const rows=[...items[i].querySelectorAll('[class*=chioceView_strongListView]')];const k=idx[i]??0;if(rows[k]){rows[k].click();out.push(i+":"+k);}await new Promise(r2=>setTimeout(r2,200));}
 return out;})()`,ex.ctx);
console.log("picked:",JSON.stringify(r));
await sleep(1000);
await ev(`(()=>{const n2=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n2(e.innerText)==='提交'&&e.getBoundingClientRect().width>10);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,ex.ctx);
await sleep(3500);
await mouse(712,525);
await sleep(4500);
// 成绩提交
let posted=false;
for(let k=0;k<10;k++){
  for(const f of await L.frames()){
    const rr=await ev(`(()=>{const n2=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n2(e.innerText)==='成绩提交'&&e.getBoundingClientRect().width>12);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>0);
    if(rr){console.log("成绩提交 clicked @",f.url.slice(40,60));posted=true;break;}
  }
  if(posted)break;
  await sleep(1500);
}
console.log("posted:",posted);
await sleep(3000);
for(const f of await L.frames()){
  const t=await ev(`(()=>{const t2=document.body?document.body.innerText:'';const m=t2.replace(/\s+/g,' ').match(/(本轮成绩|最终得分|提交成功)[^。]{0,60}/);return m?m[0]:'';})()`,f.ctx).catch(()=>"");
  if(t)console.log("RESULT:",t);
}
const fs=await import("node:fs");
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
fs.writeFileSync("u3-sec.png",Buffer.from(data,"base64"));
L.cdp.close();
