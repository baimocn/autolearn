import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const mouse=async(x,y)=>{await cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x,y},sessionId).catch(()=>{});await cdp.send("Input.dispatchMouseEvent",{type:"mousePressed",x,y,button:"left",buttons:1,clickCount:1},sessionId);await cdp.send("Input.dispatchMouseEvent",{type:"mouseReleased",x,y,button:"left",buttons:0,clickCount:1},sessionId);};
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const p=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][18];const e=[...b.querySelectorAll('[class*=i-button_default-container]')].find(x=>(x.innerText||'').replace(/[ ]+/g,'')==='提交');if(!e)return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),w:Math.round(r.width)};})()`,tb.ctx).catch(()=>null);
console.log('submit',JSON.stringify(p));
if(p&&p.y>0&&p.y<2000){await mouse(p.x,p.y);console.log('clicked');await sleep(3000);}
// 确认弹窗
for(let k=0;k<6;k++){let hit=false;for(const f of await frames()){const c=await ev(`(()=>{const n=s=>(s||'').replace(/[ ]+/g,'');const v=[...document.querySelectorAll('.ant-modal-confirm-btns .ant-btn-primary,button,div,span')].filter(e=>e.children.length<=1&&/^(确定|确认|确 定)$/.test(n(e.innerText))&&e.getBoundingClientRect().width>15);if(!v.length)return 0;v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>0);if(c){hit=true;console.log('confirmed');break;}}if(hit)break;await sleep(1500);}
await sleep(5000);
const t=await ev(`(()=>{const b=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')][18];return (b.innerText||'').replace(/[ ]+/g,' ').slice(0,200);})()`,tb.ctx).catch(()=>"");
console.log('after:',t);
const {data}=await cdp.send("Page.captureScreenshot",{format:"png"},sessionId);
const fs=await import("node:fs");fs.writeFileSync("up18-final.png",Buffer.from(data,"base64"));
cdp.close();
