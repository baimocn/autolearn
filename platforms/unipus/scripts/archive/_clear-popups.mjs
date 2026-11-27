import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent/.test(t.url));
const L=await connect(rd.id);
const mouse=async(x,y)=>{await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},L.sessionId).catch(()=>{});await L.cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},L.sessionId);await L.cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},L.sessionId);};
// 我知道了 (CSS 629,477)
await mouse(629,477);
await sleep(2000);
// 取消（放弃当前确认框）(CSS 643,528)
await mouse(643,528);
await sleep(1500);
// 再点一次我知道了（可能有多层）
await mouse(629,477);
await sleep(1500);
const {data}=await L.cdp.send("Page.captureScreenshot",{format:"png"},L.sessionId);
const fs=await import("node:fs");
fs.writeFileSync("cleared.png",Buffer.from(data,"base64"));
console.log("cleared.png saved");
L.cdp.close();
