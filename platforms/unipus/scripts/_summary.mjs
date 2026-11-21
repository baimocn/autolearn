import fs from "node:fs";
let total={}, done={}, types={};
const pending=[];
for(let u=1;u<=8;u++){
  const j=JSON.parse(fs.readFileSync(`prog-u${u}.json`,"utf8"));
  const leafs=j.rt?.leafs||{};
  for(const [id,v] of Object.entries(leafs)){
    const tab=v.tab_type||"?";
    total[tab]=(total[tab]||0)+1;
    if(v.state?.pass===1) done[tab]=(done[tab]||0)+1;
    else pending.push({u,id,tab,dur:v.duration});
  }
}
console.log("=== 节点总量/已完成 (按 tab_type) ===");
for(const t of Object.keys(total)) console.log(`  ${t.padEnd(6)} 总 ${total[t]}  已完成 ${done[t]||0}  剩余 ${total[t]-(done[t]||0)}`);
const T=Object.values(total).reduce((a,b)=>a+b,0), D=Object.values(done).reduce((a,b)=>a+b,0);
console.log(`  合计   总 ${T}  已完成 ${D}  剩余 ${T-D}  (进度 ${(D/T*100).toFixed(1)}%)`);
console.log("\n=== 剩余节点按单元 ===");
const byU={}; pending.forEach(p=>byU[p.u]=(byU[p.u]||0)+1);
for(let u=1;u<=8;u++) console.log(`  Unit${u}: ${byU[u]||0}`);
console.log("\n=== 剩余按 tab_type ===");
const byT={}; pending.forEach(p=>byT[p.tab]=(byT[p.tab]||0)+1);
for(const [t,n] of Object.entries(byT)) console.log(`  ${t}: ${n}`);
fs.writeFileSync("_pending.json",JSON.stringify(pending,null,1));
console.log("\n剩余节点明细已存 _pending.json，共",pending.length);
