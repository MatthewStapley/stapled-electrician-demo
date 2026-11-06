#!/usr/bin/env python3
"""Rasterise the hidden-line drawing and circuit routes for the compare slider."""
import json
from PIL import Image, ImageDraw
d = json.load(open("public/renders/kitchen-wide.json"))
S = 2
W, H = d["w"] * S, d["h"] * S
im = Image.new("RGB", (W, H), "#1a2433")
dr = ImageDraw.Draw(im)
for x0, y0, x1, y1 in d["lines"]:
    dr.line([x0 * S, y0 * S, x1 * S, y1 * S], fill="#aeb9c6", width=2)
cols = {"pendants": "#e9a765", "downlights": "#8cb5e6", "joinery": "#8fd08f"}
for k, routes in d["routes"].items():
    for pl in routes:
        dr.line([(x * S, y * S) for x, y in pl], fill=cols[k], width=4, joint="curve")
for x, y, r in d["circles"]:
    dr.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], outline="#e9a765", width=4)
for x, y in d["spots"]:
    r = 8
    dr.ellipse([(x - r) * S, (y - r * 0.5) * S, (x + r) * S, (y + r * 0.5) * S], outline="#8cb5e6", width=4)
im.resize((d["w"], d["h"]), Image.LANCZOS).save("public/renders/kitchen-wide-drawn.webp", quality=84, method=6)
