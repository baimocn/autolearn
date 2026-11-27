import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
// 看所有可点击词项的 DOM 结构
const r=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][21];
 const cands=[...b.querySelectorAll('*')].filter(e=>e.children.length<=1&&/aquatic|terrestrial|symbiosis|larva|herbicide|水生物种|陆生植物|共生|幼虫|除草剂/i.test(e.innerText||''));
 return cands.slice(0,15).map(e=>({tag:e.tagName,cls:(e.className||'').toString().slice(0,60),t:(e.innerText||'').replace(/[ ]+/g,'').slice(0,25),w:Math.round(e.getBoundingClientRect().width)}));})()`,tb.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1).slice(0,3000));
cdp.close();
