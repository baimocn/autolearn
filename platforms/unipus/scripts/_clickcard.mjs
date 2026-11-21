import { CDP, sleep } from "./cdp.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = tabs.find(t=>t.type==="page");
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
const ev = async (expr) => (await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true})).result.value;
// locate the leaf element containing "新农科大学英语" (the second one, the card title)
const info = await ev(`(()=>{
  const leaves=[...document.querySelectorAll('*')].filter(e=>{
    const own=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('');
    return own.includes('新农科大学英语');
  });
  return leaves.map((e,i)=>{
    const b=e.getBoundingClientRect();
    // walk ancestors and report first with react onClick
    let t=e, chain=[];
    for(let k=0;k<12&&t;k++){const rk=Object.keys(t).find(key=>key.startsWith('__reactProps'));
      if(rk){const p=t[rk]; chain.push({k,click:!!p.onClick,cursor:getComputedStyle(t).cursor,cls:(t.className||'').toString().slice(0,28)});}
      t=t.parentElement;}
    return {i,tag:e.tagName,x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width),chain};
  });
})()`);
console.log(JSON.stringify(info,null,1));
cdp.close();
