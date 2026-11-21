import { CDP, sleep } from "./cdp.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const page = tabs.find(t=>t.type==="page");
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
const ev = async (expr) => (await cdp.send("Runtime.evaluate",{expression:expr,awaitPromise:true,returnByValue:true})).result.value;
// replay the exact XHR the page uses (same origin, cookies)
const res = await ev(`(async()=>{
  const tries=[];
  // attempt POST (antd pages usually POST json)
  for(const opt of [
    {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pageNum:1,pageSize:10})},
    {method:'GET'},
  ]){
    try{
      const r=await fetch('/api/cmgt/course/getCourseListByStudent',{credentials:'include',...opt});
      const t=await r.text();
      tries.push({status:r.status,body:t.slice(0,2500)});
      if(r.status===200&&t.trim().startsWith('{')) break;
    }catch(e){tries.push({err:String(e)});}
  }
  return tries;
})()`);
console.log(JSON.stringify(res,null,1));
cdp.close();
