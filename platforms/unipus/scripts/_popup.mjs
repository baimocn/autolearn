import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
for(const f of await frames()){
 const r=await ev(`(()=>{const opts=[...document.querySelectorAll('[class*=option],[class*=dropdown],[class*=select]')].filter(e=>e.getBoundingClientRect().width>40&&e.getBoundingClientRect().height>10).slice(0,20).map(e=>({cls:(e.className||'').toString().slice(0,50),t:(e.innerText||'').replace(/[ ]+/g,' ').slice(0,60)}));return opts;})()`,f.ctx).catch(()=>[]);
 if(r&&r.length)console.log("frame",(f.url||"").slice(0,40),JSON.stringify(r).slice(0,1500));
}
cdp.close();
