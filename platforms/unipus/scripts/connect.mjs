import { connect, sleep } from "./utlib.mjs";
const CH={6:"1ed78c87-3e9c-4426-a2fb-4a155955a7bb",7:"bc8967a2-13b9-4a3f-a127-e368e228e9e5",2:"2c3ad11f-a37e-4a64-ba6a-6cfa256cc6be",3:"5f975081-b8b7-4799-9d9c-b83a53423e4f",5:"bfb4fa0c-fbd4-436f-8b37-3b307810cf63",8:"f8dc1090-7968-4eb7-b231-63da59732244",1:"7840f299-1cce-403e-9320-d6ddf613cebf",4:"6c59c2ec-f8bd-46f8-8506-6a8b25ff9e7b"};
const BOOK=(await import("./config.mjs")).BOOK,BV="VTqvEEI";
const u=Number(process.argv[2]), i=Number(process.argv[3]);
const pairs=JSON.parse(process.argv[4]);  // [["srcId","tgtId"],...]
const redo=process.argv[5]!=="noredo";
const L=await connect("D6816472D8507E6DCD80805A5A543A96");
const {ev,frames}=L;
const url=`https://ipub.unipus.cn/learner/textbook/book/${BOOK}/chapter/${CH[u]}?bookVersionNumber=${BV}`;
let tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH[u].slice(0,12)));
if(!tb){
  await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return 0;f.src=${JSON.stringify(url)};return 1;})()`);
  for(let k=0;k<40;k++){await sleep(1000);tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH[u].slice(0,12)));if(tb)break;}
  await sleep(4000);
}
const B=(body)=>`(() => { const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}]; if(!b) return {err:'no block'}; const norm=s=>(s||'').replace(/\\s+/g,' ').trim(); ${body} })()`;
await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;const r=b.getBoundingClientRect(),bx=sc.getBoundingClientRect();sc.scrollTop+=(r.top-bx.top)-20;return 1;})()`,tb.ctx);
await sleep(1200);

if(redo){
  await ev(B(`const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&norm(e.innerText)==='重新作答'); if(el) el.click(); return {ok:1};`),tb.ctx);
  await sleep(3000);
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;const r=b.getBoundingClientRect(),bx=sc.getBoundingClientRect();sc.scrollTop+=(r.top-bx.top)-20;return 1;})()`,tb.ctx);
  await sleep(1500);
}
const before=await ev(B(`return { edges: b.querySelectorAll('.react-flow__edge').length, nodes: b.querySelectorAll('.react-flow__node').length };`),tb.ctx);
console.log("before:",JSON.stringify(before));

const r=await ev(`(() => {
  const pairs=${JSON.stringify(pairs)};
  const firstId=pairs[0][0];
  // 以节点 id 定位题块，避免索引漂移
  const nodeEl=document.querySelector('.react-flow__node[data-id="'+firstId+'"]');
  if(!nodeEl) return {err:'no node'};
  const b=nodeEl.closest('div.editor-question-block.questionBlockNode') || nodeEl.closest('[class*=questionBlockNode]') || document;
  let onConn=null;
  const all=[...b.querySelectorAll('*')];
  for(const el of all){
    const key=Object.keys(el).find(k=>k.startsWith('__reactProps$'));
    if(!key) continue;
    const p=el[key];
    if(p && typeof p.onConnect==='function'){ onConn=p.onConnect; break; }
  }
  if(!onConn){
    for(const el of all){
      const fk=Object.keys(el).find(k=>k.startsWith('__reactFiber$'));
      if(!fk) continue;
      let f=el[fk], depth=0;
      while(f && depth<40){
        const mp=f.memoizedProps;
        if(mp && typeof mp.onConnect==='function'){ onConn=mp.onConnect; break; }
        f=f.return; depth++;
      }
      if(onConn) break;
    }
  }
  if(!onConn) return {err:'no onConnect'};
  const done=[];
  for(const [s,t] of pairs){
    try{ onConn({source:s,target:t,sourceHandle:null,targetHandle:null}); done.push(s.slice(0,4)+'>'+t.slice(0,4)); }
    catch(e){ done.push('ERR '+e.message.slice(0,40)); }
  }
  return {ok:1, done};
})()`,tb.ctx);
console.log("connect:",JSON.stringify(r));
await sleep(1500);
const after=await ev(`(()=>{const n=document.querySelector('.react-flow__node[data-id="${pairs[0][0]}"]');const b=n?n.closest('div.editor-question-block.questionBlockNode'):null;return { edges: b?b.querySelectorAll('.react-flow__edge').length:-1 };})()`,tb.ctx);
console.log("after:",JSON.stringify(after));
if(process.argv[6]==="submit"){
  await ev(`(()=>{const n=document.querySelector('.react-flow__node[data-id="${pairs[0][0]}"]');const b=n?n.closest('div.editor-question-block.questionBlockNode'):null;if(!b)return {err:'no block'};
    const el=[...b.querySelectorAll('div,button')].find(e=>/i-button_default-container/.test(String(e.className))&&(e.innerText||'').replace(/\\s+/g,'')==='提交');
    if(!el)return {err:'no submit'}; el.click(); return {ok:1};})()`,tb.ctx);
  await sleep(5000);
  const st=await ev(`(()=>{const n=document.querySelector('.react-flow__node[data-id="${pairs[0][0]}"]');const b=n?n.closest('div.editor-question-block.questionBlockNode'):null;const t=b?(b.innerText||'').replace(/\\s+/g,' '):'';return {score:(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null, txt:t.slice(0,60)};})()`,tb.ctx);
  console.log("submit:",JSON.stringify(st));
}
L.cdp.close();
