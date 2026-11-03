// mtts.mjs <in.txt> <out.mp3> — 文本转语音（分块 + 拼接）
// 优先 edge-tts（走代理），失败自动降级到 Google TTS
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";

const IN = process.argv[2];
const OUT = process.argv[3];
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || "http://127.0.0.1:62435";
const raw = fs.readFileSync(IN, "utf8").replace(/\s+/g, " ").trim();

function tryEdge() {
  try {
    execSync(`edge-tts --proxy ${PROXY} --voice en-US-AriaNeural --file "${IN}" --write-media "${OUT}"`, { stdio: "pipe", timeout: 90000 });
    const d = Number(execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${OUT}"`).toString().trim());
    if (d > 1) return d;
  } catch {}
  return 0;
}

function sentences(t) {
  return t.match(/[^.!?]+[.!?]+["']?|\S[^.!?]*$/g) || [t];
}

function pack(t, max = 170) {
  const out = [];
  let cur = "";
  for (const s of sentences(t)) {
    if ((cur + " " + s).trim().length <= max) { cur = (cur + " " + s).trim(); continue; }
    if (cur) out.push(cur);
    if (s.length <= max) { cur = s.trim(); continue; }
    // 长句按词硬切
    let seg = "";
    for (const w of s.split(" ")) {
      if ((seg + " " + w).trim().length > max) { out.push(seg.trim()); seg = w; }
      else seg += " " + w;
    }
    cur = seg.trim();
  }
  if (cur) out.push(cur);
  return out.filter(Boolean);
}

function google() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mtts-"));
  const parts = pack(raw);
  const files = [];
  parts.forEach((p, i) => {
    const f = path.join(tmp, `p${String(i).padStart(3, "0")}.mp3`);
    const q = encodeURIComponent(p);
    let ok = false;
    for (let k = 0; k < 3 && !ok; k++) {
      try {
        execSync(`curl -s -x ${PROXY} --max-time 20 -A "Mozilla/5.0" "https://translate.google.com/translate_tts?ie=UTF-8&q=${q}&tl=en&client=tw-ob" -o "${f}"`, { stdio: "pipe" });
        ok = fs.existsSync(f) && fs.statSync(f).size > 2000;
      } catch {}
    }
    if (!ok) throw new Error("chunk failed: " + p.slice(0, 40));
    files.push(f);
  });
  // 每块之间插入 0.25s 静音，避免连读
  const sil = path.join(tmp, "sil.mp3");
  execSync(`ffmpeg -y -v error -f lavfi -i anullsrc=r=24000:cl=mono -t 0.25 -q:a 9 -acodec libmp3lame "${sil}"`, { stdio: "pipe" });
  const list = path.join(tmp, "list.txt");
  const lines = [];
  files.forEach((f, i) => { if (i) lines.push(`file '${sil}'`); lines.push(`file '${f}'`); });
  fs.writeFileSync(list, lines.join("\n"));
  execSync(`ffmpeg -y -v error -f concat -safe 0 -i "${list}" -c:a libmp3lame -b:a 128k -ar 24000 -ac 1 "${OUT}"`, { stdio: "pipe" });
  const d = Number(execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${OUT}"`).toString().trim());
  return d;
}

let d = tryEdge();
let engine = "edge-tts";
if (!d) { d = google(); engine = "google-tts"; }
console.log(`${path.basename(OUT)} | ${engine} | ${d.toFixed(1)}s | ${(raw.split(/\s+/).length)} words`);
