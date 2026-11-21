import { connect, sleep } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { ev, frames, cdp, sessionId } = L;
const tb = (await frames()).find(f => f.url.includes("textbook/book") && f.ctx);
if (!tb) { console.log("NO TB"); process.exit(1); }
// open drawer
const op = await ev(`(()=>{const e=document.querySelector('[class*=catalog_area-open-menu]');if(!e)return null;const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, tb.ctx).catch(()=>null);
if (op) {
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: op.x, y: op.y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: op.x, y: op.y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
  await sleep(1800);
}
const r = await ev(`(()=>{const els=[...document.querySelectorAll('[class*=catalog]')];
 const rows=[];for(const e of els){const t=(e.innerText||'').replace(/\s+/g,' ').trim();if(t&&t.length<200)rows.push(t);}
 return rows.slice(0,60);})()`, tb.ctx).catch(e=>String(e));
console.log(JSON.stringify(r, null, 1).slice(0, 4000));
cdp.close();
