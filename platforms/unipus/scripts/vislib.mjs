import { CDP } from "./cdp.mjs";
export async function pickVisible(){
  const ver=await (await fetch("http://127.0.0.1:9222/json/version")).json();
  const boot=await CDP.connect(ver.webSocketDebuggerUrl);
  const list=await (await fetch("http://127.0.0.1:9222/json/list")).json();
  const tabs=list.filter(t=>t.type==='page'&&/ucontent/.test(t.url));
  for(const t of tabs){
    const {sessionId}=await boot.send("Target.attachToTarget",{targetId:t.id,flatten:true});
    const r=await boot.send("Runtime.evaluate",{expression:"document.visibilityState",returnByValue:true},sessionId);
    if(r.result?.value==='visible'){ boot.close(); return t.id; }
  }
  boot.close(); return tabs[0]?.id||null;
}
