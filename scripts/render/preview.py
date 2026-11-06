#!/usr/bin/env python3
"""Tone-map raw passes into a quick preview: preview.py scene cam W H out.png pass=gain ..."""
import sys
import numpy as np
from PIL import Image

scene, cam, W, H, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
acc = np.zeros((H, W, 3), np.float32)
for arg in sys.argv[6:]:
    name, gain = arg.split("=")
    acc += np.fromfile(f"scripts/render/out/{scene}-{cam}-{name}.f32", np.float32).reshape(H, W, 3) * float(gain)
x = acc * 0.9
x = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14)
img = (np.clip(x, 0, 1) ** (1 / 2.2) * 255).astype(np.uint8)
Image.fromarray(img).save(out)
