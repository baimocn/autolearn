// q.mjs — 题块操作 CLI
// node q.mjs <unit> <i> text            打印题块文本
// node q.mjs <unit> <i> fill  '["a","b"]'  填 input
// node q.mjs <unit> <i> area  '["t1"]'     填 textarea
// node q.mjs <unit> <i> submit            点提交
// node q.mjs <unit> <i> redo              点重新作答
// node q.mjs <unit> <i> state             打印状态
import { connect, sleep } from "./utlib.mjs";

const BOOK = "0iws4u_bQkCFpqmfcTvdAg", BV = "VTqvEEI";
const TID = "D6816472D8507E6DCD80805A5A543A96";
const CH = {
  1: "7840f299-1cce-403e-9320-d6ddf613cebf",
  2: "2c3ad11f-a37e-4a64-ba6a-6cfa256cc6be",
  3: "5f975081-b8b7-4799-9d9c-b83a53423e4f",
  4: "6c59c2ec-f8bd-46f8-8506-6a8b25ff9e7b",
  5: "bfb4fa0c-fbd4-436f-8b37-3b307810cf63",
  6: "1ed78c87-3e9c-4426-a2fb-4a155955a7bb",
  7: "bc8967a2-13b9-4a3f-a127-e368e228e9e5",
  8: "f8dc1090-7968-4eb7-b231-63da59732244",
};

const u = Number(process.argv[2]), i = Number(process.argv[3]);
const cmd = process.argv[4] || "text";
const arg = process.argv[5] || "";

const L = await connect(TID);
const { ev, frames, mouse } = L;

// 每次操作前先清掉「本单元学习规则」等遮罩
async function clearModals() {
  const tbOff = await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return {ox:0,oy:0};const r=f.getBoundingClientRect();return {ox:Math.round(r.left),oy:Math.round(r.top)};})()`).catch(() => ({ ox: 0, oy: 0 }));
  for (let round = 0; round < 3; round++) {
    let found = false;
    for (const f of await frames()) {
      const q = `(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const e=v[v.length-1];const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`;
      const r = await ev(q, f.ctx).catch(() => null);
      if (r) {
        const inTb = /textbook/.test(f.url);
        await mouse(r.x + (inTb ? tbOff.ox : 0), r.y + (inTb ? tbOff.oy : 0));
        found = true; await sleep(1000); break;
      }
    }
    if (!found) break;
  }
}
await clearModals();

async function frame() {
  let tb = null;
  for (let k = 0; k < 6; k++) {
    tb = (await frames()).find((f) => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[u].slice(0, 12)));
    if (tb) break;
    await sleep(500);
  }
  if (!tb) {
    const url = `https://ipub.unipus.cn/learner/textbook/book/${BOOK}/chapter/${CH[u]}?bookVersionNumber=${BV}`;
    await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return 0;f.src=${JSON.stringify(url)};return 1;})()`);
    for (let k = 0; k < 40; k++) {
      await sleep(1000);
      tb = (await frames()).find((f) => /textbook\/book/.test(f.url) && f.ctx && f.url.includes(CH[u].slice(0, 12)));
      if (tb) {
        const n = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(() => 0);
        if (n >= 3) break;
      }
    }
    for (let k = 0; k < 25; k++) {
      const ok = await ev(`(()=>{const b=document.querySelectorAll('div.editor-question-block.questionBlockNode')[0];return b&&(b.innerText||'').length>50?1:0;})()`, tb.ctx).catch(() => 0);
      if (ok) break;
      await sleep(1000);
    }
  }
  if (!tb) throw new Error("no frame");
  await ev(`(() => { const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    if(b){const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
    const r=b.getBoundingClientRect(),box=sc.getBoundingClientRect(); sc.scrollTop += (r.top-box.top)-20;} return 1; })()`, tb.ctx);
  await sleep(900);
  return tb;
}

const B = (body) => `(() => {
  const b = [...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
  if (!b) return { err: 'no block' };
  const norm = s => (s || '').replace(/\\s+/g, ' ').trim();
  ${body}
})()`;

const tb = await frame();

if (cmd === "text") {
  console.log(String(await ev(B(`return (b.innerText||'');`), tb.ctx) || ""));
} else if (cmd === "state") {
  const r = await ev(B(`
    const t=(b.innerText||'').replace(/\\s+/g,' ');
    return { len:t.length, inputs:b.querySelectorAll('input[type=text]').length,
      areas:b.querySelectorAll('textarea').length, flow:b.querySelectorAll('.react-flow__node').length,
      done:/得分/.test(t), score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null,
      sub:/提交/.test(t), redo:/重新作答/.test(t), ans:/答案/.test(t) };`), tb.ctx);
  console.log(JSON.stringify(r));
} else if (cmd === "fill" || cmd === "area") {
  const vals = JSON.parse(arg);
  const r = await ev(B(`
    const sel = ${cmd === "fill" ? "'input[type=text]'" : "'textarea'"};
    const els = [...b.querySelectorAll(sel)];
    const vals = ${JSON.stringify(vals)};
    if (els.length < vals.length) return { err:'fewer', got: els.length, want: vals.length };
    const proto = ${cmd === "fill" ? "HTMLInputElement" : "HTMLTextAreaElement"}.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    for (let k=0;k<vals.length;k++){
      const el=els[k]; el.focus(); setter.call(el, vals[k]);
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
      el.blur();
    }
    return { ok:true, got: els.length, first: els.slice(0,3).map(e=>e.value) };`), tb.ctx);
  console.log(JSON.stringify(r));
} else if (cmd === "copyper") {
  const list = await ev(B(`
    const items=[...b.querySelectorAll('[class*=answer-question-box_questionItem]')];
    const out=[];
    for(const it of items){
      const lines=(it.innerText||'').split('\\n').map(s=>s.trim()).filter(Boolean);
      const k=lines.lastIndexOf('答案');
      if(k<0){ out.push(null); continue; }
      let v=null;
      for(let j=k+1;j<lines.length;j++){ if(lines[j]&&!/(你的答案|正确答案|你的得分)/.test(lines[j])){ v=lines[j]; break; } }
      out.push(v);
    }
    return out;`), tb.ctx);
  const arr = Array.isArray(list) ? list : [];
  if (!arr.length || arr.some((x) => !x)) { console.log(JSON.stringify({ err: "ans incomplete", arr })); L.cdp.close(); process.exit(0); }
  await ev(B(`
    const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&norm(e.innerText)==='重新作答');
    if(el) el.click(); return 1;`), tb.ctx);
  await sleep(2500);
  await ev(`(() => { const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    if(b){const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
    const r=b.getBoundingClientRect(),box=sc.getBoundingClientRect(); sc.scrollTop += (r.top-box.top)-20;} return 1; })()`, tb.ctx);
  await sleep(900);
  const f = await ev(B(`
    const els=[...b.querySelectorAll('textarea')];
    const vals=${JSON.stringify(arr)};
    if(els.length<vals.length) return {err:'fewer', got:els.length, want:vals.length};
    const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
    for(let k=0;k<vals.length;k++){const e=els[k];e.focus();set.call(e,vals[k]);
      e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();}
    return {ok:1, n:els.length};`), tb.ctx);
  await sleep(700);
  await ev(B(`
    const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&norm(e.innerText)==='提交');
    if(el) el.click(); return 1;`), tb.ctx);
  await sleep(4500);
  const st = await ev(B(`
    const t=(b.innerText||'').replace(/\\s+/g,' ');
    return { score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null, redo:/重新作答/.test(t) };`), tb.ctx);
  console.log(JSON.stringify({ filled: f, after: st, arr }));
} else if (cmd === "copyarea") {
  const arr = await ev(B(`
    const t=(b.innerText||''); const k=t.lastIndexOf('\\n答案');
    if(k<0) return [];
    const lines=t.slice(k+3).split('\\n').map(s=>s.trim()).filter(Boolean);
    return lines.filter(s=>!/^\\(\\d+\\)$/.test(s)&&!/^答案[:：]?$/.test(s)&&!/你的答案|正确答案|你的得分/.test(s));`), tb.ctx);
  const list = Array.isArray(arr) ? arr : [];
  if (!list.length) { console.log(JSON.stringify({ err: "no answer" })); L.cdp.close(); process.exit(0); }
  await ev(B(`
    const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&norm(e.innerText)==='重新作答');
    if(el) el.click(); return 1;`), tb.ctx);
  await sleep(2500);
  await ev(`(() => { const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    if(b){const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
    const r=b.getBoundingClientRect(),box=sc.getBoundingClientRect(); sc.scrollTop += (r.top-box.top)-20;} return 1; })()`, tb.ctx);
  await sleep(900);
  const f = await ev(B(`
    const els=[...b.querySelectorAll('textarea')];
    const vals=${JSON.stringify(list)};
    if(!els.length) return {err:'no textarea'};
    if(vals.length<els.length) return {err:'fewer', got:vals.length, want:els.length};
    const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
    for(let k=0;k<els.length;k++){const e=els[k];e.focus();set.call(e,vals[k]);
      e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();}
    return {ok:1, n:els.length};`), tb.ctx);
  if (f && f.err) { console.log(JSON.stringify({ filled: f, ans: list.length })); L.cdp.close(); process.exit(0); }
  await sleep(600);
  await ev(B(`
    const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&norm(e.innerText)==='提交');
    if(el) el.click(); return 1;`), tb.ctx);
  await sleep(4500);
  const st = await ev(B(`
    const t=(b.innerText||'').replace(/\\s+/g,' ');
    return { score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null, redo:/重新作答/.test(t) };`), tb.ctx);
  console.log(JSON.stringify({ filled: f, after: st }));
} else if (cmd === "bankfill") {
  // 从题块文本里猜词库：取“提交/预览”之后、第一道题号之前的短行
  const r = await ev(B(`
    const t=(b.innerText||'');
    const lines=t.split('\\n').map(s=>s.trim()).filter(Boolean);
    const nIn=b.querySelectorAll('input[type=text]').length;
    const start=lines.findIndex(s=>/^(提交|预览)$/.test(s));
    const cand=[];
    for(let k=Math.max(0,start+1);k<lines.length;k++){
      const s=lines[k];
      if(/^\\d+[\\.、]/.test(s)) break;
      if(s.length>28) continue;
      if(/[。，；：]/.test(s)) continue;
      cand.push(s);
    }
    const uniq=[...new Set(cand)];
    const vals=[];
    for(let k=0;k<nIn;k++) vals.push(uniq[k % Math.max(1,uniq.length)] || 'x');
    const els=[...b.querySelectorAll('input[type=text]')];
    const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    for(let k=0;k<els.length;k++){const e=els[k];e.focus();set.call(e,vals[k]);
      e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();}
    return {ok:1, n:nIn, bank:uniq.slice(0,20), used:vals.slice(0,8)};`), tb.ctx);
  console.log(JSON.stringify(r));
} else if (cmd === "copyfill") {
  // 读取【答案】区，按 (1)(2)... 或连续行解析，重做后按顺序填入全部输入框
  const ans = await ev(B(`
    const t=(b.innerText||'');
    const k=t.lastIndexOf('\\n答案');
    if(k<0) return [];
    const lines=t.slice(k+3).split('\\n').map(s=>s.trim()).filter(Boolean);
    const out=[];
    for(const s of lines){
      if(/^\\(\\d+\\)$/.test(s)) continue;
      if(/^答案[:：]?$/.test(s)) continue;
      if(/你的答案|正确答案|你的得分/.test(s)) continue;
      out.push(s.replace(/\s*[（(][^()（）]*[）)]\s*$/,'').trim());
    }
    return out;`), tb.ctx);
  const arr = Array.isArray(ans) ? ans : [];
  if (!arr.length) { console.log(JSON.stringify({ err: "no answer" })); L.cdp.close(); process.exit(0); }
  await ev(B(`
    const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&norm(e.innerText)==='重新作答');
    if(el) el.click(); return 1;`), tb.ctx);
  await sleep(2500);
  await ev(`(() => { const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    if(b){const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
    const r=b.getBoundingClientRect(),box=sc.getBoundingClientRect(); sc.scrollTop += (r.top-box.top)-20;} return 1; })()`, tb.ctx);
  await sleep(900);
  const f = await ev(B(`
    const els=[...b.querySelectorAll('input[type=text]')];
    const vals=${JSON.stringify(arr)};
    if(!els.length) return {err:'no input'};
    if(vals.length<els.length) return {err:'fewer', got:vals.length, want:els.length};
    const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    for(let k=0;k<els.length;k++){const e=els[k];e.focus();set.call(e,vals[k]);
      e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();}
    return {ok:1, n:els.length, first:els[0].value};`), tb.ctx);
  if (f && f.err) { console.log(JSON.stringify({ filled: f, ansLen: arr.length })); L.cdp.close(); process.exit(0); }
  await sleep(600);
  await ev(B(`
    const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&norm(e.innerText)==='提交');
    if(el) el.click(); return 1;`), tb.ctx);
  await sleep(4500);
  const st = await ev(B(`
    const t=(b.innerText||'').replace(/\\s+/g,' ');
    return { score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null, redo:/重新作答/.test(t) };`), tb.ctx);
  console.log(JSON.stringify({ filled: f, after: st, ans: arr.slice(0, 12) }));
} else if (cmd === "copyans") {
  const ans = await ev(B(`
    const t=(b.innerText||'');
    const k=t.lastIndexOf('\\n答案');
    if(k<0) return '';
    return t.slice(k+3).replace(/^[\\s:：]*/,'').trim();`), tb.ctx);
  if (!ans || String(ans).length < 10) { console.log(JSON.stringify({ err: "no answer", ans: String(ans).slice(0, 60) })); L.cdp.close(); process.exit(0); }
  await ev(B(`
    const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&norm(e.innerText)==='重新作答');
    if(el) el.click(); return 1;`), tb.ctx);
  await sleep(2500);
  await ev(`(() => { const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];
    if(b){const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
    const r=b.getBoundingClientRect(),box=sc.getBoundingClientRect(); sc.scrollTop += (r.top-box.top)-20;} return 1; })()`, tb.ctx);
  await sleep(800);
  const f = await ev(B(`
    const els=[...b.querySelectorAll('textarea,input[type=text]')];
    if(!els.length) return {err:'no field'};
    const proto = els[0].tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
    const set=Object.getOwnPropertyDescriptor(proto,'value').set;
    set.call(els[0], ${JSON.stringify(String(ans))});
    els[0].dispatchEvent(new Event('input',{bubbles:true}));
    els[0].dispatchEvent(new Event('change',{bubbles:true}));
    els[0].blur();
    return {ok:1, len: els[0].value.length};`), tb.ctx);
  await sleep(600);
  const s = await ev(B(`
    const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&norm(e.innerText)==='提交');
    if(!el) return {err:'no submit'};
    el.click(); return {ok:1};`), tb.ctx);
  await sleep(4500);
  const st = await ev(B(`
    const t=(b.innerText||'').replace(/\\s+/g,' ');
    return { score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null, redo:/重新作答/.test(t) };`), tb.ctx);
  console.log(JSON.stringify({ filled: f, submit: s, after: st, ansLen: String(ans).length }));
} else if (cmd === "tfa") {
  const r = await ev(B(`
    const items=[...b.querySelectorAll('[class*=answer-question-box_questionItem]')];
    return items.map(it=>{
      const lines=(it.innerText||'').split('\\n').map(s=>s.trim()).filter(Boolean);
      const k=lines.lastIndexOf('答案');
      if(k<0) return null;
      for(let j=k+1;j<lines.length;j++){ if(/^[TF]$/.test(lines[j])) return lines[j]; if(lines[j].length>3) break; }
      return null;
    });`), tb.ctx);
  console.log(JSON.stringify(r));
} else if (cmd === "tfm") {
  const letters = JSON.parse(arg);
  const r = await ev(B(`
    const items=[...b.querySelectorAll('[class*=answer-question-box_questionItem]')];
    const ls=${JSON.stringify(letters)};
    const res=[];
    for(let k=0;k<ls.length&&k<items.length;k++){
      const opts=[...items[k].querySelectorAll('[class*=answer_optionTF]')];
      const hit=opts.find(e=>norm(e.innerText)===ls[k]);
      if(!hit){res.push('miss');continue;}
      hit.scrollIntoView({block:'center'});
      const rect=hit.getBoundingClientRect();
      const o={bubbles:true,cancelable:true,view:window,clientX:rect.left+rect.width/2,clientY:rect.top+rect.height/2};
      hit.dispatchEvent(new PointerEvent('pointerdown',o));
      hit.dispatchEvent(new MouseEvent('mousedown',o));
      hit.dispatchEvent(new PointerEvent('pointerup',o));
      hit.dispatchEvent(new MouseEvent('mouseup',o));
      hit.dispatchEvent(new MouseEvent('click',o));
      res.push(hit.className.includes('Active')?ls[k]:'x');
    }
    return { ok:true, items:items.length, res };`), tb.ctx);
  console.log(JSON.stringify(r));
} else if (cmd === "tf") {
  const letters = JSON.parse(arg);
  const r = await ev(B(`
    const items=[...b.querySelectorAll('[class*=answer-question-box_questionItem]')];
    const ls=${JSON.stringify(letters)};
    const done=[];
    for(let k=0;k<ls.length && k<items.length;k++){
      const opts=[...items[k].querySelectorAll('[class*=answer_option]')].filter(e=>!e.querySelector('[class*=answer_option]'));
      const hit=opts.find(e=>norm(e.innerText)===ls[k]);
      if(!hit){ done.push('miss '+k+' opts='+opts.map(e=>norm(e.innerText)).join('/')); continue; }
      hit.click(); done.push(ls[k]);
    }
    return { ok:true, items:items.length, done };`), tb.ctx);
  console.log(JSON.stringify(r));
} else if (cmd === "choice") {
  const letters = JSON.parse(arg);
  const r = await ev(B(`
    const items=[...b.querySelectorAll('[class*=answer-question-box_questionItem]')];
    const ls=${JSON.stringify(letters)};
    const done=[];
    for(let k=0;k<ls.length && k<items.length;k++){
      const rows=[...items[k].querySelectorAll('[class*=chioceView_strongListView]')];
      const row=rows[ls[k].charCodeAt(0)-65];
      if(!row){ done.push('no row '+k); continue; }
      row.scrollIntoView({block:'center'}); row.click(); done.push(ls[k]);
    }
    return { ok:true, items: items.length, done };`), tb.ctx);
  console.log(JSON.stringify(r));
} else if (cmd === "keys") {
  const r = await ev(B(`
    const t=(b.innerText||'');
    const out=[];
    const re=/正确答案[:：]?\\s*\\n?\\s*([^\\n]+)/g;
    let m; while((m=re.exec(t))) out.push(m[1].trim());
    return out;`), tb.ctx);
  console.log(JSON.stringify(r));
} else if (cmd === "ans") {
  const r = await ev(B(`
    const t=(b.innerText||'');
    const k=t.lastIndexOf('答案');
    return k<0 ? '(no answer)' : t.slice(k);`), tb.ctx);
  console.log(String(r));
} else if (cmd === "submit" || cmd === "redo") {
  const label = cmd === "submit" ? "提交" : "重新作答";
  const r = await ev(B(`
    const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&norm(e.innerText)===${JSON.stringify(label)});
    if(!el) return { err:'no ${label}' };
    el.click(); return { ok:true };`), tb.ctx);
  console.log(JSON.stringify(r));
  await sleep(3500);
  const st = await ev(B(`
    const t=(b.innerText||'').replace(/\\s+/g,' ');
    return { score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null, redo:/重新作答/.test(t), ans:/答案/.test(t) };`), tb.ctx);
  console.log("after:", JSON.stringify(st));
} else {
  console.log("unknown cmd");
}
L.cdp.close();
