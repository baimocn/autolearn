import { CDP, sleep } from "./cdp.mjs";
const USER = process.env.UNIPUS_USER, PASS = process.env.UNIPUS_PASS;
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = tabs.find(t=>t.type==="page");
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
const ev = async (expr) => (await cdp.send("Runtime.evaluate",{expression:expr,returnByValue:true})).result.value;

async function center(sel){ return ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2};})()`);}
async function click(x,y){
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y});
  await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",clickCount:1});
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",clickCount:1});
}
async function fill(sel,val){
  const p = await center(sel); await click(p.x,p.y); await sleep(200);
  // select all + delete
  await cdp.send("Input.dispatchKeyEvent",{type:"keyDown",windowsVirtualKeyCode:65,code:"KeyA",modifiers:2});
  await cdp.send("Input.dispatchKeyEvent",{type:"keyUp",windowsVirtualKeyCode:65,code:"KeyA",modifiers:2});
  await cdp.send("Input.dispatchKeyEvent",{type:"keyDown",windowsVirtualKeyCode:8,code:"Backspace"});
  await cdp.send("Input.dispatchKeyEvent",{type:"keyUp",windowsVirtualKeyCode:8,code:"Backspace"});
  await sleep(150);
  await cdp.send("Input.insertText",{text:val});
  await sleep(200);
}
// 1) check agreement + remember
await ev(`(()=>{['agreement','remember'].forEach(id=>{const e=document.getElementById(id);if(e&&!e.checked)(e.closest('label')||e).click();});return 1;})()`);
console.log("agreement checked:", await ev("document.getElementById('agreement').checked"));
// 2) fill
await fill('#username', USER);
await fill('#password', PASS);
const vals = await ev(`({u:document.getElementById('username').value,plen:document.getElementById('password').value.length})`);
console.log("vals:", JSON.stringify(vals));
// 3) click 登录
const btn = await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');
  const c=[...document.querySelectorAll('button,div,span,a')].filter(e=>{const t=n(e.innerText);const b=e.getBoundingClientRect();return t==='登录'&&b.width>40&&b.height>20;});
  if(!c.length)return null;const e=c[c.length-1];const b=e.getBoundingClientRect();return {x:b.left+b.width/2,y:b.top+b.height/2};})()`);
console.log("submit btn:", JSON.stringify(btn));
await click(btn.x,btn.y);
for(let i=0;i<15;i++){
  await sleep(1000);
  const u = await ev("location.href");
  if(!/sso\/login|portal\/sso/.test(u)){console.log("LOGIN OK ->",u);break;}
  if(i===14) console.log("STILL:", u, JSON.stringify(await ev("document.body.innerText.replace(/\s+/g,' ').slice(0,200)")));
}
cdp.close();
