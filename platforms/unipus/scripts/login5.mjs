import { attachPage, sleep } from "./cdp.mjs";
const { cdp, page } = await attachPage("unipus");
const url = await page.eval("location.href");
console.log("page:", url.slice(0, 70));
if (!url.includes("sso/login")) { console.log("already logged in"); cdp.close(); process.exit(0); }

// 勾选协议
await page.eval(`(()=>{const cbs=[...document.querySelectorAll('input[type=checkbox]')];const ag=cbs.find(e=>!e.name);if(ag&&!ag.checked){(ag.closest('label')||ag).click();}return 1;})()`);

// 清空并输入
async function fill(sel, val) {
  const b = await page.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  if (!b) return false;
  await page.clickAt(b.x, b.y);
  await sleep(150);
  await page.send("Input.dispatchKeyEvent", { type: "keyDown", windowsVirtualKeyCode: 65, code: "KeyA", modifiers: 2 });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", windowsVirtualKeyCode: 65, code: "KeyA", modifiers: 2 });
  await page.send("Input.dispatchKeyEvent", { type: "keyDown", windowsVirtualKeyCode: 8, code: "Backspace" });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", windowsVirtualKeyCode: 8, code: "Backspace" });
  await sleep(150);
  await page.typeText(val);
  await sleep(200);
  return true;
}
const USER = process.env.UNIPUS_USER;
const PASS = process.env.UNIPUS_PASS;
if (!USER || !PASS) { console.error("缺少环境变量 UNIPUS_USER / UNIPUS_PASS"); process.exit(1); }
await fill('input[name=username]', USER);
await fill('input[name=password]', PASS);
console.log("vals:", JSON.stringify(await page.eval(`(()=>({u:document.querySelector('input[name=username]').value, p:document.querySelector('input[name=password]').value.length}))()`)));

const btn = await page.eval(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
  const cands=[...document.querySelectorAll('button,input[type=submit],a,div,span')].filter(e=>{
    const t=n(e.innerText); const b=e.getBoundingClientRect();
    return t==='登录' && b.width>40 && b.height>20;});
  if(!cands.length) return null;
  const e=cands[cands.length-1]; const b=e.getBoundingClientRect();
  return {x:Math.round(b.left+b.width/2), y:Math.round(b.top+b.height/2), cls:e.className.toString().slice(0,30), n:cands.length};})()`);
console.log("btn:", JSON.stringify(btn));
if (btn) await page.clickAt(btn.x, btn.y);
for (let i=0;i<18;i++){
  await sleep(1000);
  const u = await page.eval("location.href");
  if (!u.includes("sso/login")) { console.log("OK ->", u.slice(0,100)); break; }
  if (i===17) console.log("STILL:", String(await page.eval("document.body.innerText")).replace(/\s+/g," ").slice(0,180));
}
cdp.close();
