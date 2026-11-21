import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
if(!tb){console.log('no tb');process.exit(1);}
for(let i=0;i<24;i++){
 await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollBy(0,Math.round(innerHeight*0.85));return 1;})()`,tb.ctx).catch(()=>{});
 await sleep(1500);
 const st=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];return {ne:bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length,txt:document.body.innerText.length,spin:document.querySelectorAll('.ant-spin').length};})()`,tb.ctx).catch(()=>({}));
 if(i%4===3)console.log(i+1,JSON.stringify(st));
}
cdp.close();
