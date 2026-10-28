# -*- coding: utf-8 -*-
"""Altyazı metnini seslendirme motoru için okunuşa çevirir (sayılar, kısaltmalar, özel adlar)."""
import re
ONES = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"]
TENS = ["", "on", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"]

def num_words(n):
    if n == 0: return "sıfır"
    parts = []
    th, rest = divmod(n, 1000)
    if th:
        parts.append("bin" if th == 1 else num_words(th) + " bin")
    h, rest = divmod(rest, 100)
    if h:
        parts.append("yüz" if h == 1 else ONES[h] + " yüz")
    t, o = divmod(rest, 10)
    if t: parts.append(TENS[t])
    if o: parts.append(ONES[o])
    return " ".join(parts)

REPL = [
    (r"\bHz\.", "Hazreti"),
    (r"Kur'an-ı Kerim", "Kuranı Kerim"),
    (r"Kur'an", "Kuran"),
    (r"Beytü'l-Hikme", "Beytül Hikme"),
    (r"el-Emin", "el Emin"),
    (r"el-Ensari", "el Ensari"),
    (r"Mescid-i Nebevi", "Mescidi Nebevi"),
    (r"Kâbe", "Kabe"),
    (r"Âmine", "Amine"),
    (r"âlim", "alim"),
    (r"hâlâ", "hala"),
]

def tts_text(s):
    for a, b in REPL:
        s = re.sub(a, b, s)
    s = re.sub(r"(\d+)'(\w+)", lambda m: num_words(int(m.group(1))) + m.group(2), s)
    s = re.sub(r"\d+", lambda m: num_words(int(m.group(0))), s)
    return s

if __name__ == "__main__":
    for t in ["571 yılında", "1324'teki", "661'de", "628'de", "1071'de", "Hz. Muhammed", "732'deki"]:
        print(t, "->", tts_text(t))
