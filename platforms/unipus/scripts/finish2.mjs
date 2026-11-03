// finishvid.mjs <unit> — 视频跳到最后 40 秒，16 倍速播完
import { connect, sleep } from "./utlib.mjs";
const U=Number(process.argv[2]);
const CH={1:"7840f299-1cce-403e-9320-d6ddf613cebf",2:"2c3ad11f-a37e-4a64-ba6a-6cfa256cc6be",3:"5f975081-b8b7-4799-9d9c-b83a53423e4f",4:"6c59c2ec-f8bd-46f8-8506-6a8b25ff9e7b",5:"bfb4fa0c-fbd4-436f-8b37-3b307810cf63",6:"1ed78c87-3e9c-4426-a2fb-4a155955a7bb",7:"bc8967a2-13b9-4a3f-a127-e368e228e9e5",8:"f8dc1090-7968-4eb7-b231-63da59732244"}[U];
const BOOK="0iws4u_bQkCFpqmfcTvdAg",BV="VTqvEEI";
const TID=process.env.TID||"F4B9468011D36E37580EBF14214CD6ED";
const L=await connect(TID);
const {ev,frames,cdp,sessionId}=L;
await cdp.send("Page.bringToFront",{},sessionId).catch(()=>{});
await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return 0;f.src='about:blank';return 1;})()`).catch(()=>{});
await sleep(600);
await ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub|about/.test(e.src||''));if(!f)return 0;f.src=${JSON.stringify(`https://ipub.unipus.cn/learner/textbook/book/${BOOK}/chapter/${CH}?bookVersionNumber=${BV}`)};return 1;})()`);
let tb=null;
for(let i=0;i<40;i++){ await sleep(900); tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx&&f.url.includes(CH.slice(0,12))); if(tb) break; }
if(!tb){ console.log("!! 无教材帧"); process.exit(1); }
await sleep(8000);
for(const f of await frames()){ await ev(`(()=>{const n=s=>(s||'').replace(/\\s+/g,'');const v=[...document.querySelectorAll('button,div,span')].filter(e=>n(e.innerText)==='我知道了'&&e.getBoundingClientRect().width>20);if(v.length)v[v.length-1].click();return 1;})()`,f.ctx).catch(()=>{}); }
await sleep(800);
const sh=await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;return Math.round(sc.scrollHeight);})()`,tb.ctx);
console.log(`U${U} sh=${sh}`);
let done=0;
for(let y=0;y<sh+400;y+=700){
  await ev(`(()=>{const sc=document.querySelector('.pc_center-left__MPwlq')||document.scrollingElement;sc.scrollTop=${y};return 1;})()`,tb.ctx).catch(()=>{});
  await sleep(420);
  const cnt=await ev(`(()=>{const vs=[...document.querySelectorAll('video')];
    let n=0;
    vs.forEach(v=>{
      const rc=v.getBoundingClientRect();
      if(rc.bottom<0||rc.top>window.innerHeight) return;
      if(v.__fin) return;
      v.muted=true; v.playbackRate=16;
      if(isFinite(v.duration)&&v.duration>0){ v.currentTime=Math.max(0,v.duration-2.2); }
      try{ v.play().catch(()=>{}) }catch(e){}
      v.__fin=1; n++;
    });
    return n;})()`,tb.ctx).catch(()=>0);
  if(cnt){
    done+=cnt; console.log(`  y=${y} 开始播 ${cnt} 个`);
    await sleep(3200);
    const st=await ev(`(()=>{const vs=[...document.querySelectorAll('video')];
      return vs.filter(v=>v.__fin).map(v=>({d:Math.round(v.duration||0), t:Math.round(v.currentTime||0), ended:!!v.ended}));})()`,tb.ctx).catch(()=>[]);
    if(st&&st.length) console.log("   状态:", JSON.stringify(st));
  }
}
console.log(`U${U} 播放 ${done} 个`);
L.cdp.close();
