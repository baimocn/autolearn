import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const r=await ev(`(()=>{const out=[];
 for(const e of document.querySelectorAll('*')){
  const t=(e.innerText||'').replace(/[ ]+/g,' ');
  if(/精读|intensive/i.test(t)&&t.length<30){const b=e.getBoundingClientRect();out.push({tag:e.tagName,cls:(e.className||'').toString().slice(0,55),t:t.slice(0,25),w:Math.round(b.width),h:Math.round(b.height),disp:getComputedStyle(e).display,vis:getComputedStyle(e).visibility});}
  if(out.length>=12)break;
 }
 return out;})()`,tb.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1).slice(0,2500));
cdp.close();
