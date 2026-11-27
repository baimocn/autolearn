import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
if(!tb){console.log('no tb');process.exit(1);}
const probe=async(label)=>{
 const st=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];const ne=bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length;
  const spin=document.querySelectorAll('.ant-spin-nested-loading').length;
  return {ne,total:bs.length,spin,txt:document.body.innerText.length};})()`,tb.ctx).catch(e=>String(e));
 console.log(label,JSON.stringify(st));return st;
};
await probe('before');
// 模拟 F12：缩小视口（DevTools 占右侧）
await cdp.send("Emulation.setDeviceMetricsOverride",{width:900,height:700,deviceScaleFactor:2,mobile:false},sessionId).catch(e=>console.log('err1',String(e).slice(0,80)));
await sleep(3000);
await probe('after shrink 900');
await cdp.send("Emulation.setDeviceMetricsOverride",{width:1266,height:700,deviceScaleFactor:2,mobile:false},sessionId).catch(e=>console.log('err2',String(e).slice(0,80)));
await sleep(3000);
await probe('after restore 1266');
// 再补一个真实 resize 事件
await ev(`(()=>{window.dispatchEvent(new Event('resize'));return 1;})()`,tb.ctx).catch(()=>{});
await sleep(2500);
await probe('after resize event');
await cdp.send("Emulation.clearDeviceMetricsOverride",{},sessionId).catch(()=>{});
await sleep(2000);
await probe('after clear');
cdp.close();
