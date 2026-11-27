// _tts.mjs <textfile> <out.mp3> <rate> — SAPI TTS（rate: -2..2）
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
const [src,out,rateArg]=process.argv.slice(2);
const rate=Number(rateArg||0);
const TMP=process.env.TEMP||"C:\Windows\Temp";
const wav=out.replace(/\.mp3$/,".wav");
const ps=path.join("sapi-tts.ps1");
try{
 execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File ${ps} -TextFile "${src}" -OutWav "${wav}" -Rate ${rate}`,{stdio:"pipe",timeout:240000});
 execSync(`ffmpeg -y -v error -i "${wav}" -codec:a libmp3lame -q:a 5 "${out}"`,{stdio:"pipe",timeout:60000});
 const d=execSync(`ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${out}"`).toString().trim();
 console.log("TTS OK",out,d+"s");
}catch(e){
 console.log("ERR",String(e).slice(0,200));
 process.exit(1);
}
