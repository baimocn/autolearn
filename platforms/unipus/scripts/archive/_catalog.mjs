// _catalog.mjs — 打开目录抽屉，列出可见标题及坐标
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
// 找目录开按钮
let open=await ev(`(()=>{const e=document.querySelector('[class*=catalog_area-open-menu]');if(!e)return null;const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width)};})()`,tb.ctx).catch(()=>null);
console.log('opener',JSON.stringify(open));
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
if(open&&open.w>0){await mouse(open.x,open.y);await sleep(2000);}
const r=await ev(`(()=>{const els=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')];return els.slice(0,80).map(e=>{const b=e.getBoundingClientRect();return{t:(e.innerText||'').replace(/[ ]+/g,' ').slice(0,55),x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width)};}).filter(x=>x.w>20);})()`,tb.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1).slice(0,6000));
const {data}=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId);
fs.writeFileSync("catalog.png",Buffer.from(data,"base64"));
cdp.close();
