#!/usr/bin/env python3
"""Denoise raw passes and write web assets.

bake.py <scene> <cam> <W> <H> <name> pass=gain ...
Writes public/renders/<name>-<pass>.webp (sqrt-encoded linear layers for the
WebGL compositor), <name>-lit.webp (tone-mapped poster) and <name>.json.
"""
import json
import shutil
import sys
import numpy as np
from PIL import Image

scene, cam, W, H, name = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
gains = dict((a.split("=")[0], float(a.split("=")[1])) for a in sys.argv[6:])
OUT = "scripts/render/out"
g = np.fromfile(f"{OUT}/{scene}-{cam}-gbuffer.f32", np.float32).reshape(H, W, 3)
alb = np.clip(g[..., 0], 0.03, None)[..., None]
prim = np.floor(g[..., 1] / 8)
nrm = g[..., 1] % 8
z = g[..., 2]
K = np.array([1 / 16, 1 / 4, 3 / 8, 1 / 4, 1 / 16])


def shift(a, dy, dx):
    return np.roll(np.roll(a, dy, 0), dx, 1)


def despeckle(rgb):
    """Remove isolated fireflies: pixels far from the median of their surface."""
    lum = rgb.mean(2)
    stack = np.stack([shift(lum, dy, dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1)])
    samep = np.stack([shift(prim, dy, dx) == prim for dy in (-1, 0, 1) for dx in (-1, 0, 1)])
    med = np.median(np.where(samep, stack, np.nan_to_num(lum)), axis=0)
    hot = (lum > med * 2.2 + 0.01) & (samep.sum(0) >= 7)
    out = rgb.copy()
    out[hot] = rgb[hot] * (med[hot] / np.maximum(lum[hot], 1e-5))[..., None]
    return out


def atrous(rgb, iters=4, sigma=0.5):
    c = despeckle(rgb) / alb
    for it in range(iters):
        step = 1 << it
        lum = np.sqrt(np.maximum(c.mean(2), 0) + 1e-4)
        acc = np.zeros_like(c)
        wsum = np.zeros((H, W, 1), np.float32)
        s = sigma / (1 + it * 0.6)
        for j, kj in enumerate(K):
            for i, ki in enumerate(K):
                dy, dx = (j - 2) * step, (i - 2) * step
                same = (shift(prim, dy, dx) == prim) & (np.abs(shift(nrm, dy, dx) - nrm) < 0.12)
                dz = np.abs(shift(z, dy, dx) - z) / (z + 1e-3)
                dl = np.abs(shift(lum, dy, dx) - lum)
                w = same * np.exp(-dz * 30) * np.exp(-dl / s) * (ki * kj)
                acc += shift(c, dy, dx) * w[..., None]
                wsum += w[..., None]
        c = acc / np.maximum(wsum, 1e-5)
    return (c * alb).astype(np.float32)


def tonemap(x):
    x = x * 0.9
    x = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14)
    return np.clip(x, 0, 1) ** (1 / 2.2)


total = np.zeros((H, W, 3), np.float32)
for p, gain in gains.items():
    raw = np.fromfile(f"{OUT}/{scene}-{cam}-{p}.f32", np.float32).reshape(H, W, 3)
    den = atrous(raw)
    total += den * gain
    enc = (np.clip(den / 4, 0, 1) ** 0.5 * 255 + 0.5).astype(np.uint8)
    Image.fromarray(enc).save(f"public/renders/{name}-{p}.webp", quality=84, method=6)
    print(p, "done")

Image.fromarray((tonemap(total) * 255).astype(np.uint8)).save(f"public/renders/{name}-lit.webp", quality=86, method=6)
try:
    shutil.copy(f"{OUT}/{scene}-{cam}-lines.json", f"public/renders/{name}.json")
except FileNotFoundError:
    pass
