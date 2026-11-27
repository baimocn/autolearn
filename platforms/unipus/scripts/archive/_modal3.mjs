import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
// 找所有帧里的确认按钮/弹窗
for(const f of await frames()){
 const r=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>e.children.length<=1&&e.getBoundingClientRect().width>15&&/^(确定|确认|我知道了|再想想|去学习|确 定)$/.test(n(e.innerText)));return v.map(e=>{const b=e.getBoundingClientRect();return{t:n(e.innerText),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width)};});})()`,f.ctx).catch(()=>[]);
 if(r&&r.length)console.log("frame",(f.url||"").slice(0,45),JSON.stringify(r));
}
// 点块3 提交（真实坐标）
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const p=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][3];const e=[...b.querySelectorAll('[class*=i-button_default-container]')].find(x=>(x.innerText||'').replace(/[ ]+/g,'')==='提交');if(!e)return null;const r=e.getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`,tb.ctx).catch(()=>null);
console.log("submit pos",JSON.stringify(p));
if(p){await mouse(p.x,p.y);console.log("clicked submit");await sleep(2500);}
// 提交后检查确认框
for(const f of await frames()){
 const r=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>e.children.length<=1&&e.getBoundingClientRect().width>15&&/^(确定|确认|确 定)$/.test(n(e.innerText)));return v.map(e=>{const b=e.getBoundingClientRect();return{t:n(e.innerText),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width)};});})()`,f.ctx).catch(()=>[]);
 console.log("after frame",(f.url||"").slice(0,45),JSON.stringify(r));
}
cdp.close();
