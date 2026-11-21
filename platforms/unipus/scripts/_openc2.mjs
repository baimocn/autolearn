import { CDP, sleep } from "./cdp.mjs";
const ver = await (await fetch("http://127.0.0.1:9222/json/version")).json();
const boot = await CDP.connect(ver.webSocketDebuggerUrl);
const r = await boot.send("Target.createTarget", { url: "https://uai.unipus.cn/app/cmgt/resource-detail/20001198976" });
boot.close();
await sleep(9000);
const pg = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).find(t => t.id === r.targetId);
const cdp = await CDP.connect(pg.webSocketDebuggerUrl);
const ev = async e => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const rows = await ev(`(()=>{
  const out=[];
  [...document.querySelectorAll('*')].forEach(e=>{
    const t=(e.innerText||'').replace(/\s+/g,' ').trim();
    if(t==='Unit 2'){
      let p=e; for(let i=0;i<4&&p;i++)p=p.parentElement;
      if(p){const b=p.getBoundingClientRect();
        out.push({tag:e.tagName,pTag:p.tagName,pcls:(p.className||'').toString().slice(0,46),
          ptxt:p.innerText.replace(/\s+/g,' ').slice(0,70),w:Math.round(b.width),h:Math.round(b.height),
          y:Math.round(b.top)});}
    }
  });
  return out.slice(0,5);})()`);
console.log(JSON.stringify(rows,null,1));
cdp.close();
