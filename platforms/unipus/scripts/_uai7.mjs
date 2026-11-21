import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const t = tabs.find(x => /uai\.unipus\.cn/.test(x.url));
const L = await connect(t.id);
const { ev, cdp, sessionId } = L;
const mouse = async (x,y) => {
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});
  await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);
  await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);
};
for (const u of [1,2,3,4,5,6,7,8]) {
  const pos = await ev(`(()=>{const els=[...document.querySelectorAll('div,span,a,li')].filter(e=>(e.innerText||'').trim()==='Unit ${u}');if(!els.length)return null;const b=els[0].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`);
  if (!pos) { console.log("U"+u, "NOT FOUND"); continue; }
  await mouse(pos.x, pos.y); await sleep(2200);
  const txt = await ev(`(()=>document.body.innerText.replace(/\s+/g,' '))()`).catch(()=>"");
  const i = txt.indexOf("教程目录");
  console.log("U"+u+"@@"+JSON.stringify(pos)+":", txt.slice(i, i+520));
  console.log("---");
}
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
fs.writeFileSync("uai-u8b.png", Buffer.from(data, "base64"));
cdp.close();
