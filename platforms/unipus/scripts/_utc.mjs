import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const r=await ev(`(()=>{const cs=[...document.querySelectorAll('[data-lexical-node-type=\"quiz-paper-link\"]')];return cs.map(e=>({txt:(e.innerText||'').replace(/[ ]+/g,' ').slice(0,40),img:(e.querySelector('img')||{}).src||''}));})()`,tb.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1).slice(0,1200));
cdp.close();
