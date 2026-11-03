#!/usr/bin/env python3
"""mkposter.py <out.pdf> <title> <subtitle> <bodyfile> <qr_url>
生成一张 A4 单页海报 PDF：标题 + 正文 + 真实二维码 + 页脚。
"""
import sys, os, textwrap
from PIL import Image, ImageDraw, ImageFont
import qrcode

out, title, subtitle, bodyfile, qr_url = sys.argv[1:6]
W, H = 1240, 1754  # A4 @150dpi
M = 90
INK = (26, 30, 36)
MUTED = (92, 100, 110)
ACCENT = (17, 87, 64)

F = "C:/Windows/Fonts/arialbd.ttf"
FR = "C:/Windows/Fonts/arial.ttf"
f_title = ImageFont.truetype(F, 62)
f_sub = ImageFont.truetype(FR, 30)
f_body = ImageFont.truetype(FR, 26)
f_small = ImageFont.truetype(FR, 20)
f_cap = ImageFont.truetype(FR, 22)

img = Image.new("RGB", (W, H), "white")
d = ImageDraw.Draw(img)

# 顶部色带
d.rectangle([0, 0, W, 14], fill=ACCENT)

y = M
d.text((M, y), title, font=f_title, fill=INK)
y += 86
d.text((M, y), subtitle, font=f_sub, fill=MUTED)
y += 54
d.line([M, y, W - M, y], fill=(220, 224, 228), width=2)
y += 40

# 正文
body = open(bodyfile, encoding="utf-8").read().strip().split("\n")
chars = 52
for para in body:
    para = para.strip()
    if not para:
        y += 18
        continue
    if para.startswith("## "):
        y += 10
        d.text((M, y), para[3:], font=ImageFont.truetype(F, 32), fill=ACCENT)
        y += 48
        continue
    for line in textwrap.wrap(para, chars):
        d.text((M, y), line, font=f_body, fill=INK)
        y += 38
    y += 12

# 二维码
qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=12, border=2)
qr.add_data(qr_url)
qr.make(fit=True)
qim = qr.make_image(fill_color="black", back_color="white").convert("RGB").resize((330, 330), Image.NEAREST)
qx, qy = W - M - 330, H - M - 330 - 40
img.paste(qim, (qx, qy))
d.rectangle([qx - 10, qy - 10, qx + 340, qy + 340], outline=(210, 214, 218), width=2)
d.text((qx - 10, qy + 348), "Scan to listen to the recording", font=f_cap, fill=MUTED)
d.text((qx - 10, qy + 378), qr_url, font=f_small, fill=MUTED)

# 页脚
d.line([M, H - M + 10, W - M, H - M + 10], fill=(220, 224, 228), width=2)
d.text((M, H - M + 24), "New Agricultural University English  ·  Unit Poster  ·  QR-linked audio", font=f_small, fill=MUTED)

img.save(out, "PDF", resolution=150.0)
print("saved", out, os.path.getsize(out), "bytes")
