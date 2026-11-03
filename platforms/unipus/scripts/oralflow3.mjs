// oralflow3.mjs <unit> <blockIdx> <audioFile> [--nosubmit]
import { connect, sleep } from "./utlib.mjs";
import { CDP } from "./cdp.mjs";
import { closeDrawer } from "./reader.mjs";
import fs from "node:fs";
import { execSync } from "node:child_process";
const U=Number(process.argv[2]); const I=Number(process.argv[3]); const AUD=process.argv[4];
const NOSUBMIT=process.argv.includes("--nosubmit");
const CH={1:"7840f299-1cce-403e-9320-d6ddf613cebf",2:"2c3ad11f-a37e-4a64-ba6a-6cfa256cc6be",3:"5f975081-b8b7-4799-9d9c-b83a53423e4f",4:"6c59c2ec-f8bd-46f8-8506-6a8b25ff9e7b",5:"bfb4fa0c-fbd4-436f-8b37-3b307810cf63",6:"1ed78c87-3e9c-4426-a2fb-4a155955a7bb",7:"bc8967a2-13b9-4a3f-a127-e368e228e9e5",8:"f8dc1090-7968-4eb7-b231-63da59732244"}[U];
const BOOK=(await import("./config.mjs")).BOOK,BV="VTqvEEI";
const log=(...a)=>console.log(...a);
// 音频时长 → 决定等待
const DUR=Number(execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${AUD}"`).toString().trim());
log(`音频时长 ${DUR.toFixed(1)}s`);
const b64=fs.readFileSync(AUD).toString("base64");
const ver=await (await fetch("http://127.0.0.1:9222/json/version")).json();
const READER="https://ucontent.unipus.cn/_ipublishpc_default/pc.html?cid=1837944375799767040&theme=3264FA&aitutorialId=34657&cloudCurriculaId=356008&strategyId=4793137&schoolId=9341&source=cloud&sourceCallBackUrl=https://uai.unipus.cn/app/cmgt/resource-detail/?backId=1793504265186&courseResourceId=20001221469";
const ROUTE="#/course-v3:819008cfa01e0f2+xnkdxyy+20250801090513/courseware/u"+U+"/u"+U+"g2";
let tid=process.env.TID || (await (await fetch("http://127.0.0.1:9222/json/list")).json()).find(t=>t.type==='page'&&/ucontent/.test(t.url))?.id;
if(!tid){
  const boot=await CDP.connect(ver.webSocketDebuggerUrl);
  const r=await boot.send("Target.createTarget",{url:READER+ROUTE});
  tid=r.targetId; boot.close();
  log("新建阅读器标签:",tid);
  await sleep(9000);
}
const L=await connect(tid);
const {ev,frames,mouse,cdp,sessionId}=L;
await cdp.send("Page.bringToFront",{},sessionId).catch(()=>{});
// 把教材 iframe 切到本节
const CHURL=`https://ipub.unipus.cn/learner/textbook/book/${BOOK}/chapter/${CH}?bookVersionNumber=${BV}`;
async function swapSrc(){
  await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return 0;f.src='about:blank';return 1;})()`).catch(()=>{});
  await sleep(700);
  return ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub|about/.test(e.src||''));if(!f)return 0;return 1;})()`).catch(()=>0);
}
let tb=null;
async function waitReady(){
  tb=null;
  for(let i=0;i<40;i++){ await sleep(900); tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH.slice(0,12))); if(tb) break; }
  if(!tb) return false;
  for(let i=0;i<20;i++){ await sleep(700); const n=await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`,tb.ctx).catch(()=>0); if(n>0) break; }
  await closeDrawer(L);
  let ready=false;
  for(let i=0;i<25;i++){
    ready=!!(await ev(`(()=>{const a=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];return a.some(b=>(b.innerText||'').trim().length>20)?1:0;})()`,tb.ctx).catch(()=>0));
    if(ready) break;
    await sleep(800);
  }
  return ready;
}
let ok=false;
for(let a=0;a<3 && !ok;a++){
  if(a>0){ log("  ⟳ 整页重载重试"); await ev(`location.reload()`).catch(()=>{}); await sleep(11000); }
  await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub|about/.test(e.src||''));if(!f)return 0;f.src=${JSON.stringify(CHURL)};return 1;})()`).catch(()=>0);
  ok=await waitReady();
}
if(!ok){ log("!! 章节未就绪（骨架屏），放弃本题"); process.exit(2); }
// 关规则弹窗（只在存在时点）
for(const f of await frames()){
  const r=await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>0);
  if(r) log("  关规则弹窗");
}
// 注入
await ev(`window.__ttsB64='';window.__gumCalls=0;1`,tb.ctx);
for(let p=0;p<b64.length;p+=120000){ await ev(`window.__ttsB64+=${JSON.stringify(b64.slice(p,p+120000))};1`,tb.ctx); }
log("注入:",await ev(`(()=>{ if(window.__gumPatched) return 'already'; window.__gumPatched=1;
  const md=navigator.mediaDevices; if(!md) return 'no md';
  md.getUserMedia=async function(){ const bin=atob(window.__ttsB64); const u=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    const buf=await ctx.decodeAudioData(u.buffer);
    const src=ctx.createBufferSource(); src.buffer=buf;
    const dest=ctx.createMediaStreamDestination(); src.connect(dest); src.start();
    window.__ttsCtx=ctx; window.__gumCalls=(window.__gumCalls||0)+1; return dest.stream; };
  return 'patched';})()`,tb.ctx));
// 预热：确保目标块真的挂载出内容（题块是懒挂载，冷启动时 innerText 为空）
// 若目标块被折叠区包住，先展开（折叠区里的块永远不加载）
for (let k = 0; k < 3; k++) {
  const collapsed = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];if(!b)return 0;
    const c=b.closest('[class*=collapsible-container]');if(!c)return 0;
    const body=c.querySelector('[class*=collapsible-content]');if(!body)return 0;
    return body.getBoundingClientRect().height<20?1:0;})()`, tb.ctx).catch(() => 0);
  if (!collapsed) break;
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];
    const c=b.closest('[class*=collapsible-container]');const hd=c.querySelector('[class*=collapsible-head]');if(hd)hd.click();return 1;})()`, tb.ctx).catch(() => {});
  log("  ⇩ 展开折叠区");
  await sleep(2500);
}
let mounted = false;
for (let t = 0; t < 10 && !mounted; t++) {
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx);
  await sleep(900);
  const tl = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];return b?(b.innerText||'').length:0;})()`, tb.ctx).catch(() => 0);
  if (tl > 20) mounted = true;
  else {
    // 从上方逐块滚下来，逼虚拟列表把中间段渲染出来
    for (let j = Math.max(0, I - 6); j <= I; j++) {
      await ev(`(()=>{const a=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];const b=a[${j}];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx).catch(() => {});
      await sleep(260);
    }
    await sleep(400);
  }
}
log(mounted ? "  目标块已挂载" : "  !! 目标块未挂载（继续尝试）");

const probe=async()=>await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];
  if(!b) return null;
  const q=s=>(s||'').replace(/\\s+/g,' ').trim(); const t=q(b.innerText);
  const LBL=['点击开始','准备录音','开始录音','结束录音','点击结束','回放','重录','录音结束'];
  const el=b.querySelector('[class*=record_record-recording]')||b.querySelector('[class*=record_record-prepare]');
  let pt=null;
  if(el){ el.scrollIntoView({block:'center'});
    const r=el.getBoundingClientRect();
    if(r.top>80&&r.bottom<window.innerHeight-20&&r.width>0) pt={x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};
  }
  const sub=b.querySelector('[class*=i-button_default-container]');
  let sp=null;
  if(sub){ const r0=sub.getBoundingClientRect();
    if(r0.top<80||r0.bottom>window.innerHeight-10) sub.scrollIntoView({block:'center'});
    const r=sub.getBoundingClientRect();
    if(r.top>40&&r.bottom<window.innerHeight-5) sp={x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),t:q(sub.innerText)};
  }
  return {lbl:LBL.filter(l=>t.includes(l)), hasRedo:t.includes('重新作答'), pt, sp, gum:window.__gumCalls||0, tail:t.slice(-50)};})()`,tb.ctx);

let t0=0, started=false, didRecord=false;
// 录制中是全局唯一状态：直接找红点按钮，不依赖题块序号（序号会漂移）
const recState=async()=>await ev(`(()=>{const el=document.querySelector('[class*=record_record-recording]');if(!el)return null;
  el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();
  if(r.width<10)return null;return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`,tb.ctx).catch(()=>null);
for(let step=0; step<420; step++){
  const rec=await recState();
  if(rec){
    if(!t0){ t0=Date.now(); log("  ● 识别到录制中，开始计时"); }
    const remain=DUR-(Date.now()-t0)/1000+0.5;
    if(remain>0){ await sleep(remain*1000); }
    const r2=await recState();
    if(r2 && r2.y>80 && r2.y<900){ await mouse(r2.x,r2.y); didRecord=true; log(`  ■ 结束录音（录了 ${((Date.now()-t0)/1000).toFixed(1)}s / 音频 ${DUR.toFixed(1)}s）`); }
    else {
      const j=await ev(`(()=>{const el=document.querySelector('[class*=record_record-recording]');if(!el)return 0;el.click();return 1;})()`,tb.ctx).catch(()=>0);
      if(j){ didRecord=true; log("  ■ 结束录音（JS 兜底）"); } else log("  !! 结束按钮丢失");
    }
    continue;
  }
  const s=await probe();
  if(!s) { log("块丢失"); break; }
  // 已提交过的题：先点“重新作答”清掉旧记录
  if(!didRecord && s.hasRedo){
    const rr=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];
      const n=s2=>(s2||'').replace(/\s+/g,'');
      const el=[...b.querySelectorAll('[class*=i-button_default-container]')].find(e=>n(e.innerText)==='重新作答');
      if(!el) return 0; el.click(); return 1;})()`,tb.ctx).catch(()=>0);
    if(rr){ log("  ↺ 点击重新作答（清空旧录音）"); await sleep(2500); t0=0; started=false; continue; }
  }
  if(s.lbl.includes('回放')||s.lbl.includes('重录')){
    if(didRecord){ log(`→ 录制完成 (${step})`); break; }
    // 已有旧录音 → 点“重录”重来
    const rk=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];
      const n=s=>(s||'').replace(/\s+/g,'');
      const el=[...b.querySelectorAll('div,span,button,a')].find(e=>e.children.length<=1&&n(e.innerText)==='重录');
      if(!el) return 0; el.click(); return 1;})()`,tb.ctx).catch(()=>0);
    if(rk){ log("  ⟲ 点击重录"); await sleep(1800); t0=0; started=false; continue; }
    log("  !! 找不到重录，退出"); break;
  }
  if(s.lbl.includes('开始录音') && !started && s.pt){
    await mouse(s.pt.x,s.pt.y); started=true; if(!t0) t0=Date.now();
    log("  ▶ 开始录音");
    continue;
  }
  if(s.lbl.includes('结束录音')||s.lbl.includes('点击结束')){
    // 第一次看到“录制中”才算真正开录（有的题点一次就自动开始）
    if(!t0){ t0=Date.now(); log("  ● 识别到录制中，开始计时"); }
    const elapsed=(Date.now()-t0)/1000;
    const remain=DUR-elapsed+0.5;                      // 按音频时长补齐
    if(remain>0){ await sleep(remain*1000); }
    const s2=await probe();
    if(s2?.pt){ await mouse(s2.pt.x, s2.pt.y); didRecord=true; log(`  ■ 结束录音（录了 ${((Date.now()-t0)/1000).toFixed(1)}s / 音频 ${DUR.toFixed(1)}s）`); }
    else {
      // 按钮不在视口内：先滚进来再试；仍失败则用 JS 点击兜底
      await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];const el=b&&(b.querySelector('[class*=record_record-recording]')||b.querySelector('[class*=record_record-prepare]'));if(el)el.scrollIntoView({block:'center'});return 1;})()`,tb.ctx).catch(()=>{});
      await sleep(600);
      const s3=await probe();
      if(s3?.pt){ await mouse(s3.pt.x,s3.pt.y); didRecord=true; log(`  ■ 结束录音（滚动后点击，录了 ${((Date.now()-t0)/1000).toFixed(1)}s）`); }
      else {
        const j=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${I}];const el=b&&(b.querySelector('[class*=record_record-recording]')||b.querySelector('[class*=record_record-prepare]'));if(!el)return 0;el.click();return 1;})()`,tb.ctx).catch(()=>0);
        if(j){ didRecord=true; log("  ■ 结束录音（JS 兜底点击）"); }
        else log("  !! 找不到结束按钮");
      }
    }
    continue;
  }
  if(s.lbl.includes('准备录音')){ await sleep(400); continue; }   // 倒计时中
  if(s.lbl.includes('点击开始') && s.pt){ await mouse(s.pt.x,s.pt.y); log("  ◦ 点击开始(准备)"); continue; }
  await sleep(500);
}
// 提交
if(!NOSUBMIT){
  for(let k=0;k<30;k++){
    const s=await probe();
    if(!s) break;
    if(s.sp && /提交/.test(s.sp.t)){
      await mouse(s.sp.x,s.sp.y); log("  ↑ 点击提交");
      break;
    }
    await sleep(700);
  }
  for(let k=0;k<20;k++){
    let hit=false;
    for(const f of await frames()){
      const r=await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>e.children.length<=1&&(n(e.innerText)==='确定'||n(e.innerText)==='确认')&&e.getBoundingClientRect().width>18);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>0);
      if(r){ hit=true; break; }
    }
    if(hit){ log("  ✓ 确认提交"); break; }
    await sleep(700);
  }
}
for(let k=0;k<20;k++){
  const s=await probe();
  if(!s) break;
  if(/得分|重新作答/.test(s.tail)){ log("结果:",s.tail); break; }
  await sleep(800);
}
log("final:",JSON.stringify(await probe()));
L.cdp.close();
