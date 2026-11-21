import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
// 点"返回测试结果"
const p=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='返回测试结果'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const r=e.getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`,ex.ctx).catch(()=>null);
console.log('back btn',JSON.stringify(p));
if(p){await mouse(p.x,p.y);await sleep(4000);}
const d=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');const m=t.match(/最终得分是\s*([\d.]+)/);
 const n=s=>(s||'').replace(/[ ]+/g,'');
 const btns=[...document.querySelectorAll('button,div,span,a')].filter(e=>e.children.length<=1&&e.getBoundingClientRect().width>15&&/^(答题解析|再次作答|开始答题)$/.test(n(e.innerText))).map(e=>n(e.innerText));
 return {score:m?m[1]:'',btns:[...new Set(btns)],len:t.length};})()`,ex.ctx).catch(e=>String(e));
console.log(JSON.stringify(d));
cdp.close();
