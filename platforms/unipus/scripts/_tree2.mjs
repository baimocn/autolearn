import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const tbf = (await frames()).find(x => /textbook\/book/.test(x.url) && x.ctx);
const st = await ev(`(()=>{
 const q=(s)=>document.querySelectorAll(s).length;
 const close=document.querySelector('[class*=catalog_drawer-close]');
 return {titles:q('[class*=i-tree-menu_title-flex]'), closeW: close?Math.round(close.getBoundingClientRect().width):null,
  openMenu:q('[class*=catalog_area-open-menu]'), bodyTxt:document.body.innerText.replace(/\s+/g,' ').slice(0,120)};
})()`, tbf.ctx).catch(e=>String(e));
console.log(JSON.stringify(st,null,1));
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
fs.writeFileSync("tree-state.png", Buffer.from(data, "base64"));
cdp.close();
