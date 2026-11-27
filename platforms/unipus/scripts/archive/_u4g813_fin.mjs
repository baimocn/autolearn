// _u4g813_fin.mjs — 最终轮：自适应 → 结果页(得分) → 规范截图 → 权威核验 state.pass（不 reload）
import { connect } from "./utlib.mjs";
import { CH, COURSE } from "./reader.mjs";
import fs from "node:fs";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log("[fin]", ...a);
process.on("uncaughtException", e => log("uncaught:", String(e).slice(0,160)));
const U=4, CH4=CH[U], CARD="TYL6NCP0OCeQBcPc", PAPER="kijiH3hfSGpWXCZt";
const SHOT="shots/U4-u4g813.png", PRE="shots/U4-u4g813-pre.png";
const OPENID="5cb554a204db411aa8958f116769407f";
const tabs=(await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t=>t.type==="page"&&/ucontent\.unipus\.cn/.test(t.url));
let target=null;
for(const t of tabs){const L0=await connect(t.id);const fl=await L0.frames();const tb0=fl.find(f=>/textbook\/book/.test(f.url)&&f.ctx);const ch=tb0?(tb0.url.match(/chapter\/([0-9a-f-]+)/)||[])[1]:"";L0.cdp.close();if(ch===CH4){target=t.id;break;}}
if(!target){log("NO U4 READER");process.exit(2);}
const L=await connect(target);
const {ev,frames,cdp,sessionId}=L;
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
const snap=async p=>{const s=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId).catch(()=>({data:null}));if(s.data){fs.mkdirSync("shots",{recursive:true});fs.writeFileSync(p,Buffer.from(s.data,"base64"));return fs.statSync(p).size;}return 0;};
const evRaw=async(expr,ctx)=>{const r=await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true,awaitPromise:true,userGesture:true,...(ctx?{contextId:ctx}:{})},sessionId).catch(e=>({err:String(e)}));return r?.result?.value;};
const offA=await evRaw(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`)||{ox:0,oy:0};
const OY0=offA.oy||0;
// 关所有「我知道了/知道了」+ 关抽屉
const dismiss=async(tag)=>{for(let i=0;i<4;i++){let hit=false;for(const f of await frames()){if(!f.ctx||!/pc\.html|textbook/.test(f.url))continue;const q=await evRaw(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a')].filter(e=>/^(我知道了|知道了)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`,f.ctx);if(q&&q.x){await mouse(q.x,q.y);log(tag,"dismiss @",q.x,q.y);await sleep(1100);hit=true;break;}}if(!hit)break;}};
await dismiss("init");
// 关抽屉 X @408,34（视觉已核对）
await mouse(408,34);await sleep(1200);
// healthy 探针
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH4.slice(0,12)));
if(!tb){log("NO TB");cdp.close();process.exit(3);}
const raw=e=>evRaw(e,tb.ctx);
const probe=await raw(`(()=>{try{const c=document.getElementById(${JSON.stringify(CARD)});const bs=document.querySelectorAll('div.editor-question-block.questionBlockNode');let ne=0;bs.forEach(b=>{if((b.innerText||'').replace(/\\s+/g,'').length>5)ne++;});const body=document.body.innerText||'';return{chapterOK:${JSON.stringify(tb.url.includes(CH4))},blocks:bs.length,nonempty:ne,cardExists:!!c,cardStatus:c?c.getAttribute('data-lexical-node-status'):null,hasLogin:/登录|账号|密码|SSO/.test(body),hasLimit:/限流|稍后再试|非单元学习周期|加载失败/.test(body)};}catch(e){return{err:String(e)};}})()`);
log("HEALTHY:",JSON.stringify(probe));
// 点 UT 卡片（scrollIntoView + 截图 PRE + elementFromPoint 校验）
const pos=await raw(`(()=>{const c=document.getElementById(${JSON.stringify(CARD)});if(!c)return{err:'no card'};c.scrollIntoView({block:'center'});const cc=c.querySelector('[class*=coverContainer]')||c;const b=cc.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width),h:Math.round(b.height)};})()`);
log("卡片:",JSON.stringify(pos));
await sleep(900);
log("PRE:",PRE,await snap(PRE),"bytes");
const chk=await raw(`(()=>{const e=document.elementFromPoint(${pos.x},${pos.y});return e?{tag:e.tagName,cls:String(e.className||'').slice(0,50)}:null;})()`);
log("elementFromPoint:",JSON.stringify(chk));
if(pos&&pos.x){await mouse(pos.x,pos.y);log("点卡片 @",pos.x,pos.y);}
await sleep(4500);
await dismiss("postcard");
// 扫描所有帧的状态（按钮 + 文本），据此自适应
const scan=async()=>{const out=[];for(const f of await frames()){if(!f.ctx)continue;const d=await evRaw(`(()=>{try{const t=(document.body.innerText||'').replace(/\\s+/g,' ');const n=s=>(s||'').replace(/\\s+/g,'');const btns=[...document.querySelectorAll('button,[class*=i-button],div[role=button],span,a')].map(e=>({t:n(e.innerText).slice(0,18),w:Math.round(e.getBoundingClientRect().width)})).filter(x=>x.t&&/^(开始答题|再次作答|查看测试结果|成绩提交|提交|确定|确认|继续提交|返回)$/.test(x.t)&&x.w>15);const modals=[...document.querySelectorAll('[class*=modal],[role=dialog],[class*=dialog],[class*=confirm]')].filter(e=>e.getBoundingClientRect().height>50).map(e=>(e.innerText||'').replace(/\\s+/g,' ').slice(0,180));return{url:location.href.slice(0,95),hasScore:/最终得分|测试满分|正确率/.test(t),scoreSnip:(t.match(/测试满分[^。]{0,60}/)||[''])[0],hasStart:/开始答题/.test(t),hasAgain:/再次作答/.test(t),hasView:/查看测试结果/.test(t),head:t.slice(0,150),btns:[...new Map(btns.map(b=>[b.t,b])).values()],modals:modals.slice(0,3)};}catch(e){return{err:String(e)};}})()`,f.ctx);out.push({frame:f.url.slice(0,70),d});}return out;};
let states=await scan();
log("SCAN1:",JSON.stringify(states).slice(0,1600));
// 找按钮坐标（跨帧）
const findBtn=async(regex)=>{for(const f of await frames()){if(!f.ctx)continue;const oy=/textbook/.test(f.url)?OY0:0;const r=await evRaw(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span,a,[class*=i-button]')].filter(e=>${regex}.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2+${oy}),t:n(e.innerText)};})()`,f.ctx);if(r&&r.x)return{...r,frame:f.url.slice(0,60)};}return null;};
// ① 若有「查看测试结果」→ 直接看成绩
let view=await findBtn('/^查看测试结果$/');
if(view){log("查看测试结果:",JSON.stringify(view));await mouse(view.x,view.y);await sleep(4500);}
// ② 否则若「再次作答」→ 重进考试并答满提交
else{
  const again=await findBtn('/^再次作答$/');
  const start=again||await findBtn('/^开始答题$/');
  if(start){log("进入考试:",JSON.stringify(start));await mouse(start.x,start.y);await sleep(6000);}
  let exam=null;
  for(let k=0;k<25&&!exam;k++){exam=(await frames()).find(f=>/testing\/(diagnosis|challenge)\/book/.test(f.url)&&f.ctx);if(!exam)await sleep(1200);}
  log("exam:",exam?exam.url.slice(-90):"无");
  if(exam){
    const exEv=e=>evRaw(e,exam.ctx);
    // 等题目尽量加载全
    let nq=0;
    for(let k=0;k<20;k++){nq=await exEv(`document.querySelectorAll('[class*=answer-question-box_questionItem]').length`)||0;if(nq>=20)break;await sleep(1500);}
    log("questions:",nq);
    const tb2=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
    const offB=await evRaw(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/testing|exam/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`,tb2?.ctx)||{ox:0,oy:0};
    const OX=(offA.ox||0)+(offB.ox||0),OY=(offA.oy||0)+(offB.oy||0);
    const ans=await exEv(`(()=>{try{const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];let p=0,f=0;items.forEach(q=>{const rows=[...q.querySelectorAll('[class*=chioceView_strongListView]')];if(rows.length){rows[0].click();p++;return;}const tfs=[...q.querySelectorAll('[class*=answer_optionTF]')];if(tfs.length){tfs[0].click();p++;return;}const els=[...q.querySelectorAll('input[type=text],textarea')];els.forEach(el=>{const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,'Agriculture and sustainable rural development are important.');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));f++;});});return{total:items.length,picked:p,filled:f};}catch(e){return{err:String(e)};}})()`);
    log("作答:",JSON.stringify(ans));
    await sleep(1500);
    const sb=await exEv(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,[class*=i-button_default-container]')].filter(e=>n(e.innerText)==='提交'&&e.getBoundingClientRect().width>40);if(!v.length)return null;const e=v[v.length-1];e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`);
    if(sb){await mouse(sb.x+OX,sb.y+OY);log("提交 @",sb.x+OX,sb.y+OY);await sleep(3000);}
    // 确认弹窗：读取文本后点任意正向按钮
    for(let k=0;k<5;k++){let hit=false;const conf=await findBtn('/^(确定|确认|继续提交|我知道了)$/');if(conf){log("确认:",JSON.stringify(conf));await mouse(conf.x,conf.y);hit=true;await sleep(2200);}if(!hit)break;}
    await sleep(6000);
    view=await findBtn('/^查看测试结果$/');
    if(view){log("再看测试结果:",JSON.stringify(view));await mouse(view.x,view.y);await sleep(5000);}
  }
}
// 读成绩（全帧）
let score=null,resultText="";
for(let k=0;k<8&&!resultText;k++){
  for(const f of await frames()){if(!f.ctx)continue;const t=String(await evRaw(`document.body.innerText`,f.ctx)||"");if(/最终得分|测试满分|正确率/.test(t)){resultText=t.replace(/\s+/g," ");const m=resultText.match(/最终得分是\s*([\d.]+)\s*分/);if(m)score=m[1];break;}}
  if(!resultText)await sleep(2000);
}
log("成绩文本(前 240):",resultText.slice(0,240)||"未出现");
log("解析得分:",score);
// 权威核验：直接 fetch course_progress（不 reload，避免清掉成绩页）
const pc=(await frames()).find(f=>/pc\.html/.test(f.url)&&f.ctx);
let passCheck={src:"fetch"};
if(pc){
  passCheck=await evRaw(`fetch('/course/api/v2/course_progress/${COURSE}/u${U}/${OPENID}/default',{credentials:'include'}).then(r=>r.text()).then(t=>{const j=JSON.parse(t);const v=j.rt?.leafs?.['u4g813'];return{found:!!v,state:v?v.state:null,pass:v?v.state?.pass:null,pass2:v?v.state?.pass2:null,unit:j.rt?.unit_id};}).catch(e=>({err:String(e).slice(0,140)}))`,pc.ctx)||{err:"no value"};
}
log("★ 权威 state.pass 核验:",JSON.stringify(passCheck));
// DOM 证据
states=await scan();
log("SCAN2:",JSON.stringify(states).slice(0,1400));
// 最终截图
log("最终截图:",SHOT,await snap(SHOT),"bytes");
fs.writeFileSync("_u4g813-fin.json",JSON.stringify({target,probe,pos,chk,score,resultText:resultText.slice(0,600),passCheck,states,shot:SHOT,pre:PRE},null,1));
cdp.close();
