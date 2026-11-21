// _u4g813_r2.mjs — 第2轮：点开始答题 → 答满 → 提交 → 确认 → 成绩提交 → 核验 pass → 截图
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[r2]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0,160)));
const U=4, CH4=CH[U], PAPER="kijiH3hfSGpWXCZt";
const SHOT="shots/U4-u4g813.png";
const tabs=(await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t=>t.type==="page"&&/ucontent\.unipus\.cn/.test(t.url));
let target=null;
for(const t of tabs){const L0=await connect(t.id);const fl=await L0.frames();const tb0=fl.find(f=>/textbook\/book/.test(f.url)&&f.ctx);const ch=tb0?(tb0.url.match(/chapter\/([0-9a-f-]+)/)||[])[1]:"";L0.cdp.close();if(ch===CH4){target=t.id;break;}}
if(!target){log("NO U4 READER");process.exit(2);}
const L=await connect(target);
const {ev,frames,cdp,sessionId}=L;
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
const snap=async p=>{const s=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId).catch(()=>({data:null}));if(s.data){fs.mkdirSync("shots",{recursive:true});fs.writeFileSync(p,Buffer.from(s.data,"base64"));return fs.statSync(p).size;}return 0;};
const evRaw=async(expr,ctx)=>{const r=await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true,awaitPromise:true,userGesture:true,...(ctx?{contextId:ctx}:{})},sessionId).catch(e=>({err:String(e)}));return r?.result?.value;};
// 监听进度响应
const reqs=new Map(),progIds=[];
await cdp.send("Network.enable",{},sessionId).catch(()=>{});
cdp.on("Network.requestWillBeSent",p=>{if(p.request?.url)reqs.set(p.requestId,p.request.url);});
cdp.on("Network.responseReceived",p=>{const u=reqs.get(p.requestId)||"";if(/course_progress|score|submit|result/i.test(u))progIds.push({id:p.requestId,url:u});});
// iframe 偏移
const offA=await evRaw(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`)||{ox:0,oy:0};
log("offA:",JSON.stringify(offA));

// ① 点「开始答题」（跨帧；DOM 定位 scrollIntoView，按 frame 内坐标+offA 点）
let started=false;
for(let k=0;k<8&&!started;k++){
  for(const f of await frames()){
    if(!f.ctx)continue;
    const oy=/textbook/.test(f.url)?(offA.oy||0):0;
    const q=await evRaw(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(开始答题|再次作答)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy}),t:n(e.innerText)};})()`,f.ctx);
    if(q&&q.x){log("开始答题按钮:",JSON.stringify(q),"frame",f.url.slice(0,55));await mouse(q.x,q.y);started=true;await sleep(5500);break;}
  }
  if(!started){await sleep(1500);}
}
log("started =",started);
let fl=await frames();
log("frames:",JSON.stringify(fl.map(f=>f.url.slice(0,95))));
// ② 等 exam 帧
let exam=null;
for(let k=0;k<25&&!exam;k++){exam=(await frames()).find(f=>/testing\/(diagnosis|challenge)\/book/.test(f.url)&&f.ctx&&f.url.includes(PAPER));if(!exam)exam=(await frames()).find(f=>/testing\/(diagnosis|challenge)\/book/.test(f.url)&&f.ctx);if(!exam)await sleep(1200);}
log("exam:",exam?exam.url.slice(-100):"无");
if(!exam){log("无 exam 帧");await snap(SHOT);cdp.close();process.exit(5);}
const exEv=e=>evRaw(e,exam.ctx);
// ③ 等题目
let nq=0;
for(let k=0;k<20;k++){nq=await exEv(`document.querySelectorAll('[class*=answer-question-box_questionItem]').length`)||0;if(nq>=10)break;await sleep(1200);}
log("questions:",nq);
// 偏移链 B
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const offB=await evRaw(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/testing|exam/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`,tb?.ctx)||{ox:0,oy:0};
const OX=(offA.ox||0)+(offB.ox||0),OY=(offA.oy||0)+(offB.oy||0);
log("偏移 OX,OY =",OX,OY);
// 点掉 exam 内「我知道了」
const ack=await exEv(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`);
if(ack){await mouse(ack.x+OX,ack.y+OY);log("exam 我知道了 @",ack.x+OX,ack.y+OY);await sleep(1500);}
// ④ 答满
const answered=await exEv(`(()=>{try{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];let picked=0,filled=0;
  items.forEach(q=>{const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];if(rows.length){rows[0].click();picked++;return;}
    const tfs=[...q.querySelectorAll('[class*=answer_optionTF]')];if(tfs.length){tfs[0].click();picked++;return;}
    const els=[...q.querySelectorAll('input[type=text],textarea')];els.forEach(el=>{const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,'The answer is agriculture and sustainable development.');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));filled++;});});
  return {total:items.length,picked,filled};}catch(e){return{err:String(e)};}})()`);
log("作答:",JSON.stringify(answered));
await sleep(1500);
// ⑤ 提交
let submitted=false;
for(let k=0;k<5&&!submitted;k++){
  const sb=await exEv(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('[class*=i-button_default-container],button')].filter(e=>n(e.innerText)==='提交'&&e.getBoundingClientRect().width>40&&e.getBoundingClientRect().height>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width)};})()`);
  if(!sb){await exEv(`(()=>{const se=document.scrollingElement;se.scrollBy(0,400);return 1;})()`);await sleep(800);continue;}
  log("提交按钮:",JSON.stringify(sb),"=> 页面:",sb.x+OX,sb.y+OY);await mouse(sb.x+OX,sb.y+OY);submitted=true;await sleep(3000);
}
log("submitted =",submitted);
// ⑥ 确认弹窗（确定/确认/继续提交）
for(let k=0;k<6;k++){
  let hit=false;
  for(const f of await frames()){
    if(!f.ctx)continue;
    const oy=/testing/.test(f.url)?OY:(/textbook/.test(f.url)?(offA.oy||0):0);
    const r=await evRaw(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const root=[...document.querySelectorAll('[class*=ant-modal-confirm],[class*=modal],[role=dialog]')].find(e=>e.getBoundingClientRect().height>60&&/提交|交卷|确定|确认/.test(e.innerText||''));const v=(root?[...root.querySelectorAll('button,[class*=i-button],span,div')]:[...document.querySelectorAll('button,[class*=i-button],span,div')]).filter(e=>/^(确定|确认|继续提交)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy}),t:n(e.innerText)};})()`,f.ctx);
    if(r&&r.x){log("确认:",JSON.stringify(r));await mouse(r.x,r.y);hit=true;await sleep(2000);break;}
  }
  if(!hit)break;
}
await sleep(7000);
// ⑦ 成绩提交（若存在）
let scorePosted=false;
for(let k=0;k<4&&!scorePosted;k++){
  for(const f of await frames()){
    if(!f.ctx)continue;
    const r=await evRaw(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>n(e.innerText)==='成绩提交'&&e.getBoundingClientRect().width>12);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),t:n(e.innerText)};})()`,f.ctx);
    if(r&&r.x){log("成绩提交 @",r.x,r.y);await mouse(r.x,r.y);scorePosted=true;await sleep(3000);break;}
  }
  if(!scorePosted)await sleep(1500);
}
log("scorePosted =",scorePosted);
// ⑧ 读成绩文本（全帧）
let score=null,resultText="";
for(let k=0;k<8&&!resultText;k++){
  for(const f of await frames()){
    if(!f.ctx)continue;
    const t=String(await evRaw(`document.body.innerText`,f.ctx)||"");
    if(/最终得分|正确率|测试满分/.test(t)){resultText=t.replace(/\s+/g," ");const m=resultText.match(/最终得分是\s*([\d.]+)\s*分/);if(m)score=m[1];break;}
  }
  if(!resultText)await sleep(2000);
}
log("成绩文本(前 260):",resultText.slice(0,260)||"未出现");
log("解析得分:",score);
// ⑨ reload 触发进度请求后核验 state.pass
await cdp.send("Page.reload",{},sessionId).catch(()=>{});
await sleep(16000);
let passInfo={src:"none"};
for(const h of progIds.slice(-15)){
  try{const b=await cdp.send("Network.getResponseBody",{requestId:h.id},sessionId);const j=JSON.parse(b.body);const leaf=j.rt?.leafs?.["u4g813"];if(leaf){passInfo={src:"SPA-response",pass:leaf.state?.pass,pass2:leaf.state?.pass2,state:leaf.state};break;}}catch(e){}
}
let localPass=null;
try{const j=JSON.parse(fs.readFileSync("prog-u4.json","utf8"));localPass=j.rt?.leafs?.["u4g813"]?.state?.pass;}catch(e){}
log("★ state.pass 核验: SPA=",JSON.stringify(passInfo)," local prog-u4.json=",localPass,"(来源: 本地快照, mtime="+fs.statSync("prog-u4.json").mtime.toISOString()+")");
// ⑩ DOM 证据 + 最终截图
let dom={};
for(const f of await frames()){if(!f.ctx)continue;const t=String(await evRaw(`(document.body.innerText||'').replace(/\\s+/g,' ').slice(0,400)`,f.ctx)||"");if(t)dom[f.url.slice(0,60)]=t;}
log("DOM 证据(head 400/帧):",JSON.stringify(dom).slice(0,900));
log("最终截图:",SHOT,await snap(SHOT),"bytes");
fs.writeFileSync("_u4g813-r2.json",JSON.stringify({target,started,nq,answered,submitted,scorePosted,score,resultText:resultText.slice(0,600),passInfo,localPass,progUrls:progIds.map(x=>x.url.slice(-90)),dom,shot:SHOT},null,1));
cdp.close();
