import { CDP, sleep } from "./cdp.mjs";
const tabs=await(await fetch("http://127.0.0.1:9222/json/list")).json();
const pg=tabs.find(t=>/uai\.unipus\.cn/.test(t.url)&&t.type==="page");
if(!pg){console.log("NO UAI TAB");process.exit(0);}
const cdp=await CDP.connect(pg.webSocketDebuggerUrl);
const ev=async(e)=>(await cdp.send("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true})).result?.value;
console.log("url:",(await ev("location.href")).slice(0,70));
// 调课程列表接口
const api=await ev(`(async()=>{
  const r=await fetch('/api/cmgt/course/getCourseListByStudent',{credentials:'include',headers:{'Content-Type':'application/json'}});
  return await r.text();
})()`);
console.log("API:",api.slice(0,1200));
cdp.close();
