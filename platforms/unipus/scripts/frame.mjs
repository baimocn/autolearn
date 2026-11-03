// frame.mjs — 跨域 iframe 内的取值与操作（用 CDP executionContext 绕过同源限制）
import { sleep } from "./cdp.mjs";

/** 收集所有执行上下文：frameId -> {mainContextId, isolatedContextId} */
export async function collectContexts(cdp, sessionId) {
  const map = new Map();
  const handler = (params, sid) => {
    if (sid && sid !== sessionId) return;
    const aux = params.context.auxData || {};
    if (!aux.frameId) return;
    const cur = map.get(aux.frameId) || {};
    if (aux.isDefault) cur.main = params.context.id;
    else cur.isolated = params.context.id;
    cur.frameId = aux.frameId;
    map.set(aux.frameId, cur);
  };
  cdp.on("Runtime.executionContextCreated", handler);
  await cdp.send("Runtime.disable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);
  await sleep(400);
  const hs = cdp.handlers.get("Runtime.executionContextCreated") || [];
  const i = hs.indexOf(handler);
  if (i >= 0) hs.splice(i, 1);
  return map;
}

/** 在所有 frame 里找 body 文本最长的那个（即教材阅读器） */
export async function findContentFrame(cdp, page) {
  const tree = await page.send("Page.getFrameTree");
  const frames = [];
  (function walk(n) { frames.push(n.frame); (n.childFrames || []).forEach(walk); })(tree.frameTree);
  const ctxMap = await collectContexts(cdp, page.sessionId);
  const out = [];
  for (const f of frames) {
    const c = ctxMap.get(f.id);
    if (!c || !c.main) continue;
    let len = -1, title = "";
    try {
      const r = await cdp.send("Runtime.evaluate", {
        expression: "document.body ? document.body.innerText.length : -1",
        contextId: c.main, returnByValue: true,
      }, page.sessionId);
      len = r.result?.value ?? -1;
      const t = await cdp.send("Runtime.evaluate", {
        expression: "document.title", contextId: c.main, returnByValue: true,
      }, page.sessionId);
      title = t.result?.value ?? "";
    } catch { }
    out.push({ frameId: f.id, url: f.url, ctx: c.main, len, title });
  }
  out.sort((a, b) => b.len - a.len);
  return out;
}

/** 在指定 frame 的主世界执行 JS */
export async function evalInFrame(cdp, page, ctxId, expression) {
  const r = await cdp.send("Runtime.evaluate", {
    expression, contextId: ctxId, returnByValue: true, awaitPromise: true, userGesture: true,
  }, page.sessionId);
  if (r.exceptionDetails) {
    throw new Error("frame eval error: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  }
  return r.result?.value;
}
