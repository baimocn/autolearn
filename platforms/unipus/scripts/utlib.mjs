// utlib.mjs — Unit test 全流程公共库
import { CDP, sleep } from "./cdp.mjs";
export { sleep };
import { trackContexts, frameList } from "./ctx.mjs";

export async function connect(targetId) {
  const ver = await (await fetch("http://127.0.0.1:9222/json/version")).json();
  const cdp = await CDP.connect(ver.webSocketDebuggerUrl);
  let tid = targetId;
  if (!tid) {
    const r = await cdp.send("Target.createTarget", { url: "https://uai.unipus.cn/app/cmgt/resource-detail/20001221469" });
    tid = r.targetId;
  }
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId: tid, flatten: true });
  await cdp.send("Page.enable", {}, sessionId);
  const ctxMap = trackContexts(cdp, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send("Runtime.disable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await new Promise((r) => setTimeout(r, 800));
  const ev = async (expr, ctx) => {
    const r = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true, ...(ctx ? { contextId: ctx } : {}) }, sessionId);
    return r.exceptionDetails ? null : r.result?.value;
  };
  const frames = () => frameList(cdp, sessionId, ctxMap);
  const mouse = async (x, y) => {
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y }, sessionId);
    await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
  };
  return { cdp, sessionId, ev, frames, mouse, targetId: tid };
}

/** 计算 exam 帧 => 页面绝对坐标的偏移 */
export async function examOffset(L) {
  const a = await L.ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/ipub/.test(e.src||''));if(!f)return{ox:0,oy:0};const r=f.getBoundingClientRect();return{ox:Math.round(r.left),oy:Math.round(r.top)};})()`);
  const fl = await L.frames();
  const tb = fl.find((f) => /textbook/.test(f.url));
  let b = { ox: 0, oy: 0 };
  if (tb?.ctx) {
    const r = await L.ev(`(()=>{const f=[...document.querySelectorAll('iframe')].find(e=>/testing|exam/.test(e.src||''));if(!f)return null;const b=f.getBoundingClientRect();return{ox:Math.round(b.left),oy:Math.round(b.top)};})()`, tb.ctx).catch(() => null);
    if (r) b = r;
  }
  return { ox: (a?.ox || 0) + b.ox, oy: (a?.oy || 0) + b.oy };
}

export const norm = (s) => String(s || "").replace(/\s+/g, "");
