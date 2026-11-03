import { connect, sleep } from "./utlib.mjs";
const CH={1:"7840f299-1cce-403e-9320-d6ddf613cebf",2:"2c3ad11f-a37e-4a64-ba6a-6cfa256cc6be",3:"5f975081-b8b7-4799-9d9c-b83a53423e4f",4:"6c59c2ec-f8bd-46f8-8506-6a8b25ff9e7b",5:"bfb4fa0c-fbd4-436f-8b37-3b307810cf63",6:"1ed78c87-3e9c-4426-a2fb-4a155955a7bb",7:"bc8967a2-13b9-4a3f-a127-e368e228e9e5",8:"f8dc1090-7968-4eb7-b231-63da59732244"};
const units=(process.argv[2]||"1,2,3,4,5,6,7,8").split(",").map(Number);
const L=await connect("D6816472D8507E6DCD80805A5A543A96");
const {ev,frames}=L;
for(const u of units){
  const url=`https://ipub.unipus.cn/learner/textbook/book/0iws4u_bQkCFpqmfcTvdAg/chapter/${CH[u]}?bookVersionNumber=VTqvEEI`;
  await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));f.src='about:blank';return 1;})()`);
  await sleep(600);
  await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub|about/.test(e.src||''));f.src=${JSON.stringify(url)};return 1;})()`);
  let tb=null;
  for(let k=0;k<40;k++){await sleep(1000);tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH[u].slice(0,12)));if(tb)break;}
  await sleep(7000);
  const n=await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`,tb.ctx);
  const bad=[];
  for(let i=0;i<n;i++){
    await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return 0;
      const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;
      const r=b.getBoundingClientRect(),box=sc.getBoundingClientRect(); sc.scrollTop += (r.top-box.top)-25; return 1;})()`,tb.ctx);
    await sleep(1400);
    const d=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];if(!b)return null;
      const t=(b.innerText||'').replace(/\\s+/g,' ');
      const speak=/准备时长|作答时长|点击开始/.test(t);
      const redo=/重新作答/.test(t), sub=/提交/.test(t);
      const sc=(t.match(/得分[:：]?\\s*(\\d+(\\.\\d+)?)/)||[])[1]??null;
      const blank=(b.innerText||'').length<10;
      const file=b.querySelectorAll('input[type=file]').length>0;
      return {speak,redo,sub,sc,blank,file,len:(b.innerText||'').length,t:t.slice(0,50)};})()`,tb.ctx);
    if(!d) continue;
    if(d.speak||d.blank) continue;         // 录音 / 空块
    if(d.sc!==null && Number(d.sc)===0) bad.push(`#${i} 得分0 | ${d.t}`);
    else if(!d.redo && d.sub) bad.push(`#${i} 未提交 | ${d.t}`);
  }
  console.log(`U${u} blocks=${n} 异常=${bad.length}${bad.length?" -> "+bad.join(" ;; "):""}`);
}
L.cdp.close();
