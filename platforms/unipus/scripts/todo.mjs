import fs from "node:fs";
const raw=JSON.parse(fs.readFileSync("course-raw.json","utf8"));
let c=raw.course; if(typeof c==="string") c=JSON.parse(c);
const meta={};
const walk=(ns,unit)=>(ns||[]).forEach(x=>{
  meta[x.id]={name:x.name||"",base:x.base||"",tab:x.tab_type||"",num:Number(x.question_num||0),ext:x.externalNodeId||"",unit};
  if(x.children) walk(x.children,unit);
});
c.units.forEach(u=>walk(u.children,u.id));
const all=[];
for(const u of ["u1","u2","u3","u4","u5","u6","u7","u8"]){
  const f=`prog-${u}.json`;
  if(!fs.existsSync(f)) continue;
  const j=JSON.parse(fs.readFileSync(f,"utf8"));
  const L=j.rt?.leafs||{};
  for(const [id,v] of Object.entries(L)){
    if(v.tab_type==="text") continue;
    if(v.state?.pass) continue;
    const m=meta[id]||{};
    all.push({unit:u,id,name:m.name,base:m.base,num:m.num,ext:m.ext,tab:v.tab_type,dur:v.duration});
  }
}
const byBase={};
all.forEach(a=>{byBase[a.base]=(byBase[a.base]||0)+1;});
console.log("未完成 task/ut 节点:",all.length);
console.log("\n按类型:");
Object.entries(byBase).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log("  ",String(k||"(未知)").padEnd(40),v));
const wp=all.filter(a=>a.base==="vocabulary-learn-practice");
console.log("\n词汇学练未完成:",wp.length,"套，共",wp.reduce((a,b)=>a+b.num,0),"题");
fs.writeFileSync("todo.json",JSON.stringify(all,null,1));
const other=all.filter(a=>a.base!=="vocabulary-learn-practice");
console.log("\n非词汇学练的未完成节点:");
other.forEach(a=>console.log(`  ${a.unit} ${a.id} ${(a.name||"").slice(0,24)} | ${a.base} | num=${a.num}`));
