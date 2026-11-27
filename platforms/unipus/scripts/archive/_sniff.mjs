import { CDP, sleep } from "./cdp.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
let page = tabs.find(t=>t.type==="page");
const cdp = await CDP.connect(page.webSocketDebuggerUrl);
await cdp.send("Network.enable");
await cdp.send("Page.enable");
let target=null;
cdp.on("Network.requestWillBeSent",(p)=>{ if(p.request.url.includes("getCourseListByStudent")) target=p; });
await cdp.send("Page.reload",{ignoreCache:true});
for(let i=0;i<12&&!target;i++) await sleep(1000);
if(!target){console.log("no request captured");process.exit(0);}
console.log("METHOD:",target.request.method);
console.log("HEADERS:",JSON.stringify(target.request.headers,null,1));
console.log("POSTDATA:",target.request.postData);
await sleep(1500);
let body="";
try{ body=(await cdp.send("Network.getResponseBody",{requestId:target.requestId})).body; }catch(e){ body="ERR "+e.message; }
console.log("RESPONSE:",body.slice(0,4000));
cdp.close();
