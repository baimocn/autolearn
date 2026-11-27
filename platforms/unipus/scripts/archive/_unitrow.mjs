import { CDP, sleep } from "./cdp.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const pg=tabs.find(t=>/resource-detail\/20001198976/.test(t.url));
if(!pg){console.log("NO COURSE TAB");process.exit(0);}
const cdp=await CDP.connect(pg.webSocketDebuggerUrl);
const ev=async e=>(await cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true})).result?.value;
const rows=await ev(`(()=>{
  const out=[];
  [...document.querySelectorAll('*')].forEach(e=>{
    const t=(e.innerText||'').replace(/\s+/g,' ').trim();
    if(t==='Unit 2'){
      let p=e;
      for(let i=0;i<4&&p;i++){p=p.parentElement;}
      if(p){const b=p.getBoundingClientRect();
        out.push({selfTag:e.tagName,parentTag:p.tagName,pcls:(p.className||'').toString().slice(0,50),
          ptxt:p.innerText.replace(/\s+/g,' ').slice(0,80),w:Math.round(b.width),h:Math.round(b.height)});}
    }
  });
  return out.slice(0,6);})()`);
console.log(JSON.stringify(rows,null,1));
// any expand arrow / button inside those rows?
const btns=await ev(`(()=>{
  const out=[];
  [...document.querySelectorAll('*')].forEach(e=>{
    const t=(e.innerText||'').replace(/\s+/g,' ').trim();
    if(/^(Unit 2)$/.test(t)){
      let p=e; for(let i=0;i<4&&p;i++)p=p.parentElement;
      if(p){[...p.querySelectorAll('button,[class*=btn],[class*=arrow],[class*=icon],[class*=expand],[class*=collapse]')].slice(0,6).forEach(x=>{
        const b=x.getBoundingClientRect(); if(b.width>0)out.push({cls:(x.className||'').toString().slice(0,44),tag:x.tagName});});}
    }
  });
  return out.slice(0,10);})()`);
console.log("ROW CONTROLS:",JSON.stringify(btns,null,1));
cdp.close();
