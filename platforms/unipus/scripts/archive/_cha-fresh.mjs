import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE } from "./reader.mjs";
const U = Number(process.argv[2]||1);
const ver=await(await fetch("http://127.0.0.1:9222/json/version")).json();
const boot=await CDP.connect(ver.webSocketDebuggerUrl);
for(const t of (await(await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t=>/ucontent/.test(t.url)))await boot.send("Target.closeTarget",{targetId:t.id}).catch(()=>{});
await sleep(700);
const r=await boot.send("Target.createTarget",{url:`${READER}#/${COURSE}/courseware/u${U}/u${U}g2`});
boot.close();
await sleep(16000);
const L=await connect(r.targetId);
const {ev,frames,cdp,sessionId}=L;
let tb=null;
for(let k=0;k<60&&!tb;k++){tb=(await frames()).find(f=>f.url.includes("textbook/book")&&f.ctx);if(tb){const n=await ev(`document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]').length`,tb.ctx).catch(()=>0);if(n>0)break;}await sleep(1000);}
if(!tb){console.log("NO TB");process.exit(1);}
const cards=await ev(`(()=>{return [...document.querySelectorAll('[data-lexical-node-type="quiz-paper-link"]')].map((c,i)=>{const img=c.querySelector('img');let dec='';try{dec=decodeURIComponent(img?img.src:'');}catch(e){dec=img?img.src:'';}
 const full=dec;
 c.scrollIntoView({block:'center'});const b=c.getBoundingClientRect();
 return {i,dec:full.slice(-40),isCha:full.includes('挑战'),isUT:/UT.png|Unit ?test/i.test(full),x:Math.round(b.left+b.width/2),y:Math.round(b.top+40),top:Math.round(b.top)};});})()`,tb.ctx);
console.log("CARDS:",JSON.stringify(cards,null,1));
const cha=cards.find(c=>c.isCha);
console.log("challenge card:",JSON.stringify(cha));
if(cha){
  await sleep(1200);
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x:cha.x,y:cha.y},sessionId);
  await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x:cha.x,y:cha.y,button:"left",clickCount:1},sessionId);
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x:cha.x,y:cha.y,button:"left",clickCount:1},sessionId);
  await sleep(5000);
  const fl2=await frames();
  console.log("frames:",fl2.map(f=>f.url.slice(40,90)));
  // 弹窗按钮
  for(const f of fl2){
    const b=await ev(`(()=>{const out=[];[...document.querySelectorAll('button,div,span,a')].forEach(e=>{if(e.children.length>1)return;const t=(e.innerText||'').replace(/\s+/g,'').trim();if(/开始挑战|再次挑战|开始答题|我知道了/.test(t)&&t.length<8){const bb=e.getBoundingClientRect();if(bb.width>15)out.push({t,x:Math.round(bb.left+bb.width/2),y:Math.round(bb.top+bb.height/2)});}});return out.slice(0,8);})()`,f.ctx).catch(()=>null);
    if(b&&b.length)console.log("BTNS@",f.url.slice(40,70),"=>",JSON.stringify(b));
  }
}
const {data}=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId);
const fs=await import("node:fs");
fs.writeFileSync(`cha-u${U}.png`,Buffer.from(data,"base64"));
console.log("shot cha-u"+U+".png");
cdp.close();
