// cdp.mjs — 零依赖 CDP 客户端（Node 22 内置 WebSocket）
// 职责：连接 Chrome 调试端口，提供 evaluate / 真实鼠标键盘 / 目标(含 OOPIF)会话管理
import http from "node:http";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function httpGetJson(path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: "127.0.0.1", port: 9222, path }, (res) => {
      let b = "";
      res.on("data", (c) => (b += c));
      res.on("end", () => {
        try { resolve(JSON.parse(b)); } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.setTimeout(5000, () => req.destroy(new Error("http timeout")));
  });
}

export async function listTargets() {
  return httpGetJson("/json/list");
}

export class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.code} ${msg.error.message}`));
        else resolve(msg.result);
      } else if (msg.method) {
        const hs = this.handlers.get(msg.method);
        if (hs) for (const h of hs) h(msg.params, msg.sessionId);
      }
    });
  }

  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => {
      ws.addEventListener("open", res, { once: true });
      ws.addEventListener("error", () => rej(new Error("ws error " + wsUrl)), { once: true });
    });
    return new CDP(ws);
  }

  on(method, fn) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(fn);
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`timeout ${method}`));
        }
      }, 30000);
    });
  }

  close() { try { this.ws.close(); } catch {} }
}

export const DEFAULT_ALLOW = [
  "Input.dispatchKeyEvent", "Input.dispatchMouseEvent", "Input.insertText",
  "Runtime.evaluate", "Runtime.callFunctionOn", "Runtime.getProperties", "Runtime.releaseObject",
  "DOM.getDocument", "DOM.querySelector", "DOM.getBoxModel", "DOM.describeNode", "DOM.requestChildNodes",
  "Page.enable", "Page.navigate", "Page.getFrameTree", "Page.captureScreenshot", "Page.addScriptToEvaluateOnNewDocument",
  "Target.attachToTarget", "Target.getTargets", "Target.setAutoAttach",
  "Network.enable", "Network.getResponseBody", "Network.getRequestPostData",
  "Emulation.setDeviceMetricsOverride", "Log.enable", "Console.enable",
];

/** 主页面会话封装 */
export class PageSession {
  constructor(cdp, targetId, sessionId) {
    this.cdp = cdp;
    this.targetId = targetId;
    this.sessionId = sessionId;
  }

  send(method, params) {
    return this.cdp.send(method, params, this.sessionId);
  }

  async eval(expression, { byValue = true, awaitPromise = true } = {}) {
    const r = await this.send("Runtime.evaluate", {
      expression, awaitPromise, returnByValue: byValue, userGesture: true,
    });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error(`eval error: ${d.text} ${d.exception?.description || ""}`);
    }
    return r.result?.value;
  }

  /** 在真实鼠标坐标点击（可信事件） */
  async clickAt(x, y, { button = "left", clickCount = 1 } = {}) {
    const base = { x, y, button, clickCount };
    await this.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    await this.send("Input.dispatchMouseEvent", { type: "mousePressed", ...base });
    await this.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...base });
  }

  async typeText(text) {
    await this.send("Input.insertText", { text });
  }

  async key(key) {
    const map = {
      Enter: { windowsVirtualKeyCode: 13, code: "Enter", text: "\r" },
      Tab: { windowsVirtualKeyCode: 9, code: "Tab" },
      Escape: { windowsVirtualKeyCode: 27, code: "Escape" },
      Backspace: { windowsVirtualKeyCode: 8, code: "Backspace" },
    };
    const k = map[key] || { code: key };
    await this.send("Input.dispatchKeyEvent", { type: "keyDown", ...k });
    await this.send("Input.dispatchKeyEvent", { type: "keyUp", ...k });
  }
}

/** 连接第一个匹配的页面目标，返回 {cdp, page} */
export async function attachPage(urlIncludes = "unipus") {
  const list = await listTargets();
  const page = list.find((t) => t.type === "page" && (t.url || "").includes(urlIncludes))
    || list.find((t) => t.type === "page" && !(t.url || "").startsWith("chrome"));
  if (!page) throw new Error("no page target");
  const cdp = await CDP.connect(page.webSocketDebuggerUrl);
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId: page.id, flatten: true });
  const s = new PageSession(cdp, page.id, sessionId);
  await s.send("Page.enable");
  await s.send("Runtime.enable");
  return { cdp, page: s, target: page };
}

/** 列出所有 iframe/子目标（OOPIF 跨站 iframe 会作为独立 target 出现） */
export async function listChildTargets(cdp) {
  const { targetInfos } = await cdp.send("Target.getTargets");
  return targetInfos.filter((t) => t.type === "iframe" || t.type === "page");
}

export async function attachTo(cdp, targetId) {
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const s = new PageSession(cdp, targetId, sessionId);
  await s.send("Runtime.enable");
  return s;
}
