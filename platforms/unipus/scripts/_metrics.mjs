import { connect } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const t = tabs.find(x => /uai\.unipus\.cn/.test(x.url));
const L = await connect(t.id);
const { ev, cdp, sessionId } = L;
const m = await ev(`(()=>({w:innerWidth,h:innerHeight,dpr:devicePixelRatio,scrollY}))()`);
console.log(JSON.stringify(m));
// 找 Unit 5 元素真实坐标
const pos = await ev(`(()=>{const els=[...document.querySelectorAll('div,span,a,li')].filter(e=>(e.innerText||'').trim()==='Unit 5');return els.map(e=>{const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width)};});})()`);
console.log("Unit5 pos:", JSON.stringify(pos));
const pos4 = await ev(`(()=>{const els=[...document.querySelectorAll('div,span,a,li')].filter(e=>(e.innerText||'').trim()==='Unit 4');return els.map(e=>{const b=e.getBoundingClientRect();return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2),w:Math.round(b.width)};});})()`);
console.log("Unit4 pos:", JSON.stringify(pos4));
cdp.close();
