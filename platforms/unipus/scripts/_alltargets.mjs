import { CDP, sleep } from "./cdp.mjs";
const ver=await(await fetch("http://127.0.0.1:9222/json/version")).json();
const boot=await CDP.connect(ver.webSocketDebuggerUrl);
const {targetInfos}=await boot.send("Target.getTargets");
console.log("TARGETS:",JSON.stringify(targetInfos.filter(t=>/page|iframe|webview|other/.test(t.type)).map(t=>({type:t.type,url:t.url.slice(0,90),id:t.targetId.slice(0,12)})),null,1));
// attach each and search for the dialog text + buttons
for(const t of targetInfos.filter(t=>/page|iframe/.test(t.type))){
  try{
    const {sessionId}=await boot.send("Target.attachToTarget",{targetId:t.targetId,flatten:true});
    const ev=async(e)=>{const r=await boot.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true},sessionId);return r.result?.value;};
    const found=await ev(`(()=>{const t=document.body?document.body.innerText:'';const has=t.includes('你已完成本轮全部挑战');const btns=[...document.querySelectorAll('button,div,span')].filter(e=>{const x=(e.innerText||'').replace(/\s+/g,'');return /^(确定|取消)$/.test(x)&&e.children.length<=1&&e.getBoundingClientRect().width>10;}).map(e=>({t:e.innerText.replace(/\s+/g,''),x:Math.round(e.getBoundingClientRect().left+e.getBoundingClientRect().width/2),y:Math.round(e.getBoundingClientRect().top+e.getBoundingClientRect().height/2),hasClick:!!Object.keys(e).find(k=>k.startsWith('__reactProps'))}));return {has,btns:btns.slice(0,6)};})()`).catch(()=>null);
    if(found&&(found.has||(found.btns&&found.btns.length)))console.log("HIT",t.url.slice(0,80),"=>",JSON.stringify(found));
  }catch(e){}
}
boot.close();
