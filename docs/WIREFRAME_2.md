# RePulse — Wireframe 2

**Versi:** 1.0 · 12 Agustus 2026
**Acuan:** `PRD.md` v1.3 Bagian 10 · perlakuan visual `DESIGN.md` v2.1
**Target:** mobile 360 × 800, dark-only

Berisi layar yang **belum ada** di `WIREFRAME.md`, plus **M1** yang strukturnya berubah total setelah navigasi jadi tiga tab.

Sama seperti dokumen pertama: lo-fi dan disengaja. Yang dikunci di sini **struktur, hierarki, dan kata-kata.** Warna, radius, dan tipografi urusan `DESIGN.md`.

---

> ## ⚠ Bahasa antarmuka sekarang Inggris
>
> **12 Agustus.** Kalimat Indonesia di dalam kotak wireframe berikut **tetap berlaku sebagai struktur dan maksud**, tapi bukan lagi teks yang dikirim ke layar. Padanan Inggris yang sah ada di `DESIGN.md` Bagian 12 dan di `repulse-mobile-app/src/lib/copy.ts`.
>
> Kotaknya sengaja tidak diterjemahkan: panjang kata Inggris berbeda, dan menerjemahkan ratusan baris ASCII akan merusak perataan kotak tanpa menambah satu pun keputusan baru. Yang normatif adalah kode.
>
> Empat kalimat terikat kepatuhan dalam bentuk barunya:
>
> | Lama | Berlaku sekarang |
> |---|---|
> | Bukan alat medis. | **Not a medical device.** |
> | Pola napas Anda… ke dokter. | **Your breathing pattern during sleep shows a sign worth having checked by a doctor.** |
> | Pesan belum terkirim — perlu satu ketukan Anda. | **Message not sent yet — it needs one tap from you.** |
> | DATA CONTOH | **SAMPLE DATA** |

---

## Rute — layar mana di berkas mana

| Kode | Layar | Berkas |
|---|---|---|
| O1 | Splash | **Di sini** |
| O2 | Login | `WIREFRAME.md` §1 |
| O3 | Izin sistem | `WIREFRAME.md` §2 |
| O4 | Izin autostart | **Di sini** |
| O5 | Panduan pasang | **Di sini** |
| O6 · O7 | Pairing gelang · bedside | `WIREFRAME.md` §3 — **lihat catatan pemisahan di sini** |
| O6b | Gagal terhubung | **Di sini** |
| O8 | Kalibrasi | `WIREFRAME.md` §4 — **lihat catatan gerbang kekencangan di sini** |
| O9 · D3 | Kontak darurat | **Di sini** |
| O10 | Siap | **Di sini** |
| M1 | Beranda | **Di sini — versi lama di `WIREFRAME.md` §5 sudah batal** |
| M2 | Beranda sesi aktif | `WIREFRAME.md` §5b |
| V1–V5 | Tab Vital | **Di sini — satu templat, lima varian** |
| S1 | Riwayat | `WIREFRAME.md` §7 |
| S2 | Detail malam | `WIREFRAME.md` §6 — judulnya berubah, isinya tetap |
| S3 | Tren napas | `WIREFRAME.md` §9 |
| S4 | Wawasan intervensi | `WIREFRAME.md` §10 |
| D1 | Pengaturan | `WIREFRAME.md` §11 — **kontak darurat dikeluarkan** |
| D2 | Perangkat & baterai | **Di sini** |
| D4 | Panel uji | `WIREFRAME.md` §12 |
| D5 | Keluarga — kelola | `WIREFRAME.md` §15 |
| D6 | Ekspor | **Di sini** |
| D7 | Rekam EKG | **Di sini** |
| X1 · X2 | ALERT · SOS | `WIREFRAME.md` §13, §14 |
| X3 | Lembar aksi | **Di sini** |
| X4 | Keluarga — viewer | `WIREFRAME.md` §16 |
| X5 | Darurat orang dipantau | **Di sini** |

Legenda: `●` tersambung · `○` mati · `◌` memuat · `✓` berhasil · `✗` gagal · `⚠` peringatan · `⚑` kejadian · `✦` wawasan · `▓░` bilah

---

## O1 — Splash

```
┌──────────────────────────────────────────┐
│                                          │
│                                          │
│                                          │
│                                          │
│                                          │
│                                          │
│                  ╭───╮                   │
│                  │ ⌁ │                   │
│                  ╰───╯                   │
│                                          │
│                RePulse                   │
│                                          │
│                                          │
│                                          │
│                                          │
│                                          │
│                                          │
└──────────────────────────────────────────┘
```

Menahan sampai status auth diketahui, lalu meneruskan ke O2 atau M1. **Tanpa spinner** — kalau butuh lebih dari 2 detik, yang salah bukan animasinya.

Tidak ada tagline. Tidak ada "Powered by". Tidak ada nomor versi.

---

## O4 — Izin autostart

Layar sendiri, bukan baris di O3. Ini penyebab kegagalan nomor satu di Android non-stok: foreground service dibunuh diam-diam dan tidak ada yang tahu sampai paginya.

```
┌──────────────────────────────────────────┐
│  ‹                                       │
├──────────────────────────────────────────┤
│                                          │
│  Satu langkah lagi, dan ini yang         │
│  paling menentukan                       │
│                                          │
│  HP Anda buatan Xiaomi. Xiaomi           │
│  mematikan aplikasi yang berjalan di      │
│  latar belakang, termasuk aplikasi yang  │
│  sedang memantau tidur Anda.             │
│                                          │
│  Tanpa izin ini, pemantauan bisa         │
│  berhenti di tengah malam tanpa          │
│  pemberitahuan apa pun.                  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  Buka setelan Xiaomi            ›  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Di layar yang terbuka, cari RePulse     │
│  lalu aktifkan:                          │
│                                          │
│    Autostart                             │
│    Tanpa batasan baterai                 │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  Sudah saya aktifkan               │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Lewati — saya paham risikonya           │
│                                          │
└──────────────────────────────────────────┘
```

**Nama pabrikan dan langkahnya menyesuaikan perangkat**, dibaca dari `Device.getInfo()`. Xiaomi, Oppo, Vivo, Realme punya jalur setelan yang berbeda, dan menyebutkan yang salah lebih buruk daripada tidak menyebutkan apa pun.

Pada perangkat yang tidak butuh ini (Pixel, Samsung stok), **layar ini dilewati otomatis** — tidak ditampilkan lalu ditandai selesai.

Tombol lewati ada dan sengaja tidak diberi gaya menonjol. Kalimatnya "saya paham risikonya", bukan "nanti saja" — karena konsekuensinya nyata. Kalau dilewati, spanduk permanen muncul di M1 sampai izinnya diberikan.

Aplikasi **tidak bisa memverifikasi** apakah izinnya benar-benar diberikan; Android tidak menyediakan cara mengeceknya. Jadi "Sudah saya aktifkan" adalah pengakuan pengguna, bukan hasil pemeriksaan — dan itu tidak boleh dinyatakan seolah terverifikasi.

---

## O5 — Panduan pasang

Korsel 4 langkah. Gambar di atas, teks rata kiri di bawah, **bilah segmen** di paling bawah — bukan titik-titik.

```
┌──────────────────────────────────────────┐
│  ✕                                       │
│                                          │
│                                          │
│                                          │
│             [ gambar langkah ]           │
│                                          │
│                                          │
│                                          │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│  Pakai gelang di tangan yang tidak       │
│  dominan                                 │
│                                          │
│  Posisikan dua jari di atas tulang       │
│  pergelangan. Sensor harus menempel      │
│  rata di kulit, tidak menggantung.       │
│                                          │
│                                          │
│  ▬▬▬▬  ────  ────  ────                  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │              Lanjut                │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

Empat langkah:

| # | Judul | Isi pokok |
|---|---|---|
| 1 | Pakai gelang di tangan yang tidak dominan | Posisi dua jari di atas tulang pergelangan. Sensor menempel rata |
| 2 | Kencangkan sampai tidak bergeser | Cukup kencang hingga tidak bisa digeser dengan satu jari, tapi tidak menekan |
| 3 | Tempatkan bedside di samping bantal | Jarak 30–80 cm dari kepala. Sensor cahaya menghadap ke arah wajah |
| 4 | Sambungkan bedside ke listrik | Bedside tidak berbaterai. Ia harus tetap tercolok sepanjang malam |

Langkah 1 dan 2 bukan basa-basi: gelang yang terlalu longgar menghasilkan baseline sampah, dan baseline salah berarti setiap ambang personal salah selama dua minggu berikutnya. Langkah 3 menentukan apakah pembacaan lux mewakili cahaya yang sampai ke mata atau cahaya di sudut meja.

Bisa ditutup lewat `✕`. Bisa dibuka lagi dari D2.

---

## O6 · O7 — catatan pemisahan pairing

`WIREFRAME.md` §3 menggambar satu layar pairing untuk kedua perangkat. **Itu dipecah jadi dua layar berurutan.** Alasannya bukan kerapian — memasangkan dua perangkat dalam satu layar adalah sumber kebingungan yang sudah terbukti: pengguna tidak tahu perangkat mana yang gagal, dan tombol coba lagi jadi ambigu.

**O6 — gelang.** Tiga keadaan dalam satu layar, berurutan:

```
  mencari         ◌  Mencari gelang…
                     Pastikan gelang menyala dan dalam jangkauan
                     ┌──────────────────────────────────────┐
                     │  RePulse Band  4C0521039          ›  │
                     └──────────────────────────────────────┘

  konfirmasi      Cocokkan nomor seri di badan gelang
                  4C0521039
                  ┌──────────────────────────────────────┐
                  │  Ya, ini gelang saya                 │
                  └──────────────────────────────────────┘

  tersambung      ✓  Gelang tersambung
                     Baterai 87% · sinyal kuat
```

Pil `BANTUAN` menetap di kanan atas selama ketiga keadaan.

**O7 — bedside.** Dua keadaan, `mencari` dan `tersambung`. **Tidak punya tombol lewati** — bedside adalah produk asli yang dikembangkan bersama gelang, dan tanpanya seluruh loop kenyamanan mati.

Bila bedside tidak ditemukan setelah 30 detik, yang muncul bukan tombol lewati melainkan daftar penyebab: belum tercolok, terlalu jauh, sudah terpasang ke HP lain.

---

## O6b — Gagal terhubung

Sheet bersama untuk O6 dan O7, bukan halaman baru — pencarian yang ia sela masih pekerjaan yang sedang berjalan. Referensi: layar *Trouble connecting* Oura.

```
┌──────────────────────────────────────────┐
│  ╭────────────────────────────────────╮  │
│  │                                    │  │
│  │  Trouble connecting to your band   │  │
│  │                                    │  │
│  │  Try these extra steps:            │  │
│  │                                    │  │
│  │  ✓ Grant location permission —     │  │
│  │    without it Android returns an   │  │
│  │    empty scan and shows no error   │  │
│  │  ✓ Check the band is charged and   │  │
│  │    switched on                     │  │
│  │  ✓ Check Bluetooth is on           │  │
│  │  ✓ Hold the phone within arm's     │  │
│  │    reach                           │  │
│  │  ✓ Turn Wi-Fi off — 2.4 GHz Wi-Fi  │  │
│  │    and Bluetooth share the band    │  │
│  │                                    │  │
│  │  Still stuck? Open permissions     │  │
│  │  and check what was granted.       │  │
│  │                                    │  │
│  │  ╭──────────────────────────────╮  │  │
│  │  │  Try again                   │  │  │  ← pil terang
│  │  ╰──────────────────────────────╯  │  │
│  │            Get help                │  │
│  ╰────────────────────────────────────╯  │
└──────────────────────────────────────────┘
```

**Izin lokasi ditaruh paling atas.** Ini kegagalan yang tidak bisa dilihat siapa pun: tanpa izin lokasi, Android mengembalikan hasil pemindaian kosong dan **tidak melaporkan galat apa pun**. Aplikasi terlihat rusak padahal cuma kurang izin, dan itu penyebab paling sering dari "perangkat tidak ditemukan".

Judul dan butir pertama menyesuaikan perangkat: gelang menyebut daya dan lampu, bedside menyebut colokan listrik.

**Tidak ada tombol "lanjut tanpa perangkat".** Tidak ada aplikasi tanpa perangkat terpasang, jadi tombol itu menjanjikan jalan yang tidak ada. Jalan keluarnya `Get help`, dan itu sungguhan.

Centangnya adalah butir daftar, bukan status. Warnanya ivory, bukan amber — amber akan terbaca sebagai "sudah dikerjakan".

---

## O8 — catatan gerbang kekencangan

`WIREFRAME.md` §4 punya tiga keadaan. **Ditambah satu di depan:** pengecekan kekencangan, dan kalibrasi menolak mulai sampai lulus.

```
┌──────────────────────────────────────────┐
│                                          │
│  Kencangkan gelang sampai bilah penuh    │
│                                          │
│  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░                    │
│  KUALITAS SINYAL                         │
│                                          │
│  Masih terlalu longgar. Kencangkan satu  │
│  lubang lagi, lalu tunggu tiga detik.    │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │         Mulai kalibrasi            │  │  ← nonaktif
│  └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

Bilah dibaca dari `signal_quality` di byte status `0001`. Tombol jadi aktif begitu nilainya bertahan di ambang layak selama tiga detik — **bukan** begitu ia menyentuh ambang sekali, karena satu lonjakan bukan kontak yang stabil.

Kalimatnya menyesuaikan: `terlalu longgar` di bawah ambang, `sudah pas` di dalam rentang, `terlalu kencang` bila amplitudo PPG justru turun karena aliran darah tertekan.

Ini satu-satunya tempat di aplikasi yang boleh memakai cincin progres, dan itu di keadaan `berjalan`, bukan di sini.

---

## O9 · D3 — Kontak darurat

Satu layar, dua jalan masuk. Di onboarding ia wajib dilewati; dari laci ia bisa dibuka kapan saja.

```
┌──────────────────────────────────────────┐
│  ‹                       Kontak darurat  │
├──────────────────────────────────────────┤
│                                          │
│  Siapa yang dihubungi kalau terjadi      │
│  sesuatu?                                │
│                                          │
│  Minimal satu orang. Tanpa ini,          │
│  peringatan tidak punya tujuan.          │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  Nama                              │  │
│  │  Ibu Sari                          │  │
│  ├────────────────────────────────────┤  │
│  │  Nomor WhatsApp                    │  │
│  │  0812 3456 7890                    │  │
│  ├────────────────────────────────────┤  │
│  │  Hubungan                          │  │
│  │  Ibu                            ▾  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  + Tambah kontak kedua                   │
│                                          │
│  ────────────────────────────────────    │
│                                          │
│  Yang akan mereka terima:                │
│  ┌────────────────────────────────────┐  │
│  │  Andi mungkin butuh bantuan.       │  │
│  │  Terdeteksi pukul 02:16.           │  │
│  │  Lokasi: maps.google.com/…         │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Pesan ini perlu satu ketukan Anda       │
│  sebelum terkirim.                       │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │              Simpan                │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

**Pratinjau pesan bukan hiasan.** Pengguna berhak tahu persis apa yang akan dikirim atas namanya sebelum menyetujui sistemnya — dan kalimat di bawahnya menegaskan bahwa pengiriman tidak otomatis, di layar tempat orang paling mungkin mengasumsikan sebaliknya.

Dipindahkan keluar dari Pengaturan karena tangga eskalasi tidak punya arti tanpa kontak. Menguburnya di D1 berarti sesi pertama bisa berjalan dengan fitur inti mati.

Tombol Simpan nonaktif sampai satu kontak lengkap. Nomor divalidasi bentuknya, bukan keberadaannya — aplikasi tidak mengirim pesan uji.

---

## O10 — Siap

```
┌──────────────────────────────────────────┐
│                                          │
│  Semuanya siap                           │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  ✓  Gelang                         │  │
│  │     RePulse Band 4C0521039 · 87%   │  │
│  ├────────────────────────────────────┤  │
│  │  ✓  Bedside                        │  │
│  │     Tersambung ke listrik          │  │
│  ├────────────────────────────────────┤  │
│  │  ✓  Nadi istirahat Anda            │  │
│  │     62 bpm                         │  │
│  ├────────────────────────────────────┤  │
│  │  ✓  Kontak darurat                 │  │
│  │     Ibu Sari                       │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ────────────────────────────────────    │
│                                          │
│  Malam ini                               │
│                                          │
│  Sunset mulai       21:40    ubah        │
│  Jendela bangun     06:00–06:30  ubah    │
│                                          │
│  Lampu akan mulai meredup sendiri pada   │
│  21:40. Anda tidak perlu melakukan apa   │
│  pun.                                    │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │             Selesai                │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Bukan alat medis.                       │
└──────────────────────────────────────────┘
```

Kalimat "Anda tidak perlu melakukan apa pun" adalah inti keputusan alur nomor 1 — jadwal yang memicu, bukan ketukan. Kalau pengguna keluar dari onboarding masih berpikir ia harus menekan tombol setiap malam, fitur sunset tidak akan pernah dipakai.

Nadi istirahat ditampilkan sebagai hasil, bukan angka teknis. Ini juga membuktikan kalibrasi benar-benar menghasilkan sesuatu.

---

## M1 — Beranda

**Menggantikan `WIREFRAME.md` §5 sepenuhnya.** Struktur lama tidak punya deret chip, hero, umpan kartu, atau linimasa — dan menaruh BPM hidup dalam cincin di tengah, yang sudah dikoreksi di `DESIGN.md` §4.

Tiga bentuk. Kerangkanya sama; hero dan spanduknya berganti.

### Bentuk A — `STANDBY`, pagi setelah tidur

```
┌──────────────────────────────────────────┐
│  ☰          RePulse            ⇪    ◉    │
├──────────────────────────────────────────┤
│  ⌜78⌝  ⌜58⌝  ⌜−2%⌝  ⌜12⌝  ⌜28°⌝  ⌜+     │
│  Tidur  Nadi  SpO₂  Gelisah Kamar Atur   │
├──────────────────────────────────────────┤
│                                          │
│  ⌾                                       │
│  SKOR TIDUR                              │
│                                          │
│  78                                      │
│                                          │
│  Malam yang tenang                       │
│                                          │
│  Anda tidur 6j 42m dengan dua kali       │
│  gelisah. Keduanya reda sendiri.         │
│                                          │
│  ╭─────────────────╮                     │
│  │  Selengkapnya   │                     │
│  ╰─────────────────╯                     │
│                                          │
├──────────────────────────────────────────┤
│  ┌────────────────────────────────────┐  │
│  │  ⃝  Nadi                        ›  │  │
│  │      SEMALAM                       │  │
│  │  58 bpm rata-rata                  │  │
│  │  Nadi istirahat Anda 61 — turun 1  │  │
│  │  dari pekan lalu.                  │  │
│  │  ─╲╱╲──╱╲╱╲─╱╲──╱╲╱╲──╱╲╱╲─       │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │  ⃝  Kamar                       ›  │  │
│  │      GELAP OPTIMAL                 │  │
│  │  6j 12m di bawah 3 lux             │  │
│  │  ▁▁▂▁▁▁▁▁▁▁▂▅▇                     │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Linimasa                                │
│                                          │
│  ⃝─┐ 02:14                               │
│    │ ┌──────────────────────────────┐    │
│    │ │ Gelisah terdeteksi        ›  │    │
│    │ │ ⏱ 4m  ♥ 74 bpm  ⟳ miring kiri│    │
│    │ └──────────────────────────────┘    │
│  ⃝─┘ 02:16                               │
│      ┌──────────────────────────────┐    │
│      │ White noise dinyalakan    ›  │    │
│      │ ⏱ 12m  ✓ tenang dalam 3m 20s │    │
│      └──────────────────────────────┘    │
│                                          │
│      ╭────────────────────────────╮      │
│      │  Lihat linimasa lengkap    │      │
│      ╰────────────────────────────╯      │
│                                          │
│    ╭──────────────────────────╮  ╭────╮  │
│    │ Malam Ini  Vital  Sehat  │  │  ✚ │  │
│    ╰──────────────────────────╯  ╰────╯  │
└──────────────────────────────────────────┘
```

Deret chip **sengaja terpotong** di tepi kanan. Potongan itu yang memberi tahu bahwa ia bisa digeser; jangan pas-paskan lima chip ke dalam lebar layar.

Chip SpO₂ menampilkan `−2%`, bukan `96%`. Yang diukur simpangan dari baseline pribadi, bukan kadar oksigen darah — lihat `DESIGN.md` §5.3.

Kartu Napas hanya muncul bila ada yang perlu dilaporkan. Malam tanpa desaturasi tidak menghasilkan kartu kosong bertulisan "tidak ada temuan".

### Bentuk B — menjelang jadwal sunset

Kerangka sama, ditambah spanduk di atas umpan kartu:

```
│  ┌────────────────────────────────────┐  │
│  │  ⏾  Sunset mulai 21:40          ✕  │  │
│  │     Lampu akan meredup 25 menit    │  │
│  │     ╭──────────╮                   │  │
│  │     │ Tunda 30m│      Mulai sekarang│  │
│  │     ╰──────────╯                   │  │
│  └────────────────────────────────────┘  │
```

Muncul 15 menit sebelum jadwal. `Tunda 30m` menggeser jadwal, boleh berulang. `Mulai sekarang` masuk `WIND_DOWN` lebih awal.

Tombol besar di bawah tetap `Mulai tidur`, dan itu **melompati** wind-down langsung ke `MONITORING` — dipakai saat pengguna tidur lebih awal dari jadwal.

### Bentuk C — `WIND_DOWN` berjalan

Hero berganti dari skor tidur menjadi progres sunset. Umpan kartu dan linimasa tetap ada.

```
│  ⏾                                       │
│  MEREDUPKAN                              │
│                                          │
│  18 mnt                                  │
│                                          │
│  Lampu sedang turun                      │
│                                          │
│  Sekarang 12 lux, menuju di bawah 3.     │
│                                          │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░                    │
│                                          │
│  ╭─────────────────╮                     │
│  │  Lewati sunset  │                     │
│  ╰─────────────────╯                     │
```

Latar hero **ikut meredup bersama lampu asli**, eksponensial, selama 20–30 menit. Ini penerapan langsung `DESIGN.md` §6.3 — layar dan kamar berdenyut bersama.

### Hero saat tidak ada skor

Bedside berjalan sepanjang malam terlepas dari gelang dipakai atau tidak, jadi data kamar selalu ada:

```
│  ⌂                                       │
│  KAMAR SEMALAM                           │
│                                          │
│  6j 12m                                  │
│  gelap optimal                           │
│                                          │
│  Kamar Anda siap untuk tidur.            │
│  Gelang tidak terpasang semalam.         │
│                                          │
│  ╭──────────────────────╮                │
│  │ Lihat kondisi kamar  │                │
│  ╰──────────────────────╯                │
```

Dua keadaan kosong lain memakai pola yang sama, dan keduanya **menyebut angka**:

| Keadaan | Kalimat hero |
|---|---|
| Sesi terlalu pendek | **Sesi 47 menit.** Skor tidur butuh minimal 2 jam |
| Malam pertama | **Malam pertama tercatat.** Skor intervensi muncul setelah 3 kejadian. Tren napas setelah 7 malam |

### Spanduk yang mungkin muncul

Maksimal dua sekaligus, sisanya mengantre.

| Pemicu | Kalimat | Aksi |
|---|---|---|
| Gelang putus | Gelang tidak tersambung sejak 07:20 | Cari · Bantuan |
| HP mati semalam | Menyusun ulang data semalam… `▓▓▓░░` | — |
| Baterai bedside | Bedside tidak tercolok | — |
| Autostart belum | Pemantauan bisa berhenti sendiri di tengah malam | Buka setelan |
| Kontak darurat kosong | Peringatan belum punya tujuan | Isi sekarang |
| Monitor-only aktif | Mode uji — semua intervensi dimatikan | Matikan |

Spanduk kontak darurat dan autostart tidak bisa ditutup. Keduanya melumpuhkan fitur inti, dan menutupnya berarti melupakannya.

---

## V1–V5 — Tab Vital, satu templat

Lima layar berbagi satu templat. Bagian yang berubah hanya **judul, grafik utama, dan daftar penyumbang.**

```
┌──────────────────────────────────────────┐
│  ‹                              Nadi     │
├──────────────────────────────────────────┤
│  ◀  Sen 11 Ags   ▶            ⌄ semalam  │
├──────────────────────────────────────────┤
│                                          │
│  58                                      │
│  BPM RATA-RATA                           │
│                                          │
│  ─╲╱╲──╱╲╱╲─╱╲──╱╲╱╲──╱╲╱╲─╱╲──╱╲─      │
│  22:30       00:00       03:00     06:30 │
│                                          │
│  ────────────────────────────────────    │
│                                          │
│  Dibanding baseline Anda                 │
│                                          │
│  Nadi istirahat    61      ▼ 1 dari      │
│                            pekan lalu    │
│  Terendah          52      03:14         │
│  Tertinggi         88      02:16 ⚑       │
│  HRV rata-rata     42 ms   ▲ 3           │
│                                          │
│  ────────────────────────────────────    │
│                                          │
│  Yang memengaruhi                        │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  Suhu kamar 28.4 °C                │  │
│  │  Di atas 28 °C, nadi malam Anda    │  │
│  │  rata-rata 4 bpm lebih tinggi.     │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ⚑ Satu kejadian pukul 02:16          ›  │
│                                          │
│    ╭──────────────────────────╮  ╭────╮  │
│    │ Malam Ini  Vital  Sehat  │  │  ✚ │  │
│    ╰──────────────────────────╯  ╰────╯  │
└──────────────────────────────────────────┘
```

Tiga bagian tetap di kelima layar: **grafik utama · perbandingan baseline · penyumbang.** Bagian penyumbang selalu memakai bahasa sebab-akibat dengan angka, bukan kalimat umum.

Pemilih tanggal di atas memakai panah, bukan kalender penuh — pengguna hampir selalu melihat semalam atau kemarin.

| Kode | Judul | Angka utama | Grafik utama | Penyumbang |
|---|---|---|---|---|
| **V1** | Skor Tidur | `78` | Hypnogram bertingkat | Durasi · fase dalam · kegelisahan · Kegelapan Optimal, masing-masing dengan kontribusinya ke skor |
| **V2** | Nadi | `58 bpm` | Kurva detak semalam | Suhu kamar · kejadian gelisah · nadi istirahat vs baseline |
| **V3** | Napas | `−2%` | Simpangan SpO₂ dari baseline | Posisi tidur saat desaturasi · durasi dengkur · jam kejadian terbanyak |
| **V4** | Gerak & posisi | `12 kali` | Deret waktu posisi 5 keadaan | Posisi terlama · korelasi posisi dengan desaturasi · jam paling gelisah |
| **V5** | Kamar | `28.4 °C` | Kurva lux dengan penanda sunset | Suhu · kelembapan · polusi cahaya · tingkat bising |

**V1 mengikuti pola Oura paling dekat:** skor besar, lalu daftar apa yang menaikkan dan menurunkannya, masing-masing dengan kontribusi terukur. Itu satu-satunya cara membuat sebuah skor tidak terasa seperti angka yang dikarang.

**V3 tidak pernah menampilkan SpO₂ absolut sebagai angka utama.** Sumbu grafiknya relatif. Nilai absolut boleh muncul kecil sebagai metadata. Kalimat skrining terikat kepatuhan muncul di bawah, dan disclaimer wajib ada.

---

## D2 — Perangkat & baterai

Dibuka dari ikon cincin di kanan atas header. Satu-satunya jalan masuk, dan itu cukup — status perangkat sudah terbaca dari bentuk ikonnya tanpa dibuka.

```
┌──────────────────────────────────────────┐
│  ‹                            Perangkat  │
├──────────────────────────────────────────┤
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  ⌚  Gelang                     ●   │  │
│  │      RePulse Band 4C0521039        │  │
│  │                                    │  │
│  │  Baterai        87%   ▓▓▓▓▓▓▓░     │  │
│  │  Sinyal         kuat  −52 dBm      │  │
│  │  Terpasang      ya                 │  │
│  │  Firmware       1.2.0              │  │
│  │  Jam            selaras            │  │
│  │                                    │  │
│  │  Panduan pakai  ›   Putuskan       │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  ▣  Bedside                    ●   │  │
│  │      RePulse Bedside 2A19          │  │
│  │                                    │  │
│  │  Daya           terhubung listrik  │  │
│  │  Sinyal         kuat  −48 dBm      │  │
│  │  Firmware       1.1.4              │  │
│  │  Sirene mandiri aktif              │  │
│  │                                    │  │
│  │  Uji perangkat  ›   Putuskan       │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ────────────────────────────────────    │
│                                          │
│  Buffer offline                          │
│  Kosong · terakhir disusun 11 Ags 06:12  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │      Pasangkan perangkat baru      │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

Baris **Terpasang** dibaca dari flag `worn`, dan **Jam** dari perbandingan `epoch_s` gelang dengan jam HP. Keduanya penyebab kegagalan senyap kalau tidak pernah ditampilkan ke pengguna.

Baris **Sirene mandiri** memberi tahu bahwa bedside akan berbunyi sendiri saat HP mati — konsekuensi keputusan K3. Pengguna berhak tahu perangkatnya bisa bertindak tanpa aplikasi.

Bagian buffer offline muncul terisi saat ada data yang belum disusun, dengan progres.

---

## D6 — Ekspor

```
┌──────────────────────────────────────────┐
│  ‹                                Ekspor │
├──────────────────────────────────────────┤
│                                          │
│  Rentang                                 │
│  ┌────────────────────────────────────┐  │
│  │  ● Semalam                         │  │
│  │  ○ 7 malam terakhir                │  │
│  │  ○ Semua — 14 malam                │  │
│  │  ○ Pilih tanggal                   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Isi                                     │
│  ┌────────────────────────────────────┐  │
│  │  ☑ Ringkasan malam                 │  │
│  │  ☑ Kejadian dan hasil intervensi   │  │
│  │  ☑ Deret waktu — 1 sampel / 5 dtk  │  │
│  │  ☐ Rekaman EKG                     │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Format                                  │
│  ┌────────────────────────────────────┐  │
│  │  ● CSV — satu berkas per jenis     │  │
│  │  ○ JSON — satu berkas gabungan     │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Perkiraan ukuran   1.4 MB               │
│                                          │
│  Berkas ini berisi data kesehatan Anda.  │
│  Simpan seperti Anda menyimpan hasil     │
│  pemeriksaan.                            │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │              Ekspor                │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

Perkiraan ukuran diperbarui saat pilihan berubah. Deret waktu 14 malam berukuran besar, dan mengetahuinya sebelum mengekspor mencegah kejutan.

Kalimat peringatan ada karena ini satu-satunya tempat data kesehatan keluar dari perlindungan aplikasi. Setelah berkas tersimpan, security rules tidak lagi berlaku atasnya.

---

## D7 — Rekam EKG

```
┌──────────────────────────────────────────┐
│  ✕                              Rekam EKG│
├──────────────────────────────────────────┤
│                                          │
│              [ gambar posisi ]           │
│                                          │
│  Tempelkan jari telunjuk tangan          │
│  sebelahnya ke logam di sisi gelang      │
│                                          │
│  Duduk tenang. Jangan bicara atau        │
│  bergerak selama perekaman.              │
│                                          │
│  ○  Belum ada kontak                     │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │            Mulai rekam             │  │  ← nonaktif
│  └────────────────────────────────────┘  │
│                                          │
│  Bukan alat medis.                       │
└──────────────────────────────────────────┘
```

Saat berjalan:

```
│  ●  Kontak baik                          │
│                                          │
│  ╱╲___╱╲__╱╲___╱╲__╱╲___╱╲__╱╲___       │
│                                          │
│  00:18 dari 00:30                        │
│  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░                     │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │              Batalkan              │  │
│  └────────────────────────────────────┘  │
```

Bila kontak hilang di tengah perekaman, **perekaman berhenti dan hasilnya dibuang.** Yang muncul bukan gelombang setengah jadi, tapi kalimat: *"Kontak terlepas di detik ke-18. Rekaman dibatalkan — coba lagi."*

> **Aturan yang tidak bisa dinegosiasikan.** Gelombang **tidak pernah** digambar saat `lead_on = 0`. Layar menampilkan instruksi memegang, bukan garis. Gelombang EKG sampah yang terlihat seperti gelombang nyata adalah hal paling berbahaya yang bisa ditampilkan aplikasi ini — seseorang bisa menyimpulkan sesuatu darinya.

Hasil selesai menampilkan gelombang penuh yang bisa digeser, durasi, rata-rata detak selama perekaman, dan tombol simpan. **Tidak ada interpretasi irama.** Tidak ada "normal", tidak ada "tidak teratur", tidak ada klasifikasi apa pun — itu diagnosis, dan §12 melarangnya.

---

## X3 — Lembar aksi

Dari tombol `✚`. Lembar bawah, bukan layar penuh.

```
┌──────────────────────────────────────────┐
│                                          │
│                    ▁▁▁                   │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  ⏾   Mulai tidur                   │  │
│  │      Lewati sunset, pantau sekarang│  │
│  ├────────────────────────────────────┤  │
│  │  ⌁   Rekam EKG                     │  │
│  │      30 detik, perlu jari menempel │  │
│  ├────────────────────────────────────┤  │
│  │  ⚑   Catat kejadian                │  │
│  │      Tandai sesuatu yang Anda alami│  │
│  ├────────────────────────────────────┤  │
│  │  ⚗   Panel uji                     │  │
│  │      Kontrol manual semua aktuator │  │
│  └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

`Catat kejadian` membuka satu input pendek — pengguna mencatat "minum kopi jam 8" atau "olahraga sore", dan catatan itu masuk linimasa. Ini yang membuat korelasi bisa dibaca manusia, bukan hanya oleh loop belajar.

`Panel uji` muncul di sini **selain** di laci. Tekan-tahan jam di M2 tetap ada sebagai jalan ketiga selama sesi berjalan, ketika lembar ini tidak tersedia.

Isi lembar menyesuaikan status: saat sesi berjalan, `Mulai tidur` diganti `Akhiri sesi`.

---

## X5 — Darurat orang yang dipantau

**Bukan X1.** Layar ALERT dirancang untuk orang yang sedang dalam bahaya dan punya beberapa detik untuk merespons. Orang yang memantau dari jauh butuh hal yang sepenuhnya berbeda: lokasi dan nomor telepon.

```
┌──────────────────────────────────────────┐
│                                          │
│  ⚠                                       │
│                                          │
│  Ibu Sari mungkin butuh bantuan          │
│                                          │
│  Terdeteksi pukul 02:16                  │
│  4 menit yang lalu                       │
│                                          │
│  ────────────────────────────────────    │
│                                          │
│  Nadi saat terdeteksi     124 bpm        │
│  Tahap                    peringatan     │
│                           dikirim        │
│  Lokasi terakhir          Jl. Melati 14  │
│                           02:16          │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │           Telepon Ibu Sari         │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │            Buka di peta            │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ────────────────────────────────────    │
│                                          │
│  Anda tidak bisa membatalkan peringatan  │
│  ini dari sini. Hanya Ibu Sari yang bisa.│
│                                          │
│  Tutup                                   │
└──────────────────────────────────────────┘
```

**Tidak punya tombol batal.** Kalimat di bawah menjelaskan kenapa, karena tanpa penjelasan orang akan mencarinya. Membiarkan viewer membatalkan peringatan atas nama orang lain adalah lubang keselamatan, bukan kenyamanan.

Muncul sebagai notifikasi dulu, lalu layar ini bila diketuk. **Tidak** merebut layar seperti X1 — orang yang memantau tidak sedang dalam bahaya, dan merebut layarnya saat ia sedang mengemudi justru menciptakan bahaya baru.

Kalau `ALERT` menyala untuk tubuh **pengguna sendiri** sementara X5 sedang terbuka, X1 merebut seluruh layar. Darurat selalu milik pemilik perangkat.

---

## Yang berubah di layar lama

Tiga penyesuaian kecil di `WIREFRAME.md`, tidak perlu digambar ulang:

| Layar | Perubahan |
|---|---|
| **§6 Laporan pagi** | Jadi **S2 Detail malam**. Isinya tetap. Dua jalan masuk: "Selengkapnya" di hero M1, atau dari S1 |
| **§11 Pengaturan** | Kontak darurat **dikeluarkan** ke D3. Yang tersisa: jendela bangun, durasi sunset, ambang deteksi, durasi tahap eskalasi, monitor-only |
| **§12 Panel uji** | Tambah sakelar **matikan aroma selama demo** — risiko iritasi bagi juri atau penonton yang punya asma |

---

## Belum digambar

| Layar | Kenapa ditunda |
|---|---|
| **Linimasa lengkap** | Dibuka dari "Lihat linimasa lengkap". Strukturnya sama dengan linimasa di M1, hanya tanpa batas jumlah — tidak butuh wireframe sendiri |
| **Pemilih orang** | P2 setelah K7 dan K8. Digambar bila fitur keluarga benar-benar dibangun |
| **Catat kejadian** | Satu input teks dan satu penanda waktu. Terlalu sederhana untuk dijadikan halaman |
