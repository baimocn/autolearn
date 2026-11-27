import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
if(!ex){console.log('no exam');process.exit(1);}
const r=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');
 const i=t.indexOf('Part III');
 const seg=i>=0?t.slice(i,i+4000):t.slice(-4000);
 return {len:t.length,seg};})()`,ex.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1).slice(0,6000));
cdp.close();
