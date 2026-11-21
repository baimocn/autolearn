import { CDP, sleep } from "./cdp.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const pg=tabs.find(t=>/resource-detail\/20001198976/.test(t.url)&&t.type==="page");
if(!pg){console.log("NO COURSE TAB");process.exit(0);}
const cdp=await CDP.connect(pg.webSocketDebuggerUrl);
const ev=async(e)=>(await cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true})).result?.value;
const rows=await ev(`(()=>{
  const out=[];
  [...document.querySelectorAll('button,[class*=i-button],[class*=learn],[class*=go],[class*=study]')].forEach(e=>{
    const t=(e.innerText||'').replace(/\s+/g,'').trim();
    const b=e.getBoundingClientRect();
    if(/^(立即学习|继续学习|开始学习|去学习|已完成)$/.test(t)&&b.width>10)
      out.push({t,x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)});
  });
  return out.slice(0,30);})()`);
console.log("LEARN BUTTONS:",JSON.stringify(rows,null,1));
// 目录树的节点行文本
const nodes=await ev(`(()=>{
  const out=[];
  [...document.querySelectorAll('*')].forEach(e=>{
    if(e.children.length>0)return;
    const t=(e.innerText||'').trim();
    if(!t||t.length>40)return;
    const b=e.getBoundingClientRect();
    if(b.top>380&&b.top<window.innerHeight-20)out.push({t:t.slice(0,30),y:Math.round(b.top)});
  });
  return out.slice(0,40);})()`);
console.log("NODE ROWS:",JSON.stringify(nodes.slice(0,25),null,1));
cdp.close();
