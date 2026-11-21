import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const mouse=async(x,y)=>{await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},L.sessionId).catch(()=>{});await L.cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},L.sessionId);await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},L.sessionId);};
let fl=await L.frames();
// 1) 我知道了（真实点击 shell）
for(let k=0;k<3;k++){
  let hit=false;
  for(const f of fl){
    const p=await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,f.ctx).catch(()=>null);
    if(p){await mouse(p.x,p.y);console.log("我知道了 @",p.x,p.y);hit=true;break;}
  }
  if(!hit)break;
  await sleep(1500);
  fl=await L.frames();
}
// 2) 再点卡片
const tb=(await L.frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);
const card=await ev(`(()=>{const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];
 for(const c of cs){const img=c.querySelector('img');let dec='';try{dec=decodeURIComponent(img?img.src:'');}catch(e){dec=img?img.src:'';}
  if(dec.includes('挑战')){c.scrollIntoView({block:'center'});const b=c.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+40)};}}
 return null;})()`,tb.ctx);
console.log("card2:",JSON.stringify(card));
if(card){await sleep(1000);await mouse(card.x,card.y);await sleep(3500);}
// 3) dump 弹窗按钮
for(const f of await L.frames()){
  const b=await ev(`(()=>{const out=[];[...document.querySelectorAll('button,div,span,a')].forEach(e=>{if(e.children.length>1)return;const t=(e.innerText||'').replace(/\s+/g,'').trim();if(t&&t.length<10&&e.getBoundingClientRect().width>15)out.push({t,x:Math.round(e.getBoundingClientRect().left+e.getBoundingClientRect().width/2),y:Math.round(e.getBoundingClientRect().top+e.getBoundingClientRect().height/2)});});return out.filter(x=>/挑战|答题|知道|开始|确定/.test(x.t)).slice(0,10);})()`,f.ctx).catch(()=>null);
  if(b&&b.length)console.log("BTNS@",f.url.slice(40,66),"=>",JSON.stringify(b));
}
// 4) 点开始挑战
for(const f of await L.frames()){
  const p=await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(开始挑战|再次挑战)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,f.ctx).catch(()=>null);
  if(p){await mouse(p.x,p.y);console.log("开始挑战 @",p.x,p.y);break;}
}
await sleep(5000);
const ex=(await L.frames()).find(f=>(f.url.includes("/testing/challenge/")||f.url.includes("/testing/diagnosis/"))&&f.ctx);
console.log("challenge frame:",ex?ex.url.slice(50,90):"NONE");
if(ex){
  const n=await ev(`(()=>{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];items.forEach(q=>{const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];if(rows[0])rows[0].click();});return items.length;})()`,ex.ctx);
  console.log("answered:",n);
  await sleep(1200);
  let sub=await ev(`(()=>{const n2=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n2(e.innerText)==='提交'&&e.getBoundingClientRect().width>10);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,ex.ctx);
  console.log("submit:",sub);
  await sleep(3000);
  for(let k=0;k<6;k++){
    let hit=false;
    for(const f of await L.frames()){
      const r2=await L.cdp.send("Runtime.evaluate",{expression:`(()=>{const n2=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(确定|确认)$/.test(n2(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,returnByValue:true,awaitPromise:true,contextId:f.ctx},L.sessionId).then(r=>r.result?.value).catch(()=>0);
      if(r2){hit=true;break;}
    }
    if(!hit)break;
    await sleep(1800);
  }
  await sleep(3500);
  let sc=false;
  for(let k=0;k<8;k++){
    let hit=false;
    for(const f of await L.frames()){
      const r3=await L.cdp.send("Runtime.evaluate",{expression:`(()=>{const n2=s=>(s||'').replace(/\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n2(e.innerText)==='成绩提交'&&e.getBoundingClientRect().width>12);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,returnByValue:true,awaitPromise:true,contextId:f.ctx},L.sessionId).then(r=>r.result?.value).catch(()=>0);
      if(r3){console.log("成绩提交 clicked");hit=true;sc=true;break;}
    }
    if(hit)break;
    await sleep(1500);
  }
  console.log("scored:",sc);
  // 结果文本
  for(const f of await L.frames()){
    const t=await ev(`(()=>{const d=[...document.querySelectorAll('[class*=dialog],[class*=modal],[class*=result],[class*=popup]')].find(e=>e.getBoundingClientRect().height>60);return d?d.innerText.replace(/\s+/g,' ').slice(0,200):'';})()`,f.ctx).catch(()=>"");
    if(t&&t.length>8)console.log("RESULT:",t);
  }
}
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
const fs=await import("node:fs");
fs.writeFileSync("cha-go.png",Buffer.from(data,"base64"));
L.cdp.close();
