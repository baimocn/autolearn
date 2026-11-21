// _sweepu7.mjs — U7 长慢滚：展开折叠区 + 140屏 3s/屏 + finishNode 监听
import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
let fin=0;
await cdp.send("Network.enable",{},sessionId).catch(()=>{});
cdp.on("Network.requestWillBeSent",p=>{if(/finishNode/.test((p.request&&p.request.url)||""))fin++;});
// 展开所有折叠区
const n=await ev(`(async()=>{const cols=[...document.querySelectorAll('[class*=collapsible-container]')];let o=0;
 for(const c of cols){const body=c.querySelector('[class*=collapsible-content]');if(!body)continue;
  if(body.getBoundingClientRect().height<20){const h=c.querySelector('[class*=collapsible-head]');
   if(h){const rk=Object.keys(h).find(k=>k.startsWith('__reactProps'));
    try{if(rk&&h[rk].onClick)h[rk].onClick({stopPropagation(){},preventDefault(){},target:h,currentTarget:h,nativeEvent:{}});else h.click();}catch(e){h.click();}
    o++;await new Promise(r=>setTimeout(r,250));}}}
 return o;})()`,tb.ctx).catch(()=>0);
console.log('expanded',n);
await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollTop=0;return 1;})()`,tb.ctx).catch(()=>{});
await sleep(1500);
for(let s=0;s<140;s++){
  await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(innerHeight*0.9));return 1;})()`,tb.ctx).catch(()=>{});
  await sleep(3000);
  if(s%20===19)console.log(`  ${s+1}/140 fin=${fin}`);
}
console.log('DONE finishNode=',fin);
cdp.close();
