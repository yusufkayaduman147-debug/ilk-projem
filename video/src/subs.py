# -*- coding: utf-8 -*-
"""Zaman çizelgesinden Türkçe altyazı üretir: .srt (her oynatıcı için) ve .ass (videoya gömmek için, özel stil)."""
import os, re, json

WORK = os.environ.get("WORK", "/tmp/claude-0/work")
MAXC = 84      # bir altyazı karesinde en fazla karakter (iki satır)
ROW = 46       # bir satırda hedef karakter

def chunks(text):
    """Uzun cümleyi noktalama yerlerinden, iki satırı aşmayacak parçalara böler."""
    if len(text) <= MAXC: return [text]
    parts = [p.strip() for p in re.split(r"(?<=[.;:!?])\s+", text) if p.strip()]
    out = []
    for p in parts:
        if len(p) <= MAXC: out.append(p); continue
        sub = [s.strip() for s in re.split(r"(?<=,)\s+", p)]
        cur = ""
        for s in sub:
            if cur and len(cur) + 1 + len(s) > MAXC: out.append(cur); cur = s
            else: cur = (cur + " " + s).strip()
        if cur: out.append(cur)
    # çok kısa parçaları komşusuyla birleştir
    merged = []
    for p in out:
        if merged and (len(p) < 22 or len(merged[-1]) < 22) and len(merged[-1]) + 1 + len(p) <= MAXC: merged[-1] += " " + p
        else: merged.append(p)
    return merged

def two_rows(s):
    if len(s) <= ROW: return [s]
    words = s.split(" ")
    best, bi = 1e9, 1
    for i in range(1, len(words)):
        a, b = " ".join(words[:i]), " ".join(words[i:])
        score = abs(len(a) - len(b)) + (0 if a.endswith((",", ";", ":")) else 6)
        if score < best: best, bi = score, i
    return [" ".join(words[:bi]), " ".join(words[bi:])]

def events(tl):
    ev = []
    lines = [l for s in tl["scenes"] for l in s["lines"]]
    for k, l in enumerate(lines):
        cs = chunks(l["text"])
        total = sum(len(c) for c in cs)
        t = l["start"]
        dur = l["end"] - l["start"]
        nxt = lines[k + 1]["start"] if k + 1 < len(lines) else l["end"] + 2
        for i, c in enumerate(cs):
            d = dur * len(c) / total
            a = t - (0.08 if i == 0 else 0)
            b = t + d + (min(0.35, max(0, nxt - l["end"] - 0.1)) if i == len(cs) - 1 else -0.02)
            ev.append((a, b, two_rows(c)))
            t += d
    return ev

def ts_srt(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def ts_ass(t):
    cs = int(round(t * 100)); h, cs = divmod(cs, 360000); m, cs = divmod(cs, 6000); s, cs = divmod(cs, 100)
    return f"{h:d}:{m:02d}:{s:02d}.{cs:02d}"

def main(outdir):
    tl = json.load(open(f"{WORK}/build/timeline.json"))
    ev = events(tl)
    os.makedirs(outdir, exist_ok=True)
    with open(f"{outdir}/islamin_dogusu_ve_yayilisi.tr.srt", "w", encoding="utf-8") as f:
        for i, (a, b, rows) in enumerate(ev, 1):
            f.write(f"{i}\n{ts_srt(a)} --> {ts_srt(b)}\n" + "\n".join(rows) + "\n\n")
    head = """[Script Info]
Title: İslam'ın Doğuşu ve Yayılışı
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Anlati,Inter SemiBold,46,&H00F4F1EA,&H000000FF,&H8C000000,&H96000000,0,0,0,0,100,100,0.4,0,1,2.6,1.4,2,200,200,62,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    with open(f"{WORK}/build/subs.ass", "w", encoding="utf-8") as f:
        f.write(head)
        for a, b, rows in ev:
            f.write(f"Dialogue: 0,{ts_ass(a)},{ts_ass(b)},Anlati,,0,0,0,,{{\\fad(120,160)}}" + "\\N".join(rows) + "\n")
    print(len(ev), "subtitle events")

if __name__ == "__main__":
    import sys
    main(sys.argv[1] if len(sys.argv) > 1 else f"{WORK}/build")
