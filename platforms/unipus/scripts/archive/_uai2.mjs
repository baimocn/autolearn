import { connect, sleep } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const t = tabs.find(x => /uai\.unipus\.cn/.test(x.url));
if (!t) { console.log("NO UAI TAB"); process.exit(1); }
const L = await connect(t.id);
const { ev, cdp, sessionId } = L;
const cl = await ev(`(()=>{const els=[...document.querySelectorAll('div,span,a,h3,h4')].filter(e=>(e.innerText||'').replace(/\s+/g,'')==='新农科大学英语');if(!els.length)return 0;let e=els[els.length-1];e.click();return 1;})()`).catch(()=>0);
console.log("click", cl);
await sleep(9000);
const r = await ev(`(()=>{const t=document.body.innerText.replace(/\s+/g,' ');return {url:location.href, txt:t.slice(0,1500)};})()`).catch(e=>String(e));
console.log(JSON.stringify(r, null, 1));
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
const fs = await import("node:fs"); fs.writeFileSync("uai-course.png", Buffer.from(data, "base64"));
cdp.close();
