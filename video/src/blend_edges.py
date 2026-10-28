# Feathers the borders of a high-zoom basemap into the upsampled lower-zoom map so camera moves never show a seam.
import json, numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
import os
B = os.environ.get("WORK", "/tmp/claude-0/work") + "/build"
def blend(hi, lo, band):
    mh = json.load(open(f"{B}/{hi}.json")); ml = json.load(open(f"{B}/{lo}.json"))
    f = 2 ** (mh["z"] - ml["z"])
    H = Image.open(f"{B}/{hi}.jpg").convert("RGB")
    L = Image.open(f"{B}/{lo}.jpg").convert("RGB")
    x0 = mh["ox"] / f - ml["ox"]; y0 = mh["oy"] / f - ml["oy"]
    box = (x0, y0, x0 + mh["w"] / f, y0 + mh["h"] / f)
    up = L.transform((mh["w"], mh["h"]), Image.EXTENT, box, Image.BICUBIC)
    h, w = mh["h"], mh["w"]
    yy = np.minimum(np.arange(h), np.arange(h)[::-1]).astype(np.float32)
    xx = np.minimum(np.arange(w), np.arange(w)[::-1]).astype(np.float32)
    d = np.minimum(yy[:, None], xx[None, :])
    a = np.clip(d / band, 0, 1); a = a * a * (3 - 2 * a)
    out = np.asarray(H).astype(np.float32) * a[..., None] + np.asarray(up).astype(np.float32) * (1 - a[..., None])
    Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8)).save(f"{B}/{hi}_b.jpg", quality=92, subsampling=0)
    print("blended", hi)
blend("base_z5", "base_z4", 160)
blend("base_z7", "base_z5", 500)
blend("base_z9", "base_z7", 300)
# half-resolution z7 for mid zoom levels (z6 equivalent)
im = Image.open(f"{B}/base_z7_b.jpg"); m = json.load(open(f"{B}/base_z7.json"))
im.resize((m["w"] // 2, m["h"] // 2), Image.LANCZOS).save(f"{B}/base_z6_b.jpg", quality=92, subsampling=0)
json.dump({"z": 6, "ox": m["ox"] / 2, "oy": m["oy"] / 2, "w": m["w"] // 2, "h": m["h"] // 2}, open(f"{B}/base_z6.json", "w"))
