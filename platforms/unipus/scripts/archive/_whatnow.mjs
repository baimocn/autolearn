import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
console.log('=== tabs ===');
tabs.filter(t=>/unipus/.test(t.url)).forEach(t=>console.log(t.id,'|',t.url.slice(0,120)));
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
console.log('=== frames ===');
for(const f of await frames()){
 if(!f.ctx)continue;
 const r=await ev(`(()=>{const t=document.body?document.body.innerText.replace(/[ ]+/g,' '):'';
  return {url:location.href.slice(0,90),len:t.length,head:t.slice(0,120)};})()`,f.ctx).catch(()=>null);
 if(r)console.log(JSON.stringify(r));
}
cdp.close();
