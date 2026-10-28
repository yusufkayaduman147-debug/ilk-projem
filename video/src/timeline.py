# -*- coding: utf-8 -*-
"""Seslendirme sürelerinden videonun ana zaman çizelgesini (timeline.json) üretir."""
import os, sys, json
import soundfile as sf
sys.path.insert(0, os.path.dirname(__file__))
from script import SCENES

WORK = os.environ.get("WORK", "/tmp/claude-0/work")
VOICE = f"{WORK}/build/voice"
LINES = {s["id"]: s["lines"] for s in SCENES}

# (id, tür, ayarlar) — 'card' sahneleri anlatımsızdır
SEQ = [
    ("bismillah", "card", dict(dur=7.0)),
    ("intro", "narr", dict(pre=1.6, post=1.4)),
    ("title", "card", dict(dur=9.5)),
    ("ch1", "chapter", dict(dur=4.2, num="I", title="Çölün Kalbinde", years="VI. – VII. yüzyıl")),
    ("mecca", "narr", dict(pre=1.2, post=1.2)),
    ("birth", "narr", dict(pre=1.4, post=1.2, gaps={1: 0.8, 2: 0.6})),
    ("ch2", "chapter", dict(dur=4.2, num="II", title="Vahiy ve Mekke Yılları", years="610 – 622")),
    ("hira", "narr", dict(pre=2.6, post=2.0, gaps={1: 1.6, 2: 2.6})),
    ("dawah", "narr", dict(pre=1.2, post=1.4, gaps={0: 0.8, 2: 0.7, 3: 0.8})),
    ("ch3", "chapter", dict(dur=4.2, num="III", title="Hicret ve Medine", years="622 – 632")),
    ("hijra", "narr", dict(pre=1.2, post=1.6, gaps={1: 0.6, 2: 1.4, 3: 0.8})),
    ("medina", "narr", dict(pre=1.6, post=1.4, gaps={0: 0.8, 1: 0.8})),
    ("battles", "narr", dict(pre=1.0, post=1.2, gaps={1: 0.8, 2: 0.8, 3: 0.6})),
    ("conquest", "narr", dict(pre=1.2, post=1.6, gaps={0: 0.8, 1: 0.8})),
    ("farewell", "narr", dict(pre=1.6, post=2.0, gaps={0: 1.0, 1: 1.6})),
    ("ch4", "chapter", dict(dur=4.2, num="IV", title="Dört Halife Dönemi", years="632 – 661")),
    ("caliphs", "narr", dict(pre=1.0, post=1.8, gaps={0: 0.6, 1: 0.7, 2: 0.4, 3: 0.7, 4: 0.6, 5: 0.6})),
    ("ch5", "chapter", dict(dur=4.2, num="V", title="Emeviler", years="661 – 750")),
    ("umayyad", "narr", dict(pre=1.0, post=1.8, gaps={0: 0.6, 1: 0.4, 2: 0.7, 3: 0.8, 4: 0.7, 5: 0.6})),
    ("ch6", "chapter", dict(dur=4.2, num="VI", title="Abbasiler ve İlmin Altın Çağı", years="750 – 1258")),
    ("abbasid", "narr", dict(pre=1.0, post=1.6, gaps={0: 0.5, 1: 0.9, 2: 0.9, 3: 0.8, 4: 0.8})),
    ("ch7", "chapter", dict(dur=4.2, num="VII", title="Türkler ve İslam", years="X. – XI. yüzyıl")),
    ("turks", "narr", dict(pre=1.0, post=1.8, gaps={0: 0.6, 1: 0.6, 2: 0.6})),
    ("ch8", "chapter", dict(dur=4.2, num="VIII", title="Ticaret Yollarında İslam", years="VIII. – XV. yüzyıl")),
    ("trade", "narr", dict(pre=1.0, post=1.6, gaps={0: 0.7, 1: 0.6, 2: 0.7})),
    ("finale", "narr", dict(pre=1.4, post=1.2, gaps={0: 0.9, 1: 0.9, 2: 1.2})),
    ("end", "card", dict(dur=13.0)),
]
GAP = 0.55  # cümleler arası varsayılan sessizlik

def line_dur(sid, i, text):
    p = f"{VOICE}/{sid}_{i:02d}.wav"
    if os.path.exists(p):
        return sf.info(p).duration, p
    return 0.42 * len(text.split()) + 0.4, None

def build():
    t = 0.0
    scenes = []
    for sid, kind, opt in SEQ:
        sc = dict(id=sid, kind=kind, start=round(t, 3), lines=[])
        sc.update({k: v for k, v in opt.items() if k not in ("dur", "pre", "post", "gaps")})
        if kind == "narr":
            t += opt.get("pre", 1.0)
            lines = LINES[sid]
            for i, text in enumerate(lines):
                d, p = line_dur(sid, i, text)
                sc["lines"].append(dict(start=round(t, 3), end=round(t + d, 3), text=text, wav=p))
                t += d
                if i < len(lines) - 1:
                    t += opt.get("gaps", {}).get(i, GAP)
            t += opt.get("post", 1.0)
        else:
            t += opt["dur"]
        sc["end"] = round(t, 3)
        scenes.append(sc)
    tl = dict(fps=30, width=1920, height=1080, duration=round(t, 3), scenes=scenes)
    os.makedirs(f"{WORK}/build", exist_ok=True)
    json.dump(tl, open(f"{WORK}/build/timeline.json", "w"), ensure_ascii=False, indent=1)
    missing = sum(1 for s in scenes for l in s["lines"] if not l["wav"])
    print(f"duration {t:.1f}s ({t/60:.2f} min), scenes {len(scenes)}, lines missing audio: {missing}")
    return tl

if __name__ == "__main__":
    build()
