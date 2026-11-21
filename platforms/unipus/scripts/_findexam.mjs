import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
for(const f of await frames()){
 if(!f.ctx)continue;
 const r=await ev(`(()=>{const t=document.body?document.body.innerText.replace(/[ ]+/g,' '):'';
  const rows=document.querySelectorAll('[class*=chioceView_strongListView]').length;
  const items=document.querySelectorAll('[class*=answer-question-box_questionItem]').length;
  const card=/答题卡/.test(t);
  const opts=[...document.querySelectorAll('[class*=chioceView]')].length;
  const submits=[...document.querySelectorAll('button,div,span')].filter(e=>(e.innerText||'').replace(/[ ]+/g,'')==='提交'&&e.getBoundingClientRect().width>25).map(e=>{const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width)};});
  return{url:location.href.slice(0,85),len:t.length,card,rows,items,opts,submits:submits.slice(0,3),head:t.slice(0,80)};})()`,f.ctx).catch(e=>null);
 if(r)console.log(JSON.stringify(r));
}
cdp.close();
