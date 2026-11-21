import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
// 用真实滚动容器滚到底
await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollTop=sc.scrollHeight;return 1;})()`,tb.ctx).catch(()=>{});
await sleep(3000);
const r=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][24];const q=b.getBoundingClientRect();return {y:Math.round(q.top),h:Math.round(q.height),len:(b.innerText||'').replace(/\s+/g,'').length,spin:b.querySelectorAll('.ant-spin-nested-loading').length};})()`,tb.ctx).catch(e=>String(e));
console.log('block24',JSON.stringify(r));
const {data}=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId);
const fs=await import("node:fs");fs.writeFileSync("block24-now.png",Buffer.from(data,"base64"));
cdp.close();
