import { attachPage, sleep } from "./cdp.mjs";
export async function ensureLogin() {
  const { cdp, page } = await attachPage("unipus");
  let url = await page.eval("location.href");
  if ((await page.eval("location.hostname")).startsWith("ucontent")) { cdp.close(); return "already"; }
  for (let round = 0; round < 3; round++) {
    // 同意协议（若有）
    const agree = await page.eval(`(()=>{const norm=s=>(s||'').replace(/\\s+/g,' ').trim();
      const el=[...document.querySelectorAll('a,button,div,span')].filter(e=>norm(e.innerText)==='同意'&&e.children.length<=1).pop();
      if(!el) return null; const r=el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
    if (agree) { await page.clickAt(agree.x, agree.y); await sleep(1200); }
    const btn = await page.eval(`(()=>{const el=document.querySelector('button.btn-login'); if(!el) return null; const r=el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
    if (btn) { await page.clickAt(btn.x, btn.y); }
    for (let i = 0; i < 12; i++) { await sleep(1000); url = await page.eval("location.href"); if ((await page.eval("location.hostname")).startsWith("ucontent")) { cdp.close(); return "ok"; } }
  }
  cdp.close();
  return "fail:" + url.slice(0, 60);
}
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  console.log(await ensureLogin());
}
