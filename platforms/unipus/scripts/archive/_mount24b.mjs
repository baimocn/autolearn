import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const info=await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;return {sh:sc.scrollHeight,ch:sc.clientHeight,st:sc.scrollTop,cls:(sc.className||'').toString().slice(0,40)};})()`,tb.ctx).catch(e=>String(e));
console.log('scroll',JSON.stringify(info));
// 直接设到块24附近
await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollTop=Math.max(0,sc.scrollHeight-sc.clientHeight);return 1;})()`,tb.ctx).catch(()=>{});
await sleep(3500);
for(let k=0;k<8;k++){
 const st=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][24];return {y:Math.round(b.getBoundingClientRect().top),len:(b.innerText||'').length,file:b.querySelectorAll('input[type=file]').length};})()`,tb.ctx).catch(()=>({}));
 console.log('probe',k,JSON.stringify(st));
 if(st&&st.len>0){console.log('MOUNTED');break;}
 await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollTop=sc.scrollTop+300;return 1;})()`,tb.ctx).catch(()=>{});
 await sleep(1200);
}
const {data}=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId);
fs.writeFileSync("mount24b.png",Buffer.from(data,"base64"));
cdp.close();
