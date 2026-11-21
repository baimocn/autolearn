// 空壳态：抓 DOM 证据 + 截图（如实记录无法执行）
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const tabs=(await(await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t=>t.type==="page"&&/ucontent/.test(t.url));
let target=null;
for(const t of tabs){const L0=await connect(t.id);const fl=await L0.frames();const tb=fl.find(f=>/textbook\/book/.test(f.url)&&f.ctx);
 const ch=tb?(tb.url.match(/chapter\/([0-9a-f-]+)/)||[])[1]:"";L0.cdp.close();if(ch===CH[4]){target=t.id;break;}}
const L=await connect(target);const {ev,frames,cdp,sessionId}=L;const fl=await frames();const tb=fl.find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const dom=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
  const b=document.getElementById('CMo3JMPXoM5gEl44');
  const body=document.body.innerText||'';
  return {chapter:'6c59c2ec-f8bd-46f8-8506-6a8b25ff9e7b',chapterOK:${JSON.stringify(CH[4])},
    blocks:bs.length,textNonempty:bs.filter(x=>(x.textContent||'').replace(/\s+/g,'').length>5).length,
    innerNonempty:bs.filter(x=>(x.innerText||'').replace(/\s+/g,'').length>5).length,
    statuses:[...new Set(bs.map(x=>x.getAttribute('data-lexical-node-status')))],
    targetExists:!!b,targetStatus:b?b.getAttribute('data-lexical-node-status'):null,
    targetLen:b?(b.innerText||b.textContent||'').length:0,
    targetHasRecord:b?!!b.querySelector('[class*=record_]'):false,
    hasOralControls:/点击开始|准备录音|我的回放|重录/.test(body),
    hasLogin:/登录|账号|密码|SSO/.test(body),hasLimit:/限流|稍后再试|非单元学习周期|加载失败/.test(body),
    bodyLen:body.length,healthyProbePass:false};})()`,tb.ctx).catch(e=>({err:String(e).slice(0,150)}));
console.log("DOM:",JSON.stringify(dom,null,1));
fs.mkdirSync("shots",{recursive:true});
const shot=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId).catch(()=>({data:null}));
if(shot.data){fs.writeFileSync("shots/U4-u4g569.png",Buffer.from(shot.data,"base64"));console.log("截图已存:",fs.statSync("shots/U4-u4g569.png").size,"bytes");}
fs.writeFileSync("_u4g569-exec.json",JSON.stringify({dom,shot:"shots/U4-u4g569.png",note:"u4 整章空壳，题块全 loading，录音控件未渲染，无法执行 _oralall.mjs"},null,1));
L.cdp.close();
