// scanup.mjs <unit> — 定位文件上传题块，读状态（已提交待评 / 未提交）
import { connect, sleep } from "./utlib.mjs";
import { ensureReader, openUnit, log } from "./reader.mjs";

const U = Number(process.argv[2]);
const tid = process.env.TID || (await ensureReader(U));
const L = await connect(tid);
const tb = await openUnit(L, U);
if (!tb) { log("!! 无教材帧（多半掉登录）"); process.exit(1); }
const { ev } = L;
const n = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx);
log("块总数:", n);
for (let i = 0; i < n; i++) {
  const meta = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    if(!b)return null;const g=b.querySelector('[data-ipublish-question-group-type]');
    return {type:g?g.getAttribute('data-ipublish-question-group-type'):'',len:(b.innerText||'').length,
            up:b.querySelectorAll('input[type=file],[class*=upload]').length};})()`, tb.ctx).catch(() => null);
  if (!meta) continue;
  const hasUp = /multi|upload/i.test(meta.type || "") || meta.up > 0;
  if (!hasUp) continue;
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(b)b.scrollIntoView({block:'center'});return 1;})()`, tb.ctx);
  await sleep(1200);
  const t = await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];return (b.innerText||'').replace(/\\s+/g,' ').trim();})()`, tb.ctx);
  const score = (String(t).match(/得分[:：]\s*(\d+)/) || [])[1];
  const submitted = /已提交|已上传|待批|批改|取消提交|重新提交|附件/.test(t);
  log(`#${i} type=${meta.type} up=${meta.up} score=${score ?? "-"} submitted=${submitted ? "Y" : "N"}`);
  log(`   ${String(t).slice(0, 150)}`);
}
L.cdp.close();
