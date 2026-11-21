import { CDP, sleep } from "./cdp.mjs";
const USER = process.env.UNIPUS_USER, PASS = process.env.UNIPUS_PASS;
if (!USER || !PASS) { console.error("need UNIPUS_USER/UNIPUS_PASS"); process.exit(1); }
// find or open the SSO tab
let tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
let page = tabs.find(t => t.type === "page" && /unipus/.test(t.url));
const ver = await (await fetch("http://127.0.0.1:9222/json/version")).json();
const boot = await CDP.connect(ver.webSocketDebuggerUrl);
if (!page) { const r = await boot.send("Target.createTarget", { url: "https://uai.unipus.cn/" }); await sleep(6000); tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json(); page = tabs.find(t => t.id === r.targetId); }
boot.close();
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
await cdp.send("Page.enable");
const ev = async e => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
let href = await ev("location.href");
// if not on login page, click 登录 nav
if (!/sso\/login/.test(href)) {
  const p = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const c=[...document.querySelectorAll('button,a,div,span')].filter(e=>{const t=n(e.innerText);const b=e.getBoundingClientRect();return (t==='登录'||t==='登 录')&&b.width>20&&b.height>10&&b.top<200;});if(!c.length)return null;const e=c[c.length-1];const b=e.getBoundingClientRect();return{x:b.left+b.width/2,y:b.top+b.height/2};})()`);
  if (p) { await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 1 }); await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 1 }); }
  await sleep(5000);
  href = await ev("location.href");
}
console.log("at:", href.slice(0, 90));
if (/sso\/login/.test(href)) {
  // fill
  await ev(`(()=>{['agreement','remember'].forEach(id=>{const e=document.getElementById(id);if(e&&!e.checked)(e.closest('label')||e).click();});return 1;})()`);
  for (const [sel, val] of [["#username", USER], ["#password", PASS]]) {
    const p = await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const b=e.getBoundingClientRect();return{x:b.left+b.width/2,y:b.top+b.height/2};})()`);
    await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 1 });
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 1 });
    await sleep(200);
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", windowsVirtualKeyCode: 65, code: "KeyA", modifiers: 2 });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", windowsVirtualKeyCode: 65, code: "KeyA", modifiers: 2 });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", windowsVirtualKeyCode: 8, code: "Backspace" });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", windowsVirtualKeyCode: 8, code: "Backspace" });
    await sleep(150);
    await cdp.send("Input.insertText", { text: val });
    await sleep(200);
  }
  console.log("filled u/p");
  const p = await ev(`(()=>{const e=document.querySelector('button.usso-btn-pri');if(!e)return null;const b=e.getBoundingClientRect();return{x:b.left+b.width/2,y:b.top+b.height/2};})()`);
  if (p) { await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 1 }); await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 1 }); }
  for (let i = 0; i < 15; i++) {
    await sleep(1000);
    const u = await ev("location.href");
    if (!/sso/.test(u)) { console.log("LOGIN OK ->", u.slice(0, 80)); break; }
    if (i === 14) console.log("STILL:", u, JSON.stringify(await ev("document.body.innerText.replace(/\\s+/g,' ').slice(0,150)")));
  }
}
cdp.close();
