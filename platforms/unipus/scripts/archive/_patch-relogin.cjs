const fs = require("fs");
const snippet = `
// auto-relogin if redirected to SSO
try {
  let tu = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).find(t => t.id === r.targetId);
  if (tu && /sso\\.unipus\\.cn\\/sso\\/login/.test(tu.url)) {
    log("检测到SSO，自动重登");
    const { execSync } = await import("node:child_process");
    try { execSync("node relogin2.mjs", { cwd: process.cwd(), env: { ...process.env, UNIPUS_USER: process.env.UNIPUS_USER || "USER_A_PHONE", UNIPUS_PASS: process.env.UNIPUS_PASS || "REDACTED_PW" }, stdio: "pipe", timeout: 120000 }); } catch {}
    await sleep(3000);
  }
} catch {}
`;
for (const f of ["unitfull.mjs", "oral-unit.mjs", "upload-unit.mjs", "ut-diag.mjs"]) {
  let s = fs.readFileSync(f, "utf8");
  if (!s.includes("auto-relogin if redirected")) {
    // insert right after the createTarget + sleep block, before connect
    const anchor = s.includes("await sleep(11000);") ? "await sleep(11000);" : "await sleep(9000);";
    s = s.replace(anchor, anchor + "\n" + snippet);
    fs.writeFileSync(f, s);
    console.log("patched", f);
  }
}
