import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE } from "./reader.mjs";
const U=Number(process.argv[2]||7), NODE=process.argv[3]||"u7g882";
const ver=await(await fetch("http://127.0.0.1:9222/json/version")).json();
const boot=await CDP.connect(ver.webSocketDebuggerUrl);
const readers=(await(await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t=>/ucontent\.unipus\.cn/.test(t.url));
for(const t of readers){await boot.send("Target.closeTarget",{targetId:t.id}).catch(()=>{});}
await sleep(2000);
const r=await boot.send("Target.createTarget",{url:`${READER}#/${COURSE}/courseware/u${U}/${NODE}`});
boot.close();
console.log('opened fresh tab, waiting patiently (no reload)...');
await sleep(15000);
const L=await connect(r.targetId);
const {ev,frames,cdp}=L;
let last=null;
for(let k=0;k<70;k++){
 const fl=await frames();
 const tb=fl.find(f=>/textbook\/book/.test(f.url)&&f.ctx);
 if(tb){
  const st=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];const ne=bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length;return {blocks:bs.length,nonempty:ne,txt:document.body.innerText.length,spin:document.querySelectorAll('.ant-spin').length};})()`,tb.ctx).catch(e=>String(e));
  const s=JSON.stringify(st);
  if(s!==last){console.log((15+k*5)+'s',s);last=s;}
  if(st&&st.nonempty>0){console.log('HEALTHY');break;}
 }
 await sleep(5000);
}
cdp.close();
