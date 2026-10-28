# -*- coding: utf-8 -*-
"""Son ses miksi: seslendirme işleme + efektler + ambiyans + müzik (konuşmada otomatik kısma) -> mix.wav"""
import os, json, math
import numpy as np
import soundfile as sf
import pyloudnorm as pyln
from scipy import signal

WORK = os.environ.get("WORK", "/tmp/claude-0/work")
SR = 48000
rng = np.random.default_rng(5)

def peq(f0, gain_db, q):
    A = 10 ** (gain_db / 40); w = 2 * math.pi * f0 / SR; al = math.sin(w) / (2 * q)
    b = [1 + al * A, -2 * math.cos(w), 1 - al * A]; a = [1 + al / A, -2 * math.cos(w), 1 - al / A]
    return signal.tf2sos(np.array(b) / a[0], np.array(a) / a[0])

def shelf(f0, gain_db, high=True):
    A = 10 ** (gain_db / 40); w = 2 * math.pi * f0 / SR; al = math.sin(w) / 2 * math.sqrt(2)
    c = math.cos(w); sq = 2 * math.sqrt(A) * al
    if high:
        b = [A * ((A + 1) + (A - 1) * c + sq), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sq)]
        a = [(A + 1) - (A - 1) * c + sq, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sq]
    else:
        b = [A * ((A + 1) - (A - 1) * c + sq), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - sq)]
        a = [(A + 1) + (A - 1) * c + sq, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - sq]
    return signal.tf2sos(np.array(b) / a[0], np.array(a) / a[0])

def envelope(x, attack, release, hop=48):
    """Tepe/RMS zarfı (1 ms çözünürlük), ani yükseliş-yavaş düşüş."""
    n = len(x) // hop + 1
    p = np.sqrt(np.array([np.mean(x[i * hop:(i + 1) * hop] ** 2) if i * hop < len(x) else 0 for i in range(n)]) + 1e-12)
    aa, rr = math.exp(-hop / (attack * SR)), math.exp(-hop / (release * SR))
    e = np.empty(n); cur = 0.0
    for i in range(n):
        cur = aa * cur + (1 - aa) * p[i] if p[i] > cur else rr * cur + (1 - rr) * p[i]
        e[i] = cur
    return np.interp(np.arange(len(x)) / hop, np.arange(n), e)

def compress(x, thr_db=-24, ratio=3.0, attack=0.005, release=0.12, makeup_db=0):
    e = envelope(x, attack, release)
    ldb = 20 * np.log10(e + 1e-9)
    over = np.maximum(0, ldb - thr_db)
    g = 10 ** ((-over * (1 - 1 / ratio) + makeup_db) / 20)
    return x * g

def room_ir(seconds=0.45):
    n = int(seconds * SR); t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t * 6.9 / seconds)
    ir = signal.sosfilt(signal.butter(2, 5000, "low", fs=SR, output="sos"), ir)
    ir[0] = 0
    for d, g in [(0.007, 0.6), (0.013, 0.45), (0.021, 0.35)]: ir[int(d * SR)] += g * np.abs(ir).max() * 4
    return ir / np.sqrt((ir ** 2).sum())

def hall_ir(seconds=2.8):
    n = int(seconds * SR); t = np.arange(n) / SR
    out = []
    for ch in range(2):
        x = rng.standard_normal(n) * np.exp(-t * 6.9 / seconds)
        x = signal.sosfilt(signal.butter(2, 3800, "low", fs=SR, output="sos"), x)
        out.append(np.concatenate([np.zeros(int(0.025 * SR)), x]))
    ir = np.stack(out, 1)
    return ir / np.sqrt((ir ** 2).sum(0, keepdims=True))

# ---------------------------------------------------------------- efekt sentezi
def whoosh(dur=1.8, f0=300, f1=3200, pan0=-0.6, pan1=0.6):
    n = int(dur * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    pink = signal.lfilter([0.049922035, -0.095993537, 0.050612699, -0.004408786], [1, -2.494956002, 2.017265875, -0.522189400], noise)
    f = f0 * (f1 / f0) ** (np.clip(t / (dur * 0.75), 0, 1) ** 1.5)
    out = np.zeros(n); ic1 = ic2 = 0.0
    k = 1 / 1.4   # zamanla değişen durum-değişken (TPT SVF) bant geçiren filtre
    for i in range(n):
        g = math.tan(math.pi * f[i] / SR)
        a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2
        v3 = pink[i] - ic2
        v1 = a1 * ic1 + a2 * v3
        v2 = ic2 + a2 * ic1 + a3 * v3
        ic1, ic2 = 2 * v1 - ic1, 2 * v2 - ic2
        out[i] = v1
    env = np.clip(t / (dur * 0.72), 0, 1) ** 2.2 * np.clip((dur - t) / (dur * 0.28), 0, 1) ** 1.2
    out = out * env
    out /= np.abs(out).max() + 1e-9
    pan = pan0 + (pan1 - pan0) * t / dur
    return np.stack([out * np.cos((pan + 1) * math.pi / 4), out * np.sin((pan + 1) * math.pi / 4)], 1)

def boom(dur=3.5):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 62 * np.exp(-t * 1.4) + 32
    ph = 2 * math.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 1.6)
    s += 0.35 * np.sin(2 * ph) * np.exp(-t * 3.0)
    nb = signal.sosfilt(signal.butter(2, 260, "low", fs=SR, output="sos"), rng.standard_normal(n)) * np.exp(-t * 9) * 3.0
    x = s + nb
    x[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    x /= np.abs(x).max()
    return np.stack([x, x], 1)

def shimmer(dur=3.2, root=587.33):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for k, (mult, amp) in enumerate([(4, 1.0), (5, 0.6), (6, 0.7), (8, 0.5), (10, 0.35), (12, 0.3)]):
        fr = root * mult / 2 * (1 + rng.uniform(-0.003, 0.003))
        st = rng.uniform(0, 0.5)
        e = np.clip((t - st) / 0.08, 0, 1) * np.exp(-np.maximum(0, t - st) * (1.4 + k * 0.2))
        x += amp * np.sin(2 * math.pi * fr * t + rng.uniform(0, 6)) * e * (0.8 + 0.2 * np.sin(2 * math.pi * (5 + k) * t))
    x /= np.abs(x).max()
    L = x * (0.8 + 0.2 * np.sin(2 * math.pi * 0.7 * t)); R = x * (0.8 + 0.2 * np.cos(2 * math.pi * 0.7 * t))
    return np.stack([L, R], 1)

def wind(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    b = np.cumsum(rng.standard_normal((n, 2)), 0)
    b -= signal.sosfilt(signal.butter(1, 0.5, "low", fs=SR, output="sos"), b, axis=0)
    b = signal.sosfilt(signal.butter(2, [180, 1100], "band", fs=SR, output="sos"), b, axis=0)
    lfo = 0.55 + 0.45 * np.sin(2 * math.pi * 0.07 * t + 1.3) * np.sin(2 * math.pi * 0.023 * t)
    b *= lfo[:, None]
    return b / (np.abs(b).max() + 1e-9)

def waves(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    w = rng.standard_normal((n, 2))
    low = signal.sosfilt(signal.butter(2, 500, "low", fs=SR, output="sos"), w, axis=0)
    hi = signal.sosfilt(signal.butter(2, [1500, 6000], "band", fs=SR, output="sos"), w, axis=0)
    ph = (t / 7.0) % 1.0
    swell = np.sin(np.pi * ph) ** 2
    crest = np.exp(-((ph - 0.62) / 0.08) ** 2)
    x = low * (0.3 + 0.7 * swell)[:, None] + hi * 0.25 * crest[:, None]
    return x / (np.abs(x).max() + 1e-9)

def fade_io(x, fi, fo):
    n = len(x); a = np.ones(n)
    k = int(fi * SR); a[:k] = np.linspace(0, 1, k) if k else a[:k]
    k = int(fo * SR); a[n - k:] = np.linspace(1, 0, k) if k else a[n - k:]
    return x * a[:, None]

def place(buf, x, t, gain_db):
    s = int(t * SR)
    if s >= len(buf): return
    x = x * 10 ** (gain_db / 20)
    e = min(len(buf), s + len(x))
    buf[max(0, s):e] += x[max(0, -s):e - s]

# ---------------------------------------------------------------- ana akış
def main():
    tl = json.load(open(f"{WORK}/build/timeline.json"))
    SC = {s["id"]: s for s in tl["scenes"]}
    total = tl["duration"]
    N = int(total * SR) + SR
    meter = pyln.Meter(SR)

    # 1) seslendirme izi
    voice = np.zeros(N)
    for s in tl["scenes"]:
        for l in s["lines"]:
            a, sr = sf.read(l["wav"], dtype="float64")
            a = signal.resample_poly(a, SR // 1000 * 1000 // 50, sr // 50) if sr != SR else a
            st = int(l["start"] * SR)
            voice[st:st + len(a)] += a[: max(0, N - st)]
    v = signal.sosfilt(signal.butter(2, 75, "high", fs=SR, output="sos"), voice)
    for sos in (peq(170, 1.8, 0.8), peq(420, -2.0, 1.1), peq(3100, 2.2, 0.9), shelf(7000, 1.5, True)):
        v = signal.sosfilt(sos, v)
    # yumuşak sıskalık giderici (6-9 kHz)
    ss = signal.sosfilt(signal.butter(2, [5500, 9500], "band", fs=SR, output="sos"), v)
    se = envelope(ss, 0.002, 0.06)
    over = np.maximum(0, 20 * np.log10(se + 1e-9) - 20 * np.log10(np.percentile(se[se > 1e-4], 90) + 1e-9))
    v = v - ss * (1 - 10 ** (-np.minimum(over, 6) / 20))
    v = compress(v, thr_db=-26, ratio=2.6, attack=0.006, release=0.14)
    # hafif "hava" (harmonik uyarıcı)
    hb = signal.sosfilt(signal.butter(2, [2500, 7000], "band", fs=SR, output="sos"), v)
    ex = signal.sosfilt(signal.butter(2, 8000, "high", fs=SR, output="sos"), np.tanh(hb * 6))
    v = v + ex * 0.05
    rv = signal.oaconvolve(v, room_ir(), mode="full")[:N]
    v = v + rv * 0.07
    loud = meter.integrated_loudness(np.stack([v, v], 1))
    v *= 10 ** ((-17.0 - loud) / 20)
    voice_st = np.stack([v, v], 1)

    # 2) efektler
    fx = np.zeros((N, 2))
    W = whoosh(); B = boom(); SH = shimmer()
    for cid in ["ch1", "ch2", "ch3", "ch4", "ch5", "ch6", "ch7", "ch8"]:
        s = SC[cid]
        place(fx, W, s["start"] - 1.25, -21)
        place(fx, B, s["start"] + 0.35, -16)
    place(fx, B, SC["title"]["start"] + 1.4, -14)
    place(fx, W, SC["title"]["start"] - 0.4, -22)
    for t, g in [(0.8, -27), (SC["hira"]["lines"][2]["start"] - 0.4, -24), (SC["birth"]["lines"][2]["start"] + 0.6, -28),
                 (SC["hijra"]["lines"][3]["start"] - 0.1, -27), (SC["umayyad"]["lines"][2]["start"] + 0.2, -29),
                 (SC["abbasid"]["lines"][3]["start"], -29), (SC["abbasid"]["lines"][4]["start"], -29), (SC["finale"]["lines"][3]["end"] - 1.0, -23)]:
        place(fx, SH, t, g)
    for sid in ["mecca", "hira", "medina", "battles", "conquest", "abbasid", "turks", "finale"]:
        place(fx, whoosh(1.4, 250, 2400, 0.5, -0.5), SC[sid]["start"] - 1.0, -27)
    # 3) ambiyans
    amb = np.zeros((N, 2))
    for sid, g in [("intro", -40), ("title", -34), ("mecca", -38), ("birth", -38), ("hira", -36), ("farewell", -38), ("end", -40)]:
        s = SC[sid]
        d = s["end"] - s["start"] + 2.0
        place(amb, fade_io(wind(d), 1.5, 1.5), s["start"] - 1.0, g)
    s = SC["trade"]
    place(amb, fade_io(waves(s["lines"][3]["start"] - s["lines"][1]["start"] + 2), 2, 2), s["lines"][1]["start"] - 1, -36)
    s = SC["dawah"]
    place(amb, fade_io(waves(s["lines"][4]["start"] - s["lines"][3]["start"] + 1), 1.5, 1.5), s["lines"][3]["start"], -38)

    # 4) müzik + konuşmada kısma
    mus, sr = sf.read(f"{WORK}/build/music/music.wav", dtype="float64")
    mus = mus[:N] if len(mus) >= N else np.concatenate([mus, np.zeros((N - len(mus), 2))])
    ve = envelope(v, 0.03, 0.55)
    act = np.clip((20 * np.log10(ve + 1e-9) + 45) / 15, 0, 1)
    act = signal.sosfiltfilt(signal.butter(1, 3, "low", fs=SR, output="sos"), act)
    duck = 10 ** (-9.0 * np.clip(act, 0, 1) / 20)
    mus = mus * duck[:, None] * 10 ** (-1.5 / 20)

    # 5) toplam, salon yankısı payı, son seviye
    hall = hall_ir()
    send = voice_st * 0.03 + fx * 0.35
    wet = np.stack([signal.oaconvolve(send[:, c], hall[:, c], mode="full")[:N] for c in range(2)], 1)
    mix = voice_st + mus + fx + amb + wet
    mix = signal.sosfilt(signal.butter(2, 25, "high", fs=SR, output="sos"), mix, axis=0)
    loud = meter.integrated_loudness(mix)
    mix *= 10 ** ((-15.0 - loud) / 20)
    # tepe sınırlama (-1 dBFS)
    ceil = 10 ** (-1.0 / 20)
    env = np.abs(mix).max(1)
    hop = 48; n = len(env) // hop + 1
    pk = np.array([env[i * hop:(i + 1) * hop + hop * 3].max() if i * hop < len(env) else 0 for i in range(n)])
    need = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    a = math.exp(-hop / (0.1 * SR)); g = np.empty(n); cur = 1.0
    for i in range(n):
        cur = min(need[i], a * cur + (1 - a) * need[i]); g[i] = cur
    mix *= np.interp(np.arange(len(env)) / hop, np.arange(n), g)[:, None]
    mix = mix[: int(total * SR)]
    sf.write(f"{WORK}/build/mix.wav", mix.astype(np.float32), SR, subtype="FLOAT")
    sf.write(f"{WORK}/build/voice_only.wav", voice_st[: int(total * SR)].astype(np.float32), SR, subtype="FLOAT")
    print("mix LUFS", round(meter.integrated_loudness(mix), 2), "peak dBFS", round(20 * np.log10(np.abs(mix).max()), 2), "dur", len(mix) / SR)

if __name__ == "__main__":
    main()
