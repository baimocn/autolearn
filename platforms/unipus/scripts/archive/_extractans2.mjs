import { connect } from "./utlib.mjs";
import fs from "node:fs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const rd=tabs.find(t=>/ucontent\.unipus\.cn/.test(t.url));
const L=await connect(rd.id);const {ev,frames,cdp}=L;
const ex=(await frames()).find(f=>/testing\/diagnosis/.test(f.url)&&f.ctx);
const t=await ev(`document.body.innerText.replace(/[ ]+/g,' ')`,ex.ctx).catch(e=>String(e));
// 按题切分：匹配 你的答案: X 正确答案: Y
const re=/你的答案:\s*([A-D])?\s*正确答案:\s*([A-D])?/g;
let m,out=[],i=0;
while((m=re.exec(t))!==null){out.push({i:i++,yours:m[1]||'',correct:m[2]||''});}
console.log('parsed',out.length);
out.forEach(o=>console.log('Q'+o.i+': yours='+o.yours+' correct='+o.correct+(o.yours&&o.correct&&o.yours!==o.correct?' ❌':'')));
fs.writeFileSync('ut7-answers.json',JSON.stringify(out,null,1));
cdp.close();
