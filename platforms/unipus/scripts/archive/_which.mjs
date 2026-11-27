import { connect } from "./utlib.mjs";
const tabs = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const rd = tabs.find(t => /ucontent\.unipus\.cn/.test(t.url));
const L = await connect(rd.id);
const { frames, ev, cdp } = L;
for (const f of await frames()) if (/textbook\/book/.test(f.url)) {
  console.log(f.url.slice(0,160));
  const n = await ev(`document.querySelectorAll('div.editor-question-block.questionBlockNode').length`, f.ctx).catch(()=>0);
  console.log("blocks", n);
}
cdp.close();
