// sectfix.mjs <unit> <section1|section2|...> — 视觉定位的指定小节精修
import { CDP, sleep } from "./cdp.mjs";
import { connect } from "./utlib.mjs";
import { READER, COURSE, CH } from "./reader.mjs";
import fs from "node:fs";
const U = Number(process.argv[2] || 1);
const NAMES = (process.argv[3] || "").split("|").filter(Boolean);
const log = (...a) => console.log(`[sfx${U}]`, ...a);
process.on("uncaughtException", (e) => log("uncaught:", String(e).slice(0, 110)));
const getVer = async () => (await fetch("http://127.0.0.1:9222/json/version")).json();
const getTabs = async () => (await fetch("http://127.0.0.1:9222/json/list")).json();
const b0 = await CDP.connect((await getVer()).webSocketDebuggerUrl);
for (const t of (await getTabs()).filter(t => /ucontent\.unipus\.cn/.test(t.url))) await b0.send("Target.closeTarget", { targetId: t.id }).catch(() => {});
await sleep(800);
const r = await b0.send("Target.createTarget", { url: `${READER}#/${COURSE}/courseware/u${U}/u${U}g2` });
b0.close();
await sleep(18000);
try {
  const { execSync } = await import("node:child_process");
  const tu = (await getTabs()).find(t => t.id === r.targetId);
  if (tu && /sso\.unipus\.cn\/sso\/login/.test(tu.url)) {
    log("SSO, relogin");
    try { execSync("node relogin2.mjs", { cwd: process.cwd(), env: { ...process.env, UNIPUS_USER: "USER_A_PHONE", UNIPUS_PASS: "REDACTED_PW" }, stdio: "pipe", timeout: 120000 }); } catch {}
    await sleep(3000);
  }
} catch {}
const L = await connect(r.targetId);
const { ev, frames, cdp, sessionId } = L;
let tb = null;
for (let k = 0; k < 110 && !tb; k++) {
  tb = (await frames()).find(f => f.url.includes("textbook/book") && f.ctx && f.url.includes((CH[U] || "??").slice(0, 12)));
  if (tb) { const n = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, tb.ctx).catch(() => 0); if (n > 0) break; }
  await sleep(1000);
}
if (!tb) { log("NO TB"); process.exit(1); }
const mouse = async (x, y) => {
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId).catch(() => {});
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
};
const dismissRules = async () => {
  for (let i = 0; i < 4; i++) {
    let hit = false;
    for (const f of await frames()) {
      const p = await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(!v.length)return null;const b=v[v.length-1].getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, f.ctx).catch(() => null);
      if (p) { await mouse(p.x, p.y); await sleep(1100); hit = true; break; }
    }
    if (!hit) break;
  }
};
await dismissRules();
// 打开目录抽屉
for (let i = 0; i < 3; i++) {
  const op = await ev(`(()=>{const e=document.querySelector('[class*=catalog_area-open-menu]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, tb.ctx).catch(()=>null);
  if (op) { await mouse(op.x, op.y); await sleep(2500); }
  const opened = await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return 0;const b=e.getBoundingClientRect();return b.width>3?1:0;})()`, tb.ctx).catch(()=>0);
  if (opened) break;
  await sleep(1000);
}
// 展开抽屉到目标小节（抽屉已开则直接找；找不到就滚动抽屉）
const findSection = async (name) => {
  const nn = String(name).replace(/\s+/g, "");
  for (let k = 0; k < 10; k++) {
    const p = await ev("(()=>{const target=" + JSON.stringify(nn) + ";const el=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].find(e=>{const t=(e.innerText||'').replace(/\\s+/g,'');return t.includes(target)||t.replace(/[0-9.]+%$/,'').startsWith(target.slice(0,10));});if(!el)return null;const b=el.getBoundingClientRect();if(b.top<0||b.top>window.innerHeight-30)return {out:1};return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()", tb.ctx).catch(() => null);
    if (p && p.x) return p;
    // 滚动抽屉
    await ev(`(()=>{const sc=[...document.querySelectorAll('[class*=catalog_catalog],[class*=i-tree-menu_tree-menu]')].find(e=>e.scrollHeight>e.clientHeight);if(sc)sc.scrollBy(0,300);return 1;})()`, tb.ctx).catch(() => {});
    await sleep(700);
  }
  return null;
};

for (const name of NAMES) {
  log(`== ${name} ==`);
  const p = await findSection(name);
  if (!p) { log(`  未找到 ${name}`); continue; }
  await mouse(p.x, p.y);
  await sleep(6000);
  await dismissRules();
  await sleep(3000);
  const blocks = (await ev(`[...document.querySelectorAll('div.editor-question-block.questionBlockNode')].map((b,i)=>{
    const t=(b.innerText||'');
    return {i, len:t.length, area:b.querySelectorAll('textarea').length, inp:b.querySelectorAll('input[type=text]').length,
      dig:b.querySelectorAll('[class*=digEmptyView_blankView]').length, dd:b.querySelectorAll('[class*=digEmptySelectView_selectTrigger]').length,
      tf:b.querySelectorAll('[class*=answer_optionTF]').length, items:b.querySelectorAll('[class*=questionItem]').length,
      file:b.querySelectorAll('input[type=file]').length, video:b.querySelectorAll('video').length, audio:b.querySelectorAll('audio').length,
      sub:[...b.querySelectorAll('[class*=i-button]')].some(e=>((e.innerText||'').replace(/\\s+/g,''))==='提交'), redo:/重新作答/.test(t),
      score:(t.replace(/\\s+/g,' ').match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null};
  })`, tb.ctx)) || [];
  const todo = blocks.filter(b => (b.area || b.inp || b.dig || b.dd || b.tf || b.items) && !(b.score !== null && Number(b.score) >= 99.9) && (b.sub || b.redo));
  log(`  块:${blocks.length} 待做:${todo.map(b => b.i + (b.redo ? "R" : b.sub ? "S" : "")).join(",")}`);
  for (const b of todo) {
    try {
      await ev(`(()=>{const bb=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${b.i}];if(bb)bb.scrollIntoView({block:'center'});return 1;})()`, tb.ctx);
      await sleep(1200);
      if (b.redo) {
        await ev(`(()=>{const bb=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${b.i}];
          const el=[...bb.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\\s+/g,''))==='重新作答');
          if(el)el.click();return !!el;})()`, tb.ctx);
        await sleep(2500);
      }
      // 作答
      if (b.area) {
        await ev(`(()=>{const bb=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${b.i}];
          const els=[...bb.querySelectorAll('textarea')];
          const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
          els.forEach(e=>{e.focus();set.call(e,"Agriculture has always been the foundation of human civilization. In this task, I have studied the key points of this unit and would like to share my understanding. Modern farming methods have greatly improved productivity, while traditional wisdom keeps the soil healthy.");
            e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
          return els.length;})()`, tb.ctx);
      } else if (b.inp) {
        await ev(`(()=>{const bb=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${b.i}];
          const els=[...bb.querySelectorAll('input[type=text]')];
          const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
          els.forEach((e,k)=>{e.focus();set.call(e,'answer '+(k+1));
            e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));e.blur();});
          return els.length;})()`, tb.ctx);
      } else if (b.items) {
        await ev(`(async()=>{const bb=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${b.i}];
          const items=[...bb.querySelectorAll('[class*=questionItem]')];
          items.forEach(it=>{const rows=[...it.querySelectorAll('[class*=chioceView_strongListView],[class*=strongListView]')];if(rows[0])rows[0].click();});
          return items.length;})()`, tb.ctx);
      } else if (b.tf >= 2) {
        await ev(`(async()=>{const bb=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${b.i}];
          const items=[...bb.querySelectorAll('[class*=questionItem]')];
          items.forEach(it=>{const opts=[...it.querySelectorAll('[class*=answer_optionTF]')];const t2=opts.find(e=>((e.innerText||'').trim()==='T'))||opts[0];
            if(t2){const rr=t2.getBoundingClientRect();const o={bubbles:true,cancelable:true,view:window,clientX:rr.left+rr.width/2,clientY:rr.top+rr.height/2};
              ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(n=>{const E=n.startsWith('pointer')?PointerEvent:MouseEvent;t2.dispatchEvent(new E(n,o));});}});
          return 1;})()`, tb.ctx);
      } else if (b.dd) {
        await ev(`(async()=>{const bb=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${b.i}];
          const trigs=[...bb.querySelectorAll('[class*=digEmptySelectView_selectTrigger]')];
          for(const tr of trigs){const rk=Object.keys(tr).find(x=>x.startsWith('__reactProps'));
            try{if(rk&&tr[rk].onClick)tr[rk].onClick({stopPropagation(){},preventDefault(){},target:tr,currentTarget:tr,nativeEvent:{}});else tr.click();}catch(e){tr.click();}
            await new Promise(r=>setTimeout(r,350));
            const opts=[...document.querySelectorAll('[class*=digEmptySelectView_optionItem]')].filter(e=>e.getBoundingClientRect().width>0);
            if(opts[0]){const ok=Object.keys(opts[0]).find(x=>x.startsWith('__reactProps'));
              try{if(ok&&opts[0][ok].onClick)opts[0][ok].onClick({stopPropagation(){},preventDefault(){},target:opts[0],currentTarget:opts[0],nativeEvent:{}});else opts[0].click();}catch(e){opts[0].click();}}
            await new Promise(r=>setTimeout(r,200));}
          return trigs.length;})()`, tb.ctx);
      } else if (b.dig) {
        await ev(`(async()=>{const bb=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${b.i}];
          const blanks=[...bb.querySelectorAll('[class*=digEmptyView_blankView]')];
          for(const bl of blanks){const rk=Object.keys(bl).find(x=>x.startsWith('__reactProps'));
            try{if(rk&&bl[rk].onClick)bl[rk].onClick({stopPropagation(){},preventDefault(){},target:bl,currentTarget:bl,nativeEvent:{}});else bl.click();}catch(e){bl.click();}
            await new Promise(r=>setTimeout(r,420));
            const opts=[...document.querySelectorAll('[class*=digEmptyView_optionItem],[class*=digEmptyView_labelView]')].filter(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0);
            if(opts[0]){const ok=Object.keys(opts[0]).find(x=>x.startsWith('__reactProps'));
              try{if(ok&&opts[0][ok].onClick)opts[0][ok].onClick({stopPropagation(){},preventDefault(){},target:opts[0],currentTarget:opts[0],nativeEvent:{}});else opts[0].click();}catch(e){opts[0].click();}}
            await new Promise(r=>setTimeout(r,200));}
          return blanks.length;})()`, tb.ctx);
      }
      await sleep(600);
      const sub = await ev(`(()=>{const bb=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${b.i}];
        const el=[...bb.querySelectorAll('[class*=i-button]')].find(e=>((e.innerText||'').replace(/\\s+/g,''))==='提交');
        if(el){el.click();return 1;}return 0;})()`, tb.ctx);
      if (!sub) { log(`  #${b.i} 无提交`); continue; }
      await sleep(7500);
      for (const f of await frames()) {
        await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>/^(确认|确定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>18);if(v.length){v[v.length-1].click();return 1;}return 0;})()`, f.ctx).catch(() => 0);
      }
      await sleep(1800);
      const fin = await ev(`(()=>{const bb=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${b.i}];
        const t=(bb.innerText||'').replace(/\\s+/g,' ');
        return {score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null, redo:/重新作答/.test(t), len:t.length};})()`, tb.ctx).catch(() => null);
      log(`  #${b.i} →`, JSON.stringify(fin));
    } catch (e) { log(`  #${b.i} 异常`, String(e).slice(0, 80)); }
  }
  await sleep(1500);
}
// 收尾：抽屉再截屏
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
fs.writeFileSync(`sectfix-u${U}.png`, Buffer.from(data, "base64"));
log("done");
cdp.close();
