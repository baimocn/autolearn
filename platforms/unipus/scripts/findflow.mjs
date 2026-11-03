import { connect, sleep } from "./utlib.mjs";
const CH={1:"7840f299-1cce-403e-9320-d6ddf613cebf",2:"2c3ad11f-a37e-4a64-ba6a-6cfa256cc6be",3:"5f975081-b8b7-4799-9d9c-b83a53423e4f",4:"6c59c2ec-f8bd-46f8-8506-6a8b25ff9e7b",5:"bfb4fa0c-fbd4-436f-8b37-3b307810cf63",6:"1ed78c87-3e9c-4426-a2fb-4a155955a7bb",7:"bc8967a2-13b9-4a3f-a127-e368e228e9e5",8:"f8dc1090-7968-4eb7-b231-63da59732244"};
const BOOK=(await import("./config.mjs")).BOOK,BV="VTqvEEI";
const u=Number(process.argv[2]);
const L=await connect("D6816472D8507E6DCD80805A5A543A96");
const {ev,frames}=L;
const url=`https://ipub.unipus.cn/learner/textbook/book/${BOOK}/chapter/${CH[u]}?bookVersionNumber=${BV}`;
let tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH[u].slice(0,12)));
if(!tb){ await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return 0;f.src=${JSON.stringify(url)};return 1;})()`);
  for(let k=0;k<40;k++){await sleep(1000);tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH[u].slice(0,12)));if(tb)break;} await sleep(4000);}
// 扫一遍找出所有含 react-flow 的题块
const n=await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`,tb.ctx);
for(let i=0;i<n;i++){
  await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;const r=b.getBoundingClientRect(),bx=sc.getBoundingClientRect();sc.scrollTop+=(r.top-bx.top)-20;return 1;})()`,tb.ctx);
  await sleep(1200);
  const cnt=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];return b?b.querySelectorAll('.react-flow__node').length:0;})()`,tb.ctx);
  if(cnt>0){
    const t=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][${i}];return (b.innerText||'').replace(/\\s+/g,' ').slice(0,70);})()`,tb.ctx);
    console.log("block",i,"nodes",cnt,"|",t);
  }
}
L.cdp.close();
