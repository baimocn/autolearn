// mkpdf.mjs <outfile> <title> <textfile> — 生成最简单的单页 PDF
import fs from "node:fs";
const out=process.argv[2], title=process.argv[3], src=process.argv[4];
const raw=fs.readFileSync(src,"utf8").replace(/\r/g,"");
const lines=raw.split("\n");
const esc=s=>s.replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");
let content="BT /F1 11 Tf 14 TL 50 780 Td\n";
for(const ln of lines){
  const ascii=ln.replace(/[^\x20-\x7E]/g,"?");
  content += `(${esc(ascii)}) Tj T*\n`;
}
content+="ET\n";
const objs=[];
objs.push("<< /Type /Catalog /Pages 2 0 R >>");
objs.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
objs.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>");
objs.push(`<< /Length ${content.length} >>\nstream\n${content}endstream`);
objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
let pdf="%PDF-1.4\n";
const offs=[];
objs.forEach((o,i)=>{ offs.push(pdf.length); pdf += `${i+1} 0 obj\n${o}\nendobj\n`; });
const xref=pdf.length;
pdf+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;
offs.forEach(o=>{ pdf+=String(o).padStart(10,"0")+" 00000 n \n"; });
pdf+=`trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
fs.writeFileSync(out, pdf, "latin1");
console.log("wrote",out,pdf.length,"bytes");
