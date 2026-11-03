// quiz.mjs <unit> — 打开该单元的篇章小测（quiz-paper-link），进 exam 并导出题目
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const U=Number(process.argv[2]);
const CH={1:"7840f299-1cce-403e-9320-d6ddf613cebf",2:"2c3ad11f-a37e-4a64-ba6a-6cfa256cc6be",3:"5f975081-b8b7-4799-9d9c-b83a53423e4f",4:"6c59c2ec-f8bd-46f8-8506-6a8b25ff9e7b",5:"bfb4fa0c-fbd4-436f-8b37-3b307810cf63",6:"1ed78c87-3e9c-4426-a2fb-4a155955a7bb",7:"bc8967a2-13b9-4a3f-a127-e368e228e9e5",8:"f8dc1090-7968-4eb7-b231-63da59732244"}[U];
const Q={1:["u1g145","ZNNSSBCs2Q3YJfqV"],2:["u2g244","tvE2V6FhdVwVAkal"],3:["u3g357","kZlowL3glIRoSqa2"],4:["u4g811","v8fhE9KZ2fvwOct7"],5:["u5g822","FiusoOeHRf4AS4aj"],6:["u6g833","lmRrP6eoLzeGLRjl"],7:["u7g1123","b2qiwPZQciRZQtVC"],8:["u8g1125","uFNeyMK0f1wR2oj6"]}[U];
const [ANCHOR,PAPER]=Q;
const BOOK="0iws4u_bQkCFpqmfcTvdAg",BV="VTqvEEI";
const log=(...a)=>console.log(...a);
const TID=process.env.TID||"84B74FE42AFBE800BB4140C151D85DA8";
const L=await connect(TID);
const {ev,frames,mouse}=L;
const findIframeQ=`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return null;const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`;
let tbOff=null;
for(let i=0;i<30;i++){ tbOff=await ev(findIframeQ).catch(()=>null); if(tbOff) break; await sleep(800); }
if(!tbOff){ log("!! 无 ipub iframe"); process.exit(1); }
log("tbOff:",JSON.stringify(tbOff));
await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return 0;f.src=${JSON.stringify(`https://ipub.unipus.cn/learner/textbook/book/${BOOK}/chapter/${CH}?bookVersionNumber=${BV}#${ANCHOR}`)};return 1;})()`);
await sleep(9000);
let tb=null;
for(let i=0;i<25;i++){ tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH.slice(0,12))); if(tb) break; await sleep(800); }
if(!tb){ log("!! 无教材帧"); process.exit(1); }
log("tb ok");
const scrollToCard=`(()=>{
  const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
  const cards=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];
  if(!cards.length) return {n:0};
  const c=cards[0];
  const t=c.getBoundingClientRect().top;
  sc.scrollTop += t-200;
  return {n:cards.length, moved:Math.round(t-200)};
})()`;
const cardQ=`(()=>{
  const cards=[...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')];
  if(!cards.length) return {n:0};
  const c=cards[0];
  const b=c.getBoundingClientRect();
  return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${tbOff.oy}),n:cards.length,
    r:[Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height)]};})()`;
const ackQ=(oy)=>`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy})};})()`;
const startQ=(oy)=>`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='开始答题'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy})};})()`;
async function findAny(q){ for(const f of await frames()){ const oy=/textbook/.test(f.url)?tbOff.oy:0; const r=await ev(q(oy),f.ctx).catch(()=>null); if(r) return {...r,inFrame:f.url.slice(45,70)}; } return null; }
for(let i=0;i<5;i++){ const a=await findAny(ackQ); if(a){ await mouse(a.x,a.y); await sleep(1200);} else break; }
let started=null;
for(let t=0;t<4&&!started;t++){
  const sc1=await ev(scrollToCard,tb.ctx).catch(()=>null);
  log("scroll:",JSON.stringify(sc1));
  await sleep(1500);
  const card=await ev(cardQ,tb.ctx).catch(()=>null);
  log("card:",JSON.stringify(card));
  if(!card||!card.x){ log("  无卡片"); break; }
  await mouse(card.x,card.y);
  for(let i=0;i<12;i++){
    await sleep(900);
    const a=await findAny(ackQ); if(a){ await mouse(a.x,a.y); log("  mid 我知道了"); await sleep(1200); continue; }
    const s2=await findAny(startQ); if(s2){ started=s2; break; }
    const r2=await findAny((oy)=>`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='再次作答'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy})};})()`);
    if(r2){ log("  已在成绩页"); await mouse(r2.x,r2.y); await sleep(2500); started={x:-1}; break; }
  }
}
if(!started){ log("!! 未出现开始答题"); const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId); fs.writeFileSync(`fail-quiz-U${U}.png`,Buffer.from(data,"base64")); L.cdp.close(); process.exit(1); }
if(started.x>0){ log("开始答题 @",started.x,started.y); await mouse(started.x,started.y); }
let exam=null;
for(let i=0;i<30;i++){ await sleep(1000); exam=(await frames()).find(f=>/testing\/(diagnosis|challenge)\/book/.test(f.url)&&f.ctx&&f.url.includes(PAPER)); if(exam) break; }
if(!exam){ log("!! exam 未出现"); L.cdp.close(); process.exit(1); }
let n=0;
for(let i=0;i<15;i++){ n=await ev(`document.querySelectorAll('[class*=answer-question-box_questionItem]').length`,exam.ctx); if((n||0)>0) break; await sleep(1000); }
log("questions:",n);
const body=String(await ev(`document.body.innerText`,exam.ctx)||"");
fs.writeFileSync(`quiz-U${U}-body.txt`,body);
fs.writeFileSync("quiz-current.json",JSON.stringify({U,ANCHOR,PAPER,TID,examUrl:exam.url}));
log("saved quiz-U"+U+"-body.txt len="+body.length);
L.cdp.close();
