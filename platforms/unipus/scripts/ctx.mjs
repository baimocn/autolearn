// ctx.mjs — 持续跟踪每个 frame 的 main executionContext，不反复 disable/enable
export function trackContexts(cdp, sessionId) {
  const map = new Map(); // frameId -> contextId
  cdp.on("Runtime.executionContextCreated", (p, sid) => {
    if (sid !== sessionId) return;
    const a = p.context.auxData || {};
    if (a.frameId && a.isDefault) map.set(a.frameId, p.context.id);
  });
  cdp.on("Runtime.executionContextDestroyed", (p, sid) => {
    if (sid !== sessionId) return;
    for (const [k, v] of map) if (v === p.executionContextId) map.delete(k);
  });
  cdp.on("Runtime.executionContextsCleared", (_p, sid) => { if (sid === sessionId) map.clear(); });
  return map;
}

export async function frameList(cdp, sessionId, ctxMap) {
  const tree = await cdp.send("Page.getFrameTree", {}, sessionId);
  const list = [];
  (function w(n) { list.push(n.frame); (n.childFrames || []).forEach(w); })(tree.frameTree);
  return list.map((f) => ({ url: f.url || "", id: f.id, ctx: ctxMap.get(f.id) }));
}
