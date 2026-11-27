import { CDP, sleep } from "./cdp.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = tabs.find(t=>t.type==="page" && /course-management/.test(t.url));
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
const ev = async (expr) => (await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true})).result.value;
// elements with their text near 进入
const c = await ev(`(()=>{
  const out=[];
  const kw=/进入课程|进入学习|开始学习|进入/;
  [...document.querySelectorAll('button,a,span,div')].forEach(e=>{
    const t=(e.innerText||'').replace(/\s+/g,'').trim();
    if(kw.test(t)&&t.length<12&&e.children.length<=2){const b=e.getBoundingClientRect();if(b.width>0)out.push({t,x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),tag:e.tagName});}
  });
  return out.slice(0,15);
})()`);
console.log("ENTER-ISH:", JSON.stringify(c,null,1));
// React props on the progress card: find element with __reactProps that navigates
const rp = await ev(`(()=>{
  const el=[...document.querySelectorAll('*')].find(e=>(e.innerText||'').includes('学习进度：10.9')||((e.innerText||'').includes('24/219')));
  if(!el)return null;
  let info=[]; let t=el;
  for(let i=0;i<10&&t;i++){
    const keys=Object.keys(t).filter(k=>k.startsWith('__reactProps'));
    if(keys.length){const p=t[keys[0]]; info.push({lvl:i,hasClick:!!p.onClick,cls:(t.className||'').toString().slice(0,30)});}
    t=t.parentElement;
  }
  return info;
})()`);
console.log("REACT CLICK CHAIN:", JSON.stringify(rp,null,1));
cdp.close();
