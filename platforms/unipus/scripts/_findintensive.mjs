import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
if(!tb){console.log('no tb');process.exit(1);}
const r=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');
 const all=[...document.querySelectorAll('*')].filter(e=>e.children.length<=1&&/打开精读|精读模式|立即学习|关闭精读/.test(n(e.innerText)));
 return {found:all.map(e=>{const b=e.getBoundingClientRect();return{t:n(e.innerText).slice(0,20),cls:(e.className||'').toString().slice(0,50),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width),disp:getComputedStyle(e).display};}),
  audios:[...document.querySelectorAll('audio')].length,url:location.href.slice(60,110)};})()`,tb.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1).slice(0,2500));
cdp.close();
