import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const t = tabs.find(x => /uai\.unipus\.cn/.test(x.url));
const L = await connect(t.id);
const { ev, cdp, sessionId } = L;
await ev(`(()=>{window.scrollTo(0,document.body.scrollHeight*0.75);return 1;})()`);
await sleep(1500);
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
fs.writeFileSync("uai-mycourses.png", Buffer.from(data, "base64"));
// 找课程卡片链接
const links = await ev(`(()=>{const as=[...document.querySelectorAll('a')].map(a=>({t:(a.innerText||'').replace(/\s+/g,' ').slice(0,40),h:(a.href||'').slice(0,140)}));return as.filter(a=>a.t).slice(0,40);})()`).catch(e=>String(e));
console.log(JSON.stringify(links, null, 1).slice(0, 2000));
cdp.close();
