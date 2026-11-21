// unit-drive.mjs <unit> [blocklist] — 单元题块全自动驱动
// 覆盖：选择/判断(TF)/填空/词库/下拉/简答；猜→交→读“答案”→重做→精确作答→交
import { ensureReader, openUnit, mountBlock, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";

const U = Number(process.argv[2]);
const only = process.argv[3] ? process.argv[3].split(",").map(Number) : null;
const tid = await ensureReader(U);
const L = await connect(tid);
let tb = (await L.frames()).find((f) => f.url.includes("textbook/book") && f.ctx && f.url.includes(CH[U].slice(0, 12)));
if (!tb) tb = await openUnit(L, U);
if (!tb) { console.log("NO FRAME"); L.cdp.close(); process.exit(1); }
const { ev } = L; const ctx = tb.ctx;
const log = (...a) => console.log(`[u${U}]`, ...a);
const norm = (s) => (s || "").replace(/\s+/g, " ").trim();

// —— 题块内执行 ——
const BK = (i, body) => `(()=>{
  const blocks=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];
  const b=blocks[${i}];
  if(!b) return {__err:'no block'};
  const t=(b.innerText||'').replace(/\\s+/g,' ');
  const $=s=>[...b.querySelectorAll(s)];
  const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
  return (function(b,t,$,norm){${body}})(b,t,$,norm);
})()`;
const run = (i, body) => ev(BK(i, body), ctx);

const scrollCenter = async (i) => {
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    if(b){const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
    const r=b.getBoundingClientRect(),box=sc.getBoundingClientRect();sc.scrollTop+=(r.top-box.top)-30;}return 1;})()`, ctx);
  await sleep(500);
};
const stateOf = (i) => run(i, `
  return {
    items:$('[class*=questionItem]').length,
    inputs:$('input[type=text]').length, areas:$('textarea').length,
    tf:$('[class*=answer_optionTF]').length,
    bank:$('[class*=questionViewOptionsItem]').length,
    dd:$('[class*=digEmptySelectView_selectTrigger]').length,
    video:$('video').length, audio:$('audio').length, file:$('input[type=file]').length,
    score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null,
    canSubmit:$('[class*=i-button]').some(e=>norm(e.innerText)==='提交'),
    redone:/重新作答/.test(t)
  };`);
const clickIbtn = (i, label) => run(i, `
  const el=$('[class*=i-button_default-container]').find(e=>norm(e.innerText)===${JSON.stringify(label)});
  if(!el) return {__err:'no ibtn '+label}; el.click(); return {ok:1};`);
const dismissRules = async () => {
  for (const f of await L.frames()) {
    await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');
      const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);
      if(v.length){v[v.length-1].click();return 1;}return 0;})()`, f.ctx).catch(()=>0);
  }
};

// 读取“答案”区：(1)..(2).. 或 正确答案 / 答案 列表
const readAnswers = (i, s) => run(i, `
  const raw=b.innerText;
  // (k) 风格
  const paren=[];
  const re=/\\(\\s*(\\d+)\\s*\\)\\s*\\n?([^\\n(]+)/g; let m;
  while((m=re.exec(raw))){paren[Number(m[1])-1]=m[2].trim();}
  if(paren.some(x=>x)) return paren;
  // 正确答案: 行（选择题每题一行，可能是字母或文本）
  const keys=[]; const re2=/正确答案[:：]?\\s*\\n?\\s*([^\\n]+)/g;
  while((m=re2.exec(raw))) keys.push(m[1].trim());
  if(keys.length) return keys;
  return [];`);

const total = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, ctx);
const list = only || [...Array(total).keys()];
log("题块总数", total, "本次处理", list.join(","));

const summary = [];
const waitReady = async (i, tries = 14) => {
  let s = null;
  for (let k = 0; k < tries; k++) {
    await mountBlock(L, tb, i, 300);
    await scrollCenter(i);
    s = await stateOf(i);
    if (s && !s.__err && (s.inputs + s.areas + s.bank + s.dd + s.tf + s.video + s.audio + s.file > 0)) return s;
    // read-only / text blocks: need substantial text
    const len = await run(i, `return (b.innerText||'').length;`).catch(() => 0);
    if (typeof len === "number" && len > 220 && s) return s;
  }
  return s;
};

for (const i of list) {
  try {
    await dismissRules();
    let s = await waitReady(i);
    if (!s || s.__err) { log(`#${i} 无题块`); summary.push({ i, r: "noblock" }); continue; }
    if (s.score !== null && Number(s.score) >= 99.9) { log(`#${i} 已满分`); summary.push({ i, r: "full", score: s.score }); continue; }

    // 决定类型
    let kind = "skip";
    if (s.file) kind = "upload";
    else if (s.video || s.audio) kind = "media";
    else if (s.dd) kind = "dd";
    else if (s.tf >= 2) kind = "tf";
    else if (s.areas > 0 && s.inputs === 0 && s.items <= 1) kind = "area";
    else if (s.bank > 0 && s.inputs > 0) kind = "bankfill";
    else if (s.inputs > 0) kind = "fill";
    else if (s.items > 0) kind = "choice";
    log(`#${i} kind=${kind} score=${s.score} inputs=${s.inputs} areas=${s.areas} items=${s.items} dd=${s.dd} tf=${s.tf}`);

    if (kind === "upload" || kind === "media") { log(`#${i} 暂由专项处理（${kind}）`); summary.push({ i, r: kind }); continue; }

    // 若处于已提交状态，先“重新作答”以取得干净作答态
    if (s.redone && s.score !== null) {
      await clickIbtn(i, "重新作答"); await sleep(1800); await scrollCenter(i);
    }

    // —— 第一遍：随便作答 ——
    if (kind === "choice") {
      await run(i, `$('[class*=questionItem]').forEach(it=>{
        const rows=it.querySelectorAll('[class*=chioceView_strongListView],[class*=strongListView]');
        if(rows[0]) rows[0].click();}); return {ok:1};`);
    } else if (kind === "tf") {
      await run(i, `$('[class*=questionItem]').forEach(it=>{
        const opts=it.querySelectorAll('[class*=answer_optionTF]');
        const t=[...opts].find(e=>norm(e.innerText)==='T')||opts[0]; if(!t)return;
        const r=t.getBoundingClientRect();const o={bubbles:true,cancelable:true,view:window,clientX:r.left+r.width/2,clientY:r.top+r.height/2};
        ['pointerdown','mousedown','pointerup','mouseup','click'].forEach((evn,k)=>{
          const E=evn.startsWith('pointer')?PointerEvent:MouseEvent;t.dispatchEvent(new E(evn,o));});});
        return {ok:1};`);
    } else if (kind === "dd") {
      // 每个下拉：开 trigger → 选第一个 option
      await run(i, `(async()=>{
        const trigs=$('[class*=digEmptySelectView_selectTrigger]');
        for(const tr of trigs){
          const rk=Object.keys(tr).find(k=>k.startsWith('__reactProps'));
          try{tr[rk].onClick({stopPropagation(){},preventDefault(){},target:tr,currentTarget:tr,nativeEvent:{}});}catch(e){tr.click();}
          await new Promise(r=>setTimeout(r,250));
          const opts=$('[class*=digEmptySelectView_optionItem]');
          if(opts[0]){const o2=Object.keys(opts[0]).find(k=>k.startsWith('__reactProps'));
            try{opts[0][o2].onClick({stopPropagation(){},preventDefault(){},target:opts[0],currentTarget:opts[0],nativeEvent:{}});}catch(e){opts[0].click();}}
          await new Promise(r=>setTimeout(r,150));
        }
        return {ok:1,n:trigs.length};})()`);
    } else if (kind === "area") {
      await run(i, `const els=$('textarea');
        const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
        els.forEach(e=>{e.focus();set.call(e,'placeholder answer');
          e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
        return {ok:1,n:els.length};`);
    } else if (kind === "bankfill" || kind === "fill") {
      await run(i, `const els=$('input[type=text]');
        const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
        els.forEach((e,k)=>{e.focus();set.call(e,'x'+(k+1));
          e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
        return {ok:1,n:els.length};`);
    }

    // 提交
    await sleep(400);
    let sb = await clickIbtn(i, "提交");
    if (sb.__err) {
      // 可能是其它提交按钮
      await run(i, `const el=$('button,[class*=i-button]').find(e=>norm(e.innerText)==='提交');if(el)el.click();return el?1:0;`);
    }
    await sleep(4500);
    await dismissRules();
    let after = await stateOf(i);
    if (after.score !== null && Number(after.score) >= 99.9) { log(`#${i} 一次满分 ${after.score}`); summary.push({ i, r: "full1", score: after.score }); continue; }

    // —— 读答案 ——
    const ans = await readAnswers(i, s);
    log(`#${i} 读到答案 ${Array.isArray(ans)?ans.length:0}: ${JSON.stringify(ans).slice(0,120)}`);

    // —— 第二遍：按答案精确作答 ——
    // 0 分：块仍可编辑（有提交无重新作答）→ 直接覆盖；部分分：有“重新作答”→ 先点
    const canRedo = await run(i, `return $('[class*=i-button_default-container]').some(e=>norm(e.innerText)==='重新作答');`);
    if (canRedo) {
      await clickIbtn(i, "重新作答"); await sleep(1800); await scrollCenter(i);
    } else {
      await scrollCenter(i);
    }

    if (kind === "choice" || kind === "tf") {
      const isTf = kind === "tf";
      // ans 为每题的字母或文本
      await run(i, `(async()=>{
        const items=$('[class*=questionItem]');const ans=${JSON.stringify(ans)};const isTf=${isTf};
        for(let k=0;k<items.length&&k<ans.length;k++){
          const key=String(ans[k]).trim();
          if(isTf && /^[TF]$/.test(key)){
            const opts=items[k].querySelectorAll('[class*=answer_optionTF]');
            const hit=[...opts].find(o=>norm(o.innerText)===key); if(hit)hit.click();
          } else if(/^[A-F]$/.test(key)){
            const rows=items[k].querySelectorAll('[class*=chioceView_strongListView],[class*=strongListView]');
            const row=rows[key.charCodeAt(0)-65]; if(row)row.click();
          } else {
            // 文本型：找包含该文本的选项
            const all=[...items[k].querySelectorAll('[class*=strongListView],[class*=answer_optionTF],[class*=option]')];
            const hit=all.find(o=>norm(o.innerText)===key||o.innerText.includes(key.slice(0,12)));
            if(hit)hit.click();
          }
          await new Promise(r=>setTimeout(r,120));
        }
        return {ok:1};})()`);
    } else if (kind === "dd") {
      await run(i, `(async()=>{
        const trigs=$('[class*=digEmptySelectView_selectTrigger]');const ans=${JSON.stringify(ans)};
        for(let k=0;k<trigs.length&&k<ans.length;k++){
          const want=String(ans[k]).trim();
          const rk=Object.keys(trigs[k]).find(x=>x.startsWith('__reactProps'));
          try{trigs[k][rk].onClick({stopPropagation(){},preventDefault(){},target:trigs[k],currentTarget:trigs[k],nativeEvent:{}});}catch(e){trigs[k].click();}
          await new Promise(r=>setTimeout(r,250));
          const opts=$('[class*=digEmptySelectView_optionItem]');
          const hit=[...opts].find(o=>norm(o.innerText)===want)||opts[0];
          if(hit){const ok=Object.keys(hit).find(x=>x.startsWith('__reactProps'));
            try{hit[ok].onClick({stopPropagation(){},preventDefault(){},target:hit,currentTarget:hit,nativeEvent:{}});}catch(e){hit.click();}}
          await new Promise(r=>setTimeout(r,150));
        }
        return {ok:1};})()`);
    } else if (kind === "area") {
      await run(i, `const els=$('textarea');const ans=${JSON.stringify(ans)};
        const v=Array.isArray(ans)?ans.join('\\n'):String(ans);
        const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
        els.forEach(e=>{e.focus();set.call(e,v);
          e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
        return {ok:1,n:els.length};`);
    } else { // fill / bankfill：直接键入精确文本（已验证 100）
      await run(i, `const els=$('input[type=text]');const ans=${JSON.stringify(ans)};
        const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
        els.forEach((e,k)=>{const v=ans[k]??'';e.focus();set.call(e,v);
          e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
        return {ok:1,n:els.length};`);
    }

    await sleep(400);
    await clickIbtn(i, "提交");
    await sleep(4500);
    await dismissRules();
    const fin = await stateOf(i);
    log(`#${i} 完成 score=${fin.score}`);
    summary.push({ i, r: "done", score: fin.score });
  } catch (e) {
    log(`#${i} 异常`, String(e).slice(0, 140));
    summary.push({ i, r: "error", e: String(e).slice(0, 120) });
  }
}
log("小结:", JSON.stringify(summary));
L.cdp.close();
