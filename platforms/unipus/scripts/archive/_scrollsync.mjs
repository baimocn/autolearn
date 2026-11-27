import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(!ex){console.log('no exam');process.exit(1);}
for(let k=0;k<12;k++){
 await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(innerHeight*0.85));return 1;})()`,ex.ctx).catch(()=>{});
 await sleep(1000);
}
await sleep(2000);
const r=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');const m=t.match(/(\d+)\s*\/\s*26/);return {prog:m?m[0]:'n/a'};})()`,ex.ctx).catch(e=>String(e));
console.log(JSON.stringify(r));
cdp.close();
