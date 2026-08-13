# RePulse — Brand & Design Guidelines

**Versi:** 2.4 · 13 Agustus 2026
**Menggantikan:** v1.0 (10 Agustus)
**v2.1:** hasil diskusi alur — pemilih orang, hero saat tidak ada skor, asal data di linimasa, SpO₂ sebagai simpangan
**v2.2:** Bagian 6.11 ditambahkan — target sentuh, indikator fokus, dan kontras palet yang dihitung. Ditulis setelah §7.1 dan §4.5 ketahuan melarang sesuatu tanpa menyebut penggantinya
**v2.3:** Bagian 7.1a ditambahkan — tombol utama tidak lagi dimatikan oleh isian yang belum sah. Aturan lama dibatalkan, alasannya di tempatnya
**v2.4:** Bagian 10.1 ditambahkan (mode terang, dan siapa yang menang saat sesi berjalan). Larangan spinner melingkar dicabut — Bagian 8 sekarang menetapkan `BrandSpinner` sebagai pemuat wajib
**Berlaku untuk:** prototipe mandiri, dan implementasi React + Tailwind + shadcn/ui setelahnya

**Pembagian wewenang antar dokumen**

| Dokumen | Memutuskan |
|---|---|
| `PRD.md` §10 | Layar apa saja yang ada, dan navigasinya |
| `WIREFRAME.md` | Isi dan kalimat di dalam layar |
| `DESIGN.md` | Seluruh perlakuan visual, tata letak, dan gerak |

**Bahasa antarmuka: Inggris.** Diputuskan 12 Agustus, menggantikan ketetapan Indonesia sebelumnya. Berlaku untuk seluruh teks layar, nama metrik, rute, dan nama berkas. Prosa dokumen ini tetap Indonesia — yang berubah adalah apa yang dilihat pengguna, bukan bahasa kerja kita.

Nama orang di data contoh **tetap Indonesia**, karena penggunanya Indonesia. Yang dibuang hanya gelarnya: *Sari*, bukan *Ibu Sari*.

Bila ketiganya berbeda soal tampilan, dokumen ini yang berlaku. Bila berbeda soal kalimat kepatuhan (Bagian 12), tidak ada dokumen yang boleh menang — kalimat itu konstanta.

---

## 1. Dari mana sistem ini diambil

Dua referensi dibedah untuk dokumen ini: **WHOOP Brand & Design Guidelines** (7 halaman resmi) dan **Oura iOS** (34 layar Home, 15 layar onboarding WHOOP).

**Yang diambil dari WHOOP — doktrinnya, bukan warnanya.**

| Aturan WHOOP | Dipakai di RePulse |
|---|---|
| Satu warna memiliki satu metrik, konsisten di seluruh aplikasi | Ya — Bagian 4.2 |
| Skor divaluasi tiga pita (tinggi/sedang/rendah) | Ya — Bagian 4.3 |
| Angka pakai huruf berbeda dari kata | Ya — Bagian 3 |
| Headline huruf besar, jarak huruf 10% | Ya — untuk label sistem dan status |
| **Jangan alihkan fokus dari skor ke judulnya** | Ya — Bagian 5.2 |
| **Jangan ganti nama metrik milik sendiri** | Ya — Bagian 5.1 |
| Palet teal `#00F19F`, strain `#0093E7`, recovery `#16EC06` | **Tidak.** Alasan di bawah |

WHOOP adalah aplikasi kebugaran siang hari di atas hitam murni. RePulse dibaca di kamar gelap oleh orang setengah sadar, dan produknya sendiri menurunkan lampu kamar ke amber 2200K karena cahaya panjang gelombang pendek menekan melatonin. Antarmuka yang menyala teal dan biru di wajah pengguna pukul dua pagi sedang melanggar temuan produknya sendiri. Seluruh palet digeser ke ujung panjang gelombang panjang. Doktrinnya utuh, hexnya tidak.

**Yang diambil dari Oura — tata letaknya.**

Deret chip skor yang bisa digeser, hero besar dengan latar penuh, umpan kartu bertumpuk di bawahnya, tab bar melayang berbentuk pil, dan timeline berel vertikal. Empat pola itu yang membuat Oura tidak terlihat seperti template, dan keempatnya dipakai di Bagian 6.

**Yang tidak diambil dari Oura:** foto lanskap sebagai latar hero, dan huruf serif untuk headline. Foto gunung di aplikasi tidur adalah emosi pinjaman. Penggantinya ada di Bagian 6.3, dan itu ide paling penting di dokumen ini.

---

## 2. Identitas

### Wordmark

**Direvisi 12 Agustus.** Versi sebelumnya menetapkan teks `RePulse` dalam Archivo Expanded huruf campuran. Diganti: `REPULSE` sebagai **logotype geometris monoline yang digambar**, huruf besar semua.

Alasannya sama dengan alasan WHOOP menggambar miliknya sendiri, bukan mengetiknya dalam sebuah font: **cirinya adalah stroke yang sengaja dipotong**, dan tidak ada font yang melakukan itu. Palang H pada WHOOP melayang tidak menyentuh kedua tiangnya; dua V pada W tidak bertemu di puncak; mangkuk P punya celah di tiangnya. Wordmark yang diketik tidak akan pernah punya sifat itu.

Implementasinya `repulse-mobile-app/src/components/brand/Wordmark.tsx` — path SVG di atas grid cap height 100, stroke 4.

**Aturan konstruksi**

1. Ketebalan stroke seragam, tanpa kontras tebal-tipis
2. Setiap kurva adalah busur lingkaran, bukan bentuk bebas
3. Terminal datar, tidak dibulatkan
4. **Potong hanya di sambungan yang bisa dilengkapi mata**, paling banyak satu potongan per huruf
5. Jarak antarhuruf 26 satuan — lapang, bukan padat

**Aturan 4 punya batas yang ditemukan lewat percobaan, dan layak dicatat.** Dugaan awal adalah "satu potongan per huruf, selalu". Itu salah. Dua percobaan memotong sudut huruf **L** gagal — hurufnya terbaca sebagai `l_`. Sebabnya jelas begitu dibandingkan dengan huruf H pada WHOOP: palang H yang melayang berhasil karena **dua tiang mengapitnya**, jadi mata melengkapinya sendiri. L hanya punya satu tiang, jadi tidak ada yang mengapit dan potongannya jatuh menjadi dua tanda terpisah.

WHOOP sendiri membuktikan aturan yang benar: **kedua O pada wordmark-nya utuh, tanpa potongan sama sekali.** Lingkaran tidak punya sambungan untuk dipotong. Jadi bukan setiap huruf mendapat potongan.

Hasil akhir per huruf:

| Huruf | Potongan |
|---|---|
| **R** | Kaki terlepas dari mangkuk |
| **E** | Palang tengah melayang, tidak menyentuh tiang |
| **P** | Mangkuk terlepas dari tiang di kedua ujung |
| **U** | Tiang kiri berhenti sebelum lengkungan |
| **L** | **Tidak ada** — lihat alasan di atas |
| **S** | Celah di titik balik tengah |
| **E** | Sama dengan E pertama |

**Ukuran**

| Konteks | Lebar | Stroke |
|---|---|---|
| Splash | 260px | 4 |
| Header | 118px | **6** |

Stroke ikut mengecil bersama SVG. Pada lebar 118px, stroke 4 jatuh ke bawah satu piksel dan wordmark tampak rusak — maka dinaikkan ke 6. Di bawah **100px** jangan pakai wordmark; pakai ikon.

**Animasi menggambar** hanya di splash: `@keyframes wordmark-draw`, 1100ms, kurva `--ease-light`. Dibuat sebagai keyframe CSS, bukan transisi yang dipicu state React, supaya tidak bergantung pada satu tick JS — versi pertama memakai `requestAnimationFrame` dan gagal menggambar apa pun ketika frame pertamanya terlewat.

### Ikon

Satu denyut EKG tunggal di dalam lingkaran — naik tajam, turun melewati garis dasar, kembali. Bukan hati, bukan bulan sabit, bukan gelombang tidur. Dipakai untuk ikon aplikasi, favicon, dan splash.

Versi solid dipakai hanya untuk ikon peluncur Android. Di dalam aplikasi selalu versi garis.

### Zona bebas

Ruang kosong di keempat sisi minimal setinggi huruf **R** pada wordmark. Tidak ada elemen apa pun yang masuk, termasuk tepi layar.

### Atribusi data

Setiap layar yang menampilkan angka dari perangkat keras wajib menyebut sumbernya, karena aplikasi ini juga bisa berjalan tanpa perangkat (mode mock dan mode monitor-only). Format:

```
FROM BAND        FROM BEDSIDE      SAMPLE DATA
```

Archivo Narrow, 10px, huruf besar, `Ash Grey`. `SAMPLE DATA` wajib muncul di setiap layar saat lapisan mock aktif — juri harus bisa membedakannya dalam sekali lihat.

### Larangan pada identitas

- Memiringkan, meregangkan, memutar, atau memberi bayangan pada wordmark
- Mewarnai wordmark selain `Warm Ivory` atau `Ember Base`
- Menaruh wordmark di atas grafik data
- Menaruh wordmark di atas foto tanpa scrim

---

## 3. Tipografi

WHOOP memisahkan huruf untuk kata dan huruf untuk angka. Aturan itu dipakai, karena produk ini pada dasarnya adalah pembacaan instrumen.

| Peran | Huruf | Perlakuan |
|---|---|---|
| **Angka** | `Archivo Expanded` SemiBold | `font-variant-numeric: tabular-nums` selalu. Jarak huruf `-0.02em` |
| **Kata** | `Archivo` Regular / Medium | Judul, isi, tombol |
| **Label & status** | `Archivo` Medium | Huruf besar semua, jarak huruf `0.10em` |
| **Log mentah** | `JetBrains Mono` | Hanya Panel Uji dan ekspor |

Archivo Expanded menggantikan DINPro. Alasannya bukan selera: DINPro berlisensi, dan kontras lebar di dalam satu superfamili lebih disiplin daripada dua famili tak berhubungan. Kalau ingin karakter DIN yang literal, `D-DIN` (OFL) boleh menggantikan Archivo Expanded — tapi jangan campur keduanya.

Urutan pengganti bila Archivo tidak tersedia: **Outfit**, lalu **Geist**. Jangan pernah `Inter`.

### Skala

```
Angka hero      72   Archivo Expanded SemiBold
Angka kartu     40   Archivo Expanded SemiBold
Judul layar     28   Archivo Medium
Judul kartu     17   Archivo Medium
Isi             15   Archivo Regular      line-height 1.55
Metadata        13   Archivo Regular
Label / status  11   Archivo Medium, UPPERCASE, tracking 0.10em
```

Tujuh langkah, tidak lebih. Setiap ukuran baru yang muncul di luar daftar ini adalah keputusan yang belum dibuat.

### Larangan

- `Inter`, huruf sistem bawaan, serif apa pun
- Huruf raksasa untuk membangun hierarki — hierarki lahir dari bobot dan warna
- Angka proporsional. Angka yang berubah tiap detik harus tabular, atau ia akan bergoyang
- Menambah famili ketiga

---

## 4. Warna

### 4.1 Warna dasar

| Nama | Hex | Peran |
|---|---|---|
| **Ember Base** | `#100D0A` | Latar utama. Hitam hangat, bukan `#000000` |
| **Ember Surface** | `#1A1512` | Permukaan kartu, tanpa garis tepi |
| **Ember Raised** | `#241D18` | Elemen bersarang saja |
| **Warm Ivory** | `#EDE3D6` | Teks utama |
| **Ash Grey** | `#8C8175` | Teks sekunder, satuan, metadata |
| **Ash Dim** | `#5C554D` | Teks nonaktif, garis rambut |

**Gradien latar** `#1C1611 → #0C0A08`, vertikal. Padanan warm dari gradien WHOOP `#283339 → #101518`, dan dipakai untuk hal yang sama persis: layar onboarding, pairing, dan kalibrasi. Tidak dipakai di layar harian.

### 4.2 Warna data — satu warna, satu metrik

Ini aturan WHOOP yang paling berharga dan paling mudah dilanggar. Setiap metrik memiliki satu warna di seluruh aplikasi: di chip, di kartu, di grafik, di legenda, di timeline. Warna tidak pernah dipilih karena "kartu ini butuh variasi".

| Metrik | Nama warna | Hex | Dipakai di |
|---|---|---|---|
| **Nadi** | Lamp Amber | `#E8A33D` | Detak, HRV, garis EKG, aksi utama |
| **Tidur** | Dune Sand | `#D0A17A` | Hypnogram, durasi, fase, skor tidur |
| **Napas** | Kiln Clay | `#C9846B` | SpO₂, laju napas, dengkur, desaturasi |
| **Kamar** | Ash Grey | `#8C8175` | Suhu, kelembapan, cahaya, bising |
| **Intervensi** | Lamp Faint | `#3D2E1C` | Isian grafik, jalur progres, batang latar |

Semuanya berada di ujung panjang gelombang panjang. Tidak ada biru, hijau, atau ungu — bukan karena selera, tapi karena layar ini menyala di kamar tidur.

Kamar sengaja netral. Kondisi ruangan adalah konteks, bukan tubuh; ia tidak boleh bersaing perhatian dengan nadi.

### 4.3 Valuasi tiga pita

Model High/Medium/Low WHOOP, ditulis ulang untuk skor tidur dan skor intervensi.

| Pita | Rentang | Nama | Hex |
|---|---|---|---|
| Tinggi | 80–100 | **Baik** | `#F0B65C` |
| Sedang | 50–79 | **Cukup** | `#B98243` |
| Rendah | 0–49 | **Kurang** | `#B4522F` |

Tiga pita ini bergerak dalam terang **dan** rona, jadi tetap terbaca saat dijadikan abu-abu — pengguna dengan defisiensi warna tetap bisa membedakannya. Pita rendah memakai rust, bukan merah.

### 4.4 Signal Red — bukan warna kesembilan

`#E5484D`

Merah hanya muncul di layar `ALERT` dan `SOS_SENT`. Tidak untuk baterai lemah, tidak untuk tombol hapus, tidak untuk galat form, tidak untuk pita skor rendah, tidak untuk perangkat terputus. Semua itu memakai `Kiln Clay` atau `Ash Grey`.

Pertama kali pengguna melihat merah, artinya ada nyawa yang sedang dipertaruhkan. Itu keseluruhan sistem peringatannya, dan ia hancur seketika pada pemakaian kedua.

Bandingkan `#B4522F` (rust, pita rendah) dengan `#E5484D` (Signal Red). Rust jauh lebih gelap dan lebih cokelat. Keduanya tidak pernah muncul di layar yang sama.

### 4.5 Larangan warna

- Biru, hijau, ungu — termasuk untuk tautan, cincin fokus, dan status berhasil
- Hitam murni `#000000`, putih murni `#FFFFFF`
- Signal Red di luar dua layar darurat
- Gradien pada teks, glow neon, bayangan berwarna
- Warna baru yang tidak ada di Bagian 4.1–4.4

---

## 5. Skor dan metrik

### 5.1 Nama metrik dikunci

WHOOP melarang keras pihak ketiga mengganti nama metriknya. Aturan yang sama berlaku ke dalam: nama berikut tidak boleh diubah oleh siapa pun, di layar mana pun, termasuk oleh generator desain.

| Nama resmi | Bukan |
|---|---|
| **Sleep Score** | Sleep Quality, Sleep Rating, Skor Tidur |
| **Resting Pulse** | RHR, Resting Heart Rate, Baseline HR |
| **Restlessness** | Movement, Agitation, Kegelisahan |
| **Optimal Darkness** | Dark Score, Light Score |
| **Breathing Screening** | Apnea, Sleep Apnea, Breathing Disorder |
| **Intervention Score** | Effectiveness, Success Rate |

Tiga nama terakhir terikat kepatuhan, bukan sekadar konsistensi. Lihat Bagian 12.

### 5.2 Skor lebih besar dari judulnya

Aturan WHOOP: jangan alihkan fokus dari skor ke judul. Urutan bacanya angka dulu, baru namanya.

```
BENAR                          SALAH

  Sleep Score                    SLEEP SCORE
  GOOD                           78
  78                             ────
```

Angka memakai Archivo Expanded pada ukuran hero atau kartu. Judul 17px Medium di atasnya. Status pita 11px huruf besar dalam warna pitanya. Tidak pernah terbalik.

### 5.3 SpO₂ ditampilkan sebagai simpangan, tidak pernah sebagai angka absolut

SpO₂ dari pergelangan tangan galat absolutnya lazim ±3–4%, sementara ambang skrining kita adalah penurunan ≥3%. Angka absolut `96%` mengundang pembacaan medis yang tidak bisa didukung sensornya.

Yang kita ukur sebenarnya adalah **penyimpangan dari baseline tidur orang itu sendiri** — dan akurasi relatif pada sensor yang sama, tangan yang sama, malam yang sama jauh lebih baik, karena galat sistematis sensor hilang saat dua bacaan dikurangkan.

```
BENAR                          SALAH

  −4%                            96%
  DARI BASELINE ANDA             SpO₂
```

| Ketentuan | Isi |
|---|---|
| Angka utama V3 | simpangan, dengan tanda |
| Sumbu grafik | relatif, bukan absolut |
| Nilai absolut | boleh muncul kecil sebagai metadata |
| Dilarang | angka absolut sebagai elemen besar di layar mana pun |

Ini memperkuat posisi kepatuhan, bukan melemahkannya. Kita berhenti mengklaim mengukur oksigen darah, dan mulai mengklaim mendeteksi perubahan pola — persis yang dikatakan kalimat skrining wajib di Bagian 12.

### 5.4 Angka tidak pernah dibulatkan palsu

`28.4 °C` · `0.42 g` · `2.1 kali per jam` · `142 lx` · `96%`

Bukan `28 °C`, bukan `99%`, bukan `50%`. Angka bulat di prototipe membuat juri curiga datanya karangan — dan di layar ini, memang karangan kalau bulat.

---

## 6. Tata letak

Kerangka layar harian mengikuti Oura, karena polanya benar untuk aplikasi yang punya banyak metrik tapi satu fokus per hari.

### 6.1 Kerangka

```
┌────────────────────────────────────────┐
│  ☰        RePulse        ⇪        ◉    │   header 56
├────────────────────────────────────────┤
│  ( 78 )  ( 58 )  ( 96 )  ( 22 )  ( +   │   chip row, geser
│  Tidur    Nadi   SpO₂   Gelisah  Atur  │
├────────────────────────────────────────┤
│                                        │
│                                        │
│            H E R O                     │   latar penuh
│         (Bagian 6.3)                   │   ~55% tinggi
│                                        │
├────────────────────────────────────────┤
│  ┌──────────────────────────────────┐  │
│  │ kartu                            │  │   umpan kartu
│  └──────────────────────────────────┘  │   menggulung
│  ┌──────────────────────────────────┐  │   di atas hero
│  │ kartu                            │  │
│  └──────────────────────────────────┘  │
│           Linimasa                     │
│                                        │
│      ╭──────────────────────╮   ╭──╮   │   tab pil melayang
│      │ Malam  Vital  Sehat  │   │ ✚│   │   + tombol aksi
│      ╰──────────────────────╯   ╰──╯   │
└────────────────────────────────────────┘
```

### 6.2 Header

Tiga zona tetap. Kiri: menu laci, dengan titik amber 6px bila ada yang belum dibaca. Tengah: wordmark — diganti teks status saat sedang bekerja (`Syncing…`, `Searching for band…`), atau **pemilih orang** bila pengguna memantau seseorang. Kanan: bagikan, lalu **indikator perangkat**.

#### Pemilih orang

Satu akun bisa jadi perangkat pribadi sekaligus viewer untuk orang lain. Pemilihnya menggantikan wordmark di tengah header, dan **muncul hanya bila pengguna memantau seseorang** — kalau tidak, tidak ada apa-apa, nol biaya untuk kasus umum.

```
   ☰        Saya  ▾        ⇪   ◉
```

Saat melihat orang lain, sebaris tipis menetap di bawah header:

```
   Viewing Sari · read only
```

`Ember Raised`, tinggi 32, teks 13 `Ash Grey`. **Tanpa perubahan warna** — aturan Bagian 4 melarangnya, dan warna sudah dipesan untuk hal lain.

Baris ini tidak pernah muncul di layar darurat milik pengguna sendiri. Kalau `ALERT` menyala untuk tubuh pengguna saat ia sedang melihat data orang lain, layar darurat merebut seluruh tampilan dan mode melihat berakhir. **Darurat selalu milik pemilik perangkat.**

Indikator perangkat meniru cincin Oura dan membawa empat keadaan dalam satu ikon 24px:

| Bentuk | Arti |
|---|---|
| Cincin utuh amber | Kedua perangkat tersambung |
| Cincin utuh, setengah amber | Satu perangkat tersambung |
| Cincin putus-putus `Ash Dim` | Tidak ada yang tersambung |
| Cincin dengan kilat di tengah | Ada perangkat sedang mengisi daya |

Diketuk membuka layar **Perangkat & baterai**. Ini satu-satunya jalan masuk, dan itu cukup — status perangkat sudah terbaca dari ikonnya tanpa dibuka.

### 6.3 Hero — kamar itu sendiri, bukan foto gunung

**Ini pengganti foto lanskap Oura, dan bagian terpenting dari dokumen ini.**

Oura memakai foto bukit dan langit berbintang yang berganti mengikuti skor. Efeknya kuat, tapi emosinya pinjaman: gunung tidak ada hubungannya dengan cincin di jari. RePulse punya sesuatu yang lebih jujur dan kebetulan lebih murah dirender — **kamarnya sendiri**.

Latar hero adalah medan gradien yang dihitung dari bacaan BH1750 dan mode lampu saat itu:

| Keadaan kamar | Latar hero |
|---|---|
| Terang, siang | Radial hangat `#3A2E22` di tengah atas, luruh ke `#1C1611` |
| Sunset berjalan | Radial amber ikut meredup **eksponensial** bersama lampu asli, 20–30 menit |
| Gelap optimal, <3 lx | Nyaris `#0C0A08` rata. Hampir tidak ada yang menyala |
| Polusi cahaya, >5 lx | Sapuan `Kiln Clay` tipis dari tepi tempat cahaya masuk |
| `ALERT` | Rata `#1A0E0E`, tanpa gradien. Diam total |

Terangnya mengikuti lux terukur, ronanya mengikuti suhu warna lampu. Saat kamar gelap, hero gelap. Saat lampu menyala amber, hero ikut amber. Layar dan kamar berdenyut bersama.

Ini bukan dekorasi — ini menampilkan data. Pengguna bisa melihat kamarnya terlalu terang sebelum membaca satu angka pun. Dan ia menyelesaikan masalah yang tidak bisa diselesaikan foto stok: pada pukul dua pagi, hero yang benar adalah hero yang hampir tidak terlihat.

Isi di atas hero, semuanya rata kiri, dari atas ke bawah:

```
   ⎯  ikon metrik 20px
   SKOR TIDUR                    ← label 11 UPPERCASE
   78                            ← angka 72 Archivo Expanded
   A quiet night             ← judul 28 Medium
   Kamu tidur 6j 42m dengan      ← isi 15, maksimal 3 baris
   dua kali gelisah.
   ╭─────────────╮
   │ Selengkapnya│               ← pil sekunder
   ╰─────────────╯
```

Oura menaruh headline di tengah dengan huruf serif. Kita rata kiri tanpa serif — ini perangkat lunak instrumen, dan rata kiri lebih cepat dipindai dalam gelap.

#### Hero saat tidak ada skor

Bedside berjalan sepanjang malam terlepas dari gelang dipakai atau tidak, jadi data kamar **selalu** ada. Maka saat Sleep Score tidak bisa dihitung, hero menampilkan kamarnya, bukan orangnya:

```
   ⌂  KAMAR SEMALAM

   6j 12m
   gelap optimal

   Your room is ready for sleep.
   Gelang tidak terpasang semalam.
```

Jujur, memakai data yang benar-benar ada, dan tidak membuat aplikasi terasa rusak. Jauh lebih baik daripada kartu kosong.

Dua keadaan kosong lain memakai pola yang sama — sebut angkanya, jangan bilang "belum ada data":

| Keadaan | Kalimat |
|---|---|
| Sesi terlalu pendek | **Sesi 47 menit.** Sleep Score butuh minimal 2 jam |
| Malam pertama | **Malam pertama tercatat.** Skor intervensi muncul setelah 3 kejadian. Tren napas setelah 7 malam |
| HP mati semalam | **Bukan status kosong** — ini spanduk rekonstruksi dengan progres |

Kalimat malam pertama penting untuk proyek 14 hari: ia menetapkan harapan dengan angka, bukan menyembunyikan bahwa sebagian aplikasi memang belum bisa menunjukkan apa-apa.

### 6.4 Deret chip

Deret lingkaran yang bisa digeser horizontal, tepat di bawah header. Setiap chip: lingkaran 64px berisi ikon dan angka, label di bawahnya.

- Isian lingkaran `Ember Surface`, garis tepi 1px dalam warna metriknya pada opasitas 30%
- Angka dalam warna metrik. Bila belum ada data, tanda pisah `—` dalam `Ash Dim`
- Urutan tetap: **Tidur · Nadi · SpO₂ · Gelisah · Kamar**, lalu chip terakhir `Atur` untuk menyusun ulang
- Chip yang aktif punya garis tepi penuh opasitas
- Mengetuk chip membuka layar detail metriknya di tab **Vital**

Deret ini sengaja terpotong di tepi kanan layar — potongan itu yang memberi tahu pengguna bahwa ia bisa digeser. Jangan pas-paskan lima chip ke dalam lebar layar.

### 6.5 Umpan kartu

Kartu menggulung naik menutupi hero. Anatominya seragam, dan seluruh aplikasi memakai komponen yang sama:

```
┌──────────────────────────────────────────┐
│  ⃝  Napas                            ›   │  ikon 40 + judul 17 + chevron
│      SUDAH SIAP                          │  status 11 UPPERCASE, warna metrik
│                                          │
│  2.1 per jam                             │  angka 40 Archivo Expanded
│  Tiga kejadian tercatat antara 01:20      │  isi 15
│  dan 03:40.                              │
│                                          │
│  ▁▂▅▃▁▁▂▇▅▂▁                             │  grafik atau bilah
└──────────────────────────────────────────┘
```

- Latar kartu `Ember Surface`, plus tint warna metrik pada opasitas **4%** dari sudut kiri atas. Cukup untuk membedakan domain, tidak cukup untuk terlihat sebagai warna
- Sudut 16. Tanpa garis tepi, tanpa bayangan. Kedalaman lahir dari warna
- Jarak antarkartu 12, padding dalam 20
- Setiap kartu punya status kosong yang menyebut **berapa lagi yang dibutuhkan**: *"Butuh 3 malam untuk mulai melihat pola. Baru ada 1."*

### 6.6 Spanduk

Peringatan dan tawaran muncul sebagai kartu bertumpuk **di atas** umpan, bukan sebagai toast atau dialog. Diambil dari Oura karena polanya benar: pengguna bisa mengabaikannya tanpa kehilangan konteks.

Anatomi: ikon, kalimat, tombol tutup `✕`, lalu satu atau dua aksi teks. Latar `Ember Raised`. Maksimal **dua** spanduk sekaligus; sisanya mengantre.

Spanduk yang wajib ada: gelang tidak tersambung · baterai bedside di bawah 15% · autostart vendor belum diizinkan · kontak darurat belum diisi.

### 6.7 Linimasa

Bagian terakhir di tab **Malam Ini**, mengikuti pola Oura persis karena RePulse justru lebih membutuhkannya — seluruh loop verifikasi produk ini adalah rangkaian kejadian bertanda waktu.

```
Linimasa

 ⃝ ─┐  02:14
    │  ┌────────────────────────────────────┐
    │  │ Gelisah terdeteksi              ›  │
    │  │ ⏱ 4m   ♥ 74 bpm   ⟳ miring kiri    │
    │  └────────────────────────────────────┘
 ⃝ ─┤  02:16
    │  ┌────────────────────────────────────┐
    │  │ White noise dinyalakan          ›  │
    │  │ ⏱ 12m   ✓ tenang dalam 3m 20s      │
    │  └────────────────────────────────────┘
 ⃝ ─┘  05:58
       ┌────────────────────────────────────┐
       │ Sunrise dimulai                 ›  │
       └────────────────────────────────────┘

       ╭────────────────────────────────╮
       │  Lihat linimasa lengkap        │
       ╰────────────────────────────────╯
```

Rel vertikal 1px `Ash Dim`, simpul lingkaran 32px berwarna metrik. Chip metrik sebaris di dalam kartu, `Archivo` 13, dipisah jarak bukan garis.

Kartu intervensi menampilkan hasilnya di baris kedua dengan `✓` dan waktu menenangkan, atau `✗` bila gagal. Loop verifikasi produk ini terlihat langsung di sini, dan itu yang akan ditanya juri.

#### Asal data harus terlihat

Kejadian yang dipantau langsung dan kejadian yang direkonstruksi dari buffer offline **tidak boleh terlihat identik.**

| Asal | Simpul rel |
|---|---|
| Pemantauan langsung | Lingkaran isi penuh |
| Rekonstruksi dari buffer | Lingkaran garis putus-putus, waktu diberi awalan `±` |

Malam yang separuhnya offline bukan malam yang sama kualitasnya dengan malam yang terpantau penuh. Menyembunyikan itu di balik tampilan seragam adalah kebohongan kecil yang akan ketahuan saat ada yang bertanya — dan di lomba, akan ada yang bertanya.

Aturan yang sama berlaku untuk kejadian saat bedside putus: dicatat, ditandai `bedside offline`, dan **dikeluarkan dari Intervention Score**. Kejadian tanpa intervensi bukan intervensi yang gagal.

### 6.8 Tab bar dan tombol aksi

Pil melayang, `Ember Raised` dengan blur latar, mengambang 16px dari bawah. **Tiga tab, bukan lima.**

```
 Malam Ini  ·  Vital  ·  Sehat        ✚
```

Tab aktif: ikon dan teks `Lamp Amber`. Nonaktif: `Ash Grey`.

Tombol `✚` terpisah sebagai lingkaran 56px di kanan. Membuka lembar aksi: **Mulai tidur · Catat kejadian · Panel uji · Ukur nadi sekarang**.

**Tab bar dan tombol aksi hilang seluruhnya saat sesi tidur berjalan.** Yang tersisa satu aksi, dan aksi itu diberi konfirmasi.

### 6.9 Header dan peletakan tombol

Dua komponen header, dan tidak ada yang ketiga.

| Jenis layar | Header | Kiri |
|---|---|---|
| Root tab — Beranda, Sehat | `Header` | Menu laci. **Tanpa back** — tab bar yang jadi navigasinya |
| Semua layar lain | `PageHeader` | Back, judul di tengah, aksi opsional di kanan |
| Layar merebut penuh — splash, sign in, sesi tidur, `ALERT`, `SOS`, sheet | tanpa header | Punya jalan keluarnya sendiri |

Chevron polos, bukan berlingkaran. Versi berlingkaran sempat dipakai di onboarding, ditiru dari referensi yang menaruhnya di atas foto — onboarding kita gradien rata, jadi lingkarannya tidak membeli apa pun dan hanya menambah satu hal yang harus dijaga seirama.

**Tombol primer punya dua peletakan, dan keduanya sah:**

- **Layar langkah** — satu layar penuh, satu keputusan. Tombol didorong ke dasar layar dengan `flex-1`, di jangkauan ibu jari
- **Layar bergulir** — konten lebih panjang dari layar, jadi "dasar" tidak berarti apa-apa. Tombol jadi **elemen terakhir** di kontennya

Yang dilarang: tombol primer terjepit di tengah gulungan. Aksi utama tidak boleh punya konten di bawahnya.

### 6.10 Aturan komposisi umum

- Rata kiri sebagai bawaan. Rata tengah hanya di splash, pairing, kalibrasi, `ALERT`, dan `SOS`
- Padding halaman 20 · jarak antarkartu 12 · jarak antarbagian 32
- Sudut 16 pada kartu, 12 pada kontrol, penuh pada pil dan chip
- Kartu dipisahkan jarak, bukan garis tepi. Dalam gelap, garis tepi adalah derau
- Empat nilai kondisi kamar **tidak** dibungkus empat kartu sejajar. Satu baris data telanjang, dipisah garis rambut vertikal, lebar kolom mengikuti panjang nilainya:

```
  28.4 °C  │  71%  │  142 lx  │  48 dB
  SUHU        LEMBAP   CAHAYA     BISING
```

### 6.11 Aksesibilitas

**Ditambahkan 13 Agustus.** Dokumen ini punya 1500 kata tentang potongan stroke wordmark dan nol kata tentang ukuran target sentuh, dan hasilnya sudah terlihat: tautan 11px setinggi 15 piksel di layar masuk. Karena `PRD.md` §3.2 juga membatalkan shadcn/ui, tidak ada lagi Radix yang menanggung ini secara bawaan. Aturannya jadi milik dokumen ini.

| Hal | Ketentuan |
|---|---|
| **Target sentuh** | Minimal **44 × 44** untuk apa pun yang bisa diketuk. Yang terlihat boleh lebih kecil — tambahkan padding, jangan besarkan hurufnya |
| **Jarak antar target** | Minimal 8 antara dua target yang berdekatan |
| **Fokus papan tik** | Kontrol yang mendapat fokus mengubah garisnya sendiri ke `Lamp Amber`. Tidak ada `outline` bawaan peramban, dan tidak ada cincin tambahan di luar kontrol |
| **Kontras teks** | Minimal **4.5:1** terhadap latarnya untuk teks yang harus dibaca. Angka di bawah dihitung terhadap latar **gelap**; mode terang punya tabelnya sendiri di 10.1, dan belum memenuhi ambang ini |
| **Status yang berubah** | Pesan galat dan keberhasilan berada di `aria-live="polite"`. Tanpa itu, pembaca layar diam saat sesuatu gagal |
| **Ikon tanpa teks** | Wajib punya `aria-label`. Ikon 20px sendirian tidak berarti apa-apa bagi pembaca layar |
| **Gerak** | `prefers-reduced-motion` dihormati — Bagian 9 |

#### Kontras palet terhadap `Ember Base`

Dihitung, bukan dikira-kira:

| Warna | Rasio | Boleh dipakai untuk |
|---|---|---|
| `Warm Ivory` `#EDE3D6` | **15.3:1** | Apa pun |
| `Lamp Amber` `#E8A33D` | **9.0:1** | Apa pun, termasuk teks kecil |
| `Ash Grey` `#8C8175` | **5.1:1** | Teks sekunder, metadata, satuan |
| `Ash Dim` `#5C554D` | **2.6:1** | **Bukan teks.** Garis rambut, jalur progres, teks tombol nonaktif |

**`Ash Dim` gagal untuk teks, dan itu bukan cacat warnanya** — Bagian 4.1 memang hanya menugaskannya sebagai teks nonaktif dan garis rambut, dan teks nonaktif dikecualikan dari syarat kontras karena ia memang tidak menawarkan apa pun.

Yang salah adalah pemakaiannya di luar peran itu. Disclaimer kepatuhan sempat digambar dengan `Ash Dim` 11px: teks yang **wajib terlihat** menurut Bagian 12, dalam warna yang tidak lolos ambang, pada ukuran terkecil yang kita punya. Disclaimer memakai `Ash Grey`.

> Aturan singkatnya: **`Ash Dim` tidak pernah membawa kata yang harus dibaca.**

#### Kenapa fokusnya bukan cincin

Bagian 4.5 melarang biru, hijau, dan ungu termasuk untuk cincin fokus. Larangan itu sempat berdiri tanpa pengganti, dan pengganti yang tidak ditentukan selalu berakhir jadi `outline: none` — persis yang terjadi di komponen `Field`.

Penggantinya bukan cincin berwarna lain, melainkan **garis kontrol itu sendiri**: input yang fokus mengubah garis bawahnya dari `Ash Dim` ke `Lamp Amber`, dan pil mengubah garis tepinya. Ini juga sudah jadi bahasa layar ini di tempat lain — Bagian 7.1 memakai perubahan garis abu-abu ke amber untuk mengajari pengguna bahwa isian sudah sah. Fokus dan keabsahan memakai isyarat yang sama karena keduanya berarti hal yang sama: kontrol ini sekarang hidup.

---

## 7. Enam pola yang diadaptasi langsung

Bagian ini yang paling menentukan hasilnya tidak terasa dihasilkan mesin. Semuanya diambil dari layar referensi yang sudah dibedah, dan semuanya **berlawanan dengan bawaan** yang muncul kalau tidak ditentukan.

### 7.1 Tombol bergaris, bukan tombol berisi

**Ini adaptasi paling penting di seluruh dokumen.**

WHOOP tidak memakai tombol berisi untuk aksi utama. `I HAVE A WHOOP DEVICE`, `LOG IN`, `PAIR MY DEVICE`, `GET STARTED` — semuanya **pil bergaris tepi berwarna aksen dengan teks berwarna aksen dan isian transparan.** Nyaris tidak ada aplikasi yang melakukan ini, dan tombol berisi penuh adalah bawaan yang muncul otomatis di setiap generator.

```
BENAR — pola WHOOP              SALAH — bawaan generik

╭────────────────────╮          ┌────────────────────┐
│   MULAI KALIBRASI  │          │▓▓ MULAI KALIBRASI ▓│
╰────────────────────╯          └────────────────────┘
garis amber, teks amber,        isian amber penuh,
isian transparan                teks gelap
```

| Keadaan | Perlakuan |
|---|---|
| **Nonaktif** | Pil, garis 1px `Ash Dim` 40%, teks `Ash Dim`. **Hanya untuk pekerjaan yang sedang berjalan** — lihat 7.1a |
| **Utama, aktif** | Pil, garis 1px `Lamp Amber`, teks `Lamp Amber`, isian transparan |
| **Sekunder** | Pil, garis 1px `Warm Ivory` 60%, teks `Warm Ivory` |
| **Terbalik** | Pil, isian `Warm Ivory` penuh, teks `Ember Base` — pola Oura, dipakai untuk satu aksi penutup per layar |
| **SOS** | Pil, isian `Signal Red`, tinggi 64. **Satu-satunya tombol berisi warna di aplikasi** |

#### 7.1a Tombol utama tidak pernah dimatikan oleh isian yang belum sah

**Direvisi 13 Agustus, membatalkan ketentuan sebelumnya.** Versi lama berbunyi: *"Transisi nonaktif → aktif adalah alat pengajaran WHOOP — tombol yang berubah dari abu-abu jadi amber begitu isian sah mengajari pengguna tanpa satu kalimat validasi pun. Pakai ini di O2, O8, O9."* Itu dibatalkan, dan alasannya ditemukan saat O2 dibangun.

Pengajaran itu hanya bekerja bila **penyebabnya terlihat**. Format email terlihat — pengguna bisa melihat sendiri alamatnya belum lengkap. Panjang sandi tidak: enam titik dan lima titik terlihat sama, jadi tombol abu-abu itu tidak mengajari apa pun, ia hanya diam.

Tiga hal yang membuatnya lebih buruk daripada sekadar tidak berguna:

| Masalah | Akibatnya |
|---|---|
| Tombol mati tidak menyebutkan apa yang kurang | Pengguna menebak field mana yang salah |
| `disabled` tidak bisa menerima fokus | Pengguna papan tik dan pembaca layar tidak pernah mencapainya, jadi tidak pernah mendengar alasannya |
| Diketuk tanpa reaksi apa pun | Di kamar gelap pukul dua pagi ini terbaca sebagai aplikasi rusak, bukan sebagai isian belum lengkap |

Yang berlaku sekarang:

1. **Tombol utama hidup sejak bingkai pertama.** Warnanya `Lamp Amber` terlepas dari isi form
2. **Penilaian terjadi saat diketuk**, bukan saat mengetik
3. **Galat mendarat di baris yang salah** — garis field jadi `Kiln Clay`, satu kalimat di bawahnya (7.5)
4. **Fokus pindah ke field pertama yang bermasalah**, supaya pembaca layar membacakan galatnya
5. **Keadaan nonaktif tetap ada, tapi hanya untuk pekerjaan yang sedang berjalan** — permintaan sedang terbang, dan label tombol sudah menjelaskan dirinya (`SIGNING IN…`)

#### Gerbang bukan validasi, dan boleh tetap mati

Ketentuan lama menyebut O2, O8, dan O9. Setelah dipakai, ketiganya ternyata bukan satu jenis, dan pembedanya sederhana:

| Jenis | Contoh | Boleh mati? |
|---|---|---|
| **Isian belum sah** | O2 sandi kurang enam huruf · O9 belum ada kontak | **Tidak.** Penyebabnya tidak terlihat — inilah yang diatur 7.1a |
| **Gerbang dengan penunjuk sendiri** | O8 bilah kekencangan · O3 daftar izin dengan centang · O4 tombol setelan vendor | **Ya.** Layar sudah menunjukkan apa yang kurang, dan tombol mati tidak menambah teka-teki |

Gerbang O8 menolak mulai sampai kontak kulit memadai, dan **bilah yang mengisi saat gelang dikencangkan sudah menjelaskan alasannya**. Itu bukan tombol bisu, itu tombol dengan penjelasan di sebelahnya.

Jadi 7.1a berlaku di **O2 dan O9**, bukan O8.

**Status:** O2 dan O9 sudah dikonversi.

> Ini penyimpangan dari WHOOP yang disengaja, dan masuk ke Bagian 14. WHOOP memakai tombol mati di layar masuknya; GOV.UK Design System membuangnya justru karena tiga alasan di atas. Untuk aplikasi yang dipakai orang setengah sadar, argumen aksesibilitasnya menang atas argumen kerapiannya.

Tombol terbalik dibatasi **satu per layar** — kalau ada dua, tidak ada yang menonjol. Contohnya `Lihat linimasa lengkap` di M1 dan `Ekspor` di D6.

Tombol berisi amber **tidak dipakai sama sekali.** Yang berisi hanya SOS dan tombol terbalik.

### 7.2 Dua register tipografi

Referensi WHOOP memakai dua nada yang tidak pernah tercampur, dan pemisahannya membawa makna:

| Register | Bentuk | Untuk apa | Contoh WHOOP |
|---|---|---|---|
| **Sistem** | HURUF BESAR, tracking `0.10em`, **rata tengah** | Keadaan mesin: mencari, menyambung, memuat, gagal | `SEARCHING FOR STRAP…` · `CONNECTING` · `CHOOSE A DEVICE` |
| **Isi** | Sentence case, **rata kiri**, 28px Medium | Mengajari, melaporkan, menjelaskan | `Open the clasp` · `Your WHOOP is ready to pair!` |

Aturannya: **mesin berbicara dalam huruf besar rata tengah; produk berbicara dalam huruf normal rata kiri.**

Terapkan di RePulse:

```
Register sistem                 Register isi

  SEARCHING FOR BAND…               A quiet night
  CONNECTING                 Kencangkan gelang sampai
  REBUILDING DATA           bilah penuh
  BAND DISCONNECTED               Your room is ready for sleep
```

Ini juga menyelesaikan pengecualian rata-tengah yang tadinya hanya berlaku di layar darurat: `ALERT` dan `SOS` rata tengah karena keduanya **register sistem**, bukan karena mereka istimewa.

### 7.3 Busur, bukan cincin

Oura menaruh **busur tipis terbuka** di atas hero, bukan cincin tertutup. Busurnya membentang dari tepi kiri ke tepi kanan hero, melengkung ke atas, dengan nilai minimum dan maksimum di kedua ujungnya.

```
        ╭─────────────────────────────╮
   0  ──╯                             ╰──  350
                    ⌾
              SKOR TIDUR
              78
```

Bedanya dari cincin bukan kosmetik. Cincin tertutup mengatakan "ada batas yang bisa dipenuhi" — benar untuk kalori, salah untuk skor tidur. Busur terbuka mengatakan "ini posisi Anda di suatu rentang", dan itu yang sebenarnya kita tampilkan.

| Ketentuan | Nilai |
|---|---|
| Ketebalan | 2px, ujung bulat |
| Terisi | `Lamp Amber` sampai posisi nilai |
| Sisa | `Lamp Faint` |
| Label ujung | Archivo 11, `Ash Grey`, mengikuti kelengkungan |
| Titik penanda | Lingkaran 4px `Ash Dim` pada kelipatan seperempat |

**Larangan tetap berlaku:** tidak ada cincin tertutup untuk nilai hidup. Busur bukan pengecualian atas aturan itu — ia penggantinya. Cincin tertutup hanya di kalibrasi, di mana yang ditampilkan memang kemajuan menuju selesai.

### 7.4 Anotasi bergaris putus-putus di foto perangkat

WHOOP menunjuk detail fisik dengan **garis putus-putus vertikal berujung titik**, langsung di atas foto produk. Dipakai untuk menunjukkan letak nomor seri.

```
        ┊
        ┊
        ●
  ╔═════╪═══════════════════╗
  ║ ⌁ ‖ 4A0012345           ║
  ╚═══════════════════════════╝
```

Jauh lebih baik daripada panah, karena tidak menutupi apa pun dan matanya mengikuti garis sampai ke titik. Pakai di O5 (letak sensor, arah pemasangan), O6 (nomor seri), dan D2.

Garis `Lamp Amber` 1px putus-putus, titik 6px penuh. **Satu anotasi per gambar.** Dua anotasi berarti gambarnya harus dipecah jadi dua langkah.

WHOOP juga memakai panah magenta besar di atas foto untuk menunjukkan gerakan fisik (membuka jepitan, menggeser baterai). Kita tidak bisa memakai magenta, dan panah amber di atas foto gelap akan hilang. Gantinya: **gambar dua posisi dalam satu frame** — sebelum dan sesudah, yang belakang pada opasitas 40%. Gerakan terbaca tanpa satu panah pun.

### 7.5 Input bergaris bawah, bukan berkotak

Pola WHOOP: label huruf besar kecil di atas, isian tanpa kotak, satu garis 1px di bawahnya. Kotak input dengan latar berbeda adalah bawaan yang membuat form terlihat seperti setiap form lain.

```
BENAR                           SALAH

NOMOR WHATSAPP                  ┌──────────────────┐
0812 3456 7890                  │ 0812 3456 7890   │
──────────────────────          └──────────────────┘
```

Garis `Ash Dim`, jadi `Lamp Amber` saat fokus. Galat mengubah garis jadi `Kiln Clay` dan menambah satu baris di bawahnya. Tanpa ikon galat, tanpa latar merah.

### 7.6 Pil terang di dalam gelap

Oura memakai **pil berisi krem terang** untuk aksi di dalam area gelap — `Add a tag`, `Add an activity`, `View full timeline`. Kontrasnya tinggi dan hasilnya terasa disengaja, bukan default.

Ini yang jadi "tombol terbalik" di 7.1. Batasnya satu per layar, dan **tidak pernah** di layar sesi tidur — pil terang di kamar gelap pukul dua pagi adalah lampu sorot kecil.

---

## 8. Komponen

| Komponen | Perlakuan |
|---|---|
| **Tombol** | Seluruhnya di 7.1. Bergaris, bukan berisi |
| **Chip skor** | Bagian 6.4 |
| **Kartu** | Bagian 6.5 |
| **Busur nilai** | Bagian 7.3 |
| **Input** | Bagian 7.5 |
| **Sakelar** | Jalur `Lamp Faint`, kenop `Lamp Amber` saat aktif |
| **Bilah langkah** | Segmen setara selebar layar, terisi `Warm Ivory`, sisanya `Ash Dim` 30%. Pola WHOOP. **Bukan titik-titik** |
| **Bilah progres** | Garis 3px, terisi `Lamp Amber`. Untuk sunset, kalibrasi, kekencangan, rekonstruksi buffer |
| **Cincin progres** | Hanya di kalibrasi. Tidak pernah untuk nilai hidup |
| **Pemuatan** | `BrandSpinner` — cincin `Lamp Amber` berputar dengan glif `R` di tengahnya. Lihat 8.1 |
| **Status kosong** | Kotak garis putus-putus, satu kalimat, menyebut angka yang kurang. Tanpa ilustrasi |
| **Anotasi gambar** | Bagian 7.4 |

### 8.1 `BrandSpinner` — pemuat wajib

**Ditambahkan 13 Agustus. Membatalkan larangan spinner melingkar** yang sebelumnya berdiri di tabel di atas dan di daftar DONT Bagian 11.

Larangan itu dibuat untuk alasan yang benar — skeleton memberi tahu bentuk apa yang sedang datang, sementara spinner hanya memberi tahu bahwa sesuatu belum selesai. Tapi larangan itu ditulis tanpa pengganti untuk kasus di mana **tidak ada bentuk yang bisa dijanjikan**: rute yang belum dimuat kodenya, dan panggilan auth pertama. Di dua tempat itu aplikasi tidak tahu apa yang akan digambar, jadi skeleton akan berbohong tentang tata letaknya.

Yang terjadi kemudian persis seperti kasus `outline: none` di Bagian 6.11 — larangan tanpa pengganti dipenuhi dengan **`null`**. Layar kosong. Untuk satu frame itu benar; untuk apa pun yang lebih lama itu terbaca sebagai aplikasi mati, dan pengguna menekan tombol lagi.

**Ketentuan**

| Hal | Ketentuan |
|---|---|
| Cincin | `Lamp Amber`, satu busur, `strokeLinecap` bulat, satu putaran per **2 detik** |
| Inti | Glif `R` monoline dari wordmark, `Warm Ivory`. Bukan logo lengkap, bukan maskot |
| Ukuran | `sm` 40 · `md` 72 · `lg` 110 · `fullscreen` 88 di atas `Ember Base` penuh |
| Peran ARIA | `role="progressbar"` dengan `aria-label`. Wajib — ini satu-satunya isi layar |
| Dipakai di | Fallback `Suspense`, gerbang `RequireAuth`, dan hanya itu |
| **Tidak dipakai di** | Kartu, daftar, grafik, atau apa pun yang bentuk akhirnya sudah diketahui — di sana skeleton tetap benar |
| Sesi tidur | **Tidak pernah.** Bagian 10 melarang gerak berulang di layar sesi, dan ini gerak berulang |

Baris terakhir bukan pengecualian, melainkan Bagian 9 yang tetap berlaku: aplikasi ini punya tepat dua gerakan berulang, dan pemuat bukan salah satunya. `BrandSpinner` hidup di layar siang, sebelum sesi dimulai.

---

## 9. Gerak

**Penyimpangan yang disengaja.** Panduan desain umum meminta mikro-interaksi berulang pada setiap komponen aktif. Di aplikasi ini itu berbahaya — gerakan berulang di layar yang menyala di kamar gelap menarik mata orang yang sedang berusaha tidur.

Maka: **tepat dua gerakan berulang di seluruh aplikasi.**

1. Jejak EKG di layar sesi hidup, karena ia mencerminkan detak yang memang sedang berdenyut
2. Medan gradien hero saat sunset berjalan, karena lampu kamar memang sedang meredup

Keduanya bergerak sebab dunianya bergerak. Selebihnya diam.

| Konteks | Kurva | Durasi |
|---|---|---|
| Umpan balik sentuh | pegas `stiffness 100 · damping 20` | — |
| Apa pun yang mewakili cahaya | `cubic-bezier(0.16, 1, 0.3, 1)` | mengikuti lampu asli |
| Kartu masuk | `cubic-bezier(0.16, 1, 0.3, 1)` | 320ms, bertingkat 40ms |
| Pindah tab | fade + geser 8px | 180ms |
| Deret chip | inersia bawaan | — |

Kurva eksponensial bukan selera. Peredupan lampu produk ini eksponensial karena mata mempersepsi cahaya secara logaritmik, sehingga peredupan linear terasa mati mendadak di ujungnya. Antarmukanya memakai kurva yang sama.

Bertingkat hanya di layar siang. Tidak pernah saat sesi tidur. Animasikan hanya `transform` dan `opacity`. Hormati `prefers-reduced-motion`.

---

## 10. Mode malam di dalam mode gelap

Aplikasi ini punya dua tingkat kegelapan. Ini pembeda yang paling mudah hilang saat digenerasi ulang.

| | Layar siang | Layar sesi tidur |
|---|---|---|
| Teks utama | `#EDE3D6` | `#8C8175` |
| Aksen | `#E8A33D` | `#8A5F2B` |
| Latar hero | Gradien mengikuti kamar | Nyaris `#0C0A08` |
| Permukaan kartu | Terlihat jelas dari latar | Nyaris menyatu |
| Deret chip | Ada | **Tidak ada** |
| Tab bar & tombol aksi | Ada | **Tidak ada** |
| Gerak | Halus, terbatas | Hanya jejak EKG |
| Kecerahan layar | Bawaan sistem | Diturunkan lewat overlay |

Harus terlihat seperti aplikasi yang sama, diturunkan volumenya — bukan dua desain berbeda.

### 10.1 Mode terang — Warm Linen

**Ditambahkan 13 Agustus.** Sampai versi ini dokumennya hanya mengenal satu latar. Mode terang sekarang ada, bisa dipilih pengguna di Pengaturan atau di laci, dan **gelap tetap bawaan**.

Palet ini adalah kertas hangat, bukan putih. Alasannya sama dengan alasan latar gelapnya `#100D0A` dan bukan hitam murni: tepi yang keras melelahkan mata, dan produk ini soal mata yang lelah.

| Peran | Gelap | Terang |
|---|---|---|
| `Ember Base` | `#100D0A` | `#F4EFE6` |
| Permukaan | `#1A1512` | `#E8E1D5` |
| Terangkat | `#241D18` | `#DCD4C6` |
| `Warm Ivory` (teks utama) | `#EDE3D6` | `#1C1611` |
| `Ash Grey` | `#8C8175` | `#5C5348` |
| `Ash Dim` | `#5C554D` | `#9E9386` |
| `Lamp Amber` | `#E8A33D` | `#D48C26` |
| `Lamp Sleep` | `#D0A17A` | `#B07D56` |
| `Lamp Breath` | `#C9846B` | `#B56C54` |
| Pita baik / cukup / rendah | `#F0B65C` `#B98243` `#B4522F` | `#D99A38` `#AA7334` `#B4522F` |

`Signal Red` tidak punya varian terang. Bagian 4.4 berlaku utuh di kedua mode — merah itu satu warna, dan artinya tidak boleh bergeser karena jam berapa sekarang.

#### Mode malam selalu menang

Ini bukan preferensi, ini urutan yang mengikat. `data-theme` dan `data-night` sama-sama menempel di `<html>` dengan spesifisitas identik, jadi tanpa aturan tegas urutan berkas yang memutuskan — dan hasilnya pernah: **layar linen putih di kamar gelap jam 2 pagi**, persis satu hal yang Bagian 10 ada untuk mencegahnya.

> **Seluruh aturan mode terang dimatikan selama sesi tidur berjalan.** Di kode: `[data-theme="light"]:not([data-night="true"])`, dan hal yang sama berlaku untuk `.hero-*`, `.bg-alert`, `color-scheme`, dan warna bilah status.

Yang dipilih pengguna di Pengaturan berlaku untuk layar siang. Sesi tidur bukan layar siang.

#### Kontras di mode terang — penyimpangan yang dicatat

Tabel di Bagian 6.11 dihitung terhadap `Ember Base` **gelap**, dan angkanya masih berlaku di sana. Terhadap linen, keluarga ambernya tidak lolos:

| Warna | Terhadap gelap | Terhadap linen |
|---|---|---|
| `Warm Ivory` | 15.3:1 | **15.6:1** |
| `Ash Grey` | 5.1:1 | **6.6:1** |
| `Lamp Amber` | 9.0:1 | **2.4:1** |
| Pita baik | 10.7:1 | **2.1:1** |
| Pita cukup | 5.9:1 | **3.5:1** |
| `Lamp Breath` | 6.5:1 | **3.5:1** |
| `Ash Dim` | 2.6:1 | 2.6:1 |

Amber di atas kertas hangat adalah dua warna dengan kecerahan yang berdekatan; itu sifat paletnya, bukan kesalahan penerapan. Angka-angka itu di bawah ambang 4.5:1 yang ditetapkan Bagian 6.11, dan ambang itu tidak dilonggarkan — yang dicatat adalah bahwa **mode terang belum memenuhinya**, dan palet ini dipertahankan apa adanya atas keputusan pemilik produk.

Konsekuensinya nyata dan harus diketahui sebelum diputuskan lagi: label pita skor, `SIGN IN`, `START NOW`, dan status "Good contact" semuanya dibawa oleh amber. Di mode gelap semuanya lolos dengan lapang.

Jalan keluarnya, kalau nanti ditempuh, bukan menggelapkan amber satu per satu — ketiga pita harus tetap saling terbedakan dalam greyscale (Bagian 4.3), jadi menggeser satu memaksa menggeser semuanya. Itu satu sesi palet, bukan tambalan.

Sampai itu terjadi: **gelap adalah mode yang dipakai untuk demo dan untuk penilaian.**

---

## 11. DOs dan DONTs

**Lakukan**

- Satu warna satu metrik, konsisten dari chip sampai grafik sampai timeline
- Angka lebih besar dari judulnya
- Angka spesifik: `28.4 °C`, `2.1 per jam`, `0.42 g`
- Nama orang tetap Indonesia — penggunanya Indonesia. Tanpa gelar: *Andi*, *Sari*, *Budi*
- Status kosong yang menyebut berapa lagi yang dibutuhkan
- Latar hero yang mengikuti kondisi kamar sebenarnya
- Bilah segmen untuk langkah onboarding
- Tombol utama hidup sejak awal, dinilai saat diketuk, galat mendarat di field yang salah (7.1a)

**Jangan**

- Emoji, di mana pun
- `Inter`, huruf sistem, serif apa pun
- Hitam murni, putih murni
- Biru, hijau, ungu — termasuk untuk tautan dan status berhasil
- Signal Red di luar `ALERT` dan `SOS_SENT`
- Warna berbeda untuk metrik yang sama di dua layar
- Judul lebih menonjol daripada skornya
- Mengganti nama metrik di Bagian 5.1
- Cincin progres untuk nilai hidup — hanya sah di kalibrasi
- Empat kartu sensor sejajar berlebar sama
- Foto stok lanskap sebagai latar hero
- Ilustrasi status kosong, maskot
- Bulan sabit, bintang, awan, gradien mesh
- Titik-titik untuk indikator langkah
- Tombol utama dimatikan karena isian belum sah — hanya pekerjaan yang sedang berjalan boleh mematikannya (7.1a)
- Glow neon, bayangan berwarna, gradien pada teks
- Angka bulat palsu: `99%`, `50%`, `100 bpm`
- SpO₂ absolut sebagai angka besar — selalu simpangan dari baseline
- Kejadian dari buffer offline yang terlihat sama dengan kejadian yang dipantau langsung
- Baris "Viewing [name]" di layar darurat milik pengguna sendiri
- Nama generik: *John Doe*, *Jane Smith*, *Acme*
- Kalimat pengisi: "Geser ke bawah", panah gulir, chevron memantul
- Tab bar di layar sesi tidur aktif
- Tombol batal di layar `ALERT`
- Elemen bertumpuk — setiap elemen punya ruangnya sendiri

---

## 12. Kalimat yang terikat kepatuhan

Empat teks berikut tidak boleh diubah satu huruf pun. Disimpan sebagai konstanta di kode, tidak pernah diketik ulang di komponen.

**Skrining napas**
> "Your breathing pattern during sleep shows a sign worth having checked by a doctor."

Kata *apnea*, *diagnosis*, dan *disorder* dilarang muncul di layar mana pun.

**Layar SOS**
> "Message not sent yet — it needs one tap from you."

Kalimat apa pun yang menyiratkan pengiriman otomatis adalah klaim palsu. `"SOS terkirim otomatis"` dilarang mutlak.

**Disclaimer**
> "Not a medical device."

Wajib muncul di Login, Laporan pagi, Breathing Screening, dan Pengaturan.

**Atribusi mock**
> "SAMPLE DATA"

Wajib muncul di setiap layar saat lapisan mock aktif.

---

## 13. Data yang tersedia untuk ditampilkan

Padanan halaman "Usable WHOOP Data". Ini seluruh angka yang boleh muncul di layar; tidak ada metrik lain yang boleh dikarang. Sumber lengkapnya `BLE_GATT_CONTRACT.md`.

**Dari gelang**

| Data | Warna | Laju |
|---|---|---|
| Detak jantung | Lamp Amber | 1 Hz |
| Variabilitas detak (HRV) | Lamp Amber | per menit |
| Resting Pulse | Lamp Amber | per malam |
| **Simpangan SpO₂** dari baseline | Kiln Clay | tiap 10–30 detik |
| Desaturasi per jam | Kiln Clay | turunan |
| Gelang terpasang / kualitas sinyal | Ash Grey | 1 Hz |
| Posisi tidur | Dune Sand | 1 Hz, 5 keadaan |
| Kegelisahan | Dune Sand | 1 Hz |
| Tahap eskalasi | Signal Red | saat kejadian |
| Baterai gelang | Ash Grey | per menit |

**Dari bedside**

| Data | Warna | Laju |
|---|---|---|
| Suhu ruangan | Ash Grey | tiap 30 detik |
| Kelembapan | Ash Grey | tiap 30 detik |
| Cahaya (lux) | Ash Grey | tiap 30 detik |
| Tingkat bising | Ash Grey | tiap 30 detik |
| Dengkur | Kiln Clay | saat terdeteksi |
| Status aktuator | Lamp Faint | saat berubah |

**Dari gelang, hanya saat dipicu pengguna**

| Data | Warna | Laju |
|---|---|---|
| Gelombang EKG | Lamp Amber | 250 Hz, hanya selama perekaman 30 detik |
| Kontak elektroda (`lead_on`) | Ash Grey | menyertai setiap paket |

Gelombang EKG adalah satu-satunya data di aplikasi ini yang digambar sebagai jejak resolusi tinggi. Ia **tidak pernah** ditampilkan bila `lead_on = 0` — layar menampilkan instruksi memegang, bukan gelombang. Gelombang EKG sampah yang terlihat seperti gelombang nyata adalah hal paling berbahaya yang bisa ditampilkan aplikasi ini.

**Dihitung aplikasi**

Sleep Score · fase tidur (hypnogram) · Optimal Darkness · polusi cahaya · Intervention Score per jenis · rata-rata waktu menenangkan · Breathing Screening mingguan

---

## 14. Penyimpangan yang dicatat

Ditulis terbuka supaya bisa dibantah.

| Aturan referensi | Yang dilakukan di sini | Alasan |
|---|---|---|
| Palet WHOOP: teal, biru strain, hijau recovery | Seluruhnya digeser ke panjang gelombang panjang | Produk ini menurunkan lampu kamar ke 2200K karena cahaya biru menekan melatonin. Antarmukanya tidak boleh melanggar temuannya sendiri |
| WHOOP: DINPro untuk angka | Archivo Expanded | DINPro berlisensi. Kontras lebar dalam satu superfamili lebih disiplin daripada dua famili |
| WHOOP: latar hitam murni | `#100D0A` | Hitam murni pada OLED punya tepi yang keras di kamar gelap. Hitam hangat lebih lembut ke mata yang beradaptasi gelap |
| WHOOP: merah `#FF0026` untuk pita rendah | Rust `#B4522F` | Merah disimpan utuh untuk kondisi yang mengancam nyawa. Dipakai dua kali, ia berhenti berarti |
| Oura: foto lanskap sebagai hero | Medan gradien dari bacaan lux kamar | Gunung tidak berhubungan dengan tidur. Kamar berhubungan, dan ia data |
| Oura: headline serif rata tengah | Archivo rata kiri | Perangkat lunak instrumen. Rata kiri lebih cepat dipindai dalam gelap |
| Oura: lima tab | Tiga tab | Lihat `PRD.md` §10 |
| WHOOP: tombol masuk mati sampai isian sah | Tombol selalu hidup, dinilai saat diketuk | Tombol mati tidak bisa difokus, jadi tidak pernah menjelaskan dirinya ke pembaca layar — dan panjang sandi tidak terlihat, jadi tidak ada yang diajarkan. Bagian 7.1a |
| Umum: mikro-interaksi di setiap komponen aktif | Tepat dua | Gerakan berulang di kamar gelap melawan tujuan produk |
| Umum: hero rata tengah dilarang | Layar darurat tetap rata tengah | Kesimetrisan di `ALERT` dan `SOS` menandakan "berhenti dan baca" |
| Bagian 8 versi lama: tidak ada spinner melingkar | `BrandSpinner` wajib di `Suspense` dan gerbang auth | Larangan itu tidak menyebut pengganti untuk keadaan yang bentuknya belum diketahui, dan dipenuhi dengan layar kosong. Bagian 8.1 |
| Bagian 6.11: kontras teks minimal 4.5:1 | Mode terang mengirim amber di 2.1–3.5:1 | Palet linen dipertahankan tanpa perubahan atas keputusan pemilik produk. Ambangnya tidak dilonggarkan, kegagalannya dicatat. Bagian 10.1 |
