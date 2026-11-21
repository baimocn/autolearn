import { connect, sleep } from "./utlib.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp,sessionId}=L;
const tb=(await frames()).find(f=>/textbook\/book/.test(f.url)&&f.ctx);
const probe=async(l)=>{const st=await ev(`(()=>{const bs=[...document.querySelectorAll('div.editor-question-block.questionBlockNode')];return {ne:bs.filter(b=>(b.innerText||'').replace(/\s+/g,'').length>5).length,total:bs.length,spin:document.querySelectorAll('.ant-spin-nested-loading').length,txt:document.body.innerText.length};})()`,tb.ctx).catch(e=>String(e));console.log(l,JSON.stringify(st));};
await cdp.send("Page.bringToFront",{},sessionId).catch(()=>{});
await probe('before');
for (const [type] of [["keyDown"],["keyUp"]]) {
  await cdp.send("Input.dispatchKeyEvent",{type,key:"F12",code:"F12",windowsVirtualKeyCode:123,nativeVirtualKeyCode:123},sessionId).catch(e=>console.log('key err',String(e).slice(0,80)));
}
console.log('F12 sent');
await sleep(4000);
await probe('after F12');
cdp.close();
