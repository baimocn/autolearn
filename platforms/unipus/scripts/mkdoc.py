#!/usr/bin/env python3
"""mkdoc.py <out.pdf> <title> <subtitle> <bodyfile>  — 单页 A4 文档（无二维码）"""
import sys, os, textwrap
from PIL import Image, ImageDraw, ImageFont

out, title, subtitle, bodyfile = sys.argv[1:5]
W, H = 1240, 1754
M = 100
INK, MUTED, ACCENT = (26, 30, 36), (92, 100, 110), (17, 87, 64)

FB = "C:/Windows/Fonts/arialbd.ttf"
FR = "C:/Windows/Fonts/arial.ttf"
f_title = ImageFont.truetype(FB, 52)
f_sub = ImageFont.truetype(FR, 28)
f_body = ImageFont.truetype(FR, 25)
f_small = ImageFont.truetype(FR, 19)

img = Image.new("RGB", (W, H), "white")
d = ImageDraw.Draw(img)
d.rectangle([0, 0, W, 12], fill=ACCENT)

y = M
d.text((M, y), title, font=f_title, fill=INK); y += 74
d.text((M, y), subtitle, font=f_sub, fill=MUTED); y += 50
d.line([M, y, W - M, y], fill=(220, 224, 228), width=2); y += 40

for para in open(bodyfile, encoding="utf-8").read().strip().split("\n"):
    para = para.strip()
    if not para:
        y += 16
        continue
    if para.startswith("## "):
        y += 8
        d.text((M, y), para[3:], font=ImageFont.truetype(FB, 29), fill=ACCENT)
        y += 44
        continue
    for line in textwrap.wrap(para, 56):
        d.text((M, y), line, font=f_body, fill=INK); y += 36
    y += 10

d.line([M, H - M + 10, W - M, H - M + 10], fill=(220, 224, 228), width=2)
d.text((M, H - M + 26), "New Agricultural University English · Group Work Submission", font=f_small, fill=MUTED)

img.save(out, "PDF", resolution=150.0)
print("saved", out, os.path.getsize(out), "bytes")
