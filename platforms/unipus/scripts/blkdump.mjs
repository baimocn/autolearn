import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const U=Number(process.argv[2]);
const CH={1:"7840f299-1cce-403e-9320-d6ddf613cebf",2:"2c3ad11f-a37e-4a64-ba6a-6cfa256cc6be",3:"5f975081-b8b7-4799-9d9c-b83a53423e4f",4:"6c59c2ec-f8bd-46f8-8506-6a8b25ff9e7b",5:"bfb4fa0c-fbd4-436f-8b37-3b307810cf63",6:"1ed78c87-3e9c-4426-a2fb-4a155955a7bb",7:"bc8967a2-13b9-4a3f-a127-e368e228e9e5",8:"f8dc1090-7968-4eb7-b231-63da59732244"}[U];
const BOOK="0iws4u_bQkCFpqmfcTvdAg",BV="VTqvEEI";
const TID=process.env.TID||"84B74FE42AFBE800BB4140C151D85DA8";
const L=await connect(TID);
const {ev,frames}=L;
await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return 0;f.src='about:blank';return 1;})()`).catch(()=>{});
await sleep(600);
await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub|about/.test(e.src||''));if(!f)return 0;f.src=${JSON.stringify(`https://ipub.unipus.cn/learner/textbook/book/${BOOK}/chapter/${CH}?bookVersionNumber=${BV}`)};return 1;})()`);
let tb=null;
for(let i=0;i<40;i++){ await sleep(900); tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH.slice(0,12))); if(tb) break; }
if(!tb){ console.log("!! 无教材帧"); process.exit(1); }
let n=0;
for(let k=0;k<12;k++){
  await sleep(2500);
  tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH.slice(0,12)));
  if(!tb) continue;
  n=await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`,tb.ctx).catch(()=>0);
  if((n||0)>0) break;
}
if(!n){ console.log("!! 题块未挂载 n="+n); process.exit(1); }
const rows=[];
for(let i=0;i<n;i++){
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return 0;
    const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
    const r=b.getBoundingClientRect(),box=sc.getBoundingClientRect(); sc.scrollTop += (r.top-box.top)-25; return 1;})()`,tb.ctx);
  await sleep(1300);
  const d=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return null;
    const t=(b.innerText||'').replace(/\\s+/g,' ').trim();
    return {gt:(b.querySelector('[data-ipublish-question-group-type]')||{getAttribute:()=>'-'}).getAttribute('data-ipublish-question-group-type'), i:${i}, len:t.length, sub:/提交/.test(t), redo:/重新作答/.test(t),
      sc:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null,
      ta:b.querySelectorAll('textarea').length, inp:b.querySelectorAll('input[type=text]').length,
      file:b.querySelectorAll('input[type=file]').length, t:t.slice(0,70)};})()`,tb.ctx);
  if(d) rows.push(d);
}
fs.writeFileSync(`blkdump-U${U}.json`,JSON.stringify(rows,null,1));
rows.forEach(r=>{
  const flag = (!r.redo && r.sub) ? "未交" : (r.sc==="0"?"0分":"  ");
  console.log(`#${r.i} ${flag} sc=${r.sc} sub=${r.sub?1:0} redo=${r.redo?1:0} ta=${r.ta} | ${r.t.slice(0,60)}`);
});
L.cdp.close();
