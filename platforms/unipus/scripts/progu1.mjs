import { connect, sleep } from "./utlib.mjs";
import { CDP } from "./cdp.mjs";
import fs from "node:fs";
const U=process.argv[2]||"u1";
const ver=await (await fetch("http://127.0.0.1:9222/json/version")).json();
const READER="https://ucontent.unipus.cn/_ipublishpc_default/pc.html?cid=1837944375799767040&theme=3264FA&aitutorialId=34657&cloudCurriculaId=356008&strategyId=4793137&schoolId=9341&source=cloud&sourceCallBackUrl=https://uai.unipus.cn/app/cmgt/resource-detail/?backId=1793504265186&courseResourceId=20001221469";
const ROUTE="#/course-v3:819008cfa01e0f2+xnkdxyy+20250801090513/courseware/u1/u1g2";
const boot=await CDP.connect(ver.webSocketDebuggerUrl);
const r=await boot.send("Target.createTarget",{url:READER+ROUTE});
const tid=r.targetId; boot.close();
const L=await connect(tid);
const {cdp,sessionId,ev}=L;
try{ await cdp.send("Network.enable",{},sessionId); }catch(e){}
const reqs={}, ids=[];
cdp.on("Network.requestWillBeSent",(p)=>{ if(p.request?.url) reqs[p.requestId]=p.request.url; });
cdp.on("Network.responseReceived",(p)=>{ if(/course_progress/.test(reqs[p.requestId]||"")) ids.push(p.requestId); });
for(let i=0;i<40;i++){ await sleep(1000); if(ids.length>=8) break; }
let saved=0;
for(const id of ids){
  try{
    const b=await cdp.send("Network.getResponseBody",{requestId:id},sessionId);
    const u=reqs[id]||"";
    const m=u.match(/course_progress\/[^/]+\/([^/]+)\//);
    const name=m?m[1]:("x"+saved);
    if(/^u\d$/.test(name)){ fs.writeFileSync(`prog-${name}.json`, b.body||"{}"); saved++; }
  }catch(e){}
}
console.log("saved",saved,"files, tid",tid);
const j=JSON.parse(fs.readFileSync(`prog-${U}.json`,"utf8"));
const raw=JSON.parse(fs.readFileSync("course-raw.json","utf8"));
let c=raw.course; if(typeof c==="string") c=JSON.parse(c);
const meta={}; const walk=(ns)=>(ns||[]).forEach(x=>{ meta[x.id]={b:x.base||""}; if(x.children) walk(x.children); });
c.units.forEach(u=>walk(u.children));
const oral=Object.keys(j.rt.leafs).filter(k=>meta[k]&&meta[k].b==="oral-personal-state_subjective");
console.log(U,"口语:", oral.map(k=>k+":"+(j.rt.leafs[k].state?.pass?"✓":"✗")).join(" "));
L.cdp.close();
