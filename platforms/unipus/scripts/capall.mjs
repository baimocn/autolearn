// capall.mjs — 逐单元打开，抓取 8 份 course_progress 响应
import { connect, sleep } from "./utlib.mjs";
import { ensureReader, READER, COURSE, log } from "./reader.mjs";
import fs from "node:fs";

const tid = process.env.TID || (await ensureReader(1));
const L = await connect(tid);
const { cdp, sessionId } = L;
await cdp.send("Network.enable", {}, sessionId);
const reqs = new Map();
const hits = [];
cdp.on("Network.requestWillBeSent", (p) => { if (p.request?.url) reqs.set(p.requestId, p.request.url); });
cdp.on("Network.responseReceived", (p) => {
  const u = reqs.get(p.requestId);
  if (u && /course_progress/.test(u)) hits.push({ id: p.requestId, url: u });
});

for (const n of (process.argv[2] ? process.argv[2].split(",").map(Number) : [1,2,3,4,5,6,7,8])) {
  hits.length = 0;
  await cdp.send("Page.navigate", { url: `${READER}#/${COURSE}/courseware/u${n}/u${n}g2` }, sessionId).catch(() => {});
  await sleep(1200);
  await cdp.send("Page.reload", {}, sessionId).catch(() => {});
  for (let i = 0; i < 25 && hits.length === 0; i++) await sleep(1000);
  let ok = false;
  for (const h of hits) {
    const m = h.url.match(/course_progress\/[^/]+\/([^/]+)\//);
    if (!m || m[1] !== `u${n}`) continue;
    try {
      const b = await cdp.send("Network.getResponseBody", { requestId: h.id }, sessionId);
      if (b.body && b.body.length > 100) { fs.writeFileSync(`prog-u${n}.json`, b.body); ok = true; }
    } catch {}
  }
  log(`u${n}: ${ok ? "已保存" : "未捕获"} (hits=${hits.length})`);
  await sleep(1500);
}
L.cdp.close();
