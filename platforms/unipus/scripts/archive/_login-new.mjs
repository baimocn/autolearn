import { CDP, sleep } from "./cdp.mjs";
const USER=process.env.UNIPUS_USER, PASS=process.env.UNIPUS_PASS;
const ver=await(await fetch("http://127.0.0.1:9222/json/version")).json();
const boot=await CDP.connect(ver.webSocketDebuggerUrl);
// 清掉所有旧标签，开课程页
for(const t of (await(await fetch("http://127.0.0.1:9222/json/list")).json()).filter(t=>t.type==="page"&&/unipus/.test(t.url)))await boot.send("Target.closeTarget",{targetId:t.id}).catch(()=>{});
await sleep(600);
const r=await boot.send("Target.createTarget",{url:"https://uai.unipus.cn/"});
boot.close();
await sleep(9000);
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const pg=tabs.find(t=>t.id===r.targetId);
const cdp=await CDP.connect(pg.webSocketDebuggerUrl);
const ev=async(e)=>(await cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true})).result?.value;
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y}).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1});await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1});};
console.log("url:",(await ev("location.href")).slice(0,60));
// 若已登录（有用户头像）→ 需要退出
const loggedIn=await ev(`(()=>{const t=document.body.innerText||'';return /退出|个人中心/.test(t)?1:0;})()`);
console.log("loggedIn:",loggedIn);
if(loggedIn){
  // 找用户头像下拉 → 退出
  await ev(`(()=>{const els=[...document.querySelectorAll('*')].filter(e=>/^(白|用户|[\u4e00-\u9fa5]{2,3})$/.test((e.innerText||'').trim())&&e.children.length===0);return els.length;})()`);
  // 简化：找右上角下拉触发器
  const p=await ev(`(()=>{const e=[...document.querySelectorAll('[class*=avatar],[class*=user],[class*=dropdown]')].find(x=>x.getBoundingClientRect().top<80&&x.getBoundingClientRect().width>0);if(!e)return null;const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`);
  console.log("avatar:",JSON.stringify(p));
  if(p){await mouse(p.x,p.y);await sleep(1500);}
  const lp=await ev(`(()=>{const e=[...document.querySelectorAll('*,li,a,div,span')].find(x=>/退出登录|退出/.test((x.innerText||'').trim())&&x.children.length===0&&x.getBoundingClientRect().width>20);if(!e)return null;const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`);
  console.log("logout:",JSON.stringify(lp));
  if(lp){await mouse(lp.x,lp.y);await sleep(2500);}
  // 可能有确认弹窗
  const cp=await ev(`(()=>{const e=[...document.querySelectorAll('button,[class*=btn]')].find(x=>/^(确定|确认)$/.test((x.innerText||'').trim())&&x.getBoundingClientRect().width>20);if(!e)return null;const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`);
  if(cp){await mouse(cp.x,cp.y);await sleep(2000);}
}
// 现在应该未登录 → 点登录按钮
let url=await ev("location.href");
if(!/sso\/login/.test(url)){
  const p=await ev(`(()=>{const n=s=>(s||'').replace(/\s+/g,'');const c=[...document.querySelectorAll('button,a,div,span')].filter(e=>{const t=n(e.innerText);const b=e.getBoundingClientRect();return (t==='登 录'||t==='登录')&&b.width>20&&b.height>10&&b.top<200;});if(!c.length)return null;const e=c[c.length-1];const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`);
  console.log("login nav:",JSON.stringify(p));
  if(p){await mouse(p.x,p.y);await sleep(4000);}
}
url=await ev("location.href");
console.log("now:",url.slice(0,90));
// 登录页：勾协议、填账号密码
if(/sso\/login/.test(url)){
  await ev(`(()=>{const cbs=[...document.querySelectorAll('input[type=checkbox]')];cbs.forEach(c=>{if(!c.checked)(c.closest('label')||c).click();});return cbs.length;})()`);
  await sleep(600);
  for(const [sel,val] of [["#username",USER],["#password",PASS]]){
    const p=await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`);
    if(!p){console.log("input missing",sel);continue;}
    await mouse(p.x,p.y);await sleep(200);
    await cdp.send("Input.dispatchKeyEvent",{type:"keyDown",windowsVirtualKeyCode:65,code:"KeyA",modifiers:2});
    await cdp.send("Input.dispatchKeyEvent",{type:"keyUp",windowsVirtualKeyCode:65,code:"KeyA",modifiers:2});
    await cdp.send("Input.dispatchKeyEvent",{type:"keyDown",windowsVirtualKeyCode:8,code:"Backspace"});
    await cdp.send("Input.dispatchKeyEvent",{type:"keyUp",windowsVirtualKeyCode:8,code:"Backspace"});
    await sleep(150);
    await cdp.send("Input.insertText",{text:val});
    await sleep(200);
  }
  console.log("filled");
  const p=await ev(`(()=>{const b=document.querySelector('button.usso-btn-pri');if(!b)return null;const r=b.getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()`);
  console.log("submit:",JSON.stringify(p));
  if(p){await mouse(p.x,p.y);}
  for(let i=0;i<12;i++){
    await sleep(1500);
    const u=await ev("location.href");
    if(!/sso\/login/.test(u)){console.log("LOGIN OK ->",u.slice(0,80));break;}
    if(i===11)console.log("STILL:",JSON.stringify(await ev("document.body.innerText.replace(/\s+/g,' ').slice(0,120)")));
  }
}
cdp.close();
