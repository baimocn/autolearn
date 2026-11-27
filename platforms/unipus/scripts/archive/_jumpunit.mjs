import { connect, sleep } from "./utlib.mjs";
const BOOK="0iws4u_bQkCFpqmfcTvdAg";
const PAPER=process.argv[2]||"v8fhE9KZ2fvwOct7"; // U4
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(!ex){console.log('no exam frame');process.exit(1);}
const url=`https://ipub.unipus.cn/learner/testing/diagnosis/book/${BOOK}/exam/${PAPER}`;
await ev(`(()=>{location.href=${JSON.stringify(url)};return 1;})()`,ex.ctx).catch(e=>console.log('nav err',String(e).slice(0,80)));
console.log('jump to',PAPER);
await sleep(12000);
for(let k=0;k<15;k++){
 const fl=await frames();
 const e2=fl.find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx&&f.url.includes(PAPER));
 if(e2){
  const r=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');const m=t.match(/最终得分是\s*([\d.]+)/);return {url:location.href.slice(-40),score:m?m[1]:'',len:t.length};})()`,e2.ctx).catch(e=>String(e));
  console.log('ready',k,JSON.stringify(r));
  break;
 }
 await sleep(2000);
}
cdp.close();
