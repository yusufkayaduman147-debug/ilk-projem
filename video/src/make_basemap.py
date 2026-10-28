# Builds stylized Web-Mercator base maps (z7 region + z9 Hejaz) from Terrarium DEM tiles + Blue Marble colours.
import math, json, os, sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter
Image.MAX_IMAGE_PIXELS = None
WORK = os.environ.get("WORK", "/tmp/claude-0/work")
D = f"{WORK}/data"
OUT = f"{WORK}/build"

def tile_range(z):
    xs = sorted({int(f.split('_')[0]) for f in os.listdir(f"{D}/tiles/{z}")})
    ys = sorted({int(f.split('_')[1].split('.')[0]) for f in os.listdir(f"{D}/tiles/{z}")})
    return xs[0], xs[-1], ys[0], ys[-1]

def load_dem(z):
    x0, x1, y0, y1 = tile_range(z)
    W, H = (x1-x0+1)*256, (y1-y0+1)*256
    dem = np.zeros((H, W), np.float32)
    for x in range(x0, x1+1):
        for y in range(y0, y1+1):
            a = np.asarray(Image.open(f"{D}/tiles/{z}/{x}_{y}.png").convert("RGB")).astype(np.float32)
            dem[(y-y0)*256:(y-y0+1)*256, (x-x0)*256:(x-x0+1)*256] = a[..., 0]*256 + a[..., 1] + a[..., 2]/256 - 32768
    return dem, (x0*256, y0*256)

def px_to_lonlat(X, Y, z):
    n = 256 * 2**z
    lon = X / n * 360 - 180
    lat = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2*Y/n))))
    return lon, lat

def lonlat_to_px(lon, lat, z):
    n = 256 * 2**z
    lat = max(min(lat, 85), -85)
    x = (lon + 180) / 360 * n
    r = math.radians(lat)
    y = (1 - math.log(math.tan(r) + 1/math.cos(r)) / math.pi) / 2 * n
    return x, y

def raster_polys(path, z, origin, shape, scale=1):
    g = json.load(open(path))
    im = Image.new("L", (shape[1]*scale, shape[0]*scale), 0)
    dr = ImageDraw.Draw(im)
    ox, oy = origin
    for f in g["features"]:
        geom = f["geometry"]
        polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        for poly in polys:
            for i, ring in enumerate(poly):
                pts = [((lonlat_to_px(lo, la, z)[0]-ox)*scale, (lonlat_to_px(lo, la, z)[1]-oy)*scale) for lo, la in ring]
                if len(pts) > 2:
                    dr.polygon(pts, fill=255 if i == 0 else 0)
    return np.asarray(im.resize((shape[1], shape[0]), Image.LANCZOS) if scale != 1 else im).astype(np.float32)/255

_BM = None
def land_filled_bluemarble():
    # Blue Marble with ocean pixels replaced by nearby land colours (normalized convolution),
    # so coastal land never picks up a blue fringe when upsampled.
    global _BM
    if _BM is not None: return _BM
    cache = f"{OUT}/bm_filled.npy"
    if os.path.exists(cache):
        _BM = np.load(cache); return _BM
    im = Image.open(f"{D}/bluemarble.jpg").convert("RGB")
    w, h = im.size
    c = np.asarray(im).astype(np.float32)/255
    g = json.load(open(f"{D}/ne_50m_land.geojson"))
    mk = Image.new("L", (w, h), 0); dr = ImageDraw.Draw(mk)
    for f in g["features"]:
        geom = f["geometry"]
        polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        for poly in polys:
            for i, ring in enumerate(poly):
                pts = [((lo+180)/360*w, (90-la)/180*h) for lo, la in ring]
                if len(pts) > 2: dr.polygon(pts, fill=255 if i == 0 else 0)
    m = np.asarray(mk.filter(ImageFilter.MinFilter(5))).astype(np.float32)/255
    filled = c.copy()
    acc = np.zeros_like(c); accw = np.zeros((h, w), np.float32)
    for sig in [2, 6, 18, 50]:
        num = np.stack([np.asarray(Image.fromarray(c[..., k]*m).filter(ImageFilter.GaussianBlur(sig))) if False else
                        gauss(c[..., k]*m, sig) for k in range(3)], -1)
        den = gauss(m, sig)
        est = num / np.maximum(den[..., None], 1e-4)
        take = (accw < 0.5) & (den > 0.02)
        acc[take] = est[take]; accw[take] = 1
    filled = np.where(m[..., None] > 0.5, c, acc)
    filled = np.stack([gauss(filled[..., k], 1.0) for k in range(3)], -1)
    np.save(cache, filled.astype(np.float32))
    _BM = filled.astype(np.float32)
    return _BM

def gauss(a, sig):
    from scipy.ndimage import gaussian_filter
    return gaussian_filter(a, sig, mode="wrap")

def sample_bluemarble(lon, lat):
    bm = land_filled_bluemarble()
    h, w, _ = bm.shape
    fx = (lon + 180) / 360 * w - 0.5
    fy = (90 - lat) / 180 * h - 0.5
    x0 = np.clip(np.floor(fx).astype(int), 0, w-2); y0 = np.clip(np.floor(fy).astype(int), 0, h-2)
    tx = np.clip(fx - x0, 0, 1)[..., None]; ty = np.clip(fy - y0, 0, 1)[..., None]
    c = (bm[y0, x0]*(1-tx)*(1-ty) + bm[y0, x0+1]*tx*(1-ty) + bm[y0+1, x0]*(1-tx)*ty + bm[y0+1, x0+1]*tx*ty)
    return c

def hillshade(dem, z, lat, exag):
    res = 156543.03392 * np.cos(np.radians(lat)) / 2**z  # metres per pixel
    gy, gx = np.gradient(dem * exag)
    gx = gx / res[:, None] if res.ndim == 1 else gx / res
    gy = gy / res[:, None] if res.ndim == 1 else gy / res
    slope = np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)
    out = np.zeros_like(dem)
    for az, alt, w in [(315, 40, 0.55), (270, 45, 0.15), (0, 45, 0.15), (225, 50, 0.15)]:
        a = np.radians(360 - az + 90); e = np.radians(alt)
        out += w * (np.sin(e)*np.cos(slope) + np.cos(e)*np.sin(slope)*np.cos(a - aspect))
    return np.clip(out, 0, 1)

def build(z, exag, name, preview=False, detail=0.0):
    dem, (ox, oy) = load_dem(z)
    H, W = dem.shape
    print(name, W, H, flush=True)
    Y = np.arange(H) + oy + 0.5
    X = np.arange(W) + ox + 0.5
    lon_row, _ = px_to_lonlat(X, np.zeros_like(X), z)
    _, lat_col = px_to_lonlat(np.zeros_like(Y), Y, z)
    land = raster_polys(f"{D}/ne_50m_land.geojson", z, (ox, oy), (H, W), scale=1)
    lakes = raster_polys(f"{D}/ne_50m_lakes.geojson", z, (ox, oy), (H, W), scale=1)
    lakes = np.maximum(lakes, raster_polys(f"{D}/ne_10m_lakes_historic.geojson", z, (ox, oy), (H, W), scale=1))
    land_core = np.asarray(Image.fromarray((land*255).astype(np.uint8)).filter(ImageFilter.MinFilter(9))).astype(np.float32)/255
    # water: below sea level and not an inland depression; plus lakes
    water = ((dem <= 0.5) & (land_core < 0.5)).astype(np.float32)
    water = np.maximum(water, lakes)
    water = np.asarray(Image.fromarray((water*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))).astype(np.float32)/255
    hs = hillshade(np.maximum(dem, 0), z, lat_col[:, None] * np.ones((1, W)), exag)
    hs_b = hillshade(np.minimum(dem, 0), z, lat_col[:, None] * np.ones((1, W)), exag*0.35)
    # colour layer
    out = np.zeros((H, W, 3), np.float32)
    step = 1024
    for r0 in range(0, H, step):
        r1 = min(H, r0+step)
        lon = np.broadcast_to(lon_row[None, :], (r1-r0, W)); lat = np.broadcast_to(lat_col[r0:r1, None], (r1-r0, W))
        out[r0:r1] = sample_bluemarble(lon, lat)
    # land grading: warm, slightly desaturated, then relief
    lum = out.mean(-1, keepdims=True)
    landc = lum + (out - lum) * 0.82
    landc = landc ** 0.92 * np.array([1.06, 0.99, 0.86])
    elev = np.maximum(dem, 0)[..., None]
    snow = np.clip((elev - 3800) / 1500, 0, 1) * 0.35
    landc = landc * (1 - snow) + snow * np.array([0.92, 0.90, 0.86])
    shade = hs[..., None]
    landc = landc * (0.30 + 1.05 * shade**1.15) + 0.03
    if detail > 0:
        # ince kum/arazi dokusu: izotropik + yönlü (kum dalgası) gürültü
        from scipy.ndimage import gaussian_filter
        rs = np.random.default_rng(z)
        tex = np.zeros((H, W), np.float32)
        for sig, amp in [((0.8, 0.8), 0.45), ((2.5, 2.5), 0.35), ((1.0, 7.0), 0.5), ((6, 6), 0.3)]:
            nz = gaussian_filter(rs.standard_normal((H, W)).astype(np.float32), sig)
            tex += amp * nz / (nz.std() + 1e-6)
        tex /= tex.std() + 1e-6
        flat = np.clip(1 - (1 - hs) * 2.5, 0, 1)            # düz alanlarda daha belirgin
        landc = landc * (1 + detail * tex[..., None] * (0.5 + 0.5 * flat[..., None]))
    # water colouring by depth
    # Terrarium bathymetry is blocky over the Caspian and lakes: use a distance-to-shore pseudo depth there
    from scipy.ndimage import distance_transform_edt, gaussian_filter
    LON = lon_row[None, :]; LAT = lat_col[:, None]
    casp = (water > 0.5) & (LON > 46) & (LON < 55.5) & (LAT > 36.4) & (LAT < 47.6)
    inland = casp | (lakes > 0.5)
    depth = np.clip(-gaussian_filter(dem, 1.5).astype(np.float32), 0, 6000)
    rows = np.where(inland.any(1))[0]; cols = np.where(inland.any(0))[0]
    if len(rows):
        r0, r1, c0, c1 = max(rows[0]-2, 0), rows[-1]+3, max(cols[0]-2, 0), cols[-1]+3
        sub = inland[r0:r1, c0:c1]
        dist = distance_transform_edt(sub).astype(np.float32) * ((156543.03392 / 2**z) / 1223)
        depth[r0:r1, c0:c1] = np.where(sub, np.clip(dist * 9, 0, 900), depth[r0:r1, c0:c1])
    depth = depth[..., None]
    t = np.sqrt(depth / 6000)
    shallow = np.array([0.16, 0.36, 0.42]); deep = np.array([0.03, 0.08, 0.15])
    waterc = shallow * (1 - t) + deep * t
    waterc = waterc * (0.8 + 0.35 * hs_b[..., None])
    wm = water[..., None]
    img = landc * (1 - wm) + waterc * wm
    img = np.clip(img, 0, 1)
    im = Image.fromarray((img * 255 + 0.5).astype(np.uint8))
    im.save(f"{OUT}/{name}.jpg", quality=92, subsampling=0)
    meta = {"z": z, "ox": ox, "oy": oy, "w": W, "h": H}
    json.dump(meta, open(f"{OUT}/{name}.json", "w"))
    im.resize((W//6, H//6), Image.LANCZOS).save(f"{OUT}/{name}_preview.jpg", quality=85)
    np.save(f"{OUT}/{name}_water.npy", (water > 0.5))
    print("done", name, flush=True)

if __name__ == "__main__":
    which = sys.argv[1]
    if which == "z4": build(4, 11.0, "base_z4")
    elif which == "z5": build(5, 9.0, "base_z5")
    elif which == "z9": build(9, 4.0, "base_z9", detail=0.06)
    else: build(7, 5.0, "base_z7")
