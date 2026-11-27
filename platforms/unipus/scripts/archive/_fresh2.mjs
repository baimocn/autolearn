import { CDP, sleep } from "./cdp.mjs";
const ver = await (await fetch("http://127.0.0.1:9222/json/version")).json();
const boot = await CDP.connect(ver.webSocketDebuggerUrl);
const r = await boot.send("Target.createTarget", { url: "https://uai.unipus.cn/app/cmgt/resource-detail/20001198976" });
boot.close();
await sleep(10000);
const pg = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).find(t => t.id === r.targetId);
const cdp = await CDP.connect(pg.webSocketDebuggerUrl);
const ev = async e => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
console.log("course url:", (await ev("location.href")).slice(0, 90));
console.log("has 开始学习:", await ev(`(document.body.innerText||'').includes('开始学习')`));
const p = await ev(`(()=>{const e=[...document.querySelectorAll('*')].find(x=>(x.innerText||'').trim()==='开始学习'&&x.children.length===0);if(!e)return null;e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:b.left+b.width/2,y:b.top+b.height/2};})()`);
console.log("btn:", JSON.stringify(p));
if (p) {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x, y: p.y });
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 1 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 1 });
}
await sleep(10000);
const rd = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).find(t => /ucontent\.unipus\.cn/.test(t.url));
console.log("reader:", rd ? rd.url.slice(80, 230) : "NONE");
if (rd) {
  const { connect } = await import("./utlib.mjs");
  const L = await connect(rd.id);
  let ok = false;
  for (let k = 0; k < 18; k++) {
    await sleep(1000);
    const fl = await L.frames();
    const tb = fl.find(f => f.url.includes("textbook/book") && f.ctx);
    if (!tb) continue;
    const len = await L.ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];return (b.innerText||'').length;})()`, tb.ctx).catch(() => 0) || 0;
    if (len > 80) { console.log("B6 READY len=" + len); ok = true; break; }
    await L.ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][6];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx).catch(() => 0);
  }
  if (!ok) console.log("B6 STILL EMPTY");
  L.cdp.close();
}
