# İslam'ın Doğuşu ve Yayılışı — belgesel video (≈ 9 dakika)

Hira Mağarası'ndaki ilk vahiyden Endülüs'e, Bağdat'ın ilim çağından Malazgirt'e ve
Hint Okyanusu'nun ticaret yollarına uzanan, Türkçe seslendirmeli animasyonlu belgesel.
Seslendirme, özgün fon müziği, harita animasyonları ve illüstrasyonların tamamı bu klasördeki
kodla üretilmiştir.

## Bölümler

| Zaman | Bölüm |
|---|---|
| 0:00 | Besmele · Giriş: iki imparatorluk arasında Arabistan |
| 0:40 | I. Çölün Kalbinde — Mekke, Kâbe, cahiliye; Hz. Muhammed'in doğumu ve gençliği |
| 1:38 | II. Vahiy ve Mekke Yılları (610 – 622) — Hira, ilk vahiy, davet, Habeşistan, Hüzün Yılı |
| 2:45 | III. Hicret ve Medine (622 – 632) — Hicret, Medine Sözleşmesi, Bedir/Uhud/Hendek, Hudeybiye, Mekke'nin fethi, Veda Haccı |
| 4:59 | IV. Dört Halife Dönemi (632 – 661) — Yermük, Kadisiye, Kudüs, Mısır |
| 5:40 | V. Emeviler (661 – 750) — Endülüs, Maveraünnehir, Sind, İstanbul kuşatmaları, Puvatya |
| 6:28 | VI. Abbasiler ve İlmin Altın Çağı — Talas, Bağdat, Beytü'l-Hikme, Harezmî, İbn Sînâ |
| 7:12 | VII. Türkler ve İslam — Karahanlılar, Gazneliler, Selçuklular, Malazgirt |
| 7:43 | VIII. Ticaret Yollarında İslam — Hint Okyanusu, Endonezya, Mansa Musa ve Timbuktu |
| 8:20 | Kapanış: bugün ≈ 2 milyar Müslüman · "Oku!" |

Peygamberler ve sahabe hiçbir sahnede tasvir edilmez; anlatım harita, hat sanatı,
mimari siluet ve geometrik desenlerle yapılır.

## Nasıl üretildi?

| Katman | Yöntem |
|---|---|
| Senaryo | `src/script.py` — 16 sahne, 72 cümle |
| Seslendirme | Piper TTS, Türkçe **Fahrettin** sesi. Her cümle 4–8 kez seslendirilip Whisper (turbo) ile yazıya dökülür; en anlaşılır ve en canlı tonlamalı deneme seçilir (`src/tts.py`). Son miksin anlaşılırlık testinde ortalama karakter hata oranı ≈ %1 (`src/asr_check.py`). |
| Müzik | Tamamen özgün, algoritmik beste: Hicaz/Kürdî/Rast renkleri, ney (şakuhaçi), kanun (koto), ud, yaylılar, koro, timpani, taiko, Maksum usulü. GeneralUser GS ses bankasıyla seslendirilir (`src/music.py`). |
| Ses miksi | Seslendirme EQ/kompresör/oda yankısı, konuşmada müziği otomatik kısma, geçiş efektleri, rüzgâr ve dalga ambiyansı, −15 LUFS (`src/mix.py`). |
| Haritalar | AWS Terrain Tiles yükseklik verisinden çok yönlü kabartma + NASA Blue Marble renkleri, Web Mercator; 4 yakınlaştırma seviyesi dikişsiz harmanlanır (`src/make_basemap.py`, `src/blend_edges.py`). Dönem sınırları Natural Earth kıyılarına kırpılmış yaklaşık çizimlerdir (`src/prep_geo.py`). |
| Animasyon | HTML canvas sahneleri (`render/*.js`), Chromium + Playwright ile kare kare çizilir (`render/render.cjs`). |
| Altyazı | Zaman çizelgesinden otomatik `.srt` ve stilli `.ass` (`src/subs.py`). |

## Yeniden üretmek

```bash
export WORK=/tmp/claude-0/work   # büyük veriler (yükseklik karoları, modeller) burada
python3 src/tts.py 4             # seslendirme (Piper sesi ve Whisper modeli $WORK/models altında)
python3 src/make_basemap.py z4 && python3 src/make_basemap.py z5 && python3 src/make_basemap.py z7 && python3 src/make_basemap.py z9
python3 src/blend_edges.py && python3 src/prep_geo.py
./render_all.sh                  # zaman çizelgesi, müzik, miks, kareler ve son MP4 dosyaları
```

## Kaynaklar ve lisanslar

- Ses: [Piper](https://github.com/rhasspy/piper) · Fahrettin sesi (veri seti CC0)
- Ses bankası: [GeneralUser GS](https://github.com/mrbumpy409/GeneralUser-GS) (müzik üretiminde serbest kullanım)
- Yükseklik: AWS Terrain Tiles (Mapzen; SRTM, GMTED2010, ETOPO1 vb. kaynaklar)
- Uydu renkleri: NASA Blue Marble · Kıyı/nehir/göl: [Natural Earth](https://www.naturalearthdata.com) (kamu malı)
- 600 yılı sınırları: [historical-basemaps](https://github.com/aourednik/historical-basemaps) (GPL-3.0)
- Yazı tipleri: Cinzel, Cormorant Garamond, Amiri, Aref Ruqaa, Inter (SIL OFL)

Haritalardaki sınırlar ve bazı tarihler yaklaşıktır; ayrıntılı akademik kullanım için
kaynaklarla karşılaştırınız.
