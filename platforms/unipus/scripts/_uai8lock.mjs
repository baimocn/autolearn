import { connect, sleep } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const t = tabs.find(x => /uai\.unipus\.cn/.test(x.url));
const L = await connect(t.id);
const { ev, cdp, sessionId } = L;
const mouse = async (x,y) => {
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});
  await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);
};
const pos = await ev(`(()=>{const els=[...document.querySelectorAll('div,span,a,li')].filter(e=>(e.innerText||'').trim()==='Unit 8');if(!els.length)return null;const b=els[0].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`);
console.log("U8 pos", JSON.stringify(pos));
if (pos) { await mouse(pos.x,pos.y); await sleep(2500); }
const r = await ev(`(()=>{
  const txt=document.body.innerText;
  const lockEls=[...document.querySelectorAll('[class*=lock],[class*=Lock],[title*=锁定],[title*=开放]')].map(e=>({c:e.className.toString().slice(0,60),t:(e.innerText||'').slice(0,30)}));
  const dates=txt.match(/\d{4}\/\d{2}\/\d{2}[-–~]\d{4}\/\d{2}\/\d{2}/g)||[];
  return {locks:lockEls.slice(0,10), dates:dates.slice(0,10), has:txt.includes('未开放')};
})()`);
console.log(JSON.stringify(r,null,1));
cdp.close();
