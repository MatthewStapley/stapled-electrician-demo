#!/usr/bin/env python3
"""Download each licensed photograph at the widths the site uses.

Writes public/images/<name>-<width>.webp. Sources and licences: IMAGE-CREDITS.md.
Run: python3 scripts/fetch-images.py
"""
import os
import subprocess
from concurrent.futures import ThreadPoolExecutor

U = "https://images.unsplash.com/"
WIDTHS = [640, 1024, 1600]
IMAGES = {
    "pendant-kitchen": "photo-1708426045546-8911cfea6162",  # 6s2cHhuy6lY
    "ev-charger": "photo-1600490819528-42405785433a",  # 9RZlFXzrANI
    "staff-kitchen": "photo-1497366672149-e5e4b4d34eb3",  # JdcJn85xD2k
    "lit-stair": "photo-1784572546490-500144f113ab",  # M4dpV6STEDM
    "first-fix-opening": "photo-1768321901750-f7b96d774456",  # R2olgus7AO4
    "strip-out": "photo-1634586648651-f1fb9ec10d90",  # biRt6RXejuk
    "workspace-ceiling": "photo-1766984702553-be155b143c80",  # iK1WfxsJgLc
    "distribution-board": "photo-1544724569-5f546fd6f2b5",  # kK7uPfb2YWU
}
jobs = [
    (f"public/images/{name}-{w}.webp", f"{U}{pid}?w={w}&fm=webp&q=70&fit=max")
    for name, pid in IMAGES.items()
    for w in WIDTHS
]


def fetch(job):
    out, url = job
    if os.path.exists(out) and os.path.getsize(out) > 0:
        return
    subprocess.run(["curl", "-sSfL", "--retry", "5", "--retry-all-errors", "-o", out, url], check=True)


os.makedirs("public/images", exist_ok=True)
with ThreadPoolExecutor(6) as pool:
    list(pool.map(fetch, jobs))
print(len(jobs), "files ready")
