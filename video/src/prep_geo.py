# -*- coding: utf-8 -*-
"""Harita katmanları: dönem sınırları (karaya kırpılmış), nehirler, yerler -> Web Mercator z0 koordinatları."""
import json, math
from shapely.geometry import shape, Polygon, MultiPolygon, LineString, box, mapping
from shapely.ops import unary_union
import os
WORK = os.environ.get("WORK", "/tmp/claude-0/work")
D = f"{WORK}/data"
OUT = f"{WORK}/build/geo.json"

def merc(lon, lat):
    lat = max(min(lat, 85), -85)
    x = (lon + 180) / 360 * 256
    r = math.radians(lat)
    y = (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * 256
    return round(x, 4), round(y, 4)

REGION = box(-35, -30, 155, 65)
land = unary_union([shape(f["geometry"]).buffer(0) for f in json.load(open(f"{D}/ne_50m_land.geojson"))["features"]]).intersection(REGION)
lakes = unary_union([shape(f["geometry"]).buffer(0) for f in json.load(open(f"{D}/ne_50m_lakes.geojson"))["features"]]
                    + [shape(f["geometry"]).buffer(0) for f in json.load(open(f"{D}/ne_10m_lakes_historic.geojson"))["features"]])
land = land.difference(lakes)

def polys_out(geom, simp=0.03, min_area=0.02):
    geom = geom.simplify(simp, preserve_topology=True)
    ps = [geom] if isinstance(geom, Polygon) else list(getattr(geom, "geoms", []))
    out = []
    for p in ps:
        if not isinstance(p, Polygon) or p.area < min_area: continue
        rings = [p.exterior] + list(p.interiors)
        out.append([[c for lo, la in r.coords for c in merc(lo, la)] for r in rings])
    return out

def terr(coords, extra_cut=None):
    g = Polygon(coords).buffer(0).intersection(land)
    if extra_cut is not None: g = g.difference(extra_cut)
    return g

# --- dönem sınırları (yaklaşık; lon, lat) ---
T632 = [(34.6,29.4),(35.4,29.6),(36.4,30.0),(38.0,30.3),(39.9,30.0),(41.5,29.8),(43.5,29.5),(46.5,29.4),(48.5,29.9),(51.5,27.5),(57.5,26.8),(60.5,23.0),
        (60.5,15.0),(52.0,11.0),(43.5,11.8),(42.5,13.8),(40.8,16.6),(38.5,19.8),(36.4,23.4),(34.6,27.0)]
T661 = [(10.8,34.3),(15.0,33.6),(20.0,33.2),(24.5,32.8),(29.0,31.9),(32.5,31.8),(33.8,32.4),(34.4,33.6),(35.3,35.6),(35.4,36.6),(36.0,37.0),
        (37.2,37.3),(38.4,38.0),(39.6,38.3),(40.8,39.0),(42.0,40.4),(43.2,41.1),(45.0,41.6),(46.6,41.9),(48.3,42.1),(49.3,41.0),(49.4,39.2),
        (49.0,38.0),(49.6,37.1),(51.5,36.5),(53.6,36.3),(54.6,37.2),(56.0,38.0),(58.5,38.2),(60.5,38.6),(62.5,38.6),(64.5,38.1),(66.5,37.6),
        (67.8,37.25),(68.0,36.5),(66.8,35.2),(65.0,33.8),(64.2,31.8),(63.6,30.0),(63.6,28.0),(64.8,26.4),(65.6,25.2),(65.6,23.5),(60.5,15.0),
        (52.0,11.0),(43.5,11.8),(42.5,13.8),(40.8,16.6),(38.5,19.8),(36.4,23.4),(35.7,23.0),(33.0,22.2),(31.4,22.0),(29.5,24.0),(25.0,24.5),
        (24.6,29.0),(20.0,29.2),(15.5,29.6),(13.0,30.5),(10.8,31.5)]
T750 = [(-9.5,42.2),(-7.6,42.4),(-6.0,42.7),(-4.0,42.8),(-2.0,42.7),(0.0,42.7),(1.5,42.4),(2.4,42.7),(2.8,43.6),(4.0,44.0),(4.9,43.9),(5.0,43.0),
        (3.5,42.0),(1.0,40.5),(0.5,39.0),(-0.5,37.5),(-2.0,36.6),(1.0,37.2),(4.0,37.6),(8.0,37.8),(10.5,38.0),(11.6,37.2),(11.4,35.0),
        (15.0,33.6),(20.0,33.2),(24.5,32.8),(29.0,31.9),(32.5,31.8),(33.8,32.4),(34.4,33.6),(35.3,35.6),(35.4,36.6),(36.0,37.0),(37.2,37.6),
        (38.5,38.6),(39.6,38.6),(40.8,39.3),(41.6,41.1),(41.7,41.9),(43.5,42.3),(45.5,42.4),(47.3,42.3),(48.3,42.15),(49.3,41.0),(49.4,39.2),
        (49.0,38.0),(49.6,37.1),(51.5,36.5),(53.6,36.3),(54.6,37.2),(56.0,38.0),(57.0,39.5),(58.5,42.3),(60.0,43.6),(61.5,44.0),(63.5,43.2),
        (65.5,42.6),(67.5,42.4),(69.3,42.0),(70.8,41.6),(72.6,41.2),(72.4,40.0),(71.3,39.4),(71.0,38.0),(70.7,37.2),(69.6,36.4),(67.4,35.4),
        (66.0,34.3),(65.0,32.5),(66.4,30.6),(68.6,30.2),(70.2,31.2),(71.8,30.9),(72.6,29.6),(71.6,28.0),(70.8,26.2),(70.4,24.6),(69.0,23.6),
        (68.0,22.5),(60.5,15.0),(52.0,11.0),(43.5,11.8),(42.5,13.8),(40.8,16.6),(38.5,19.8),(36.4,23.4),(35.7,23.0),(33.0,22.2),(31.4,22.0),
        (29.5,24.0),(25.0,24.5),(24.6,27.5),(20.0,27.2),(15.5,27.2),(11.5,29.0),(8.0,30.5),(5.0,31.0),(2.0,31.0),(-1.5,30.4),(-4.5,29.6),
        (-8.0,29.0),(-10.5,28.8),(-14.0,28.0),(-12.0,33.0),(-10.0,36.0),(-11.0,40.0)]
# Abbasiler (~800): Endülüs, Fas ve Septimanya hariç; Taberistan dahil
T800_CUT = unary_union([Polygon([(-15,27),(-1.9,27),(-1.9,35.97),(-15,35.97)]),
                        Polygon([(-12,36.0),(-5.5,36.0),(-2.0,36.6),(0.0,38.0),(6.0,38.5),(6.0,45.0),(-12,45.0)])])
TABARISTAN = Polygon([(48.8,38.6),(49.6,37.1),(51.5,36.4),(53.6,36.2),(54.8,37.3),(53.5,37.8),(50.5,37.8)])
KARAHAN = [(62.8,40.6),(64.2,41.7),(66.2,42.6),(68.5,43.6),(71.0,44.6),(74.0,45.0),(77.5,44.8),(80.0,44.0),(80.8,42.2),(80.3,40.2),(79.2,38.6),
           (77.8,37.4),(75.4,37.0),(73.0,37.3),(71.3,37.6),(70.0,37.3),(68.2,37.2),(66.4,37.4),(64.6,38.3),(63.2,39.2)]
GAZNE = [(52.4,35.4),(53.8,36.6),(55.6,37.3),(57.6,37.9),(60.2,37.6),(62.3,37.9),(64.6,37.6),(66.6,37.4),(68.4,37.2),(70.6,37.6),(72.6,36.5),
         (74.0,35.3),(75.4,33.2),(76.6,31.6),(77.2,30.3),(75.6,29.2),(73.6,28.4),(71.6,27.4),(70.0,26.0),(68.2,24.6),(66.5,25.0),(63.0,25.3),
         (61.4,26.5),(60.9,29.5),(60.2,31.5),(57.2,32.5),(54.5,33.4),(52.6,34.2)]
SELCUK = [(35.6,32.6),(35.9,34.4),(35.8,36.0),(36.6,36.7),(38.6,37.3),(40.6,37.6),(42.4,38.4),(43.8,39.2),(45.2,39.9),(46.0,41.2),(47.4,41.7),
          (48.6,41.9),(49.4,40.6),(49.0,38.6),(49.6,37.2),(51.5,36.5),(53.8,36.8),(54.2,38.2),(55.6,39.8),(56.8,41.6),(58.0,43.2),(60.6,43.9),
          (62.0,43.0),(63.2,41.2),(64.6,40.2),(66.8,39.2),(67.6,38.0),(66.6,37.4),(64.4,37.1),(63.4,35.6),(62.6,33.6),(61.4,31.4),(60.8,29.2),
          (61.2,27.0),(60.4,25.4),(57.6,25.6),(54.0,26.6),(50.6,29.2),(48.4,29.9),(47.3,29.6),(46.0,29.4),(43.6,30.6),(41.0,31.6),(38.8,32.2),
          (37.0,32.0)]
ANATOLIA_1080 = [(27.0,40.5),(29.0,40.9),(31.0,41.0),(33.5,41.3),(35.5,41.4),(37.5,40.9),(39.5,40.6),(41.5,40.3),(43.8,39.2),(42.4,38.4),
                 (40.6,37.6),(38.6,37.3),(36.6,36.7),(34.6,36.6),(32.6,36.9),(30.6,37.2),(28.8,37.6),(27.4,38.6)]

def lines_out(geom, simp=0.02):
    geom = geom.simplify(simp)
    ls = [geom] if isinstance(geom, LineString) else list(getattr(geom, "geoms", []))
    return [[c for lo, la in l.coords for c in merc(lo, la)] for l in ls if isinstance(l, LineString) and len(l.coords) > 1]

RIVERS = {"Nil": ["Nile", "El Bahr el Abyad", "El Bahr el Azraq", "Rosetta Branch", "Damietta Branch", "Abay"],
          "Fırat": ["Euphrates", "Al Furat", "Firat", "Shatt al Arab"], "Dicle": ["Tigris", "Dicle"],
          "İndus": ["Indus", "Chenab", "Sutlej"], "Ceyhun": ["Amu  Darya", "Panj"], "Seyhun": ["Syr Darya", "Naryn"],
          "Nijer": ["Niger"], "Tuna": ["Danube", "Donau"], "Volga": ["Volga"], "Ganj": ["Ganges", "Yamuna"],
          "Senegal": ["Sénégal", "Bafing"], "Ürdün": ["Jordan"], "Helmand": ["Helmand"], "Tarim": ["Tarim", "Yarkant"],
          "Tajo": ["Tajo", "Tejo"], "Ebro": ["Ebro"], "Duero": ["Duero"], "Rhône": ["Rhône"], "Loire": ["Loire"], "Garonne": ["Garonne"]}

def rivers():
    out = {}
    feats = json.load(open(f"{D}/ne_50m_rivers_lake_centerlines.geojson"))["features"]
    for tr, names in RIVERS.items():
        gs = [shape(f["geometry"]) for f in feats if (f["properties"].get("name") or "") in names]
        if gs: out[tr] = lines_out(unary_union(gs).intersection(REGION))
    return out

def hist600():
    out = {}
    for f in json.load(open(f"{D}/world_600.geojson"))["features"]:
        n = f["properties"].get("NAME")
        if n in ("Eastern Roman Empire", "Sasanian Empire"):
            g = shape(f["geometry"]).buffer(0).intersection(land)
            out["byz" if n.startswith("Eastern") else "sas"] = polys_out(g)
    return out

MUSLIM_MAJ = set("AFG ALB DZA AZE BHR BGD BRN BFA TCD COM DJI EGY GMB GIN IDN IRN IRQ JOR KAZ KOS KWT KGZ LBN LBY MYS MDV MLI MRT MAR NER OMN PAK PSE QAT SAU SEN SLE SOM SDN SYR TJK TUN TUR TKM ARE UZB ESH YEM".split())
def country(iso):
    for f in json.load(open(f"{D}/ne_50m_admin_0_countries.geojson"))["features"]:
        if f["properties"].get("ISO_A3") == iso:
            return polys_out(shape(f["geometry"]).buffer(0), simp=0.03)
    return []

def modern():
    gs = []
    for f in json.load(open(f"{D}/ne_50m_admin_0_countries.geojson"))["features"]:
        p = f["properties"]
        codes = {p.get("ISO_A3"), p.get("ADM0_A3"), p.get("SOV_A3"), p.get("ISO_A3_EH")}
        if codes & MUSLIM_MAJ:
            gs.append(shape(f["geometry"]).buffer(0))
    return polys_out(unary_union(gs).intersection(box(-30, -20, 150, 62)), simp=0.05)

PLACES = {
 "mekke": ("Mekke", 39.826, 21.423), "medine": ("Medine", 39.611, 24.468), "taif": ("Taif", 40.415, 21.27),
 "sevr": ("Sevr Mağarası", 39.849, 21.377), "hira": ("Hira", 39.858, 21.457), "bedir": ("Bedir", 38.78, 23.73),
 "uhud": ("Uhud", 39.615, 24.505), "hendek": ("Hendek", 39.59, 24.48), "hudeybiye": ("Hudeybiye", 39.62, 21.44), "hayber": ("Hayber", 39.29, 25.70),
 "tebuk": ("Tebük", 36.57, 28.38), "akabe": ("Akabe", 39.875, 21.42), "kuba": ("Kuba", 39.617, 24.44),
 "kudus": ("Kudüs", 35.23, 31.78), "sam": ("Şam", 36.29, 33.51), "busra": ("Busra", 36.48, 32.52), "halep": ("Halep", 37.16, 36.2),
 "antakya": ("Antakya", 36.16, 36.2), "bagdat": ("Bağdat", 44.36, 33.31), "medain": ("Medain", 44.58, 33.09), "kufe": ("Kûfe", 44.4, 32.03),
 "basra": ("Basra", 47.78, 30.5), "kadisiye": ("Kadisiye", 44.3, 31.85), "yermuk": ("Yermük", 35.95, 32.8), "nihavend": ("Nihavend", 48.38, 34.19),
 "isfahan": ("İsfahan", 51.67, 32.65), "rey": ("Rey", 51.43, 35.59), "nisabur": ("Nişabur", 58.8, 36.2), "merv": ("Merv", 61.83, 37.66),
 "herat": ("Herat", 62.2, 34.35), "belh": ("Belh", 66.9, 36.76), "buhara": ("Buhara", 64.42, 39.77), "semerkant": ("Semerkant", 66.97, 39.65),
 "taskent": ("Şaş", 69.24, 41.3), "talas": ("Talas", 72.3, 42.52), "kasgar": ("Kaşgar", 75.99, 39.47), "balasagun": ("Balasagun", 75.25, 42.75),
 "gazne": ("Gazne", 68.42, 33.55), "lahor": ("Lahor", 74.35, 31.55), "multan": ("Multan", 71.47, 30.2), "debul": ("Debul", 67.5, 24.75),
 "dandanakan": ("Dandanakan", 62.4, 37.3), "malazgirt": ("Malazgirt", 42.53, 39.14), "istanbul": ("Konstantinopolis", 28.98, 41.01),
 "fustat": ("Fustat", 31.23, 30.0), "iskenderiye": ("İskenderiye", 29.92, 31.2), "aksum": ("Aksum", 38.72, 14.13), "kayrevan": ("Kayrevan", 10.1, 35.68),
 "trablus": ("Trablus", 13.19, 32.89), "berka": ("Berka", 20.88, 32.49), "tanca": ("Tanca", -5.8, 35.77), "cebelitarik": ("Cebelitarık", -5.35, 36.14),
 "kurtuba": ("Kurtuba", -4.78, 37.88), "tuleytula": ("Tuleytula", -4.02, 39.86), "puvatya": ("Puvatya", 0.34, 46.58), "narbonne": ("Narbonne", 3.0, 43.18),
 "kibris": ("Kıbrıs", 33.4, 35.1), "sana": ("San'a", 44.2, 15.35), "aden": ("Aden", 45.03, 12.8), "suhar": ("Suhar", 56.7, 24.35), "siraf": ("Siraf", 52.3, 27.67),
 "kalikut": ("Kalikut", 75.78, 11.25), "seylan": ("Seylan", 80.7, 7.5), "malakka": ("Malakka", 102.25, 2.19), "pasai": ("Samudra Pasai", 97.15, 5.15),
 "cava": ("Cava", 110.4, -7.0), "kanton": ("Kanton", 113.26, 23.13), "mogadisu": ("Mogadişu", 45.34, 2.04), "mombasa": ("Mombasa", 39.67, -4.04),
 "kilva": ("Kilva", 39.5, -8.95), "zengibar": ("Zengibar", 39.19, -6.16), "timbuktu": ("Timbuktu", -3.0, 16.77), "gao": ("Gao", -0.04, 16.27),
 "niani": ("Niani", -8.4, 11.38), "sicilmasa": ("Sicilmasa", -4.25, 31.28), "kahire": ("Kahire", 31.24, 30.04), "necran": ("Necran", 44.13, 17.5),
 "gazze": ("Gazze", 34.47, 31.5), "petra": ("Petra", 35.44, 30.33), "dumetulcendel": ("Dûmetü'l-Cendel", 39.87, 29.81), "mute": ("Mute", 35.71, 31.08),
 "rabig": ("Rabiğ", 39.03, 22.8), "kudeyd": ("Kudeyd", 39.22, 22.33), "usfan": ("Usfan", 39.36, 21.92), "cuhfe": ("Cuhfe", 39.15, 22.70),
 "eyup": ("Eyüp", 28.93, 41.05), "derbent": ("Derbent", 48.29, 42.06), "tiflis": ("Tiflis", 44.8, 41.7), "ani": ("Ani", 43.57, 40.51),
 "nisibin": ("Nusaybin", 41.21, 37.07), "musul": ("Musul", 43.13, 36.34), "hemedan": ("Hemedan", 48.51, 34.8), "kerman": ("Kirman", 57.08, 30.28),
 "zerenc": ("Zerenc", 61.9, 30.96), "harezm": ("Gürgenç", 59.15, 42.33), "fergana": ("Fergana", 71.78, 40.38), "kabil": ("Kabil", 69.18, 34.53),
 "arafat": ("Arafat", 39.984, 21.355), "mina": ("Mina", 39.893, 21.413), "kahta": ("", 0, 0),
}

def main():
    t632 = terr(T632); t661 = terr(T661).union(t632); t750 = terr(T750).union(t661)
    t800 = t750.difference(T800_CUT).union(TABARISTAN.intersection(land))
    sel = terr(SELCUK)
    geo = {
        "terr": {"t632": polys_out(t632), "t661": polys_out(t661), "t750": polys_out(t750), "t800": polys_out(t800),
                 "karahan": polys_out(terr(KARAHAN)), "gazne": polys_out(terr(GAZNE)), "selcuk": polys_out(sel),
                 "anadolu": polys_out(terr(ANATOLIA_1080).difference(sel))},
        "h600": hist600(), "rivers": rivers(), "modern": modern(), "idn": country("IDN"),
        "places": {k: dict(name=v[0], xy=merc(v[1], v[2]), lonlat=[v[1], v[2]]) for k, v in PLACES.items() if v[0]},
    }
    json.dump(geo, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
    import os; print("geo.json", os.path.getsize(OUT) // 1024, "KB")
    for k, v in geo["terr"].items(): print(k, len(v), sum(len(r) for p in v for r in p) // 2, "pts")

if __name__ == "__main__":
    main()
