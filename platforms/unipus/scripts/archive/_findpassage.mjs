import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
const r=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');
 const i=t.indexOf('Rice Paddy Art');
 const i2=t.indexOf('Part II');
 return {idxRP:i,idxP2:i2,len:t.length,
  aroundRP:i>=0?t.slice(Math.max(0,i-1500),i+1500):'',
  part2:i2>=0?t.slice(i2,i2+2500):''};})()`,ex.ctx).catch(e=>String(e));
console.log(JSON.stringify(r,null,1).slice(0,7000));
cdp.close();
