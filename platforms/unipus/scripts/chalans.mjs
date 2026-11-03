// chalans.mjs <unit> '["B","C","C","A","B"]'
import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const U=Number(process.argv[2]);
const ANS=JSON.parse(process.argv[3]);
const TID=process.env.TID||"84B74FE42AFBE800BB4140C151D85DA8";
const log=(...a)=>console.log(...a);
const L=await connect(TID);
const {ev,frames,mouse}=L;
let cf=null;
for(let k=0;k<10;k++){ cf=(await frames()).find(f=>/testing\/(challenge|diagnosis)\/book/.test(f.url)&&f.ctx); if(cf) break; await sleep(800); }
if(!cf){ log("!! 无挑战帧"); process.exit(1); }
const info=await ev(`(()=>({items:document.querySelectorAll('[class*=answer-question-box_questionItem]').length,
  rows:document.querySelectorAll('[class*=chioceView_strongListView]').length}))()`,cf.ctx);
log("结构:",JSON.stringify(info));
// 逐题按字母点选项
const r=await ev(`(()=>{
  const ans=${JSON.stringify(ANS)};
  const items=[...document.querySelectorAll('[class*=answer-question-box_questionItem]')];
  const out=[];
  for(let i=0;i<items.length;i++){
    const want=ans[i]; if(!want){ out.push('skip'); continue; }
    const rows=[...items[i].querySelectorAll('[class*=chioceView_strongListView]')];
    let hit=null;
    for(const row of rows){
      const t=(row.innerText||'').replace(/\\s+/g,' ').trim();
      if(t.startsWith(want+' ')||t===want||t.startsWith(want)){ hit=row; break; }
    }
    if(!hit){ out.push(i+1+':noopt('+rows.length+')'); continue; }
    hit.click();
    out.push(i+1+':'+want);
  }
  return out;
})()`,cf.ctx);
log("作答:",JSON.stringify(r));
await sleep(1500);
const prog=await ev(`(()=>{const t=document.body.innerText.match(/问题\\s*(\\d+)\\s*\\/\\s*(\\d+)/);return t?t[0]:'?';})()`,cf.ctx);
log("进度:",prog);
L.cdp.close();
