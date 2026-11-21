import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
for(const f of await frames()){
 if(!/testing/.test(f.url)||!f.ctx)continue;
 const r=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');
  const m=t.match(/(\d+)\s*\/\s*(\d+)/g);
  return {url:location.href.slice(0,70),nums:m?m.slice(0,6):[],head:t.slice(0,150)};})()`,f.ctx).catch(e=>String(e));
 console.log(JSON.stringify(r));
}
cdp.close();
