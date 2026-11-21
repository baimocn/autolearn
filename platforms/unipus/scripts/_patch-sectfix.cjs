const fs = require("fs");
let s = fs.readFileSync("sectfix.mjs", "utf8");

// 1) 打开目录抽屉（在 dismissRules 之后、findSection 之前插入）
if (!s.includes("catalog_area-open-menu")) {
  const anchor = "await dismissRules();\n// 展开抽屉到目标小节";
  const ins = [
    "await dismissRules();",
    "// 打开目录抽屉",
    "for (let i = 0; i < 3; i++) {",
    "  const op = await ev(`(()=>{const e=document.querySelector('[class*=catalog_area-open-menu]');if(!e)return null;const b=e.getBoundingClientRect();if(b.width<3)return null;return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()`, tb.ctx).catch(()=>null);",
    "  if (op) { await mouse(op.x, op.y); await sleep(2500); }",
    "  const opened = await ev(`(()=>{const e=document.querySelector('[class*=catalog_drawer-close]');if(!e)return 0;const b=e.getBoundingClientRect();return b.width>3?1:0;})()`, tb.ctx).catch(()=>0);",
    "  if (opened) break;",
    "  await sleep(1000);",
    "}",
    "// 展开抽屉到目标小节"
  ].join("\n");
  s = s.replace(anchor, ins);
}

// 2) 名称模糊匹配：去空格 + 前缀
const oldBlock = `  for (let k = 0; k < 10; k++) {
    const p = await ev(\`(()=>{const el=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].find(e=>(e.innerText||'').replace(/\\\\s+/g,' ').includes(\${JSON.stringify(name)}));if(!el)return null;const b=el.getBoundingClientRect();if(b.top<0||b.top>window.innerHeight-30)return {out:1};return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()\`, tb.ctx).catch(() => null);`;
if (s.includes("const nn =")) {
  console.log("already patched names");
} else if (s.includes(oldBlock)) {
  const newBlock = `  const nn = String(name).replace(/\\s+/g, "");
  for (let k = 0; k < 10; k++) {
    const p = await ev("(()=>{const target=" + JSON.stringify(nn) + ";const el=[...document.querySelectorAll('[class*=i-tree-menu_title-flex]')].find(e=>{const t=(e.innerText||'').replace(/\\\\s+/g,'');return t.includes(target)||t.replace(/[0-9.]+%$/,'').startsWith(target.slice(0,10));});if(!el)return null;const b=el.getBoundingClientRect();if(b.top<0||b.top>window.innerHeight-30)return {out:1};return{x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)};})()", tb.ctx).catch(() => null);`;
  s = s.replace(oldBlock, newBlock);
  console.log("names patched");
} else {
  console.log("OLD BLOCK NOT FOUND — inspect manually");
}
fs.writeFileSync("sectfix.mjs", s);
console.log("sectfix patched");
