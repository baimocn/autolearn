import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {cdp,sessionId,ev,frames}=L;
await cdp.send("Page.enable",{},sessionId).catch(()=>{});
for(let k=0;k<4;k++){
  await cdp.send("Page.reload",{ignoreCache:true},sessionId).catch(()=>{});
  console.log('hard reload',k+1);
  await sleep(11000);
  const fl=await frames();
  const tb=fl.find(f=>/textbook\/book/.test(f.url)&&f.ctx);
  if(tb){
    const st=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];return {blocks:bs.length,nonempty:bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length,txt:document.body.innerText.length,ch:location.href.slice(60,110)};})()`,tb.ctx).catch(e=>String(e));
    console.log('  probe',JSON.stringify(st));
    if(st&&st.nonempty>0){console.log('HEALTHY after reload',k+1);break;}
  } else console.log('  no tb');
}
// 关抽屉/弹窗
for(const f of await frames()){
  if(!/pc\.html/.test(f.url))continue;
  await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');for(const b of document.querySelectorAll('button,div,span,a')){if(/^(我知道了|知道了)$/.test(n(b.innerText)))b.click();}return 1;})()`,f.ctx).catch(()=>{});
}
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
if(tb)await ev(`(()=>{const c=document.querySelector('[class*=catalog_drawer-close]');if(c)c.click();return 1;})()`,tb.ctx).catch(()=>{});
await sleep(1500);
if(tb){
 const st=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];return {blocks:bs.length,nonempty:bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length,txt:document.body.innerText.length};})()`,tb.ctx).catch(e=>String(e));
 console.log('FINAL',JSON.stringify(st));
}
cdp.close();
