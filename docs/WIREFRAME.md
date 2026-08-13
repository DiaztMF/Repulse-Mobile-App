# RePulse — Wireframe

**Versi:** 1.0 · 10 Agustus 2026
**Acuan:** `PRD.md` Bagian 10
**Target:** mobile 360 × 800, dark-only, shadcn/ui

Wireframe ini lo-fi dan disengaja. Tujuannya mengunci **struktur, hierarki, dan kata-kata** — bukan warna, radius, atau tipografi. Itu urusan langkah berikutnya.

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

> ## ⚠ Sebagian dokumen ini sudah tidak berlaku
>
> **12 Agustus 2026.** `PRD.md` v1.2 mengganti navigasi dari lima tab menjadi tiga tab plus laci, dan memperluas onboarding dari 4 menjadi 10 langkah. `DESIGN.md` v2.0 mengganti seluruh perlakuan visual.
>
> | Bagian dokumen ini | Status |
> |---|---|
> | Peta navigasi di bawah | **Batal** — pakai `PRD.md` §10.1 |
> | Isi dan kalimat tiap layar (§1–§16) | **Masih berlaku** — ini alasan dokumen ini disimpan |
> | Tata letak, urutan elemen, penempatan | **Batal** — pakai `DESIGN.md` Bagian 6 |
> | Peta layar lama 1–16 | Diganti kode `O1–O10 · M1–M3 · V1–V5 · S1–S4 · D1–D6 · X1–X4` |
>
> **Layar baru sudah digambar di `WIREFRAME_2.md`** (12 Agustus): O1, O4, O5, O9/D3, O10, **M1 versi baru**, templat V1–V5, D2, D6, D7, X3, X5. Tabel rute lengkap ada di awal berkas itu.
>
> Tiga layar di dokumen ini berubah sedikit tanpa perlu digambar ulang:
>
> | Layar | Perubahan |
> |---|---|
> | **§5 Beranda** | **Batal seluruhnya.** Pakai M1 di `WIREFRAME_2.md` |
> | **§6 Laporan pagi** | Jadi **S2 Detail malam**. Isi tetap, dua jalan masuk |
> | **§11 Pengaturan** | Kontak darurat dikeluarkan ke D3 |
> | **§12 Panel uji** | Tambah sakelar matikan aroma selama demo |

---

## Peta navigasi ~~(batal — lihat `PRD.md` §10.1)~~

```
Login ─► Panduan izin ─► Pairing ─► Kalibrasi ─┐
                                                │
                    ┌───────────────────────────┘
                    ▼
      ╔═════════ TAB BAR (5) ═════════╗
      ║                               ║
   Beranda   Laporan   Napas   Wawasan   Atur
      │         │                          │
      │         ├─ Semalam                 ├─ Panel uji
      │         ├─ Riwayat ─► Detail malam ├─ Ambang deteksi
      │                                    ├─ Kontak darurat
      │                                    └─ Keluarga ─► kelola
      │
      └─ sesi aktif (tab bar disembunyikan)

  ALERT ─► SOS   ◄── bisa muncul dari mana saja, di atas lock screen

  Akun keluarga masuk ke tampilan viewer, bukan tab bar di atas.
```

**Kenapa tab bar hilang saat sesi tidur berjalan.** Layar ini menyala di kamar gelap dan bisa tersenggol. Yang tersisa hanya satu aksi merusak — "Akhiri sesi" — dan itu diberi konfirmasi. **Aturan ini tetap berlaku di struktur baru.**

---

## Aturan global

| Hal | Ketentuan |
|---|---|
| Tema | Dark-only. Tidak ada varian terang |
| Layar malam | Kontras diturunkan, tanpa putih murni, tanpa animasi |
| Disclaimer | "Bukan alat medis" wajib muncul di Login, Laporan pagi, Napas, dan Pengaturan |
| Angka besar | BPM selalu jadi elemen terbesar di layar hidup |
| Waktu | 24 jam, `02:16` |
| Kosong | Setiap kartu punya status kosong bertulisan apa yang kurang dan berapa lagi yang dibutuhkan |
| Bahaya | Merah hanya dipakai untuk ALERT dan SOS. Tidak untuk hal lain, apa pun alasannya |

Legenda: `●` aktif/tersambung · `○` mati · `◌` memuat · `✓` berhasil · `✗` gagal · `⚠` peringatan · `⚑` kejadian · `✦` wawasan

---

## 1. Login

Sumber: Firebase Auth

```
┌──────────────────────────────────────────┐
│                                          │
│                                          │
│              ◕  RePulse                  │
│                                          │
│                                          │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Email                              │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ Kata sandi                     👁  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │              Masuk                 │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ─────────────  atau  ────────────────   │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │   G   Lanjutkan dengan Google      │  │
│  └────────────────────────────────────┘  │
│                                          │
│         Belum punya akun? Daftar         │
│                                          │
│                                          │
│   ⓘ Bukan alat medis. Untuk wellness    │
│      dan peringatan dini saja.           │
└──────────────────────────────────────────┘
```

Disclaimer sengaja muncul sejak layar pertama. Juri akan menilai kejujuran klaim, dan ini tempat paling murah untuk menunjukkannya.

---

## 2. Panduan izin

Sumber: plugin permission, battery-optimization, intent-launcher

```
┌──────────────────────────────────────────┐
│ ←  Izin yang dibutuhkan            2/4   │
├──────────────────────────────────────────┤
│                                          │
│  RePulse memantau sepanjang malam.       │
│  Tanpa izin di bawah, pemantauan         │
│  berhenti sendiri saat layar mati.       │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ ✓  Notifikasi                      │  │
│  │    Agar layar SOS bisa muncul      │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ ✓  Bluetooth & lokasi              │  │
│  │    Menemukan band dan bedside      │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ ○  Abaikan optimasi baterai        │  │
│  │    Android mematikan RePulse saat  │  │
│  │    Doze bila ini tidak aktif       │  │
│  │                     [ Aktifkan ]   │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ ⚠  Autostart — Xiaomi              │  │
│  │    HP ini mematikan aplikasi latar │  │
│  │    secara agresif. Wajib.          │  │
│  │                 [ Buka setelan ]   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │            Lanjutkan               │  │
│  └────────────────────────────────────┘  │
│                                          │
│      Lewati — nanti saja (berisiko)      │
└──────────────────────────────────────────┘
```

**Kartu autostart hanya muncul bila `Build.MANUFACTURER` termasuk Xiaomi, Oppo, Vivo, Realme, atau Huawei.** Nama pabrikan ditulis apa adanya supaya pengguna mengenali layar yang akan terbuka. Tombolnya memakai intent-launcher ke `AutoStartManagementActivity` vendor.

---

## 3. Pairing perangkat

Sumber: `@capacitor-community/bluetooth-le`, filter service UUID dari kontrak GATT

```
┌──────────────────────────────────────────┐
│ ←  Hubungkan perangkat             3/4   │
├──────────────────────────────────────────┤
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  ⌚  Smartband                     │  │
│  │  ────────────────────────────────  │  │
│  │  ● Tersambung · −54 dBm · 87%      │  │
│  │  RePulse Band · A4:C1:38:2F        │  │
│  │                     [ Putuskan ]   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  ▣  Bedside device                 │  │
│  │  ────────────────────────────────  │  │
│  │  ◌ Memindai…                       │  │
│  │                                    │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │ RePulse Bedside    −61 dBm   │  │  │
│  │  │                [ Hubungkan ] │  │  │
│  │  └──────────────────────────────┘  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Tidak ketemu?                           │
│  · Pastikan perangkat menyala            │
│  · Dekatkan ke HP lalu pindai ulang      │
│                                          │
│                    [ Pindai ulang ]      │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │            Lanjutkan               │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

Bonding diaktifkan di sini. Reconnect berikutnya tidak boleh meminta pairing ulang — pengguna sedang tidur saat itu terjadi.

---

## 4. Kalibrasi baseline

Sumber: `0009` `record_baseline` → hasil balik lewat `0005`

```
┌──────────────────────────────────────────┐
│ ←  Kalibrasi                       4/4   │
├──────────────────────────────────────────┤
│                                          │
│  Rekam detak istirahat Anda              │
│                                          │
│  RePulse mendeteksi anomali relatif      │
│  terhadap tubuh Anda, bukan angka        │
│  mutlak. Tiga menit, sekali saja.        │
│                                          │
│                                          │
│              ╭───────────╮               │
│             │             │              │
│             │     64      │              │
│             │     bpm     │              │
│             │             │              │
│              ╰───────────╯               │
│                                          │
│          ▓▓▓▓▓▓▓▓▓░░░░░░░░               │
│                 1:48                     │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Duduk atau berbaring diam.         │  │
│  │ Jangan bicara. Jangan gerakkan     │  │
│  │ tangan yang memakai band.          │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ⚠ Gerakan terdeteksi — waktu ditahan   │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │            Batalkan                │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

**Timer ditahan, bukan direset, saat gerakan melampaui ambang.** Reset penuh membuat pengguna gagal berkali-kali dan menyerah.

Status selesai menampilkan baseline final plus tombol "Simpan ke band", dan hasilnya wajib ditulis ke flash band — bukan hanya disimpan di aplikasi.

---

## 5. Beranda — `STANDBY`

Sumber: RTDB `/live/{uid}`

```
┌──────────────────────────────────────────┐
│  RePulse                             ⚙   │
├──────────────────────────────────────────┤
│  ┌────────────────────────────────────┐  │
│  │  SIAGA                             │  │
│  │  Belum ada sesi tidur berjalan     │  │
│  └────────────────────────────────────┘  │
│                                          │
│   ⌚ Band ● 87%      ▣ Bedside ● AC      │
│                                          │
│              ╭───────────╮               │
│             │     72      │              │
│             │     bpm     │              │
│              ╰───────────╯               │
│         ─╲╱╲──╱╲╱╲─╱╲──╱╲╱╲─            │
│                                          │
│  ┌────────┬────────┬─────────┬────────┐  │
│  │ 28.4°C │  71%   │ 142 lx  │ 48 dB  │  │
│  │ suhu   │ lembap │ cahaya  │ bising │  │
│  └────────┴────────┴─────────┴────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ ⚠ Kamar di atas 28 °C. Pada malam  │  │
│  │   seperti ini Anda 2× lebih sering │  │
│  │   gelisah.                         │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │          ⏾  Mulai tidur            │  │
│  └────────────────────────────────────┘  │
│    Bangun 06.00–06.30 · sunset 25 mnt    │
│                                          │
├──────────────────────────────────────────┤
│   ⏻      📄      ෴      ✦       ⚙       │
│ Beranda Laporan  Napas Wawasan  Atur     │
└──────────────────────────────────────────┘
```

Panel Uji tidak muncul di layar ini. Jalur satu-satunya adalah Pengaturan → Panel uji.

Kartu peringatan suhu hanya muncul bila loop belajar sudah punya cukup data untuk mendukungnya. Sebelum itu, kartu tidak ada sama sekali — bukan diganti teks placeholder.

---

## 5b. Beranda — sesi aktif (`MONITORING`)

```
┌──────────────────────────────────────────┐
│  02:14                                   │
├──────────────────────────────────────────┤
│                                          │
│           MEMANTAU · 3j 44m              │
│                                          │
│              ╭───────────╮               │
│             │     58      │              │
│             │     bpm     │              │
│              ╰───────────╯               │
│                                          │
│         tidur dalam · SpO₂ 96%           │
│                                          │
│  ▁▁▂▃▅▃▂▁▁▁▂▂▁▁▃▄▂▁▁▁▁▂▁▁▁▂▃▂▁▁▁        │
│  22:30           00:00            02:14  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ 01:20  Gelisah → white noise       │  │
│  │        ✓ tenang dalam 4m 4d        │  │
│  └────────────────────────────────────┘  │
│                                          │
│   27.1 °C · 68% · 0.4 lx · gelap optimal │
│                                          │
│                                          │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │           Akhiri sesi              │  │
│  └────────────────────────────────────┘  │
│                                          │
│   ⌚ ● 71%   ▣ ●    layar meredup 30 dtk │
└──────────────────────────────────────────┘
```

Tanpa tab bar. Kontras diturunkan. Setelah 30 detik tanpa sentuhan, kecerahan layar turun ke minimum — layar tetap menyala untuk foreground service, tapi tidak menerangi kamar. Ini bertentangan langsung dengan tujuan produk kalau diabaikan.

> **Jalan buntu yang perlu ditambal.** Karena Panel Uji sekarang hanya ada di Pengaturan, dan tab bar disembunyikan selama sesi, tidak ada cara mencapainya saat sesi berjalan — padahal justru di sanalah tangga eskalasi perlu dipicu saat demo. Tambalannya: **tekan-tahan 2 detik pada jam di kiri atas** membuka Panel Uji. Tidak terlihat pengguna biasa, selalu terjangkau saat peragaan.

Status `WIND_DOWN`, `COMFORT`, dan `WAKE_WINDOW` memakai kerangka yang sama, hanya berganti baris status dan kartu kejadian:

| Status | Baris status | Kartu |
|---|---|---|
| `WIND_DOWN` | `MEREDUPKAN · 18 mnt lagi` | Progress sunset + lux terkini |
| `COMFORT` | `MENENANGKAN · white noise` | Hitung mundur jendela verifikasi 5 menit |
| `WAKE_WINDOW` | `MENUNGGU TIDUR RINGAN` | Jendela bangun + fase sekarang |
| `OFFLINE` | `⚠ BAND TERPUTUS` | Sejak kapan, dan pemberitahuan bahwa band tetap memantau sendiri |

---

## 6. Laporan pagi

Sumber: `nights/{d}` + `series` + `events`

```
┌──────────────────────────────────────────┐
│  Laporan pagi                            │
│  Rabu, 12 Agustus                        │
├──────────────────────────────────────────┤
│  [ Semalam ]   Riwayat                   │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │           7j 12m                   │  │
│  │        22:47 → 06:07               │  │
│  │   ●●●●●●●○○   skor tidur 78        │  │
│  └────────────────────────────────────┘  │
│                                          │
│  FASE TIDUR                              │
│  ▓▓░░▒▒▒▓▓▓░░▒▒▓▓░░░▒▒▒▓▓░░▒▒▒░░        │
│  22:47                            06:07  │
│  ▓ dalam   ▒ REM   ░ ringan   | bangun   │
│                                          │
│  DETAK & SUHU KAMAR                      │
│  ┌────────────────────────────────────┐  │
│  │ 80│                         ╱      │  │
│  │   │     ╱╲      ╱╲    ╱╲╱╲╱       │  │
│  │ 60│─╲╱╲╱  ╲╱╲╱╲╱  ╲╱╲╱           │  │
│  │   │· · · · · · · · · · · · 29 °C  │  │
│  │ 40└─────────────────────────────── │  │
│  └────────────────────────────────────┘  │
│                                          │
│  KEJADIAN SEMALAM                        │
│  ┌────────────────────────────────────┐  │
│  │ 01:20  Gelisah                     │  │
│  │        HR 78 · gerak 0.42 g        │  │
│  │        → white noise, vol 3        │  │
│  │        ✓ tenang dalam 4m 4d        │  │
│  ├────────────────────────────────────┤  │
│  │ 03:41  Gelisah                     │  │
│  │        → aroma, 25 dtk             │  │
│  │        ✗ masih gelisah setelah 5m  │  │
│  │        → white noise, vol 3        │  │
│  │        ✓ tenang dalam 2m 10d       │  │
│  └────────────────────────────────────┘  │
│                                          │
│  KONDISI KAMAR                           │
│  ┌────────────────────────────────────┐  │
│  │ ✓ Gelap optimal sepanjang malam    │  │
│  │   Lux tertinggi 1.8 — di bawah 3   │  │
│  ├────────────────────────────────────┤  │
│  │ Suhu 26.8–29.4 °C · rata 28.1 °C   │  │
│  │ Bising rata-rata 44 dB             │  │
│  └────────────────────────────────────┘  │
│                                          │
│  POLA NAPAS                              │
│  ┌────────────────────────────────────┐  │
│  │ Desaturasi        2.1 / jam        │  │
│  │ Dengkuran         18 menit         │  │
│  │ SpO₂ terendah     91%              │  │
│  │               [ Lihat mingguan → ] │  │
│  └────────────────────────────────────┘  │
│                                          │
│  WAWASAN                                 │
│  ┌────────────────────────────────────┐  │
│  │ ✦ White noise menenangkan Anda     │  │
│  │   rata-rata 4 menit; aroma 11.     │  │
│  ├────────────────────────────────────┤  │
│  │ ✦ Anda paling sering gelisah pada  │  │
│  │   malam saat kamar di atas 28 °C.  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [ Bagikan ]           [ Ekspor CSV ]    │
│                                          │
│  ⓘ Bukan alat medis                     │
└──────────────────────────────────────────┘
```

**Varian kartu kondisi kamar saat ada polusi cahaya:**

```
  ┌────────────────────────────────────┐
  │ ⚠ Polusi cahaya · 2j 14m           │
  │   Terbaca di atas 5 lux sejak      │
  │   23:10. Detak tidur Anda 5 bpm    │
  │   lebih tinggi dibanding malam     │
  │   yang gelap penuh.                │
  └────────────────────────────────────┘
```

Kartu ini **tidak** menawarkan tombol apa pun untuk menyalakan lampu. Sistem hanya melaporkan; menyalakan cahaya untuk memberi tahu bahwa ada terlalu banyak cahaya jelas kontraproduktif.

Blok "Kejadian semalam" adalah wujud visual dari loop verifikasi, dan satu-satunya bukti kasat mata bahwa lingkarannya benar-benar tertutup. Baris 03:41 sengaja menampilkan kegagalan diikuti percobaan kedua — itu justru yang paling meyakinkan.

---

## 7. Riwayat

```
┌──────────────────────────────────────────┐
│  Laporan                                 │
├──────────────────────────────────────────┤
│   Semalam    [ Riwayat ]                 │
│                                          │
│  AGUSTUS 2026                            │
│  ┌────────────────────────────────────┐  │
│  │ Rab 12    7j 12m       skor 78   → │  │
│  │ ▓▓░▒▒▓░▒▓░  2 gelisah · gelap ✓    │  │
│  ├────────────────────────────────────┤  │
│  │ Sel 11    6j 48m       skor 64   → │  │
│  │ ▓░▒▓░░▒▒░▓  4 gelisah · ⚠ cahaya   │  │
│  ├────────────────────────────────────┤  │
│  │ Sen 10    7j 55m       skor 81   → │  │
│  │ ▓▓▒▒▓▓░▒▓░  1 gelisah · gelap ✓    │  │
│  ├────────────────────────────────────┤  │
│  │ Min 09    5j 12m       skor 41   → │  │
│  │ ░░▒░░▓░▒░░  ⚑ 1 peringatan         │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │      Muat malam sebelumnya         │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

Hypnogram mini di tiap baris membuat pola mingguan terbaca tanpa membuka apa pun.

---

## 8. Detail malam

Tata letaknya **identik** dengan Laporan Pagi. Yang berbeda hanya header:

```
┌──────────────────────────────────────────┐
│ ←   Senin, 10 Agustus            ‹   ›   │
├──────────────────────────────────────────┤
│  … isi sama persis dengan layar 6 …      │
```

Satu komponen dipakai dua kali. Bedanya cuma sumber tanggal dan navigasi kiri-kanan antar malam.

---

## 9. Napas mingguan

Sumber: agregasi 7 × `nights/{d}.breathing`

```
┌──────────────────────────────────────────┐
│  Pola napas                              │
│  6 – 12 Agustus                   ‹   ›  │
├──────────────────────────────────────────┤
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Pola napas Anda selama tidur       │  │
│  │ menunjukkan tanda yang sebaiknya   │  │
│  │ diperiksakan ke dokter.            │  │
│  │                                    │  │
│  │ Terlihat pada 4 dari 7 malam.      │  │
│  │           [ Apa artinya ini? ]     │  │
│  └────────────────────────────────────┘  │
│                                          │
│  DESATURASI PER JAM                      │
│  ┌────────────────────────────────────┐  │
│  │ 6│        ▄                        │  │
│  │ 4│     ▄  █  ▄     ▄               │  │
│  │ 2│  ▄  █  █  █  ▄  █  ▄            │  │
│  │ 0└──┴──┴──┴──┴──┴──┴──┴            │  │
│  │    K  J  S  M  S  S  R             │  │
│  └────────────────────────────────────┘  │
│  Rata-rata 3.2 / jam minggu ini          │
│                                          │
│  DENGKURAN                               │
│  ┌────────────────────────────────────┐  │
│  │ 5 dari 7 malam  ·  71%             │  │
│  │ Rata-rata 22 menit per malam       │  │
│  └────────────────────────────────────┘  │
│                                          │
│  POSISI SAAT KEJADIAN                    │
│  ┌────────────────────────────────────┐  │
│  │ Telentang     ████████████   68%   │  │
│  │ Miring kanan  ████   19%           │  │
│  │ Miring kiri   ██   9%              │  │
│  │ Tengkurap     █   4%               │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ ✦ Kejadian paling sering muncul    │  │
│  │   saat Anda telentang.             │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ⓘ Skrining ini bukan diagnosis. SpO₂   │
│    dari pergelangan tangan kurang        │
│    akurat dibanding oximeter jari.       │
│    Diagnosis hanya lewat polisomnografi. │
└──────────────────────────────────────────┘
```

**Kalimat di kartu teratas dikunci huruf per huruf** dan disimpan sebagai konstanta, bukan diketik ulang di komponen. Kata "apnea" dan "diagnosis" tidak boleh muncul di seluruh layar ini.

Breakdown posisi hanya mungkin karena enum posisi memisahkan miring kiri dan kanan — layar inilah alasan perbaikan itu diminta ke firmware.

Status kosong: `Butuh 3 malam untuk mulai melihat pola. Baru ada 1.`

---

## 10. Wawasan

Sumber: `users/{uid}/interventions/*` + korelasi dari `nights`

```
┌──────────────────────────────────────────┐
│  Wawasan                                 │
├──────────────────────────────────────────┤
│  APA YANG BERHASIL UNTUK ANDA            │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ White noise              ●  0.80   │  │
│  │ ████████████████░░░░               │  │
│  │ 8 berhasil / 10 coba               │  │
│  │ Rata-rata menenangkan   4m 12d     │  │
│  ├────────────────────────────────────┤  │
│  │ Aroma                       0.30   │  │
│  │ ██████░░░░░░░░░░░░░░               │  │
│  │ 3 berhasil / 10 coba               │  │
│  │ Rata-rata menenangkan  11m 30d     │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ ● Pilihan berikutnya: white noise  │  │
│  │   Skor tertinggi, 10 percobaan.    │  │
│  │   Sesekali RePulse tetap mencoba   │  │
│  │   aroma agar skornya tidak beku.   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  POLA YANG DITEMUKAN                     │
│  ┌────────────────────────────────────┐  │
│  │ ✦ Anda paling sering gelisah pada  │  │
│  │   malam saat kamar di atas 28 °C.  │  │
│  │   9 dari 12 kejadian.              │  │
│  ├────────────────────────────────────┤  │
│  │ ✦ Detak tidur Anda 5 bpm lebih     │  │
│  │   tinggi pada malam saat kamar     │  │
│  │   tidak sepenuhnya gelap.          │  │
│  ├────────────────────────────────────┤  │
│  │ ✦ White noise menenangkan Anda     │  │
│  │   rata-rata 4 menit; aroma 11.     │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Data belum cukup untuk pola lain.  │  │
│  │ Butuh 14 malam, baru ada 8.        │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

Kalimat "sesekali RePulse tetap mencoba aroma" adalah cara menjelaskan eksplorasi 1:5 tanpa istilah teknis. Tanpa itu, pengguna akan menganggap sistem rusak ketika sesekali memilih intervensi berskor rendah.

---

## 11. Pengaturan

```
┌──────────────────────────────────────────┐
│  Pengaturan                              │
├──────────────────────────────────────────┤
│  TIDUR                                   │
│  ┌────────────────────────────────────┐  │
│  │ Jendela bangun       06.00–06.30 → │  │
│  │ Durasi sunset            25 mnt  → │  │
│  │ Durasi sunrise           25 mnt  → │  │
│  └────────────────────────────────────┘  │
│                                          │
│  DARURAT                                 │
│  ┌────────────────────────────────────┐  │
│  │ Kontak darurat          2 orang  → │  │
│  │ Durasi tahap eskalasi            → │  │
│  └────────────────────────────────────┘  │
│                                          │
│  KELUARGA                                │
│  ┌────────────────────────────────────┐  │
│  │ Berbagi ke keluarga     1 aktif  → │  │
│  └────────────────────────────────────┘  │
│                                          │
│  PENGUJIAN                               │
│  ┌────────────────────────────────────┐  │
│  │ Mode monitor saja        [ ○   ]   │  │
│  │ Semua intervensi dimatikan,        │  │
│  │ perekaman tetap berjalan.          │  │
│  ├────────────────────────────────────┤  │
│  │ Panel uji                        → │  │
│  │ Ambang deteksi                   → │  │
│  │ Sumber data    Perangkat asli    → │  │
│  └────────────────────────────────────┘  │
│                                          │
│  DATA                                    │
│  ┌────────────────────────────────────┐  │
│  │ Ekspor CSV                       → │  │
│  │ Ekspor JSON                      → │  │
│  └────────────────────────────────────┘  │
│                                          │
│  PERANGKAT                               │
│  ┌────────────────────────────────────┐  │
│  │ ⌚ Band     ● 71%  · v1.0.2      → │  │
│  │ ▣ Bedside  ● AC   · v1.0.1      → │  │
│  │ Kalibrasi ulang baseline         → │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │             Keluar                 │  │
│  └────────────────────────────────────┘  │
│                                          │
│  RePulse 0.9.0 · bukan alat medis        │
└──────────────────────────────────────────┘
```

**"Sumber data"** beralih antara Perangkat asli dan Simulasi. Ini sakelar lapisan mock, dan jaring pengaman demo bila hardware bermasalah pada 24 Agustus.

**"Ambang deteksi"** membuka daftar panjang seluruh parameter di Lampiran PRD. Setiap baris menampilkan nilai sekarang, rentang yang diizinkan, dan tombol kembalikan ke bawaan. Perubahan dikirim ke band lewat characteristic `0005` tanpa flash ulang.

---

## 12. Panel uji

Layar terpenting untuk demo juri.

```
┌──────────────────────────────────────────┐
│ ←  Panel uji                             │
├──────────────────────────────────────────┤
│  ⚠ Perintah dikirim langsung ke          │
│    perangkat, melewati mesin status.     │
│                                          │
│  BEDSIDE                                 │
│  ┌────────────────────────────────────┐  │
│  │ White noise      [ ●───── ] vol 3  │  │
│  │ Trek        [ 1 ] [ 2 ] [ 3 ]      │  │
│  ├────────────────────────────────────┤  │
│  │ Diffuser aroma       [ Semprot ]   │  │
│  │ 25 dtk · sisa kuota malam ini 3/4  │  │
│  ├────────────────────────────────────┤  │
│  │ Lampu                              │  │
│  │ [Sunset][Sunrise][Amber][Alert][Off]│ │
│  │ Kecerahan  ─────●──────────  40%   │  │
│  ├────────────────────────────────────┤  │
│  │ Sirene                [ ○  MATI ]  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  SMARTBAND                               │
│  ┌────────────────────────────────────┐  │
│  │ Getar      [ Halus ]  [ Keras ]    │  │
│  │ Sinkronkan waktu       [ Kirim ]   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  SIMULASI KEJADIAN                       │
│  ┌────────────────────────────────────┐  │
│  │ [ Picu gelisah              ]      │  │
│  │ [ Picu anomali              ]      │  │
│  │ [ Anomali tanpa respons     ]      │  │
│  │ [ Putus koneksi 30 detik    ]      │  │
│  └────────────────────────────────────┘  │
│                                          │
│  LOG PERINTAH                            │
│  ┌────────────────────────────────────┐  │
│  │ 14:22:07  #42 light.amber     ✓ 0  │  │
│  │ 14:21:55  #41 aroma 60s       ✗ 2  │  │
│  │           ditolak — batas durasi   │  │
│  │ 14:21:30  #40 white_noise     ✓ 0  │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

Log perintah menampilkan `command_id` dan kode status dari kontrak GATT. Baris `#41 ✗ 2` adalah cara tercepat memperagakan bahwa batas keselamatan aroma benar-benar ditegakkan firmware, bukan sekadar diklaim di slide.

Empat tombol simulasi memetakan langsung ke skenario penerimaan no. 5, 9, 10, dan 4.

---

## 13. `ALERT` — sebelum SOS

Muncul saat band melaporkan `stage` 2 atau 3. Belum ada pesan apa pun yang disiapkan.

```
┌══════════════════════════════════════════┐
║                                          ║
║                                          ║
║                  ⚠                       ║
║                                          ║
║          MEMERIKSA KONDISI               ║
║                                          ║
║   Irama jantung tidak teratur terdeteksi ║
║                                          ║
║                                          ║
║              ╭───────────╮               ║
║             │     142     │              ║
║             │     bpm     │              ║
║              ╰───────────╯               ║
║                                          ║
║                                          ║
║            ●━━━━━━━━━━○━━━○              ║
║          tahap 2 dari 4 · 0:23           ║
║                                          ║
║  ┌────────────────────────────────────┐  ║
║  │  Band sedang bergetar.             │  ║
║  │  Gerakkan tangan Anda untuk        │  ║
║  │  membatalkan.                      │  ║
║  └────────────────────────────────────┘  ║
║                                          ║
║                                          ║
║        Tidak ada pesan dikirim.          ║
║                                          ║
└══════════════════════════════════════════┘
```

Tidak ada tombol batal. Yang membatalkan adalah gerakan tubuh, bukan ketukan jari — itu inti perbedaan produk ini dari pendekatan countdown biasa. Menaruh tombol di sini akan merusak seluruh argumennya.

---

## 14. `SOS_SENT`

Full-screen di atas lock screen.

```
┌══════════════════════════════════════════┐
║                                          ║
║                  ⚠                       ║
║                                          ║
║          ANOMALI TERDETEKSI              ║
║                                          ║
║  Tubuh tidak merespons selama 65 detik   ║
║                                          ║
║  02:16 · 12 Agustus                      ║
║                                          ║
║  ┌────────────────────────────────────┐  ║
║  │ Detak terakhir      142 bpm        │  ║
║  │ Irama               tidak teratur  │  ║
║  │ SpO₂                89%            │  ║
║  └────────────────────────────────────┘  ║
║                                          ║
║  PESAN SIAP DIKIRIM KE                   ║
║  ┌────────────────────────────────────┐  ║
║  │ Ibu Sari · +62 812-xxxx-xxxx       │  ║
║  │ ────────────────────────────────── │  ║
║  │ "Andi butuh bantuan. RePulse       │  ║
║  │  mendeteksi irama jantung tidak    │  ║
║  │  teratur pukul 02:16 dan tidak     │  ║
║  │  ada respons. Detak terakhir       │  ║
║  │  142 bpm.                          │  ║
║  │  Lokasi: maps.google.com/?q=…"     │  ║
║  └────────────────────────────────────┘  ║
║                                          ║
║  ┌────────────────────────────────────┐  ║
║  │                                    │  ║
║  │       KIRIM VIA WHATSAPP           │  ║
║  │                                    │  ║
║  └────────────────────────────────────┘  ║
║                                          ║
║  ┌────────────────────────────────────┐  ║
║  │              BATAL                 │  ║
║  └────────────────────────────────────┘  ║
║                                          ║
║  Sirene dan lampu kamar sedang menyala.  ║
║  Pesan belum terkirim — perlu satu       ║
║  ketukan Anda.                           ║
└══════════════════════════════════════════┘
```

**Dua kalimat terakhir adalah teks paling sensitif di seluruh aplikasi.** Kata "belum terkirim" wajib ada. Menulis "SOS terkirim otomatis" di sini akan menjadi klaim yang tidak bisa dipertahankan saat juri bertanya, dan dokumen sumber melarangnya secara eksplisit.

Bila tidak ada respons dalam 2 menit, layar berbunyi dan tampil ulang.

---

## 15. Keluarga — kelola

```
┌──────────────────────────────────────────┐
│ ←  Berbagi ke keluarga                   │
├──────────────────────────────────────────┤
│  Keluarga bisa melihat ringkasan tidur   │
│  dan riwayat peringatan Anda. Mereka     │
│  tidak bisa melihat data mentah.         │
│                                          │
│  SEDANG BERBAGI                          │
│  ┌────────────────────────────────────┐  │
│  │ Ibu Sari                           │  │
│  │ sari@email.com · sejak 8 Agustus   │  │
│  │                        [ Cabut ]   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  UNDANG                                  │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │
│  │            4 8 2 9 1 6             │  │
│  │                                    │  │
│  │  Berlaku 10 menit · sisa 08:42     │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Minta mereka memasang RePulse, masuk,   │
│  lalu memasukkan kode ini.               │
│                                          │
│  [ Salin kode ]         [ Bagikan ]      │
│                                          │
│  MENUNGGU PERSETUJUAN                    │
│  ┌────────────────────────────────────┐  │
│  │ budi@email.com                     │  │
│  │       [ Tolak ]    [ Izinkan ]     │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

Kode undangan diklaim viewer, lalu pemilik menyetujui. Satu ketukan tambahan menghilangkan kebutuhan Cloud Function untuk memetakan email ke uid — dan sekaligus mencegah orang yang menebak kode langsung mendapat akses.

---

## 16. Keluarga — tampilan viewer

```
┌──────────────────────────────────────────┐
│  Andi                              ⚙     │
├──────────────────────────────────────────┤
│  ┌────────────────────────────────────┐  │
│  │  ✓  Semalam aman                   │  │
│  │     Tidak ada peringatan           │  │
│  └────────────────────────────────────┘  │
│                                          │
│  TIDUR SEMALAM                           │
│  ┌────────────────────────────────────┐  │
│  │  7j 12m                            │  │
│  │  22:47 → 06:07                     │  │
│  │  ▓▓░░▒▒▓▓▓░░▒▒▓▓░░░▒▒▓▓░░          │  │
│  │  2 kali gelisah, keduanya reda     │  │
│  └────────────────────────────────────┘  │
│                                          │
│  RIWAYAT PERINGATAN                      │
│  ┌────────────────────────────────────┐  │
│  │ 9 Ags 02:15   ⚑ Anomali            │  │
│  │               Andi merespons,      │  │
│  │               tidak berlanjut.     │  │
│  ├────────────────────────────────────┤  │
│  │ Tidak ada peringatan lain dalam    │  │
│  │ 30 hari terakhir.                  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  7 MALAM TERAKHIR                        │
│  ┌────────────────────────────────────┐  │
│  │  ●   ●   ●   ◐   ●   ●   ●         │  │
│  │  K   J   S   M   S   S   R         │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ⓘ Anda melihat ringkasan. Data detak   │
│    dan sensor tidak dibagikan.           │
└──────────────────────────────────────────┘
```

Kartu teratas menjawab satu-satunya pertanyaan yang benar-benar dipedulikan keluarga: apakah semalam aman. Sisanya pelengkap.

Tidak ada grafik detak, tidak ada data kamar, tidak ada akses ke subkoleksi `series`. Aturan Firestore menegakkan ini, bukan sekadar UI yang menyembunyikannya.

---

## Yang sengaja tidak dibuat

| Tidak ada | Alasan |
|---|---|
| Tema terang | Aplikasi kamar gelap. Menambah tema kedua berarti menguji tiap layar dua kali |
| Onboarding bergambar | Empat layar setup sudah menjelaskan dirinya sendiri |
| Grafik interaktif dengan zoom | Scrub pada Detail Malam sudah cukup. Zoom adalah pekerjaan sehari yang bisa dipakai untuk hal lain |
| Notifikasi harian | Laporan pagi dibuka saat pengguna bangun, tidak perlu didorong |
| Profil & avatar | Satu pengguna per instalasi pada prototipe |

---

## Keputusan yang sudah dikunci

| # | Hal | Keputusan |
|---|---|---|
| 1 | Susunan tab | Beranda · Laporan · Napas · Wawasan · Atur. Napas dan Wawasan mendapat tab sendiri karena keduanya klaim utama produk di depan juri, bukan karena frekuensi pemakaian |
| 2 | Panel Uji | Disembunyikan di Pengaturan. Tidak ada pintasan di Beranda. Satu-satunya jalur cepat adalah tekan-tahan jam saat sesi berjalan |
| 3 | Kartu wawasan di Beranda | Muncul kondisional. Bila data belum cukup, kartu tidak ada sama sekali — tidak diganti placeholder, dan tinggi layar menyesuaikan |

Wireframe ini sudah bisa dipakai sebagai dasar prompt Figma Make. Lihat `FIGMA_MAKE_PROMPTS.md`.
