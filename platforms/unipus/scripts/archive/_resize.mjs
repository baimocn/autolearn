import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const tbf=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
if(!tbf){console.log('no tb');process.exit(1);}
console.log('before', JSON.stringify(await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];return {ne:bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length,txt:document.body.innerText.length,spin:document.querySelectorAll('.ant-spin').length,iw:innerWidth,ih:innerHeight};})()`,tbf.ctx).catch(e=>String(e))));
// 方法1: 触发 resize 事件
await ev(`(()=>{window.dispatchEvent(new Event('resize'));return 1;})()`,tbf.ctx).catch(()=>{});
await sleep(1500);
// 方法2: CDP 改视口尺寸（模拟 F12）
await cdp.send("Emulation.setDeviceMetricsOverride",{width:1266,height:700,deviceScaleFactor:2,mobile:false},sessionId).catch(e=>console.log('override err',String(e).slice(0,80)));
await sleep(1500);
await cdp.send("Emulation.clearDeviceMetricsOverride",{},sessionId).catch(()=>{});
await sleep(2500);
console.log('after', JSON.stringify(await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];return {ne:bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length,txt:document.body.innerText.length,spin:document.querySelectorAll('.ant-spin').length};})()`,tbf.ctx).catch(e=>String(e))));
cdp.close();
