import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const fl=await L.frames();
const tb=fl.find(f=>f.url.includes("textbook/book")&&f.ctx);
const ev=async(e)=>{const r=await L.cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true,contextId:tb.ctx},L.sessionId);return r.result?.value;};
// 找打开目录的按钮（隐藏状态时的 catalog 按钮）
const cands=await ev(`(()=>{const out=[];[...document.querySelectorAll('button,div,span,[class*=catalog],[class*=drawer]')].forEach(e=>{const cn=(typeof e.className==='string'?e.className:'');if(/catalog|drawer/i.test(cn)){const b=e.getBoundingClientRect();out.push({cls:cn.slice(0,50),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width),h:Math.round(b.height)});}});return out.slice(0,15);})()`);
console.log("CANDIDATES:",JSON.stringify(cands,null,1).slice(0,1500));
L.cdp.close();
