# -*- coding: utf-8 -*-
"""Zaman çizelgesine göre özgün fon müziği besteler ve GeneralUser GS ses bankasıyla seslendirir.

Her enstrüman ayrı bir sentezleyicide çalınır (ayrı kanal/stem); sonra panorama, yankı ve
seviye ayarıyla stereo bir müzik miksine dönüştürülür. Melodik ana çizgiler (ney) mümkün
olduğunca anlatımın boşluklarına yerleştirilir.
"""
import os, sys, json, math, random
import numpy as np
import soundfile as sf
import tinysoundfont
from scipy import signal

WORK = os.environ.get("WORK", "/tmp/claude-0/work")
SR = 48000
SF2 = f"{WORK}/data/GeneralUser-GS.sf2"
OUT = f"{WORK}/build/music"
random.seed(11)

# ---------------------------------------------------------------- notalar / diziler
N = {n: i for i, n in enumerate(["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"])}
N.update({"Db": 1, "D#": 3, "Gb": 6, "G#": 8, "A#": 10})
def m(name):                     # "D4" -> 62
    p, o = name[:-1], int(name[-1])
    return 12 * (o + 1) + N[p]

HIJAZ = [0, 1, 4, 5, 7, 8, 10]   # D Eb F# G A Bb C
KURDI = [0, 1, 3, 5, 7, 8, 10]   # D Eb F G A Bb C
MINOR = [0, 2, 3, 5, 7, 8, 10]   # D E F G A Bb C
MAJOR = [0, 2, 4, 5, 7, 9, 11]
PENTA = [0, 3, 5, 7, 10]         # D F G A C
def scale_note(root, sc, deg):
    o, d = divmod(deg, len(sc))
    return root + 12 * o + sc[d]

# ---------------------------------------------------------------- olay modeli
class Track:
    def __init__(self, name, prog, bank=0, vol=-22.0, pan=0.0, rev=0.25, drums=False, bend_range=2):
        self.name, self.prog, self.bank, self.vol, self.pan, self.rev, self.drums = name, prog, bank, vol, pan, rev, drums
        self.bend_range = bend_range
        self.ev = []   # (t, kind, a, b)
        self.swells = []   # (t0, t1, a, r, peak, base) — CC11 zarfları (üst üste binerse en büyüğü)
        self.over = []     # (t0, t1, v0, v1) — doğrudan CC11 eğrisi (zarfın önüne geçer)

    def note(self, t, dur, pitch, vel):
        if dur <= 0 or vel <= 0: return
        vel = int(max(1, min(127, vel)))
        self.ev.append((max(0.0, t), 1, int(pitch), vel))
        self.ev.append((max(0.0, t) + dur, 0, int(pitch), 0))

    def chord(self, t, dur, pitches, vel, spread=0.0):
        for i, p in enumerate(pitches):
            self.note(t + i * spread, dur - i * spread, p, vel * (0.92 + 0.08 * random.random()))

    def cc(self, t, num, val, hold=0.4):
        if num == 11: self.over.append((t, t + hold, val, val))
        else: self.ev.append((max(0.0, t), 2, num, int(max(0, min(127, val)))))

    def ramp(self, t0, t1, num, v0, v1, step=0.05, curve=1.0):
        if num == 11:
            self.over.append((t0, t1, v0, v1)); return
        n = max(1, int((t1 - t0) / step))
        for i in range(n + 1):
            f = i / n
            self.cc(t0 + (t1 - t0) * f, num, v0 + (v1 - v0) * (f ** curve))

    def expression_events(self, total, step=0.03):
        if not self.swells and not self.over: return []
        ts = np.arange(0, total, step)
        env = np.full(len(ts), 100.0 if not self.swells else 0.0)
        for (t0, t1, a, r, peak, base) in self.swells:
            i0, i1 = np.searchsorted(ts, [t0, t1])
            tt = ts[i0:i1]
            up = np.clip((tt - t0) / max(a, 1e-3), 0, 1)
            dn = np.clip((t1 - tt) / max(r, 1e-3), 0, 1)
            k = np.minimum(up, dn)
            k = k * k * (3 - 2 * k)
            env[i0:i1] = np.maximum(env[i0:i1], base + (peak - base) * k)
        for (t0, t1, v0, v1) in sorted(self.over):
            i0, i1 = np.searchsorted(ts, [t0, t1])
            if i1 > i0:
                env[i0:i1] = v0 + (v1 - v0) * (ts[i0:i1] - t0) / max(t1 - t0, 1e-3)
        out, last = [], -1
        for t, v in zip(ts, np.clip(env, 0, 127).astype(int)):
            if v != last:
                out.append((float(t), 2, 11, int(v))); last = v
        return out

    def bend(self, t, semis):
        v = int(8192 + semis / self.bend_range * 8191)
        self.ev.append((max(0.0, t), 3, max(0, min(16383, v)), 0))


TR = {}
def tr(name, *a, **k):
    TR[name] = Track(name, *a, **k)
    return TR[name]

pad = tr("pad", 94, vol=-25, pan=0.0, rev=0.45)
warm = tr("warm", 89, vol=-27, pan=0.0, rev=0.4)
strl = tr("strl", 49, vol=-20, pan=-0.25, rev=0.35)
strh = tr("strh", 49, vol=-21, pan=0.25, rev=0.4)
trem = tr("trem", 44, vol=-26, pan=0.15, rev=0.4)
fast = tr("fast", 48, vol=-24, pan=-0.1, rev=0.25)
cello = tr("cello", 42, vol=-21, pan=-0.35, rev=0.3)
bass = tr("bass", 43, vol=-24, pan=0.0, rev=0.2)
choir = tr("choir", 52, vol=-24, pan=0.0, rev=0.5)
oohs = tr("oohs", 53, vol=-26, pan=0.1, rev=0.5)
ney = tr("ney", 77, vol=-18.5, pan=0.12, rev=0.45, bend_range=2)
oboe = tr("oboe", 69, vol=-21, pan=0.2, rev=0.35)
kanun = tr("kanun", 107, vol=-23, pan=0.35, rev=0.35)
harp = tr("harp", 46, vol=-23, pan=-0.3, rev=0.4)
oud = tr("oud", 24, vol=-22, pan=-0.2, rev=0.25)
kopuz = tr("kopuz", 106, vol=-23, pan=0.3, rev=0.25)
cel = tr("cel", 8, vol=-27, pan=0.3, rev=0.5)
bells = tr("bells", 14, vol=-26, pan=-0.15, rev=0.55)
horns = tr("horns", 60, vol=-22, pan=-0.15, rev=0.35)
timp = tr("timp", 47, vol=-21, pan=0.0, rev=0.3)
taiko = tr("taiko", 116, vol=-22, pan=0.0, rev=0.25)
perc = tr("perc", 0, bank=128, vol=-23, pan=0.05, rev=0.2, drums=True)
orch = tr("orch", 48, bank=128, vol=-27, pan=0.0, rev=0.3, drums=True)
kalimba = tr("kalimba", 108, vol=-27, pan=0.25, rev=0.4)

# GM vurmalı tuşlar
LOW_CONGA, HI_CONGA, MUTE_CONGA, HI_BONGO, LO_BONGO = 64, 63, 62, 60, 61
TAMB, SHAKER, SIDE, RIDE_BELL, CRASH, SUSP_CYM = 54, 70, 37, 53, 49, 57
BASS_DRUM, LOW_TOM, FLOOR_TOM = 35, 45, 41

def hum(x=0.012):
    return random.uniform(-x, x)

# ---------------------------------------------------------------- müzikal yapıtaşları
def swell_chord(trk, t0, t1, pitches, vel=70, a=1.5, r=1.5, peak=110, base=20):
    """Yaylı/pad için yavaş açılıp kapanan akor (CC11 ifade zarfı)."""
    trk.chord(t0, t1 - t0 + r * 0.6, pitches, vel)
    trk.swells.append((t0, t1 + r * 0.5, a, r, peak, base))

def phrase(trk, t, notes, vel=78, legato=1.0, bendslides=True):
    """notes: [(pitch, dur)] ; ney için küçük süslemeler (kayma, vibrato)."""
    for i, (p, d) in enumerate(notes):
        if p is None:
            t += d; continue
        v = vel * (0.9 + 0.2 * random.random())
        trk.note(t + hum(0.01), d * legato, p, v)
        if trk is ney and bendslides:
            if d >= 0.9:   # uzun notada gecikmeli vibrato
                for k in range(int(d / 0.12)):
                    tt = t + 0.35 + k * 0.12
                    if tt > t + d - 0.1: break
                    trk.bend(tt, 0.12 * math.sin(k * 1.9) * min(1, k / 3))
                trk.bend(t + d - 0.05, 0)
            if i > 0 and random.random() < 0.35:   # nota girişinde küçük kayma
                trk.bend(t, -0.35); trk.bend(t + 0.06, -0.15); trk.bend(t + 0.12, 0)
        t += d
    return t

def arp(trk, t0, t1, pitches, step, vel=60, pattern=None, accent=1.15):
    pattern = pattern or list(range(len(pitches)))
    t, i = t0, 0
    while t < t1 - 0.05:
        p = pitches[pattern[i % len(pattern)]]
        v = vel * (accent if i % len(pattern) == 0 else 1.0) * (0.88 + 0.24 * random.random())
        trk.note(t + hum(0.008), step * 1.8, p, v)
        t += step; i += 1

def maksum(t0, t1, bpm, vel=70, tamb=True):
    """Makam ritmi Maksum (4/4): Düm Tek - Tek Düm - Tek -"""
    beat = 60 / bpm
    pat = [(0, LOW_CONGA, 1.0), (0.5, HI_BONGO, 0.7), (1.0, MUTE_CONGA, 0.5), (1.5, HI_BONGO, 0.75), (2.0, LOW_CONGA, 0.85),
           (2.5, MUTE_CONGA, 0.45), (3.0, HI_BONGO, 0.75), (3.5, HI_BONGO, 0.45)]
    t = t0
    while t < t1 - 0.05:
        for off, k, a in pat:
            tt = t + off * beat
            if tt >= t1: break
            perc.note(tt + hum(0.008), 0.2, k, vel * a * (0.85 + 0.3 * random.random()))
            if tamb and off in (1.0, 3.0):
                perc.note(tt + hum(0.008), 0.2, TAMB, vel * 0.35)
        t += 4 * beat

def heartbeat(t0, t1, bpm, vel=70, trk=None):
    trk = trk or taiko
    beat = 60 / bpm
    t = t0
    while t < t1 - 0.05:
        trk.note(t, 0.6, m("D2"), vel)
        trk.note(t + beat * 0.42, 0.6, m("D2"), vel * 0.6)
        t += beat * 2

def gallop(t0, t1, bpm, vel=70):
    beat = 60 / bpm
    t = t0
    while t < t1 - 0.05:
        for off, k, a in [(0, LOW_TOM, 1.0), (0.33, FLOOR_TOM, 0.6), (0.66, LOW_TOM, 0.75), (1.0, LOW_TOM, 0.9), (1.33, FLOOR_TOM, 0.55), (1.66, LOW_TOM, 0.7)]:
            if t + off * beat < t1: perc.note(t + off * beat + hum(0.006), 0.15, k, vel * a)
        t += 2 * beat

def timp_roll(t0, t1, pitch, v0=30, v1=100):
    t = t0
    n = 0
    while t < t1:
        f = (t - t0) / max(0.01, t1 - t0)
        timp.note(t, 0.12, pitch, v0 + (v1 - v0) * f * f)
        t += 0.07 if n % 2 else 0.065
        n += 1

def hit(t, root=m("D2"), big=1.0, chord=None):
    """Bölüm geçişi vuruşu: timpani + yaylı/koro sforzando."""
    timp.note(t, 2.5, root, 110 * big)
    timp.note(t + 0.02, 2.5, root + 7, 70 * big)
    taiko.note(t, 2.0, m("D2"), 95 * big)
    orch.note(t, 3.0, SUSP_CYM, 60 * big)
    ch = chord or [m("D3"), m("A3"), m("D4"), m("F#4"), m("A4")]
    strl.chord(t, 3.2, ch[:3], 100 * big)
    strh.chord(t, 3.2, ch[2:], 92 * big)
    choir.chord(t + 0.05, 3.4, [p + 12 for p in ch[1:4]], 80 * big)
    for trk in (strl, strh, choir):
        trk.ramp(t - 0.02, t + 0.5, 11, 120, 118); trk.ramp(t + 0.5, t + 3.2, 11, 118, 40)

# ---------------------------------------------------------------- akor dizileri
D = m("D3")
CH = {
    "Dm": [D, D + 7, D + 12, D + 15, D + 19], "D": [D, D + 7, D + 12, D + 16, D + 19],
    "Eb": [D + 1, D + 8, D + 13, D + 17, D + 20], "Bb": [D - 4, D + 3, D + 8, D + 12, D + 15],
    "Gm": [D - 7, D + 5, D + 8, D + 12, D + 17], "G": [D - 7, D + 5, D + 9, D + 12, D + 17],
    "Cm": [D - 2, D + 5, D + 10, D + 13, D + 17], "C": [D - 2, D + 5, D + 10, D + 14, D + 17],
    "F": [D + 3, D + 10, D + 15, D + 19, D + 22], "A": [D - 5, D + 7, D + 11, D + 14, D + 19],
    "Asus": [D - 5, D + 7, D + 12, D + 14, D + 19], "Bm": [D - 3, D + 9, D + 12, D + 16, D + 21],
    "Em": [D - 10, D + 2, D + 9, D + 14, D + 17], "Dadd9": [D, D + 7, D + 14, D + 15, D + 19],
}

def chords_over(t0, t1, names, layers=("pad", "strl"), vel=64, peak=100, base=25):
    if not names or t1 <= t0: return
    seg = (t1 - t0) / len(names)
    for i, nm in enumerate(names):
        a, b = t0 + i * seg, t0 + (i + 1) * seg
        c = CH[nm]
        for L in layers:
            trk = TR[L]
            if L == "pad": swell_chord(trk, a, b + 0.4, [c[0], c[1], c[2], c[3]], vel, a=min(2.0, seg * 0.4), r=min(2.0, seg * 0.4), peak=peak, base=base)
            elif L == "strl": swell_chord(trk, a, b + 0.3, [c[0] - 12, c[0], c[1]], vel, a=min(2.0, seg * 0.4), r=min(2.0, seg * 0.4), peak=peak, base=base)
            elif L == "strh": swell_chord(trk, a, b + 0.3, [c[2], c[3], c[4]], vel, a=min(2.0, seg * 0.45), r=min(2.0, seg * 0.45), peak=peak, base=base)
            elif L == "choir": swell_chord(trk, a, b + 0.3, [c[1] + 12, c[2] + 12, c[3] + 12], vel, a=min(2.5, seg * 0.5), r=min(2.5, seg * 0.5), peak=peak, base=base)
            elif L == "oohs": swell_chord(trk, a, b + 0.3, [c[2], c[3], c[4]], vel, a=min(2.5, seg * 0.5), r=min(2.5, seg * 0.5), peak=peak, base=base)
            elif L == "warm": swell_chord(trk, a, b + 0.4, [c[0], c[2], c[3]], vel, a=min(2.0, seg * 0.4), r=min(2.0, seg * 0.4), peak=peak, base=base)
            elif L == "bass": bass.note(a, b - a + 0.2, c[0] - 12, vel)

# Ney motifleri (Hicaz, D4 = 62)
def hz(*degs_durs, root=m("D4"), sc=HIJAZ):
    return [(None if d is None else scale_note(root, sc, d), du) for d, du in degs_durs]
NEY = [
    hz((4, 1.2), (3, 0.45), (2, 0.45), (1, 0.9), (0, 2.6)),
    hz((0, 0.5), (1, 0.5), (2, 0.9), (3, 0.5), (4, 2.2)),
    hz((4, 0.6), (5, 0.45), (6, 0.45), (5, 0.5), (4, 1.0), (3, 0.45), (2, 0.45), (3, 0.5), (4, 1.8)),
    hz((7, 1.0), (6, 0.5), (5, 0.5), (4, 1.0), (3, 0.4), (2, 0.4), (1, 0.6), (0, 2.6)),
    hz((2, 0.5), (3, 0.5), (4, 1.4), (5, 0.6), (4, 0.6), (3, 0.6), (2, 1.6)),
]

# ---------------------------------------------------------------- bölümler
def windows(sc, minlen=2.4):
    """Sahnede anlatımın olmadığı aralıklar."""
    ws, t = [], sc["start"]
    for l in sc["lines"]:
        if l["start"] - t >= minlen: ws.append((t, l["start"]))
        t = l["end"]
    if sc["end"] - t >= minlen: ws.append((t, sc["end"]))
    return ws

def ney_in_windows(sc, vel=72, maxn=3, motifs=None, root=m("D4"), sc_=HIJAZ):
    k = 0
    for a, b in windows(sc):
        if k >= maxn: break
        mot = (motifs or NEY)[random.randrange(len(motifs or NEY))]
        if root != m("D4") or sc_ is not HIJAZ:
            mot = [(None if p is None else p - m("D4") + root, d) for p, d in mot]
        dur = sum(d for _, d in mot)
        if b - a < dur * 0.6: continue
        phrase(ney, a + 0.3, mot, vel)
        k += 1

def S(id_):
    return SC[id_]

def compose():
    # 0) Besmele
    s = S("bismillah")
    swell_chord(pad, 0.0, s["end"] + 1.5, [m("D2"), m("A2"), m("D3")], 70, a=3.0, r=2.5, peak=105)
    swell_chord(strl, 1.0, s["end"] + 1.5, [m("D2"), m("A2")], 55, a=3.0, r=2.0, peak=80)
    phrase(ney, 1.2, hz((4, 1.6), (3, 0.5), (2, 0.5), (1, 1.0), (0, 2.6)), 74)
    for i, p in enumerate([m("A5"), m("D6"), m("F#5"), m("A5"), m("D6")]):
        cel.note(0.9 + i * 0.55, 2.5, p, 42)
    # 1) Giriş
    s = S("intro")
    t0, t1 = s["start"], s["end"]
    swell_chord(bass, t0, t1, [m("D2")], 60, a=3, r=2, peak=90, base=40)
    chords_over(t0, t1 - 1.5, ["Dm", "Bb", "Gm", "Asus"], layers=("pad", "strl"), vel=60, peak=92)
    ney_in_windows(s, 70, 2)
    arp(kanun, s["lines"][2]["start"], s["lines"][3]["end"], [m("D4"), m("A4"), m("D5"), m("Eb5"), m("D5"), m("A4")], 0.32, 46)
    timp_roll(t1 - 3.2, t1 + 1.3, m("D2"), 20, 95)
    orch.note(t1 - 2.8, 4.0, SUSP_CYM, 40)
    # 2) Başlık
    s = S("title")
    t0, t1 = s["start"], s["end"]
    hit(t0 + 1.4, big=1.0, chord=CH["Dm"])
    chords_over(t0 + 1.4, t1 + 1.0, ["Dm", "Bb", "Gm", "A"], layers=("pad", "strl", "strh", "choir"), vel=72, peak=110)
    bass.note(t0 + 1.4, t1 - t0, m("D1") + 12, 80)
    theme = hz((0, 1.2), (4, 1.2), (3, 0.6), (2, 0.6), (3, 0.6), (4, 2.2), (5, 0.8), (4, 0.6), (3, 0.6), (2, 0.6), (1, 0.6), (0, 2.4), root=m("D5"))
    phrase(strh, t0 + 2.0, theme, 92)
    strh.ramp(t0 + 2.0, t0 + 4, 11, 60, 115)
    for i, p in enumerate([m("D5"), m("A5"), m("D6")]):
        bells.note(t0 + 1.45 + i * 0.12, 4, p, 60)
    # 3) Bölüm kartları
    chap_chords = {"ch1": CH["Dm"], "ch2": CH["D"], "ch3": CH["Dm"], "ch4": CH["Dm"], "ch5": CH["Gm"], "ch6": CH["D"], "ch7": CH["Dm"], "ch8": CH["D"]}
    for cid, chd in chap_chords.items():
        s = S(cid)
        hit(s["start"] + 0.35, big=0.85, chord=chd)
        phrase(ney, s["start"] + 1.4, hz((4, 0.8), (3, 0.35), (2, 0.35), (1, 0.6), (0, 1.6)), 60)
    # 4) Mekke
    s = S("mecca")
    t0, t1 = s["start"], s["end"]
    l2 = s["lines"][2]["start"]
    arp(kanun, t0 + 0.5, l2, [m("D3"), m("A3"), m("D4"), m("Eb4"), m("F#4"), m("A4"), m("F#4"), m("Eb4")], 0.36, 50)
    chords_over(t0, l2, ["D", "Gm", "D", "Eb"], layers=("pad", "strl"), vel=58, peak=88)
    chords_over(l2, t1 + 0.6, ["Dm", "Eb"], layers=("pad", "strl", "oohs"), vel=58, peak=86)
    heartbeat(l2, t1, 60, 55)
    ney_in_windows(s, 68, 2)
    # 5) Doğum ve gençlik
    s = S("birth")
    t0, t1 = s["start"], s["end"]
    l3 = s["lines"][3]["start"]
    chords_over(t0, l3, ["D", "G", "Bm", "A", "D", "G"], layers=("pad", "strl", "strh"), vel=58, peak=90)
    arp(harp, t0 + 0.4, l3, [m("D3"), m("A3"), m("D4"), m("F#4"), m("A4"), m("F#4")], 0.3, 48)
    phrase(oboe, s["lines"][1]["start"] - 0.2, [(m("A4"), 1.2), (m("F#4"), 0.6), (m("G4"), 0.6), (m("A4"), 1.6), (m("B4"), 0.8), (m("A4"), 0.8), (m("F#4"), 2.0)], 56)
    for i, p in enumerate([m("D6"), m("A5"), m("F#5"), m("D5")]):
        cel.note(s["lines"][2]["start"] + 0.6 + i * 0.4, 2.0, p, 46)
    # kervan: Maksum ritmi + ud
    chords_over(l3, t1 + 0.8, ["Dm", "C", "Dm"], layers=("pad", "strl"), vel=56, peak=86)
    maksum(l3, t1 + 0.5, 92, 62)
    arp(oud, l3, t1 + 0.5, [m("D3"), m("D3"), m("A3"), m("D3"), m("Eb3"), m("D3"), m("C3"), m("D3")], 60 / 92 / 2, 52, accent=1.3)
    # 6) Hira ve vahiy
    s = S("hira")
    t0, t1 = s["start"], s["end"]
    L = s["lines"]
    swell_chord(pad, t0, L[2]["start"], [m("D2"), m("A2"), m("D3"), m("E3")], 58, a=3, r=1.0, peak=92)
    swell_chord(trem, L[0]["start"], L[2]["start"] + 0.5, [m("A4"), m("D5"), m("E5")], 40, a=4, r=0.6, peak=80, base=10)
    swell_chord(strl, L[1]["start"], L[2]["start"] + 0.3, [m("D2"), m("A2"), m("D3")], 60, a=3.5, r=0.5, peak=100, base=20)
    trem.ramp(L[1]["start"], L[2]["start"], 11, 60, 120)
    timp_roll(L[2]["start"] - 2.5, L[2]["start"], m("D2"), 20, 105)
    rev = L[2]["start"]
    timp.note(rev, 3.0, m("D2"), 120)
    orch.note(rev, 4.0, CRASH, 70)
    chords_over(rev, t1 + 1.0, ["D", "D", "G", "D"], layers=("pad", "strl", "strh", "choir"), vel=74, peak=112)
    for i, p in enumerate([m("D5"), m("F#5"), m("A5"), m("D6"), m("A6")]):
        bells.note(rev + i * 0.18, 5, p, 64)
        cel.note(rev + 0.1 + i * 0.22, 4, p + 12, 50)
    bass.note(rev, t1 - rev, m("D2"), 70)
    ney_in_windows(s, 70, 1)
    # 7) Davet ve baskı
    s = S("dawah")
    t0, t1 = s["start"], s["end"]
    L = s["lines"]
    chords_over(t0, L[2]["start"], ["Dm", "Bb", "Gm"], layers=("pad", "strl"), vel=56, peak=86)
    chords_over(L[2]["start"], L[3]["start"], ["Dm", "Eb"], layers=("pad", "strl", "cello"), vel=60, peak=96)
    beat = 60 / 66
    t = L[2]["start"]
    while t < L[3]["start"]:
        for k, p in enumerate([m("D2"), m("D2"), m("Eb2"), m("D2")]):
            cello.note(t + k * beat / 2, beat / 2 * 0.9, p, 70 if k == 0 else 55)
        t += beat * 2
    heartbeat(L[2]["start"], L[3]["start"], 66, 62)
    # Habeşistan: deniz, arp dalgaları
    chords_over(L[3]["start"], L[4]["start"], ["Gm", "D"], layers=("pad", "strh"), vel=56, peak=86)
    arp(harp, L[3]["start"], L[4]["start"], [m("G3"), m("D4"), m("G4"), m("Bb4"), m("D5"), m("Bb4"), m("G4"), m("D4")], 0.25, 46)
    # Hüzün
    chords_over(L[4]["start"], t1 + 0.6, ["Dm", "Bb", "Asus"], layers=("pad", "strl"), vel=54, peak=82)
    phrase(cello, L[4]["start"] + 0.5, [(m("A3"), 1.6), (m("G3"), 0.8), (m("F3"), 0.8), (m("E3"), 1.2), (m("D3"), 2.8)], 62)
    ney_in_windows(s, 66, 2)
    # 8) Hicret yolculuğu
    s = S("hijra")
    t0, t1 = s["start"], s["end"]
    L = s["lines"]
    chords_over(t0, L[3]["start"], ["Dm", "C", "Bb", "C", "Dm", "Eb"], layers=("pad", "strl"), vel=58, peak=90)
    maksum(L[1]["start"], L[3]["start"], 96, 66)
    st = 60 / 96 / 2
    arp(oud, L[1]["start"], L[3]["start"], [m("D3"), m("D3"), m("A3"), m("D3"), m("Eb3"), m("F#3"), m("Eb3"), m("D3")], st, 54, accent=1.3)
    arp(kanun, L[2]["start"], L[3]["start"], [m("D4"), m("F#4"), m("A4"), m("D5"), m("Eb5"), m("D5"), m("A4"), m("F#4")], st, 44)
    fast.ramp(L[2]["start"], L[3]["start"], 11, 30, 100)
    swell_chord(fast, L[2]["start"], L[3]["start"], [m("D3"), m("A3"), m("D4")], 50, a=3, r=0.4, peak=100)
    hit(L[3]["start"] - 0.1, big=0.9, chord=CH["D"])
    chords_over(L[3]["start"], t1 + 1.0, ["D", "G", "D"], layers=("pad", "strl", "strh", "choir"), vel=66, peak=100)
    phrase(ney, L[4]["start"] + 0.2, hz((0, 0.5), (2, 0.5), (4, 1.0), (7, 2.4)), 70)
    # 9) Medine
    s = S("medina")
    t0, t1 = s["start"], s["end"]
    chords_over(t0, t1 + 0.6, ["D", "Bm", "G", "A", "D", "G", "D"], layers=("pad", "strl", "strh"), vel=58, peak=92)
    arp(harp, t0 + 0.3, t1, [m("D3"), m("A3"), m("D4"), m("E4"), m("F#4"), m("A4"), m("F#4"), m("E4")], 0.28, 46)
    ney_in_windows(s, 66, 2, motifs=[hz((0, 0.6), (2, 0.6), (4, 1.4), (5, 0.6), (4, 2.0), sc=MAJOR), hz((4, 1.0), (3, 0.5), (2, 0.5), (1, 0.5), (0, 2.2), sc=MAJOR)])
    # 10) Savaşlar
    s = S("battles")
    t0, t1 = s["start"], s["end"]
    L = s["lines"]
    chords_over(t0, L[3]["start"], ["Dm", "Bb", "C", "Dm", "Bb", "Asus", "Dm"], layers=("pad", "strl"), vel=62, peak=96)
    beat = 60 / 100
    t = L[0]["start"]
    while t < L[3]["start"] - 0.1:
        for k in range(8):
            fast.note(t + k * beat / 2, beat / 2 * 0.8, [m("D3"), m("D3"), m("A3"), m("D3"), m("Eb3"), m("D3"), m("C3"), m("D3")][k], 64 if k % 2 == 0 else 50)
        taiko.note(t, 0.8, m("D2"), 78); taiko.note(t + beat * 1.5, 0.6, m("D2"), 55); taiko.note(t + beat * 2, 0.8, m("D2"), 72)
        timp.note(t + beat * 3, 0.8, m("A1"), 60)
        t += beat * 4
    for lt, ch_ in [(L[1]["start"] + 1.0, [m("D3"), m("A3"), m("D4")]), (L[2]["start"] + 0.5, [m("C3"), m("G3"), m("C4")])]:
        horns.chord(lt, 2.4, ch_, 70)
    # Hudeybiye: sakin
    chords_over(L[3]["start"], L[4]["start"], ["Gm", "D", "G"], layers=("pad", "strh", "oohs"), vel=58, peak=88)
    # Mektuplar: umut dolu korno çağrısı
    chords_over(L[4]["start"], t1 + 0.6, ["D", "G", "A"], layers=("pad", "strl", "strh"), vel=60, peak=94)
    phrase(horns, L[4]["start"] + 1.0, [(m("D4"), 0.6), (m("A4"), 0.9), (m("G4"), 0.4), (m("F#4"), 0.4), (m("A4"), 1.8)], 66)
    # 11) Mekke'nin fethi
    s = S("conquest")
    t0, t1 = s["start"], s["end"]
    L = s["lines"]
    chords_over(t0, L[1]["start"], ["Dm", "C", "Bb", "Asus"], layers=("pad", "strl"), vel=62, peak=96)
    maksum(t0 + 0.5, L[1]["start"], 100, 60)
    timp_roll(L[1]["start"] - 1.6, L[1]["start"], m("D2"), 30, 100)
    timp.note(L[1]["start"], 2.5, m("D2"), 112)
    chords_over(L[1]["start"], t1 + 0.8, ["D", "G", "D", "A", "D"], layers=("pad", "strl", "strh", "choir"), vel=70, peak=108)
    for i, p in enumerate([m("D5"), m("A5"), m("D6")]):
        bells.note(L[1]["start"] + i * 0.15, 4, p, 58)
    # 12) Veda ve vefat
    s = S("farewell")
    t0, t1 = s["start"], s["end"]
    L = s["lines"]
    chords_over(t0, L[2]["start"], ["D", "Bm", "G", "A", "D"], layers=("pad", "strl", "strh"), vel=58, peak=90)
    phrase(oboe, L[1]["start"] - 0.4, [(m("F#4"), 1.0), (m("A4"), 1.0), (m("B4"), 0.6), (m("A4"), 0.6), (m("G4"), 0.6), (m("F#4"), 2.2)], 52)
    chords_over(L[2]["start"], t1 + 0.6, ["Dm", "Bb", "Gm", "Asus"], layers=("pad", "strl", "oohs"), vel=56, peak=86)
    phrase(cello, L[2]["start"] + 0.4, [(m("D4"), 1.4), (m("C4"), 0.7), (m("Bb3"), 0.7), (m("A3"), 1.4), (m("G3"), 0.7), (m("F3"), 0.7), (m("E3"), 1.2), (m("D3"), 3.0)], 58)
    # 13) Dört Halife — yükselen destan
    s = S("caliphs")
    t0, t1 = s["start"], s["end"]
    L = s["lines"]
    chords_over(t0, L[2]["start"], ["Dm", "Bb", "Gm"], layers=("pad", "strl", "choir"), vel=58, peak=88)
    beat = 60 / 96
    t = L[2]["start"]
    seq = ["Dm", "Bb", "C", "Dm", "Gm", "Bb", "C", "D"]
    chords_over(L[2]["start"], t1 + 0.6, (seq * 3)[:int((t1 - L[2]["start"]) / (beat * 8)) + 1], layers=("pad", "strl", "strh"), vel=62, peak=96)
    k = 0
    while t < t1 - 0.2:
        root = CH[seq[int(k) % len(seq)]][0]
        for j in range(16):
            if t + j * beat / 2 >= t1: break
            fast.note(t + j * beat / 2, beat / 2 * 0.8, root + [0, 12, 7, 12][j % 4], 58 if j % 4 == 0 else 46)
        taiko.note(t, 0.8, m("D2"), 70); taiko.note(t + beat * 2, 0.8, m("D2"), 62)
        taiko.note(t + beat * 3.5, 0.5, m("D2"), 50)
        if k % 2 == 0: timp.note(t, 1.0, m("D2"), 62)
        t += beat * 4; k += 0.5
    phrase(horns, L[2]["start"] + 1.0, [(m("D4"), 1.2), (m("A4"), 1.2), (m("Bb4"), 0.6), (m("A4"), 0.6), (m("G4"), 0.6), (m("A4"), 2.4)], 66)
    phrase(horns, L[6]["start"] + 0.4, [(m("A4"), 1.0), (m("D5"), 1.6), (m("C5"), 0.6), (m("Bb4"), 0.6), (m("A4"), 2.4)], 70)
    # 14) Emeviler
    s = S("umayyad")
    t0, t1 = s["start"], s["end"]
    L = s["lines"]
    seq = ["Gm", "Eb", "F", "Gm", "Cm", "Eb", "F", "G"]
    beat = 60 / 100
    chords_over(t0, t1 + 0.6, (seq * 4)[:int((t1 - t0) / (beat * 8)) + 1], layers=("pad", "strl", "strh"), vel=62, peak=96)
    t, k = t0 + 0.4, 0
    while t < t1 - 0.2:
        root = CH[seq[int(k) % len(seq)]][0]
        for j in range(8):
            fast.note(t + j * beat / 2, beat / 2 * 0.8, root + [0, 12, 7, 12][j % 4], 56 if j % 4 == 0 else 44)
        taiko.note(t, 0.8, m("D2"), 72); taiko.note(t + beat * 1.5, 0.5, m("D2"), 52); taiko.note(t + beat * 2, 0.8, m("D2"), 66)
        t += beat * 4; k += 0.5
    maksum(L[1]["start"], L[3]["start"], 100, 48, tamb=True)
    phrase(horns, L[1]["start"] + S("umayyad")["lines"][1]["end"] - L[1]["start"] - 1.0, [(m("G4"), 0.8), (m("D5"), 1.4), (m("C5"), 0.5), (m("Bb4"), 0.5), (m("A4"), 2.0)], 66)
    hit(L[2]["start"] - 0.2, big=0.6, chord=CH["Gm"])
    timp_roll(L[5]["start"], L[5]["start"] + 2.0, m("G1") + 12, 30, 100)
    hit(L[6]["start"] + 1.6, big=0.9, chord=CH["D"])
    chords_over(L[6]["start"] + 1.6, t1 + 0.8, ["D", "G", "D"], layers=("choir",), vel=66, peak=100)
    # 15) Abbasiler — ilim
    s = S("abbasid")
    t0, t1 = s["start"], s["end"]
    L = s["lines"]
    chords_over(t0, L[1]["start"], ["Dm", "Bb"], layers=("pad", "strl"), vel=58, peak=88)
    chords_over(L[1]["start"], L[2]["start"], ["Dm", "C", "Bb", "A"], layers=("pad", "strl"), vel=60, peak=92)
    heartbeat(L[1]["start"], L[2]["start"], 84, 64)
    gallop(L[1]["start"], L[2]["start"], 120, 52)
    lyd = [m("D4"), m("A4"), m("E5"), m("G#4"), m("F#5"), m("A4"), m("E5"), m("D5")]
    chords_over(L[2]["start"], t1 + 0.6, ["D", "Em", "D", "G", "D", "A", "D", "G"], layers=("pad", "strh", "warm"), vel=56, peak=88)
    arp(harp, L[2]["start"] + 0.3, L[4]["start"], [m("D3"), m("A3"), m("E4"), m("F#4"), m("A4"), m("D5"), m("A4"), m("E4")], 0.27, 46)
    arp(cel, L[3]["start"], t1, lyd, 0.27 * 2, 36)
    arp(kanun, L[4]["start"], t1, [m("D4"), m("F#4"), m("A4"), m("B4"), m("D5"), m("B4"), m("A4"), m("F#4")], 0.27, 42)
    ney_in_windows(s, 64, 2, motifs=[hz((0, 0.6), (2, 0.6), (4, 1.4), (5, 0.6), (4, 2.0), sc=MAJOR)])
    # 16) Türkler
    s = S("turks")
    t0, t1 = s["start"], s["end"]
    L = s["lines"]
    chords_over(t0, L[3]["start"], ["Dm", "C", "Dm", "F", "C", "Dm"], layers=("pad", "strl"), vel=58, peak=90)
    gallop(L[0]["start"] + 0.5, L[3]["start"], 116, 56)
    pen = [scale_note(m("D3"), PENTA, d) for d in [0, 2, 3, 4, 3, 2, 0, 1]]
    arp(kopuz, L[0]["start"] + 0.5, L[3]["start"], pen, 60 / 116 / 2, 52, accent=1.3)
    timp_roll(L[3]["start"] - 1.5, L[3]["start"] + 1.0, m("D2"), 30, 110)
    hit(L[3]["start"] + 1.0, big=1.0, chord=CH["D"])
    chords_over(L[3]["start"] + 1.0, t1 + 0.8, ["D", "G", "A", "D"], layers=("pad", "strl", "strh", "choir"), vel=66, peak=102)
    phrase(horns, L[3]["start"] + 2.2, [(m("D4"), 0.6), (m("A4"), 0.6), (m("D5"), 1.6), (m("C#5"), 0.5), (m("B4"), 0.5), (m("A4"), 2.2)], 72)
    # 17) Ticaret yolları
    s = S("trade")
    t0, t1 = s["start"], s["end"]
    L = s["lines"]
    chords_over(t0, L[3]["start"], ["D", "Bm", "G", "A", "D", "Bm", "G", "A"], layers=("pad", "strh", "warm"), vel=56, peak=86)
    arp(harp, t0 + 0.3, L[3]["start"], [m("D3"), m("A3"), m("D4"), m("F#4"), m("A4"), m("F#4"), m("D4"), m("A3")], 0.3, 44)
    arp(kalimba, L[1]["start"], L[3]["start"], [m("D5"), m("A5"), m("F#5"), m("E5"), m("A5"), m("D5")], 0.6, 36)
    chords_over(L[3]["start"], t1 + 0.6, ["Dm", "C", "Bb", "C"], layers=("pad", "strl"), vel=58, peak=90)
    beat = 60 / 104
    t = L[3]["start"] + 0.4
    while t < t1 - 0.3:
        for off, kk, a in [(0, LOW_CONGA, 1.0), (0.75, HI_CONGA, 0.6), (1.0, MUTE_CONGA, 0.7), (1.5, HI_CONGA, 0.6), (2.0, LOW_CONGA, 0.9), (2.5, MUTE_CONGA, 0.5), (3.0, HI_CONGA, 0.7), (3.5, SHAKER, 0.5)]:
            perc.note(t + off * beat + hum(0.008), 0.2, kk, 58 * a)
        t += 4 * beat
    arp(kanun, L[3]["start"] + 0.4, t1, [m("D4"), m("F4"), m("A4"), m("C5"), m("A4"), m("F4")], beat / 2, 40)
    # 18) Final
    s = S("finale")
    t0, t1 = s["start"], s["end"]
    L = s["lines"]
    chords_over(t0, L[2]["start"], ["Dm", "Bb", "F", "C", "Dm", "Bb", "Gm", "Asus"], layers=("pad", "strl", "strh"), vel=62, peak=96)
    theme = hz((0, 1.0), (4, 1.0), (3, 0.5), (2, 0.5), (3, 0.5), (4, 2.0), (5, 0.7), (4, 0.5), (3, 0.5), (2, 0.5), (1, 0.5), (0, 2.6), root=m("D5"))
    phrase(strh, L[1]["start"] - 0.2, theme, 74)
    chords_over(L[2]["start"], L[3]["end"] - 0.6, ["Dm", "Eb", "Dm"], layers=("pad", "strl", "choir"), vel=56, peak=88)
    oku = L[3]["end"] - 0.6
    timp_roll(oku - 2.2, oku, m("D2"), 20, 110)
    hit(oku, big=1.1, chord=CH["D"])
    chords_over(oku, S("end")["end"] - 2.0, ["D", "G", "D"], layers=("pad", "strl", "strh", "choir"), vel=70, peak=108)
    for i, p in enumerate([m("D5"), m("F#5"), m("A5"), m("D6"), m("F#6"), m("A6")]):
        bells.note(oku + i * 0.16, 5, p, 60)
        cel.note(oku + 0.08 + i * 0.2, 4, p, 46)
    # 19) Kapanış
    s = S("end")
    phrase(ney, s["start"] + 2.5, hz((4, 1.2), (3, 0.45), (2, 0.45), (1, 0.9), (0, 3.2)), 66)
    swell_chord(bass, oku, s["end"], [m("D2")], 60, a=2, r=4, peak=90)

# ---------------------------------------------------------------- seslendirme
def render_track(trk, total):
    syn = tinysoundfont.Synth(samplerate=SR, gain=-3)
    sfid = syn.sfload(SF2)
    syn.program_select(0, sfid, trk.bank, trk.prog, is_drums=trk.drums)
    syn.pitchbend_range(0, trk.bend_range)
    syn.control_change(0, 7, 110)
    syn.control_change(0, 11, 100 if not trk.swells else 0)
    ev = sorted([e for e in trk.ev + trk.expression_events(total) if e[0] < total], key=lambda e: (e[0], 0 if e[1] in (0, 2, 3) else 1))
    out = np.zeros((int(total * SR) + SR, 2), np.float32)
    pos = 0
    for t, kind, a, b in ev:
        s = int(t * SR)
        if s > pos:
            buf = np.frombuffer(syn.generate(s - pos), dtype=np.float32).reshape(-1, 2)
            out[pos:s] = buf
            pos = s
        if kind == 1: syn.noteon(0, a, b)
        elif kind == 0: syn.noteoff(0, a)
        elif kind == 2: syn.control_change(0, a, b)
        elif kind == 3: syn.pitchbend(0, a)
    if pos < len(out):
        out[pos:] = np.frombuffer(syn.generate(len(out) - pos), dtype=np.float32).reshape(-1, 2)
    return out

def reverb_ir(seconds=3.4, predelay=0.03, seed=3):
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = np.zeros((n + int(predelay * SR), 2), np.float32)
    for ch in range(2):
        noise = rng.standard_normal(n).astype(np.float32)
        env = np.exp(-t * 6.9 / seconds)
        # yüksek frekanslar daha hızlı sönsün
        sos_lp = signal.butter(2, 4500, "low", fs=SR, output="sos")
        bright = noise * env
        dark = signal.sosfilt(sos_lp, noise) * np.exp(-t * 6.9 / (seconds * 1.15))
        mixf = np.clip(t / (seconds * 0.5), 0, 1)
        x = bright * (1 - mixf) + dark * mixf
        ir[int(predelay * SR):, ch] = x
    # erken yansımalar
    for d, g in [(0.011, 0.5), (0.019, 0.38), (0.027, 0.3), (0.041, 0.22)]:
        ir[int(d * SR), 0] += g; ir[int((d + 0.003) * SR), 1] += g
    ir /= np.sqrt((ir ** 2).sum(0, keepdims=True))
    return ir

def limiter(x, ceiling=0.8, release=0.12, hop=48):
    """Basit ileri bakışlı tepe sınırlayıcı (1 ms çözünürlükte kazanç eğrisi)."""
    env = np.abs(x).max(1)
    n = len(env) // hop + 1
    pk = np.array([env[i * hop:(i + 1) * hop + hop * 4].max() if i * hop < len(env) else 0 for i in range(n)])
    need = np.minimum(1.0, ceiling / np.maximum(pk, 1e-9))
    a = math.exp(-hop / (release * SR))
    g = np.empty(n); cur = 1.0
    for i in range(n):
        cur = min(need[i], a * cur + (1 - a) * need[i])
        g[i] = cur
    gs = np.interp(np.arange(len(env)) / hop, np.arange(n), g)
    return x * gs[:, None]

def pan_gains(p):
    a = (p + 1) * math.pi / 4
    return math.cos(a), math.sin(a)

def main():
    global SC
    tl = json.load(open(f"{WORK}/build/timeline.json"))
    SC = {s["id"]: s for s in tl["scenes"]}
    total = tl["duration"] + 2.0
    compose()
    os.makedirs(OUT, exist_ok=True)
    dry = np.zeros((int(total * SR) + SR, 2), np.float32)
    send = np.zeros_like(dry)
    for name, trk in TR.items():
        if not trk.ev: continue
        x = render_track(trk, total)
        # etkin bölümlerdeki RMS'e göre hedef seviyeye getir
        e = np.sqrt(signal.lfilter([1.0], [1, -0.999], (x ** 2).mean(1) * 0.001) + 1e-12)
        act = e > e.max() * 0.03
        rms = np.sqrt((x[act] ** 2).mean()) if act.any() else 1e-6
        x = x * (10 ** (trk.vol / 20) / max(rms, 1e-6))
        mono = x.mean(1)
        gl, gr = pan_gains(trk.pan)
        st = np.stack([mono * gl * 1.4142 * 0.5 + x[:, 0] * 0.5, mono * gr * 1.4142 * 0.5 + x[:, 1] * 0.5], 1)
        n = min(len(dry), len(st))
        dry[:n] += st[:n]
        send[:n] += st[:n] * trk.rev
        print(f"{name:8s} events={len(trk.ev):5d} peak={np.abs(st).max():.3f}", flush=True)
    ir = reverb_ir()
    wet = np.stack([signal.oaconvolve(send[:, c], ir[:, c], mode="full")[:len(send)] for c in range(2)], 1).astype(np.float32)
    mix = dry + wet * 0.55
    # alçak geçiren hafif sıcaklık ve DC temizliği
    sos = signal.butter(2, 28, "high", fs=SR, output="sos")
    mix = signal.sosfilt(sos, mix, axis=0).astype(np.float32)
    rms = np.sqrt((mix ** 2).mean())
    mix *= 10 ** (-20 / 20) / rms
    mix = limiter(mix, 0.8)
    sf.write(f"{OUT}/music.wav", mix.astype(np.float32), SR, subtype="FLOAT")
    print("music.wav", mix.shape[0] / SR, "s; rms dBFS", 20 * np.log10(np.sqrt((mix ** 2).mean())), "peak", np.abs(mix).max())

if __name__ == "__main__":
    main()
