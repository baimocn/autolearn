// hepapi.mjs — ICC 平台 API 客户端（复用浏览器会话的 X-Access-Token）
import fs from "node:fs";

const PORT = 9222;

export async function listPages() {
  const r = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  return (await r.json()).filter((t) => t.type === "page");
}

export async function attach(urlPart = "iccweb/v1/student") {
  const pages = await listPages();
  const t = pages.find((p) => (p.url || "").includes(urlPart)) || pages.find((p) => (p.url || "").includes("icc.hep.com.cn"));
  if (!t) throw new Error("未找到 ICC 页面标签");
  const ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
  const { CDP } = await import("./cdp.mjs");
  const cdp = await CDP.connect(ver.webSocketDebuggerUrl);
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId: t.id, flatten: true });
  const ev = async (expr) => {
    const x = await cdp.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }, sessionId);
    if (x.exceptionDetails) throw new Error(x.exceptionDetails.text || "eval error");
    return x.result?.value;
  };
  return { cdp, sessionId, ev, page: t };
}

/** 从浏览器里抓一次真实请求的 token（最稳，不依赖 localStorage 结构） */
export async function grabToken(ctx) {
  const { cdp, sessionId } = ctx;
  await cdp.send("Network.enable", {}, sessionId);
  let tok = null;
  cdp.on("Network.requestWillBeSent", (p) => {
    if (!tok && p.request.headers && p.request.headers["X-Access-Token"]) tok = p.request.headers["X-Access-Token"];
  });
  await cdp.send("Page.reload", {}, sessionId).catch(() => {});
  for (let i = 0; i < 15 && !tok; i++) await new Promise((r) => setTimeout(r, 1000));
  if (tok) fs.writeFileSync("hep-token.txt", tok);
  return tok;
}

export function cachedToken() {
  try { return fs.readFileSync("hep-token.txt", "utf8").trim(); } catch { return null; }
}

/** POST form-encoded，返回 JSON */
export async function post(ctx, path, params, token) {
  const { ev } = ctx;
  const body = new URLSearchParams(params).toString();
  const txt = await ev(`(async()=>{const r=await fetch(${JSON.stringify(path)},{method:'POST',credentials:'include',
    headers:{'X-Access-Token':${JSON.stringify(token)},'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
    body:${JSON.stringify(body)}});
    return r.status+'|'+await r.text();})()`);
  const i = txt.indexOf("|");
  const status = Number(txt.slice(0, i));
  const raw = txt.slice(i + 1);
  let json = null;
  try { json = JSON.parse(raw); } catch {}
  return { status, json, raw };
}
