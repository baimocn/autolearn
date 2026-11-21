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
await mouse(404, 714); await sleep(2500);
let u = await ev(`(()=>location.href)`).catch(()=>"");
console.log("url", JSON.stringify(u));
let txt = await ev(`(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,800))()`).catch(()=>"");
console.log(txt);
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
fs.writeFileSync("uai-after-click.png", Buffer.from(data, "base64"));
cdp.close();
