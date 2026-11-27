import { connect, sleep } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const t = tabs.find(x => /resource-detail/.test(x.url));
const L = await connect(t.id);
const { ev, cdp } = L;
const txt = await ev(`(()=>{const t=document.body.innerText.replace(/\s+/g,' ');const i=t.indexOf('当前成绩');return i>=0?t.slice(i,i+700):t.slice(0,700);})()`).catch(e=>"ERR");
console.log(txt);
cdp.close();
