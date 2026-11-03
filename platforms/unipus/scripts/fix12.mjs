import { connect, sleep } from "./utlib.mjs";
const L=await connect("D6816472D8507E6DCD80805A5A543A96");
const {ev,frames}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes("1ed78c87"));
const NID="ccscy2bVn62r6M1M";
const FIX={
 "ccscy2bVn62r6M1M":"Lfp43rKeQR2MwAll",
 "RffFIH8JWiEcQ4g8":"eG12OFkBAPh6KxBp",
 "aBGoS880lk0hBc6L":"Vk62IRPJWOJpihMd",
 "EBh4L7I08hMKkOZG":"HwP7xMd4FZpUF2uK",
 "vv8f7kdYIUjkieA8":"og6tIdwMQXjSsLOl",
 "wFhzWv9lESsk7jil":"LLG3ZFhzfoEr5uzD",
};
const inst=await ev(`(()=>{
  if(window.__xpatch) return 'already';
  window.__xpatch=true; window.__sent=[];
  const XS=XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send=function(b){
    try{
      if(/submitScore/.test(String(this.__u||'')) && typeof b==='string'){
        const fix=${JSON.stringify(FIX)};
        const j=JSON.parse(b);
        j.userAnswers=(j.userAnswers||[]).map(a=>{
          if(a && fix[a.childId]) return Object.assign({},a,{userAnswerValue:JSON.stringify([fix[a.childId]])});
          return a;
        });
        b=JSON.stringify(j);
        window.__sent.push(j);
      }
    }catch(e){ window.__err=String(e).slice(0,120); }
    return XS.apply(this,arguments);
  };
  return 'patched';
})()`,tb.ctx);
console.log("patch:",inst);
for(let k=0;k<8;k++){
  const st=await ev(`(()=>{const n=document.querySelector('.react-flow__node[data-id="${NID}"]');if(!n)return 0;n.scrollIntoView({block:'center'});return 1;})()`,tb.ctx);
  if(st) break; await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq');if(sc)sc.scrollTop+=700;return 1;})()`,tb.ctx); await sleep(1200);
}
const re=await ev(`(()=>{const n=document.querySelector('.react-flow__node[data-id="${NID}"]');const b=n?n.closest('div.editor-question-block.questionBlockNode'):null;
  const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&(e.innerText||'').replace(/\\s+/g,'')==='重新作答');
  if(!el)return 'no redo'; el.click(); return 'redo';})()`,tb.ctx);
console.log("redo:",re);
await sleep(4500);
const sub=await ev(`(()=>{const n=document.querySelector('.react-flow__node[data-id="${NID}"]');const b=n?n.closest('div.editor-question-block.questionBlockNode'):null;
  const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&(e.innerText||'').replace(/\\s+/g,'')==='提交');
  if(!el)return 'no submit'; el.click(); return 'submitted';})()`,tb.ctx);
console.log("submit:",sub);
await sleep(8000);
console.log("sent:",JSON.stringify(await ev(`window.__sent||[]`,tb.ctx)).slice(0,600));
console.log("err:",await ev(`window.__err||''`,tb.ctx));
const st=await ev(`(()=>{const n=document.querySelector('.react-flow__node[data-id="${NID}"]');const b=n?n.closest('div.editor-question-block.questionBlockNode'):null;
  const t=b?(b.innerText||'').replace(/\\s+/g,' '):''; return {score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null, t:t.slice(0,80)};})()`,tb.ctx);
console.log("state:",JSON.stringify(st));
L.cdp.close();
