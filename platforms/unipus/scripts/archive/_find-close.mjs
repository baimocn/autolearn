import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
for(const f of await L.frames()){
  const info=await ev(`(()=>{
    // 找含 100 分/恭喜 的结果弹窗
    const dlg=[...document.querySelectorAll('[class*=dialog],[class*=modal],[class*=popup],[class*=result]')].find(e=>/恭喜|本轮成绩/.test(e.innerText||'')&&e.getBoundingClientRect().height>100);
    if(!dlg)return null;
    // 找其中可点击的关闭元素（X 图标或 close 类）
    const close=dlg.querySelector('[class*=close],[aria-label*=lose],[class*=Close]');
    const btns=[...dlg.querySelectorAll('button,[class*=btn]')].map(b=>({t:(b.innerText||'').replace(/\s+/g,'').slice(0,12),cls:(b.className||'').toString().slice(0,30)})).slice(0,6);
    return {dlgTxt:(dlg.innerText||'').replace(/\s+/g,' ').slice(0,80), close:close?{cls:(close.className||'').toString().slice(0,40),tag:close.tagName}:null, btns};
  })()`,f.ctx).catch(()=>null);
  if(info)console.log("FRAME",f.url.slice(38,64),"=>",JSON.stringify(info));
}
L.cdp.close();
