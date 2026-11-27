import { connect } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const t = tabs.find(x => /resource-detail/.test(x.url));
const L = await connect(t.id);
const { ev, cdp } = L;
const rows = await ev(`(()=>{const trs=[...document.querySelectorAll('tr')].map(tr=>(tr.innerText||'').replace(/\s+/g,' ').trim());return trs.filter(x=>x).slice(0,20);})()`).catch(e=>"ERR");
console.log(JSON.stringify(rows,null,1));
cdp.close();
