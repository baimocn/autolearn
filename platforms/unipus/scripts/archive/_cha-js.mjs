import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const fl=await L.frames();
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
// JS 点挑战卡（找到带 挑战 的 quiz-paper-link 的后代可点元素）
const r=await ev(`(()=>{
  const cs=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];
  for(const c of cs){
    const img=c.querySelector('img');let dec='';try{dec=decodeURIComponent(img?img.src:'');}catch(e){dec=img?img.src:'';}
    if(!dec.includes('挑战'))continue;
    // 尝试多个可点层：img -> 容器 -> React onClick
    const cands=[img,c,c.querySelector('*')];
    for(const el of cands){
      if(!el)continue;
      const rk=Object.keys(el).find(k=>k.startsWith('__reactProps'));
      if(rk&&el[rk].onClick){try{el[rk].onClick({stopPropagation(){},preventDefault(){},target:el,currentTarget:el,nativeEvent:{}});return 'react-onclick';}catch(e){}}
    }
    (img||c).click();
    return 'js-click';
  }
  return 'no-card';
})()`,tb.ctx);
console.log("click result:",r);
await sleep(4000);
// dump 所有帧弹窗文本与按钮
for(const f of await L.frames()){
  const info=await ev(`(()=>{
    const dlg=[...document.querySelectorAll('[class*=dialog],[class*=modal],[class*=popup]')].find(e=>e.getBoundingClientRect().height>60);
    const btns=[...document.querySelectorAll('button,div,span,a')].filter(e=>{const t=(e.innerText||'').replace(/\s+/g,'').trim();const b=e.getBoundingClientRect();return t&&t.length<10&&b.width>15&&/挑战|答题|知道|确定|开始/.test(t);}).map(e=>({t:e.innerText.replace(/\s+/g,''),x:Math.round(e.getBoundingClientRect().left+5),y:Math.round(e.getBoundingClientRect().top+5)}));
    return {dlg:dlg?dlg.innerText.replace(/\s+/g,' ').slice(0,200):'', btns:btns.slice(0,8)};
  })()`,f.ctx).catch(()=>null);
  if(info&&(info.dlg||info.btns.length))console.log("FRAME",f.url.slice(40,64),"=>",JSON.stringify(info));
}
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
const fs=await import("node:fs");
fs.writeFileSync("cha-js.png",Buffer.from(data,"base64"));
L.cdp.close();
