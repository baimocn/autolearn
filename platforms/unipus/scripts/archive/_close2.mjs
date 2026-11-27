import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const r=await ev(`(()=>{const c=document.querySelector('[class*=catalog_drawer-close]');const w=document.querySelector('[class*=drawer-wrapper_backdrop]');return {close:c?{w:Math.round(c.getBoundingClientRect().width),x:Math.round(c.getBoundingClientRect().left+c.getBoundingClientRect().width/2),y:Math.round(c.getBoundingClientRect().top+c.getBoundingClientRect().height/2)}:null,backdrop:w?getComputedStyle(w).display:null};})()`,tb.ctx).catch(e=>String(e));
console.log("drawer state",JSON.stringify(r));
// JS 点 close
await ev(`(()=>{const c=document.querySelector('[class*=catalog_drawer-close]');if(c)c.click();return 1;})()`,tb.ctx).catch(()=>{});
await sleep(1500);
const after=await ev(`(()=>{const c=document.querySelector('[class*=catalog_drawer-close]');return c?Math.round(c.getBoundingClientRect().width):-1;})()`,tb.ctx).catch(()=>-2);
console.log("after closeW",after);
cdp.close();
