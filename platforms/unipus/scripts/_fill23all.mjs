import { ensureReader, CH } from "./reader.mjs";
import { connect, sleep } from "./utlib.mjs";
const tid = await ensureReader(1);
const L = await connect(tid);
let tb=(await L.frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH[1].slice(0,12)));
const { ev }=L;
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];if(b)b.scrollIntoView({block:'center'});return 1;})()`,tb.ctx);
await sleep(400);
// click each input in order then click each word in bank order
const words=['sericulture','silk reeling','hybrid rice','agrarian','sustenance','drought-resistant crop'];
const res=await ev(`(async()=>{
 const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];
 const inputs=[...b.querySelectorAll('input[type=text]')];
 const getW=txt=>[...b.querySelectorAll('span')].find(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()===txt));
 for(let k=0;k<${words.length};k++){
   inputs[k].focus(); await new Promise(r=>setTimeout(r,80));
   const w=getW(${JSON.stringify(words)}[k]); const rk=Object.keys(w).find(x=>x.startsWith('__reactProps'));
   w[rk].onClick({stopPropagation(){},preventDefault(){},target:w,currentTarget:w,nativeEvent:{}});
   await new Promise(r=>setTimeout(r,120));
 }
 return inputs.map(e=>e.value);
})()`,tb.ctx);
console.log("filled:",JSON.stringify(res));
// submit
const sb=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];
 const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&e.innerText.replace(/\s+/g,'')==='提交');
 if(!el)return 'no-btn'; el.click(); return 'clicked';})()`,tb.ctx);
console.log("submit:",sb);
await sleep(5000);
// check for confirm modal inside frame / top
const txt=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][23];return b.innerText;})()`,tb.ctx);
console.log("=== AFTER SUBMIT (len "+txt.length+") ===");
console.log(txt.slice(0,2500));
L.cdp.close();
