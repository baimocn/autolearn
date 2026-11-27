import { ensureReader, openUnit, mountBlock } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const U = Number(process.argv[2]||1);
const tid = await ensureReader(U);
const L = await connect(tid);
const tb = await openUnit(L, U);
if(!tb){ console.log("NO TEXTBOOK FRAME"); L.cdp.close(); process.exit(1);}
const { ev } = L; const ctx=tb.ctx;
const body = (i, fn) => `(()=>{
  const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  if(!b) return 'NOBLOCK';
  const t=(b.innerText||'').replace(/\s+/g,' ');
  const $=s=>b.querySelectorAll(s);
  return (${fn.toString()})(b,t,$);
})()`;
const total = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`,ctx);
console.log("Unit",U,"题块总数:",total);
for(let i=0;i<total;i++){
  await mountBlock(L,tb,i,300);
  const kind = await ev(body(i,(b,t,$)=>{
    if($('video,audio').length) return 'video';
    if($('input[type=file]').length) return 'upload';
    if($('[class*=answer_optionTF]').length>=2) return 'tf';
    const areas=$('textarea').length, inputs=$('input[type=text]').length, items=$('[class*=answer-question-box_questionItem]').length;
    if(areas>0&&inputs===0) return 'area';
    if(inputs>0) return 'fill';
    if(items>0) return 'choice';
    if(/重新作答/.test(t)) return 'done?';
    return '?';
  }),ctx).catch(()=>'ERR');
  const score = await ev(body(i,(b,t)=>((t.match(/得分[:：]?\s*(\d+(\.\d+)?)/)||[])[1]||'')),ctx).catch(()=>'');
  const txt = await ev(body(i,(b,t)=>t.slice(0,44)),ctx).catch(()=>'');
  console.log(`#${String(i).padStart(2)} ${String(kind).padEnd(7)} ${score?('['+score+'] '):''}${txt}`);
}
L.cdp.close();
