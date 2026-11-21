import { CDP, sleep } from "./cdp.mjs";
const U = process.argv[2] || 3;
const ver = await (await fetch("http://127.0.0.1:9222/json/version")).json();
const boot = await CDP.connect(ver.webSocketDebuggerUrl);
// 关掉 ucontent 旧标签，保留/新建课程页
for (const t of (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t => /ucontent\.unipus\.cn/.test(t.url))) await boot.send("Target.closeTarget", { targetId: t.id }).catch(() => {});
await sleep(600);
let pg = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).find(t => /resource-detail\/20001198976/.test(t.url) && t.type === "page");
if (!pg) { const r2 = await boot.send("Target.createTarget", { url: "https://uai.unipus.cn/app/cmgt/resource-detail/20001198976" }); pg = { id: r2.targetId }; }
boot.close();
await sleep(12000);
const cdp = await CDP.connect((await (await fetch("http://127.0.0.1:9222/json/list")).json()).find(t => t.id === pg.id).webSocketDebuggerUrl);
const ev = async (e) => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
console.log("url:", (await ev("location.href")).slice(0, 80));
// 点 教程目录 tab
let p = await ev(`(()=>{const e=[...document.querySelectorAll('*')].find(x=>(x.innerText||'').trim()==='教程目录'&&x.children.length===0);if(!e)return null;e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`);
console.log("catalog tab:", JSON.stringify(p));
if (p) { await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 1 }); await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 1 }); }
await sleep(4000);
// 找 Unit N 标题并点击展开
p = await ev(`(()=>{const e=[...document.querySelectorAll('*')].filter(x=>{const t=(x.innerText||'').replace(/\s+/g,' ').trim();return t==='Unit ${U}'&&x.children.length<=3;}).pop();if(!e)return null;e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`);
console.log("unit tab:", JSON.stringify(p));
if (p) { await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 1 }); await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 1 }); }
await sleep(3500);
// dump 目录树前 40 行文本（找节点行）
const rows = await ev(`(()=>{
  const out=[];
  [...document.querySelectorAll('*')].forEach(e=>{
    if(e.children.length>0)return;
    const t=(e.innerText||'').trim();
    if(!t||t.length>44)return;
    const b=e.getBoundingClientRect();
    if(b.top>60&&b.top<window.innerHeight)out.push({t:t.slice(0,34),y:Math.round(b.top)});
  });
  return out.slice(0,50);})()`);
console.log("ROWS:", JSON.stringify(rows, null, 1).slice(0, 2200));
cdp.close();
