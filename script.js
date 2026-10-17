const form = document.getElementById("gorev-formu");
const girdi = document.getElementById("gorev-girdisi");
const liste = document.getElementById("gorev-listesi");
const bosMesaj = document.getElementById("bos-mesaj");
const sayac = document.getElementById("sayac");

const KAYIT_ANAHTARI = "gorevler";

// Görevler tarayıcıda saklanır, böylece sayfa yenilense de kaybolmaz
let gorevler = yukle();

function yukle() {
  try {
    return JSON.parse(localStorage.getItem(KAYIT_ANAHTARI)) || [];
  } catch {
    return [];
  }
}

function kaydet() {
  try {
    localStorage.setItem(KAYIT_ANAHTARI, JSON.stringify(gorevler));
  } catch {
    // Tarayıcı kayda izin vermezse liste yalnızca bu oturumda kalır
  }
}

function ciz() {
  liste.innerHTML = "";

  gorevler.forEach((gorev) => {
    const li = document.createElement("li");
    li.className = "gorev" + (gorev.tamamlandi ? " tamamlandi" : "");

    const kutu = document.createElement("input");
    kutu.type = "checkbox";
    kutu.id = "gorev-" + gorev.id;
    kutu.checked = gorev.tamamlandi;
    kutu.addEventListener("change", () => durumDegistir(gorev.id));

    const metin = document.createElement("label");
    metin.className = "gorev-metni";
    metin.htmlFor = kutu.id;
    metin.textContent = gorev.metin;

    const sil = document.createElement("button");
    sil.className = "sil-butonu";
    sil.textContent = "Sil";
    sil.addEventListener("click", () => gorevSil(gorev.id));

    li.append(kutu, metin, sil);
    liste.appendChild(li);
  });

  const kalan = gorevler.filter((g) => !g.tamamlandi).length;
  bosMesaj.classList.toggle("gizli", gorevler.length > 0);
  sayac.textContent = gorevler.length > 0 ? `${kalan} görev kaldı` : "";
}

function gorevEkle(metin) {
  gorevler.push({ id: Date.now(), metin, tamamlandi: false });
  kaydet();
  ciz();
}

function durumDegistir(id) {
  const gorev = gorevler.find((g) => g.id === id);
  gorev.tamamlandi = !gorev.tamamlandi;
  kaydet();
  ciz();
}

function gorevSil(id) {
  gorevler = gorevler.filter((g) => g.id !== id);
  kaydet();
  ciz();
}

form.addEventListener("submit", (olay) => {
  olay.preventDefault();
  const metin = girdi.value.trim();
  if (!metin) return;
  gorevEkle(metin);
  girdi.value = "";
  girdi.focus();
});

ciz();
