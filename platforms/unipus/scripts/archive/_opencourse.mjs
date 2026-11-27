import { CDP, sleep } from "./cdp.mjs";
const ver = await (await fetch("http://127.0.0.1:9222/json/version")).json();
const boot = await CDP.connect(ver.webSocketDebuggerUrl);
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
for (const t of tabs.filter(t => /ucontent\.unipus\.cn/.test(t.url))) await boot.send("Target.closeTarget", { targetId: t.id }).catch(() => {});
const r = await boot.send("Target.createTarget", { url: "https://uai.unipus.cn/app/cmgt/resource-detail/20001198976" });
boot.close();
await sleep(9000);
const pg = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).find(t => t.id === r.targetId);
const cdp = await CDP.connect(pg.webSocketDebuggerUrl);
const ev = async e => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const p = await ev(`(()=>{const e=[...document.querySelectorAll('*')].find(x=>/^(继续学习|开始学习)$/.test((x.innerText||'').trim())&&x.children.length===0);if(!e)return null;e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:b.left+b.width/2,y:b.top+b.height/2};})()`);
console.log("btn:", JSON.stringify(p));
if (p) {
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 1 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 1 });
}
await sleep(9000);
const rd = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).find(t => /ucontent\.unipus\.cn/.test(t.url));
console.log("reader:", rd ? "OK" : "NONE");
if (rd) {
  const { connect } = await import("./utlib.mjs");
  const L = await connect(rd.id);
  let tb = null;
  for (let k = 0; k < 20 && !tb; k++) { tb = (await L.frames()).find(f => f.url.includes("textbook/book") && f.ctx); if (!tb) await sleep(900); }
  const raw = async e => { const r2 = await L.cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true, contextId: tb.ctx }, L.sessionId); return r2.result?.value; };
  for (let step = 0; step < 40; step++) {
    await raw(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollTop+=420;return sc.scrollTop;})()`);
    await sleep(700);
  }
  await sleep(2000);
  const lens = await raw(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map(b=>(b.innerText||'').length)`);
  console.log("LENS:", JSON.stringify(lens));
  L.cdp.close();
}
