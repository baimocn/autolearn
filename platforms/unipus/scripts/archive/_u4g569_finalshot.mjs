// _u4g569_finalshot.mjs — 第2轮证据定格：只读当前真实 DOM + 截图（不刷新/不滚动/不改状态）
import { connect } from "./utlib.mjs";
import { CH } from "./reader.mjs";
import fs from "node:fs";
const log=(...a)=>console.log("[fin]",...a);
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const chap=tb?(tb.url.match(/chapter\/([0-9a-f-]+)/)||[])[1]:"";
const dom=tb?await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
  const ne=bs.filter(b=>(b.innerText||'').replace(/\\s+/g,'').length>5).length;
  const sts={};bs.forEach(b=>{const s=b.getAttribute('data-lexical-node-status')||'none';sts[s]=(sts[s]||0)+1;});
  const allRec=document.querySelectorAll('[class*=record_record-prepare],[class*=record_record-recording]').length;
  const anyInput=document.querySelectorAll('input[type=file]').length;
  const body=document.body.innerText||'';
  const idx=[...bs].map((b,i)=>({i,len:(b.innerText||'').length,st:b.getAttribute('data-lexical-node-status')})).filter(x=>x.len>3);
  return{blocks:bs.length,nonempty:ne,statusCounts:sts,allRecordCtrls:allRec,fileInputs:anyInput,
    bodyLen:body.length,hasLimit:/限流|稍后再试|非单元学习周期|加载失败/.test(body),
    hasOralText:/点击开始|准备录音|开始录音|回放|重录|我的回放|重新作答/.test(body),
    nonemptyIdx:idx.slice(0,8),sample:body.replace(/\\s+/g,' ').slice(0,220)};})()`,tb.ctx).catch(e=>({err:String(e).slice(0,160)})):{err:"no tb"};
log("chap:",chap,"match:",chap===CH[4]);
log("DOM:",JSON.stringify(dom));
const healthy=(dom.nonempty||0)>0&&chap===CH[4];
log("HEALTHY:",healthy,"(nonempty>0 && chapter match)");
fs.mkdirSync("shots",{recursive:true});
const shot=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId).catch(()=>({data:null}));
if(shot.data){fs.writeFileSync("shots/U4-u4g569.png",Buffer.from(shot.data,"base64"));log("截图:",fs.statSync("shots/U4-u4g569.png").size,"bytes");}
fs.writeFileSync("_u4g569-final.json",JSON.stringify({chap,chapterMatch:chap===CH[4],healthy,dom,shot:"shots/U4-u4g569.png"},null,1));
cdp.close();
