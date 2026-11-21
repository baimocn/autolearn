import { connect, sleep } from "./utlib.mjs";
import { READER, COURSE } from "./reader.mjs";
const ROUTE=process.argv[2];
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
await cdp.send("Page.enable",{},sessionId).catch(()=>{});
await cdp.send("Page.navigate",{url:`${READER}#/${COURSE}/courseware/${ROUTE}`},sessionId).catch(()=>{});
console.log('nav',ROUTE);
for(let k=0;k<20;k++){
 await sleep(2000);
 const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
 if(tb){
  const st=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];return {ne:bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length,txt:document.body.innerText.length,url:location.href.slice(-60)};})()`,tb.ctx).catch(()=>null);
  if(st&&st.ne>0){console.log('ready',k*2+'s',JSON.stringify(st));break;}
 }
}
// 找精读/播放入口
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
if(tb){
 const r=await ev(`(()=>{const out=[];
  for(const e of document.querySelectorAll('*')){
   const t=(e.innerText||'').replace(/[ ]+/g,' ');
   if(/精读|intensive|立即学习/i.test(t)&&t.length<32){const b=e.getBoundingClientRect();out.push({tag:e.tagName,cls:(e.className||'').toString().slice(0,50),t:t.slice(0,25),w:Math.round(b.width),disp:getComputedStyle(e).display});}
   if(out.length>=10)break;}
  const auds=[...document.querySelectorAll('audio')].map(a=>({dur:Math.round(a.duration||0),cur:Math.round(a.currentTime||0)})).slice(0,8);
  return {found:out,audios:auds.length,audioSample:auds};})()`,tb.ctx).catch(e=>String(e));
 console.log(JSON.stringify(r,null,1).slice(0,2500));
}
cdp.close();
