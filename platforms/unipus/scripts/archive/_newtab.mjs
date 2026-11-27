import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE, CH } from "./reader.mjs";
const U=Number(process.argv[2]||7);
const NODE=process.argv[3]||"u7g882";
const ver=await(await fetch("http://127.0.0.1:9222/json/version")).json();
const boot=await CDP.connect(ver.webSocketDebuggerUrl);
// 只在有多个 reader 时关闭旧的；保留 uai 标签
const readers=(await(await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t=>/ucontent\.unipus\.cn/.test(t.url));
for(const t of readers){await boot.send("Target.closeTarget",{targetId:t.id}).catch(()=>{});console.log('closed',t.id);}
await sleep(1500);
const r=await boot.send("Target.createTarget",{url:`${READER}#/${COURSE}/courseware/u${U}/${NODE}`});
boot.close();
console.log('new tab',r.targetId);
await sleep(16000);
const L=await connect(r.targetId);
const {ev,frames,cdp,sessionId}=L;
for(let k=0;k<8;k++){
 const fl=await frames();
 const tb=fl.find(f=>/textbook\/book/.test(f.url)&&f.ctx);
 if(tb){
  const st=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];return {blocks:bs.length,nonempty:bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length,txt:document.body.innerText.length,ch:location.href.slice(60,112)};})()`,tb.ctx).catch(e=>String(e));
  console.log('probe',k,JSON.stringify(st));
  if(st&&st.nonempty>0){console.log('HEALTHY');break;}
 } else console.log('probe',k,'no tb');
 await cdp.send("Page.reload",{ignoreCache:true},sessionId).catch(()=>{});
 await sleep(14000);
}
cdp.close();
