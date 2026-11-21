import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const t = tabs.find(x => /uai\.unipus\.cn/.test(x.url));
const L = await connect(t.id);
const { ev, cdp, sessionId } = L;
const r0 = await ev(`(()=>{const els=[...document.querySelectorAll('div,span,a,img')].filter(e=>((e.innerText||e.alt||'')+'').includes('新农科大学英语'));return els.length;})()`);
console.log("candidates", r0);
// 点击课程卡封面
const cl = await ev(`(()=>{const imgs=[...document.querySelectorAll('img')].filter(i=>((i.alt||'')+(i.src||'')).length&&((i.alt||'').includes('新农科')||/cover|book/i.test(i.src)));const el=imgs[0];if(!el)return 0;el.click();return 1;})()`).catch(()=>0);
console.log("click img", cl);
await sleep(8000);
let u = await ev(`(()=>location.href)`);
console.log("url", u);
let txt = await ev(`(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,900))()`);
console.log("txt", txt);
if (!/Unit|单元/.test(txt||"")) {
  // 尝试点卡片标题
  const cl2 = await ev(`(()=>{const els=[...document.querySelectorAll('div,span,h3,h4,p')].filter(e=>(e.innerText||'').replace(/\s+/g,'')==='新农科大学英语');if(!els.length)return 0;els[els.length-1].click();return 1;})()`).catch(()=>0);
  console.log("click title", cl2);
  await sleep(8000);
  u = await ev(`(()=>location.href)`); console.log("url2", u);
  txt = await ev(`(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,900))()`); console.log("txt2", txt);
}
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
fs.writeFileSync("uai-unitlist.png", Buffer.from(data, "base64"));
cdp.close();
