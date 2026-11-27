import { connect, sleep } from "./utlib.mjs";
const MAX=Number(process.argv[2]||36); // 36*5s = 3 分钟
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
let last=null;
for(let k=0;k<MAX;k++){
 const fl=await frames();
 const tb=fl.find(f=>/textbook\/book/.test(f.url)&&f.ctx);
 if(tb){
  const st=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];const ne=bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length;const spin=document.querySelectorAll('.ant-spin,[class*=loading]').length;return {blocks:bs.length,nonempty:ne,txt:document.body.innerText.length,spin,ch:location.href.slice(60,112)};})()`,tb.ctx).catch(e=>String(e));
  if(JSON.stringify(st)!==last){console.log(k,JSON.stringify(st));last=JSON.stringify(st);}
  if(st&&st.nonempty>0){console.log('HEALTHY at',k*5+'s');break;}
 } else if(last!=='notb'){console.log(k,'no tb');last='notb';}
 await sleep(5000);
}
cdp.close();
