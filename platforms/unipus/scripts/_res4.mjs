import { connect } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
for(const f of await frames()){
 if(!f.ctx)continue;
 const r=await ev(`(()=>{const t=document.body.innerText.replace(/[ ]+/g,' ');const m=t.match(/(最终得分|测试满分|正确率)[^。]{0,70}/);return m?m[0]:'';})()`,f.ctx).catch(()=>"");
 if(r)console.log('RESULT',r);
}
cdp.close();
