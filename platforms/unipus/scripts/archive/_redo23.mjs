import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb=(await L.frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH[1].slice(0,12)));
const { ev }=L;
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];if(b)b.scrollIntoView({block:'center'});return 1;})()`,tb.ctx);
await sleep(400);
// click 重新作答
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];
 const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&e.innerText.replace(/\s+/g,'')==='重新作答');
 if(!el)return 'no'; el.click();return 'ok';})()`,tb.ctx);
await sleep(2500);
// bank words as labeled on buttons; correct blank order maps to these items
const order=['sericulture','sustenance','agrarian','hybrid rice','drought-resistant crop','silk reeling'];
const filled=await ev(`(async()=>{
 const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];
 const inputs=[...b.querySelectorAll('input[type=text]')];
 const norm=s=>s.trim().toLowerCase().replace(/s$/,'');
 const getW=txt=>[...b.querySelectorAll('span')].find(e=>{const t=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();return norm(t)===norm(txt);});
 for(let k=0;k<${order.length};k++){
   inputs[k].focus(); await new Promise(r=>setTimeout(r,80));
   const w=getW(${JSON.stringify(order)}[k]); const rk=Object.keys(w).find(x=>x.startsWith('__reactProps'));
   w[rk].onClick({stopPropagation(){},preventDefault(){},target:w,currentTarget:w,nativeEvent:{}});
   await new Promise(r=>setTimeout(r,120));
 }
 return inputs.map(e=>e.value);
})()`,tb.ctx);
console.log("refilled:",JSON.stringify(filled));
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];
 const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&e.innerText.replace(/\s+/g,'')==='提交');
 el.click();return 1;})()`,tb.ctx);
await sleep(5000);
const score=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];const t=b.innerText;return (t.match(/得分[:：]?\s*(\d+(?:\.\d+)?)/)||[])[1];})()`,tb.ctx);
console.log("SCORE:",score);
L.cdp.close();
