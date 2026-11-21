import { CDP, sleep } from "./cdp.mjs";
const USER = process.env.UNIPUS_USER, PASS = process.env.UNIPUS_PASS;
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = tabs.find(t => t.type === "page" && /unipus/.test(t.url));
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
await cdp.send("Page.enable");
const ev = async e => (await cdp.send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const center = sel => ev(`(()=>{const e=${sel};if(!e)return null;e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return{x:b.left+b.width/2,y:b.top+b.height/2};})()`);
const clickAt = async p => { if (!p) return; await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x, y: p.y }); await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 1 }); await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 1 }); };
const USERSEL = `document.getElementById('username')||document.querySelector('input[name=username]')||document.querySelector('input[placeholder*=手机号]')`;
const PASSEL = `document.getElementById('password')||document.querySelector('input[name=password]')||document.querySelector('input[type=password]')`;
// agreement checkbox(s)
await ev(`(()=>{const cbs=[...document.querySelectorAll('input[type=checkbox]')];
  cbs.forEach(c=>{if(!c.checked)(c.closest('label')||c).click();});return cbs.length;})()`);
await sleep(600);
for (const [sel, val] of [[USERSEL, USER], [PASSEL, PASS]]) {
  const p = await center(sel);
  if (!p) { console.log("INPUT NOT FOUND for", sel); process.exit(1); }
  await clickAt(p); await sleep(200);
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", windowsVirtualKeyCode: 65, code: "KeyA", modifiers: 2 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", windowsVirtualKeyCode: 65, code: "KeyA", modifiers: 2 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", windowsVirtualKeyCode: 8, code: "Backspace" });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", windowsVirtualKeyCode: 8, code: "Backspace" });
  await sleep(150);
  await cdp.send("Input.insertText", { text: val });
  await sleep(200);
}
console.log("vals:", JSON.stringify(await ev(`({u:(${USERSEL}).value, pl:(${PASSEL}).value.length})`)));
const p = await center(`[...document.querySelectorAll('button')].find(b=>b.innerText.replace(/\\s+/g,'')==='登录'&&/usso-btn-pri|i-button|btn/.test(b.className)) || [...document.querySelectorAll('button')].find(b=>b.innerText.replace(/\\s+/g,'')==='登录')`);
await clickAt(p);
for (let i = 0; i < 15; i++) {
  await sleep(1000);
  const u = await ev("location.href");
  if (!/sso\/login/.test(u)) { console.log("LOGIN OK ->", u.slice(0, 80)); break; }
  if (i === 14) console.log("STILL:", u.slice(0, 60), JSON.stringify(await ev("document.body.innerText.replace(/\\s+/g,' ').slice(0,150)")));
}
cdp.close();
