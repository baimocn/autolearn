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
// Unit tabs x coords from screenshot: U1 292, U2 456, U3 601, U4 738, U5 877, U6 1016, U7 1152, U8 1290 at y=746
const xs = {1:292,2:456,3:601,4:738,5:877,6:1016,7:1152,8:1290};
for (const [u,x] of Object.entries(xs)) {
  await mouse(x, 746); await sleep(1800);
  const txt = await ev(`(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,2600))()`).catch(()=>"");
  const m = txt.match(/教程目录(.{0,700})/);
  console.log("U"+u+":", m?m[1].slice(0,600):txt.slice(0,300));
  console.log("---");
}
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
fs.writeFileSync("uai-u8.png", Buffer.from(data, "base64"));
cdp.close();
