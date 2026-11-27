import { connect, sleep } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const t = tabs.find(x => /resource-detail/.test(x.url) && x.id);
const L = await connect(t.id);
const { ev, cdp, sessionId } = L;
const p = await ev(`(()=>{const els=[...document.querySelectorAll('div,span,a,li')].filter(e=>(e.innerText||'').trim()==='综合成绩');if(!els.length)return null;const el=els[els.length-1];const b=el.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`);
console.log("tab pos", JSON.stringify(p));
if (p) {
  for (const type of ["mousePressed","mouseReleased"]) await cdp.send("Input.dispatchMouseEvent",{type,x:p.x,y:p.y,button:"left",buttons:type==="mousePressed"?1:0,clickCount:1},sessionId);
  await sleep(4000);
}
const txt = await ev(`(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,1500))()`).catch(e=>"ERR");
console.log(txt);
cdp.close();
