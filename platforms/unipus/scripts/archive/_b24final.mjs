import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
for(let k=0;k<6;k++){
 await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,-Math.round(innerHeight*0.5));return 1;})()`,tb.ctx).catch(()=>{});
 await sleep(900);
 const st=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];const b=bs[24];return{blocks:bs.length,y:Math.round(b.getBoundingClientRect().top),len:(b.innerText||'').length,file:b.querySelectorAll('input[type=file]').length,nonempty:bs.filter(x=>(x.innerText||'').replace(/[ ]+/g,'').length>5).length};})()`,tb.ctx).catch(()=>({}));
 console.log(k,JSON.stringify(st));
 if(st&&st.len>0){console.log('MOUNTED');break;}
}
const {data}=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId);
fs.writeFileSync("b24final.png",Buffer.from(data,"base64"));
cdp.close();
