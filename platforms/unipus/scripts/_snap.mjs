import { connect, sleep } from "./utlib.mjs";
import fs from "node:fs";
const out = process.argv[2] || "view.png";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
if (!rd) { console.log("NO READER"); process.exit(1); }
const L = await connect(rd.id);
const { cdp, sessionId } = L;
const { data } = await cdp.send("Page.captureScreenshot", { format: "png" }, sessionId);
fs.writeFileSync(out, Buffer.from(data, "base64"));
console.log("saved", out, Buffer.from(data, "base64").length);
cdp.close();
