import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const ev=async(e,ctx)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:ctx},L.sessionId);return r.result?.value;};
const mouse=async(x,y)=>{await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},L.sessionId).catch(()=>{});await L.cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},L.sessionId);await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},L.sessionId);};
// 找到挑战帧（exam 帧）
const ex=(await L.frames()).find(f=>/\/exam\/|testing\/(challenge|diagnosis)/.test(f.url)&&f.ctx);
console.log("exam frame:",ex?ex.url.slice(45,90):"NONE");
if(!ex){process.exit(0);}
// 当前可见题目文本+选项
const info=await ev(`(()=>{
  const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
  return items.map((q,i)=>{
    const stem=(q.querySelector('[class*=q-question-stem_quesTextView]')||q).innerText.replace(/\s+/g,' ').slice(0,150);
    const opts=[...q.querySelectorAll('[class*=chioceView_strongListView]')].map(r=>(r.innerText||'').replace(/\s+/g,' ').trim().slice(0,80));
    return {i,stem,opts};
  });
})()`,ex.ctx);
console.log("ITEMS:",JSON.stringify(info,null,1).slice(0,1500));
// 底部按钮
const btns=await ev(`[...document.querySelectorAll('button,div,span,a')].filter(e=>{const t=(e.innerText||'').replace(/\s+/g,'').trim();const b=e.getBoundingClientRect();return t&&t.length<8&&b.width>15&&/提交|下一题|上一题|确定/.test(t);}).map(e=>({t:e.innerText.replace(/\s+/g,''),x:Math.round(e.getBoundingClientRect().left+e.getBoundingClientRect().width/2),y:Math.round(e.getBoundingClientRect().top+e.getBoundingClientRect().height/2)})).slice(0,8)`,ex.ctx);
console.log("BTNS:",JSON.stringify(btns));
L.cdp.close();
