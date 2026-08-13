# PRD — Aplikasi RePulse

**Produk:** RePulse — sistem pemantau tidur & jantung untuk Indonesia Inventors Day 2026
**Dokumen ini:** Product Requirements Document untuk **aplikasi Android** saja
**Acuan:** RePulse — Panduan Teknis untuk Developer v2.1 (11 halaman)
**Versi:** 1.4 · 13 Agustus 2026
**Tenggat demo:** 24 Agustus 2026 — **11 hari kalender tersisa**
**Status:** Aktif — pertanyaan terbuka tersisa di Bagian 16.2

**Perubahan v1.2:** Bagian 10 ditulis ulang — navigasi tiga tab menggantikan lima tab, onboarding diperluas dari 4 ke 10 langkah, total 33 layar dengan tingkat prioritas P0/P1/P2. Bagian 14 disesuaikan ke kode layar baru. Seluruh perlakuan visual dipindahkan ke `DESIGN.md` v2.1, yang kini diturunkan dari WHOOP Brand Guidelines dan pola tata letak Oura.

**Perubahan v1.4 · 13 Agustus:** §10.2a ditambahkan — ketahanan sesi, penjagaan rute, dan sepuluh keadaan O2, satu-satunya layar onboarding yang keadaannya tidak pernah diurai. §3.2 dikoreksi ke React 19 tanpa shadcn/ui, dengan alasannya. Disclaimer dan baris viewer disamakan ke bentuk Inggris yang mengikat. Daftar kata terlarang A4 dipindahkan ke bahasa Inggris dan diberi uji yang benar-benar jalan.

**Perubahan v1.3 · 12 Agustus:** sepuluh dari dua belas pertanyaan klien terjawab (§16.2). Yang terpenting: **gelang dan bedside boleh berkomunikasi langsung**, menutup lubang keselamatan terbesar di desain lama — Aturan 1 dapat pengecualian kedua. AD8232 dikonfirmasi dipasang, jadi karakteristik EKG masuk kontrak. Fitur keluarga turun ke P2 karena hanya tersedia satu set perangkat keras.

---

## 1. Ringkasan

RePulse terdiri dari tiga alat yang bekerja sebagai satu sistem: smartband ESP32-C3, bedside device ESP32, dan aplikasi Android. Dokumen ini hanya mengatur **aplikasi Android**.

Aplikasi memegang peran paling kritis dalam sistem: ia adalah satu-satunya pemegang status sistem, satu-satunya yang memutuskan intervensi, dan satu-satunya jalur peringatan darurat ke keluarga. Band dan bedside tidak saling terhubung — keduanya hanya bicara ke aplikasi (topologi bintang).

Yang membedakan produk ini bukan komponennya, melainkan satu lingkaran tertutup:

```
Ukur → Putuskan → Bertindak → Cek hasilnya → Simpan untuk besok ↻
```

Dua kotak terakhir — verifikasi dan adaptasi — sepenuhnya dikerjakan aplikasi, dan itulah yang tidak dilakukan produk sejenis.

### Tujuan aplikasi

1. Memegang status sistem secara tunggal dan konsisten (Aturan 1)
2. Mendeteksi kegelisahan, memilih intervensi, dan **memverifikasi hasilnya**
3. Belajar dari hasil verifikasi sehingga pilihan intervensi membaik seiring waktu
4. Menjalankan layar SOS yang bisa diandalkan saat band melaporkan anomali
5. Menyajikan laporan pagi dan ringkasan mingguan yang bisa dipahami orang awam
6. Memberi keluarga jendela ketenangan tanpa membocorkan data mentah

### Bukan tujuan

- Bukan alat medis, bukan diagnosis
- Tidak menggantikan polisomnografi maupun oximeter jari
- Tidak mengirim pesan darurat tanpa ketukan manusia

---

## 2. Batas tanggung jawab

| Fungsi | Dijalankan di | Milik siapa |
|---|---|---|
| Baca PPG, hitung BPM dan interval RR | Smartband | Firmware |
| Baseline personal & ambang anomali | Smartband (flash) | Firmware |
| Deteksi anomali + tangga eskalasi | Smartband | Firmware |
| Buffer kejadian saat offline | Smartband | Firmware |
| Menyalakan aktuator | Bedside | Firmware |
| Mengukur kondisi kamar | Bedside | Firmware |
| Deteksi pola dengkuran dari mikrofon | Bedside | Firmware |
| **Estimasi fase tidur** | **Aplikasi** | **PRD ini** |
| **Memilih & menjadwalkan intervensi** | **Aplikasi** | **PRD ini** |
| **Verifikasi hasil & adaptasi** | **Aplikasi** | **PRD ini** |
| **Kirim peringatan + lokasi** | **Aplikasi** | **PRD ini** |
| **Pemegang status sistem** | **Aplikasi** | **PRD ini** |
| **Seluruh antarmuka & pelaporan** | **Aplikasi** | **PRD ini** |

> **Catatan penting:** deteksi anomali sengaja ditaruh di band, bukan di aplikasi. Android mematikan proses latar saat Doze, HP bisa kehabisan baterai, pengguna bisa lupa mengisi daya. Fitur keselamatan tidak boleh bergantung pada hal-hal itu. Aplikasi **menerima** flag anomali dari band, tidak menghitungnya sendiri.

---

## 3. Arsitektur teknis

### 3.1 Bentuk aplikasi

Aplikasi dibangun sebagai **web app** (Firebase + WebView) lalu dibungkus **Capacitor** menjadi satu APK Android. Bagian yang butuh kemampuan native diselesaikan lewat plugin siap pakai — tanpa menulis kode Kotlin.

```
┌─────────────────────── APK tunggal ───────-────────────────┐
│                                                            │
│  Lapisan native (plugin Capacitor, tanpa kode sendiri)     │
│  · Foreground service + notifikasi persisten               │
│  · Koneksi BLE ke band & bedside                           │
│  · Full-screen SOS di atas lock screen                     │
│  · Doze exemption + pintasan setelan autostart             │
│                                                            │
│  Lapisan WebView (React + TS + shadcn) ← pekerjaan utama   │
│  · Mesin status, loop verifikasi, adaptasi                 │
│  · Estimasi fase tidur, skrining napas                     │
│  · Seluruh layar, grafik, pengaturan                       │
│  · Firebase SDK                                            │
└────────────────────────────────────────────────────────────┘
```

### 3.2 Stack (dikunci)

| Lapisan | Pilihan |
|---|---|
| Bahasa & build | React 19 + TypeScript, Vite |
| Styling | Tailwind CSS v4 |
| Komponen | **Ditulis sendiri** — lihat catatan di bawah |
| Shell native | Capacitor 7 |
| Backend | Firebase (Auth, Firestore, Realtime Database, App Check) |

**Direvisi 13 Agustus — shadcn/ui dibatalkan.** v1.2 mengunci shadcn/ui. Itu ditulis sebelum `DESIGN.md` v2.1 ada, dan keduanya tidak bisa hidup bersama: §7.1 mewajibkan tombol **bergaris tepi, isian transparan**, §7.5 mewajibkan input **tanpa kotak**, §7.2 mewajibkan dua register tipografi, dan §8 melarang spinner melingkar. Keempatnya adalah bawaan shadcn yang harus ditimpa. Menyalin sepuluh komponen lalu menulis ulang isinya lebih mahal daripada menulis empat komponen yang memang kita butuhkan.

Yang ada sekarang: `Button`, `Card`, `Field`, `StepBar`, `Sparkline`, `ValueArc`, `DeviceArt` — semuanya di `src/components/ui/`. `class-variance-authority`, `clsx`, dan `tailwind-merge` tetap dipakai karena itu memang perkakas yang dipakai shadcn di baliknya, dan harganya beberapa kilobyte.

**Konsekuensi yang harus diterima:** kita kehilangan aksesibilitas bawaan Radix — fokus terperangkap di dialog, semantik ARIA, navigasi papan tik. Itu harus ditulis tangan, dan karena itu `DESIGN.md` §6.11 sekarang mengatur aturan minimumnya. Ini penukaran yang disengaja, bukan kelalaian.

Tema dikunci **dark-only** — tidak ada varian terang di token, supaya tidak ada jalur kode yang perlu diuji dua kali.

### 3.3 Daftar dependensi

| Kebutuhan | Paket | Biaya | Catatan |
|---|---|---|---|
| BLE | `@capacitor-community/bluetooth-le` | Gratis | API BLE native, bukan Web Bluetooth |
| Foreground service | `@capawesome-team/capacitor-android-foreground-service` | Gratis | Notifikasi persisten, tombol aksi |
| Doze exemption | `@capawesome-team/capacitor-android-battery-optimization` | Gratis | `requestIgnoreBatteryOptimization()` |
| SOS di atas lock screen | `capacitor-fullscreen-notification` | Gratis | Butuh `showWhenLocked` + `turnScreenOn` di manifest |
| Pintasan autostart pabrikan | `@capawesome-team/capacitor-android-intent-launcher` | Gratis | Membuka `AutoStartManagementActivity` MIUI dsb. |
| Lokasi | `@capacitor/geolocation` | Gratis | Untuk tautan Google Maps di pesan SOS |
| Getar HP | `@capacitor/haptics` | Gratis | Pelengkap getar band |
| Berbagi & ekspor | `@capacitor/share`, `@capacitor/filesystem` | Gratis | Ekspor CSV/JSON |

**Total biaya lisensi: Rp 0.**

**Sengaja dihindari:** `@capawesome-team/capacitor-bluetooth-low-energy`. Plugin ini punya *headless task* yang secara teknis lebih benar (BLE tetap jalan tanpa WebView), tapi berbayar 99 USD/bulan atau 1.980 USD sekali beli, **dan** tetap menuntut penulisan kelas Java. Disimpan sebagai rencana cadangan bila spike di Bagian 14 gagal.

### 3.4 Firebase

| Layanan | Dipakai untuk |
|---|---|
| Authentication | Email/password + Google Sign-In (wajib) |
| Cloud Firestore | Ringkasan malam, kejadian, deret waktu, pengaturan, skor intervensi |
| Realtime Database | Aliran data live 1 Hz (BPM, gerakan, status) |
| App Check | Melindungi akses dari klien tidak sah |

**Kenapa dua database.** Firestore menagih per operasi tulis. BPM 1 Hz selama 8 jam = 28.800 sampel — mustahil ditulis satu per satu. Realtime Database menagih bandwidth, bukan operasi, sehingga cocok untuk node live yang ditimpa terus-menerus. Firestore hanya dipakai untuk data yang sudah diringkas.

### 3.5 Risiko arsitektur yang harus diuji lebih dulu

Dokumentasi plugin foreground service menyatakan secara eksplisit bahwa plugin **tidak menjamin JavaScript terus berjalan** di latar belakang — itu tergantung siklus hidup OS. Loop deteksi aplikasi ini adalah JavaScript di dalam WebView.

Konsekuensinya: **service hidup tidak sama dengan `setInterval` berjalan.** Ini wajib diuji semalaman di perangkat asli sebelum arsitektur ini dikunci. Lihat Bagian 14, Milestone M0.

---

## 4. Mesin status

### 4.1 Aturan yang tidak bisa dinegosiasikan

**Aturan 1 — Status dipegang aplikasi.** Sistem hanya boleh berada di satu status pada satu waktu. Bedside tidak pernah memutuskan apa pun, ia hanya menjalankan perintah lalu melapor selesai.

> **Pengecualian, ditambahkan v1.2 — tangga eskalasi berjalan otonom di gelang.**
>
> Aturan 1 berlaku untuk **sistem kenyamanan**: aktuator mana yang menyala kapan, dan status mana yang aktif. Tangga eskalasi (§6) dikecualikan sepenuhnya — ia berjalan di dalam firmware gelang, terus-menerus, tersambung maupun tidak.
>
> Alasannya: fitur keselamatan tidak boleh punya titik kegagalan tunggal berupa baterai ponsel. Kalau eskalasi butuh HP, maka HP yang mati pukul dua pagi mematikan satu-satunya fitur yang menyelamatkan nyawa di produk ini.
>
> Kontrak GATT sebenarnya sudah mengasumsikan ini — karakteristik `0007` melaporkan *tahap eskalasi*, dan tahap 3 berbunyi "getar keras + **minta layar HP menyala**". Gelang yang meminta HP menyalakan layar bukan gelang yang sedang diperintah. Aturan 1 versi lama bertentangan dengan kontrak yang sudah ditulis; yang berlaku adalah versi kontrak.
>
> Peran aplikasi selama `ALERT` adalah **cermin dan antarmuka**, bukan pengendali. Aplikasi menampilkan tahap, menyalakan layar, menyiapkan pesan — tapi yang menghitung adalah gelang, dan yang membatalkan adalah gerakan tubuh yang dibaca gelang.

> **Pengecualian kedua, ditambahkan 12 Agustus — bedside boleh bertindak sendiri saat tidak ada HP.**
>
> Klien menyetujui gelang dan bedside berkomunikasi langsung (K3). Ini menutup lubang keselamatan paling serius di desain lama: HP mati pukul dua pagi, gelang tetap eskalasi sampai tahap 4, tapi tidak ada yang memerintahkan sirene.
>
> Mekanismenya **bukan** koneksi GATT kedua — itu memaksa gelang jadi dual-role dan pekerjaannya besar. Gelang menyiarkan tahap eskalasinya di paket advertising yang sudah ia kirim; bedside memindai pasif. Rincian ada di `BLE_GATT_CONTRACT.md` §2.1.
>
> **Arbitrasi:** bedside membunyikan sirene sendiri hanya bila tahap ≥ 3, MAC cocok dengan gelang pasangannya, bedside tidak punya koneksi ke aplikasi, **dan** bit `phone_connected` di siaran bernilai `0`. Bila salah satu pihak masih punya HP, HP yang berkuasa. Ini yang mencegah sirene diperintah dua tuan.
>
> Aturan 1 sekarang berbunyi lengkap: **aplikasi memegang sistem kenyamanan; gelang memegang eskalasi; bedside boleh membunyikan sirene sendiri hanya saat tidak ada aplikasi.**

**Aturan 2 — Ada urutan prioritas.** Status berprioritas lebih tinggi membatalkan yang lebih rendah.

**Aturan 3 — Saat darurat, semuanya dibalik.** Aktuator yang bertugas menidurkan harus melakukan kebalikannya.

### 4.2 Daftar status

| Prioritas | Status | Kapan aktif |
|---|---|---|
| 1 | `ALERT` / `SOS_SENT` | Anomali jantung. Membatalkan semua status lain |
| 2 | `WAKE_WINDOW` | Urutan bangun lembut |
| 3 | `COMFORT` | Pengguna gelisah, intervensi berjalan |
| 4 | `MONITORING` | Tidur normal |
| 5 | `WIND_DOWN` | Lampu meredup sebelum tidur |
| 6 | `STANDBY` | Siang hari / tidak dipakai |
| — | `OFFLINE` | Bluetooth putus, band jalan sendiri |

### 4.3 Transisi

```
STANDBY ──"Mulai tidur"/jadwal──► WIND_DOWN ──tertidur──► MONITORING
                                                              │  ▲
                                              gelisah         │  │ tenang lagi
                                                              ▼  │
                                                           COMFORT
                                                              │
                                          masuk jendela bangun ▼
                                                        WAKE_WINDOW ──► STANDBY

ALERT ◄── dapat dimasuki dari status mana pun, membatalkan semuanya
  │
  └─ tidak responsif ──► SOS_SENT
  └─ ada respons tubuh ──► turun ke status sebelumnya, catat sebagai peringatan biasa
```

**Uji wajib:** saat urutan sunrise berjalan, picu anomali → urutan bangun dibatalkan, sistem masuk `ALERT`.

### 4.4 Matriks aktuator (Aturan 3)

| Aktuator | Tidur normal | Gelisah | Anomali | Darurat |
|---|---|---|---|---|
| White noise | Mati | Naik bertahap | Mati | Sirene, volume maks |
| Aroma | Mati | Semprot singkat | Mati sampai pagi | Tetap mati |
| Lampu | Mati | **Tetap mati** | Amber redup 10% | Putih 100% berkedip |

> Kolom "Gelisah" pada baris Lampu bukan salah ketik. Cahaya apa pun menekan melatonin — menyalakan lampu saat `COMFORT` justru merusak tujuan intervensi itu sendiri.

**Kenapa polaritas dibalik saat darurat.** White noise dirancang untuk menutupi suara. Artinya saat pengguna tersengal atau jatuh dari tempat tidur, alat kita sendiri yang menyembunyikan bunyinya dari orang serumah. Dan aroma menenangkan adalah hal terakhir yang dibutuhkan di kamar orang yang harus dibangunkan.

---

## 5. Perilaku per status

### 5.1 `WIND_DOWN`

**Pemicu utama: jadwal.** Ketukan "Mulai tidur" adalah override, bukan jalan masuk normal.

Alasannya menentukan bentuk layar M1. Sunset butuh 20–30 menit sebelum tidur. Kalau sesi hanya bisa dimulai dari ketukan, pengguna harus mengetuk setengah jam sebelum tidur lalu menunggu lampu meredup — tidak ada yang melakukan itu, dan fitur sunset praktis mati.

| Jalan masuk | Perilaku |
|---|---|
| **Jadwal tercapai** | `WIND_DOWN` mulai otomatis. M1 sudah menampilkan spanduk sejak 15 menit sebelumnya: *"Sunset mulai 21:40 — tunda?"* dengan tombol tunda 30 menit |
| **Ketukan "Mulai tidur"** | Melompati `WIND_DOWN`, langsung ke `MONITORING`. Dipakai saat pengguna tidur lebih awal dari jadwal |
| **Tunda** | Jadwal digeser 30 menit. Boleh berulang |

Konsekuensi ke desain: **M1 punya tiga bentuk**, bukan dua — `STANDBY` biasa, `STANDBY` menjelang jadwal (spanduk aktif), dan `WIND_DOWN` berjalan.

1. Aplikasi memerintahkan bedside menjalankan urutan sunset
2. Aplikasi memantau sampai pengguna terdeteksi tertidur
3. Masuk `MONITORING`

**Urutan sunset:**

| Tahap | Durasi | Setelan |
|---|---|---|
| Mulai | — | Amber hangat 2200–2700K, kecerahan awal setara ~30–50 lux di kepala tempat tidur |
| Peredupan | 20–30 menit (bisa diatur) | **Kurva eksponensial, bukan linear** |
| Akhir | — | Mati total. Target: pembacaan sensor di bawah 3 lux |

Selama sunset, komponen biru diminimalkan — pada WS2812, kanal B jauh di bawah R.

> Kurva harus eksponensial karena mata manusia mempersepsi cahaya secara logaritmik. Peredupan linear terasa "mati mendadak" di ujungnya.

### 5.2 `MONITORING`

- Band mengirim detak dan gerakan tiap ~1 detik (boleh dibatch 5–10 detik)
- Bedside mengirim kondisi kamar tiap ~5 menit
- Aplikasi menghitung fase tidur dan menyimpan riwayat malam itu
- Skrining napas berjalan pasif di latar (Bagian 8)

**`MONITORING` tidak berjalan saat gelang terlepas.** Bagi MAX30102, "tidak ada detak" dan "tidak dipakai" terlihat identik — dan yang pertama memicu `ALERT`. Firmware wajib membedakannya lewat level DC inframerah atau indeks kualitas sinyal, dan melaporkannya sebagai flag di `0001`. Tanpa ini, alarm palsu akan berbunyi pada malam pertama pengujian.

#### Syarat akhir sesi

Tiga pemicu, mana pun yang lebih dulu. Tanpa dua yang terakhir, sesi berjalan sepanjang siang dan catatan malam itu jadi sampah — durasi tidur 14 jam, nadi istirahat tercemar aktivitas siang, skor tidur tanpa arti.

| Pemicu | Ambang | Akibat |
|---|---|---|
| Jendela bangun tercapai | sesuai setelan | `WAKE_WINDOW` → `STANDBY` |
| Gelang terlepas | > 10 menit berturut-turut | `STANDBY`, waktu akhir ditandai **perkiraan** |
| Aktivitas menetap | gerakan setingkat berjalan > 15 menit | `STANDBY`, waktu akhir ditandai **perkiraan** |

Dua yang terakhir mengakhiri sesi **tanpa memicu alarm apa pun**.

Sesi lebih pendek dari **2 jam** dicatat tapi tidak diberi Sleep Score. Layar menyebut angkanya: *"Sesi 47 menit. Sleep Score butuh minimal 2 jam."*

### 5.3 `COMFORT`

Pemicu: gerakan tinggi **dan** detak di atas baseline tidur.

1. Aplikasi memilih intervensi secara adaptif (Bagian 7)
2. Bedside menjalankannya
3. Aplikasi membuka **jendela cek 5 menit**
4. Tenang kembali → `berhasil`. Masih gelisah → `gagal`, boleh coba intervensi lain **satu kali**
5. Kembali ke `MONITORING`

Setiap kejadian `COMFORT` wajib menghasilkan tepat satu baris log (Bagian 7).

**Batas keselamatan aroma:** maksimal 20–30 detik per kejadian, dan jumlah kejadian per malam dibatasi. Diffuser ultrasonik yang menyala terus-menerus membuat ruangan lembap dan berisiko mengiritasi saluran napas, terutama bagi penderita asma. Aplikasi wajib menegakkan batas ini — firmware bedside juga menegakkannya secara independen.

#### Bedside putus saat sesi berjalan

Bedside **wajib** tersambung saat setup (§10.2 O7 tidak bisa dilewati), tapi wajib saat setup tidak sama dengan selalu tersambung saat berjalan — ia bisa tercabut pukul tiga pagi.

| Aspek | Perilaku saat bedside putus |
|---|---|
| Pemantauan | Lanjut penuh. Gelang tidak terpengaruh |
| Intervensi | Mati. `COMFORT` tidak dijalankan |
| Kejadian gelisah | Tetap dicatat, dengan `intervention: null` |
| Skor intervensi | **Tidak dihitung.** Kejadian ditandai `bedside_offline` dan dikeluarkan dari statistik |
| Tampilan | Spanduk permanen di M1 dan M2 |
| Tangga eskalasi | Tetap berjalan di gelang, tapi sirene bedside tidak tersedia |

Poin ketiga dan keempat penting: kejadian tanpa intervensi tidak boleh masuk sebagai `gagal`, karena itu mencemari loop belajar dengan kegagalan yang bukan kegagalan intervensinya.

### 5.4 `WAKE_WINDOW`

Pengguna menyetel jendela bangun (mis. 06.00–06.30). Aplikasi memantau fase tidur lebih rapat. Begitu pengguna terdeteksi di tidur ringan, bedside menjalankan urutan sunrise:

1. Lampu naik bertahap 20–30 menit, amber hangat menuju putih lebih terang
2. White noise memudar perlahan sampai mati
3. Aroma singkat, 20–30 detik
4. Alarm halus di menit terakhir
5. Belum bangun sampai batas jendela → alarm penuh

### 5.5 `OFFLINE`

Bluetooth putus lebih dari 30 detik. Band beralih ke baseline di flash-nya sendiri dan menjalankan seluruh tangga eskalasi secara mandiri.

Kewajiban aplikasi saat tersambung kembali:

1. Menerima seluruh isi ring buffer band
2. Mengisi ulang grafik dengan **cap waktu kejadian sebenarnya**, bukan waktu penerimaan
3. Bila ada kejadian kritis yang tertahan, **langsung mengirim peringatan susulan** yang menyebut waktu kejadian sebenarnya

Selama offline, aplikasi menampilkan indikator koneksi terputus di semua layar. Proses rekonstruksi buffer bisa memakan waktu, jadi ia punya spanduk sendiri dengan progres — bukan status kosong.

#### Otoritas waktu

> **Selama tersambung, waktu ditentukan HP. Jam gelang hanya berlaku untuk buffer offline.**

Saat tersambung, HP memberi cap waktu sendiri pada paket yang tiba, dan jam gelang diabaikan. Itu memotong sebagian besar masalah sinkronisasi.

Yang tersisa: ESP32-C3 kehilangan waktu sepenuhnya saat kehabisan daya atau reboot, dan kejadian di buffer `0006` jadi bercap epoch nol. Ini bukan soal kosmetik — `settle_time_s` dihitung dari selisih dua cap waktu, dan `settle_time_s` yang salah merusak Intervention Score, yaitu bukti loop belajar bekerja.

| Langkah | Ketentuan |
|---|---|
| Gelang melaporkan jamnya sendiri | di `0008`, bersama baterai. Tidak perlu karakteristik baru |
| Aplikasi membandingkan setiap kali tersambung | selisih > 60 detik = melenceng |
| `sync_time` dikirim **setiap kali tersambung** | bukan sekali saat pairing |
| Bila melenceng, kejadian dari buffer ditandai `perkiraan` | tidak dibuang |

**Linimasa wajib membedakan asal data.** Kejadian yang dipantau langsung dan kejadian yang direkonstruksi dari buffer tidak boleh terlihat identik. Malam yang separuhnya offline bukan malam yang sama kualitasnya dengan malam yang terpantau penuh, dan menyembunyikan itu di balik tampilan seragam adalah kebohongan kecil yang akan ketahuan saat ada yang bertanya.

#### Gelang putus saat `ALERT`

Hitung mundur **lanjut**, ditandai sebagai estimasi.

Tiga alasan. Pertama, risikonya tidak simetris — gagal menampilkan layar SOS saat ada orang dalam bahaya berakibat fatal, sedangkan menampilkannya saat orang itu baik-baik saja berakibat satu ketukan untuk menutup. Kedua, tidak ada risiko kirim palsu, karena SOS tetap butuh satu ketukan manusia; kalau SOS bisa terkirim otomatis, keputusan ini harus dibalik. Ketiga, menahan hitungan justru berbohong — gelang tetap menghitung di pergelangan tangan, terputus atau tidak.

Saat tersambung lagi, `0007` Indicate melaporkan tahap sebenarnya dan layar merekonsiliasi. Label estimasi hilang.

Dengan siaran advertising (`BLE_GATT_CONTRACT.md` §2.1), aplikasi tidak perlu menebak lagi. Saat kehilangan gelang di tengah `ALERT`, aplikasi **memindai siaran** dan membaca tahap sebenarnya tanpa menyambung ulang. Label estimasi hanya dipakai bila siarannya pun tidak terbaca.

Satu field siaran menyelesaikan tiga hal sekaligus: sirene bedside saat HP mati, tahap sebenarnya untuk aplikasi yang kehilangan koneksi, dan kepastian bahwa eskalasi tidak pernah bergantung pada baterai ponsel.

---

## 6. Auto-SOS — tangga eskalasi

Ini fitur unggulan produk.

**Kenapa countdown biasa tidak dipakai.** Pendekatan lama memberi countdown 45 detik untuk dibatalkan pengguna. Cacatnya fatal: orang yang sedang tidur tidak akan membatalkan apa pun — baik itu anomali asli maupun salah deteksi. Setiap salah deteksi otomatis lolos jadi peringatan ke keluarga, dan sistem tidak bisa membedakan "tidur nyenyak" dari "tidak sadarkan diri".

**Gantinya: yang membatalkan alarm bukan jari pengguna, tapi tubuhnya.**

### 6.1 Tahapan

| Tahap | Waktu | Yang terjadi | Lanjut kalau |
|---|---|---|---|
| 1 | 0–20 dtk | Konfirmasi diam. Band mengevaluasi tanpa memberi tanda apa pun | Anomali masih bertahan. Kalau hilang (motion artifact) → batal, tidak ada yang terjadi |
| 2 | 20–35 dtk | Getar halus + band memantau accelerometer | Tidak ada gerakan respons dalam 15 detik |
| 3 | 35–65 dtk | Getar keras + layar HP menyala + nada peringatan | Tidak ada gerakan respons dalam 30 detik |
| 4 | 65 dtk | Sistem menyimpulkan tidak responsif → `SOS_SENT` | — |

Tahap 1–3 dieksekusi firmware band. Aplikasi menerima flag tahap dan **mencerminkannya di layar**, serta menyalakan layar HP pada tahap 3.

**Ada respons di tahap 2 atau 3?** Sistem menyimpulkan pengguna sadar. Turun jadi peringatan biasa — dicatat dan ditampilkan di laporan pagi, **tidak ada peringatan dikirim ke siapa pun**.

Semua durasi tahap harus bisa diubah dari aplikasi tanpa flash ulang.

### 6.2 Saat masuk `SOS_SENT`

1. **Bedside:** lampu putih 100% berkedip + sirene volume maksimal. Aroma dan white noise dimatikan.
2. **HP:** full-screen intent di atas lock screen.
3. **Layar SOS:** tombol **KIRIM** besar dan tombol **BATAL** yang jelas. Pesan WhatsApp sudah terisi lengkap: nama, jenis kejadian, waktu, detak terakhir, dan tautan lokasi Google Maps.
4. Belum ada respons dalam 2 menit → bunyikan dan tampilkan ulang.

### 6.3 Soal audio

Dokumen meminta layar SOS berbunyi walau HP disenyapkan, memakai alarm audio stream. **Kemampuan ini tidak tersedia lewat plugin Capacitor mana pun tanpa menulis kode native.**

Ini diterima sebagai batasan, karena sumber bunyi utama saat darurat bukan HP melainkan **sirene bedside pada volume maksimal** — perangkat keras, dikomandoi lewat BLE, tidak terpengaruh mode senyap HP. Audio HP berperan sebagai pelengkap.

Bila klien menolak batasan ini, jalur satu-satunya adalah plugin native kecil dengan `AudioAttributes.USAGE_ALARM`, dan itu berarti menyentuh Kotlin.

### 6.4 Soal klaim — wajib dipatuhi

Pengiriman akhir memakai WhatsApp intent, yang **butuh satu ketukan manusia**. Yang otomatis adalah deteksi, penyiapan pesan, dan membangunkan seisi kamar — **bukan pengirimannya**.

> **Jangan pernah menulis "SOS terkirim otomatis" di UI mana pun.**

Arsitektur harus disiapkan agar `SmsManager` (izin `SEND_SMS`, tanpa ketukan) mudah ditambahkan kemudian sebagai jalur cadangan.

---

## 7. Loop belajar

Hampir semua produk yang mengaku *closed loop* sebenarnya masih terbuka: memicu aksi lalu selesai, tidak pernah tahu aksinya berguna atau tidak. RePulse harus tahu.

### 7.1 Verifikasi — satu baris per kejadian

Setiap intervensi di status `COMFORT` menghasilkan tepat satu baris:

| Field | Tipe | Contoh |
|---|---|---|
| `timestamp` | ISO 8601 | `2026-08-12T01:20:14+07:00` |
| `trigger` | objek | `{ movement_g: 0.42, hr: 78, baseline_hr: 62 }` |
| `room_state` | objek | `{ temp_c: 29.1, rh: 74, lux: 0.4, db: 48 }` |
| `intervention` | objek | `{ type: "white_noise", volume: 3, track: 2 }` |
| `settle_time_s` | number | `244` |
| `result` | enum | `berhasil` \| `gagal` |

### 7.2 Adaptasi — tanpa machine learning

Cukup penghitung sederhana per pengguna:

| Intervensi | Catatan | Skor |
|---|---|---|
| `white_noise` | 8 berhasil / 10 coba | 0.80 |
| `aroma` | 3 berhasil / 10 coba | 0.30 |

Aturan pemilihan:

1. Pilih intervensi berskor tertinggi yang sudah punya **minimal 3 percobaan**
2. Data belum cukup → pakai urutan default (white noise dulu)
3. **Eksplorasi 1 dari 5 kali** pakai intervensi kedua, supaya skor tidak terkunci selamanya di pilihan pertama

### 7.3 Wawasan yang wajib bisa ditampilkan

Setelah 1–2 minggu, laporan pagi menampilkan kalimat seperti:

- "Anda paling sering gelisah di malam-malam saat kamar di atas 28 °C."
- "White noise menenangkan Anda rata-rata 4 menit; aroma rata-rata 11 menit."
- "Detak jantung tidur Anda 5 bpm lebih tinggi di malam-malam saat kamar tidak sepenuhnya gelap."

Kalimat ketiga hanya mungkin karena sistem punya sensor cahaya **dan** sensor detak jantung pada garis waktu yang sama. **Data mentah wajib tersimpan pada resolusi yang memungkinkan korelasi ini dihitung.**

---

## 8. Deteksi dan skrining

Pendekatan berbasis ambang sudah cukup. **Machine learning tidak wajib.**

### 8.1 Yang dihitung aplikasi

| Yang dihitung | Caranya |
|---|---|
| Fase tidur | **Jangan hanya pakai gerakan.** Gabungkan gerakan rendah dengan variabilitas denyut dari interval RR. Ini cara wearable modern bekerja dan tidak butuh komponen tambahan |
| Deteksi gelisah | Gerakan di atas ambang **dan** HR di atas baseline tidur |
| Baseline HR tidur | Rata-rata bergulir dari malam-malam sebelumnya |

Semua ambang harus bisa diubah dari aplikasi tanpa flash ulang, untuk keperluan tuning dan demo.

### 8.2 Skrining pola napas saat tidur

Nol komponen tambahan — SpO₂ sudah bisa dibaca MAX30102, mikrofon bedside sudah dipasang untuk mengukur kebisingan. Yang dibutuhkan hanya kode.

Nilainya besar karena inilah yang menghubungkan tidur dan jantung secara **sebab-akibat**, bukan sekadar korelasi: saluran napas tertutup → oksigen turun → jantung tertekan. Gangguan napas saat tidur juga sangat jarang terdiagnosis — di Indonesia angka prevalensinya bahkan tidak diketahui, sebagian karena mendengkur dianggap hal biasa.

```
Bedside: mikrofon      → pola dengkuran      ┐
Band: sensor PPG       → penurunan SpO₂      ├─► indikasi gangguan napas
Band: accelerometer    → posisi tidur        ┘   (tiga sinyal bersamaan, berulang)
```

Tidak ada satu alat pun yang bisa melakukan ini sendiri. Suara ada di kamar, oksigen dan posisi ada di tubuh — keduanya hanya bertemu di aplikasi.

| Yang diukur | Ambang awal |
|---|---|
| SpO₂ | Sampling tiap 10–30 detik, **jangan kontinu** (boros baterai). Rekam baseline tidur di malam-malam pertama |
| Kejadian desaturasi | Penurunan minimal **3%** dari baseline tidur, bertahan minimal **10 detik**. Hitung jumlahnya **per jam tidur** |
| Dengkuran | Pola berulang 0,2–0,5 Hz di atas ambang volume. **Jangan pakai rata-rata desibel saja.** Bedside mengirim flag |
| Posisi tidur | Telentang / miring kiri / miring kanan / tengkurap. Simpan sebagai deret waktu agar bisa dicocokkan dengan kejadian desaturasi |

**Skrining ini berjalan pasif.** Tidak memicu aktuator apa pun, tidak membangunkan pengguna, tidak masuk tangga eskalasi Bagian 6. Hasilnya hanya muncul di laporan.

### 8.3 Verifikasi kegelapan

Bedside terus membaca sensor cahaya sepanjang malam:

- Di bawah **3 lux** → tandai malam ini "gelap optimal"
- Di atas **5 lux** berkelanjutan → catat sebagai **polusi cahaya** beserta durasinya

Dilaporkan di laporan pagi berikut dampaknya pada detak jantung tidur malam itu.

> **Sistem tidak boleh menyalakan lampu untuk mengoreksi ini.** Ia hanya melaporkan. Menyalakan cahaya untuk memberi tahu bahwa ada terlalu banyak cahaya jelas kontraproduktif.

---

## 9. Model data

### 9.1 Realtime Database — aliran live

```
/live/{uid}
  ├─ state              "MONITORING"
  ├─ updated_at         epoch ms
  ├─ band               { connected, battery, rssi }
  ├─ bedside            { connected }
  ├─ vitals             { bpm, movement_g, spo2, position }
  ├─ sleep_stage        "light" | "deep" | "rem" | "awake"
  ├─ room               { temp_c, rh, lux, db }
  └─ escalation         { active: false, stage: 0 }
```

Node tunggal yang ditimpa terus-menerus. Tidak menumpuk riwayat.

### 9.2 Firestore

```
users/{uid}
  ├─ profile            { name, email, created_at }
  ├─ emergency_contacts [{ name, phone, relation }]
  ├─ settings           { wake_window, sunset_duration_min, monitor_only, ... }
  ├─ thresholds         { semua ambang deteksi & durasi tahap eskalasi }
  └─ devices            { band_id, bedside_id, paired_at }

users/{uid}/interventions/{type}
  { tries, success, score, avg_settle_s, last_used_at }

users/{uid}/nights/{YYYY-MM-DD}
  ├─ sleep              { start, end, duration_min, stages:{deep,light,rem,awake} }
  ├─ heart              { avg_bpm, min_bpm, max_bpm, baseline_bpm, avg_hrv }
  ├─ room               { avg_temp_c, avg_rh, avg_lux, avg_db }
  ├─ light              { dark_optimal: bool, pollution_min: 0 }
  ├─ breathing          { desat_events, desat_per_hour, snore_min, positions:{} }
  ├─ counts             { restless, anomaly, sos, offline_min }
  └─ insights           ["Anda paling sering gelisah ..."]

users/{uid}/nights/{d}/series/{HH}          ← 1 dokumen per jam
  { t0, interval_s: 5, bpm:[...], movement:[...], spo2:[...],
    temp:[...], lux:[...], db:[...] }

users/{uid}/nights/{d}/events/{eventId}
  { type, timestamp, ...payload }
  type: comfort | anomaly | sos | desaturation | snore | light_pollution | offline

users/{uid}/viewers/{viewerUid}
  { name, added_at }         ← siapa yang boleh melihat SAYA. Otoritas security rules

users/{uid}/watching/{ownerUid}
  { name, added_at }         ← siapa yang bisa SAYA lihat. Indeks denormalisasi

invites/{code}
  { owner_uid, expires_at }
```

#### Kunci tanggal malam

`nights/{YYYY-MM-DD}` memakai **tanggal bangun**, bukan tanggal mulai. Tidur yang mulai 23:40 tanggal 12 dan berakhir 06:30 tanggal 13 disimpan sebagai `2026-08-13`.

Alasannya perilaku pengguna: orang membuka aplikasi pagi tanggal 13 dan mencari laporan tanggal 13. Oura memakai konvensi yang sama.

**Batasan yang diakui: satu sesi per tanggal.** Tidur siang akan bertabrakan kuncinya dan berada di luar cakupan demo 24 Agustus. Lebih baik dinyatakan sebagai batasan daripada ditemukan sebagai bug pada malam sebelum lomba.

#### Kenapa ada dua koleksi untuk satu hubungan

Satu akun bisa menjadi perangkat pribadi **dan** viewer untuk orang lain sekaligus — tidak ada tipe akun terpisah. Anak memakai RePulse-nya sendiri sambil memantau ibunya; ibunya juga memantau anaknya.

`viewers` tetap jadi otoritas yang diperiksa security rules. `watching` adalah indeks kebalikannya, ditulis bersamaan saat undangan diterima. Dua penulisan sekali seumur hubungan, dan viewer bisa mendaftar siapa yang ia pantau tanpa collection-group query.

### 9.3 Anggaran penulisan

Deret waktu **didownsample ke 1 sampel per 5 detik** sebelum ditulis. Band memang sudah membatch 5–10 detik, jadi tidak ada informasi yang hilang untuk keperluan grafik dan korelasi.

| Item | Jumlah per malam |
|---|---|
| Dokumen `series` | 8–10 (satu per jam) |
| Dokumen `events` | 5–30 |
| Dokumen ringkasan malam | 1 |
| **Total penulisan Firestore** | **±20–40 per malam** |

Kuota gratis Firestore 20.000 penulisan per hari. Tidak akan tersentuh.

Ukuran satu dokumen `series`: 720 nilai × 6 deret ≈ 25 KB. Batas Firestore 1 MB. Aman.

### 9.4 Security rules

- Seluruh isi `users/{uid}/**` hanya bisa dibaca dan ditulis oleh pemiliknya
- Dokumen `nights/{d}` (ringkasan saja) bisa **dibaca** oleh uid yang terdaftar di `users/{uid}/viewers`
- Subkoleksi `series` **tidak pernah** dibagikan ke viewer — keluarga melihat ringkasan, bukan data mentah
- `invites/{code}` bisa dibaca siapa pun yang sudah login, hanya berisi `owner_uid`
- App Check wajib aktif untuk semua akses

> Dokumen sumber §12 meminta data disimpan lokal dan tidak dikirim ke server tanpa perlindungan. Firebase adalah server. Aturan di atas — isolasi per-uid, App Check, viewer hanya ringkasan — adalah bentuk perlindungan itu. Klien perlu menyetujui ini secara tertulis.

---

## 10. Daftar layar

**Direvisi v1.2 · 12 Agustus 2026.** Struktur navigasi diganti dari lima tab menjadi tiga tab plus laci, mengikuti pola Oura; onboarding diperluas mengikuti pola WHOOP. Penomoran lama (1–15) diganti kode berhuruf supaya rujukan tidak bertabrakan. Perlakuan visual seluruh layar diatur `DESIGN.md` v2.0.

### 10.1 Navigasi

```
          ┌─ sudah login ────────────────────────────────► Malam Ini
          │
Splash ───┤
          │
          └─ belum login ─► Login ─► Izin ─► Autostart ─► Panduan pasang ─┐
                                                                          │
  ┌───────────────────────────────────────────────────────────────────────┘
  ▼
Pairing gelang ─► Pairing bedside ─► Kalibrasi ─► Kontak darurat ─► Siap
                                                                     │
  ┌──────────────────────────────────────────────────────────────────┘
  ▼
     ╭──────── TAB PIL MELAYANG (3) ────────╮      ╭───╮
     │  Malam Ini   ·   Vital   ·   Sehat   │      │ ✚ │
     ╰──────────────────────────────────────╯      ╰───╯
          │             │            │               │
          │             │            │               └─ lembar aksi
          │             │            └─ Riwayat ─► Detail malam
          │             │               Tren napas
          │             │               Wawasan intervensi
          │             │
          │             └─ 5 layar detail metrik (satu templat)
          │                dibuka dari deret chip
          │
          └─ sesi aktif: tab bar & deret chip hilang

  ☰ laci ─► Pengaturan · Perangkat · Keluarga · Panel uji · Ekspor
  ◉ header ─► Perangkat & baterai

  ALERT ─► SOS   ◄── dari mana saja, di atas lock screen
```

**Kenapa tiga tab, bukan lima.** Struktur lama memisahkan Laporan, Napas, dan Wawasan menjadi tiga tab, padahal ketiganya adalah hal yang sama: pembacaan jangka panjang. Digabung menjadi **Sehat**. Sisi baiknya bukan sekadar navigasi lebih rapi — kelima layar detail metrik di tab **Vital** memakai satu templat yang sama, jadi jumlah layar naik sementara jumlah komponen yang harus dibangun justru turun.

### 10.2 Onboarding

Diperluas dari 4 menjadi 10 langkah mengikuti pola WHOOP: **ajari perangkat kerasnya dulu, baru sambungkan.** RePulse punya dua perangkat, bukan satu, jadi urutannya lebih panjang daripada WHOOP dan pemisahannya wajib — pairing dua perangkat dalam satu layar adalah sumber kebingungan yang sudah terbukti.

| Kode | Layar | Isi | Prioritas |
|---|---|---|---|
| **O1** | Splash | Ikon di tengah, `Ember Base`. Menahan sampai status auth diketahui | P0 |
| **O2** | Login | Email/password + Google Sign-In. Tombol utama nonaktif sampai isian sah. Disclaimer `"Not a medical device."` Keadaan lengkapnya di §10.2a | P0 |
| **O3** | Izin sistem | Notifikasi, lokasi, Bluetooth, abaikan optimasi baterai. Daftar dengan status per izin, tidak diminta sekaligus | P0 |
| **O4** | Izin autostart | Khusus Xiaomi/Oppo/Vivo/Realme, dengan pintasan langsung ke setelan vendor. **Layar sendiri, bukan baris di O3** — ini penyebab kegagalan nomor satu di Android non-stok | P0 |
| **O5** | Panduan pasang | Korsel 4 langkah dengan bilah segmen: pakai gelang · nyalakan gelang · tempatkan bedside · colok bedside. Gambar di atas, teks rata kiri di bawah | P1 |
| **O6** | Pairing gelang | Tiga keadaan dalam satu layar: mencari · pilih perangkat (konfirmasi serial) · tersambung. Pil `BANTUAN` di kanan atas | P0 |
| **O6b** | Gagal terhubung | Sheet bersama untuk O6 dan O7. Daftar penyebab, tombol coba lagi, jalan keluar ke bantuan. **Izin lokasi ditaruh paling atas** — tanpanya Android mengembalikan pemindaian kosong tanpa galat apa pun, jadi aplikasi terlihat rusak padahal cuma kurang izin | P0 |
| **O7** | Pairing bedside | Dua keadaan: mencari · tersambung. **Tidak bisa dilewati** — bedside adalah produk asli yang dikembangkan bersama gelang, dan tanpanya seluruh loop kenyamanan dan loop belajar mati | P0 |
| **O8** | Kalibrasi baseline | Empat keadaan: penjelasan · **pengecekan kekencangan** · berjalan (cincin progres, **satu-satunya cincin di aplikasi**) · hasil. Baseline dikirim ke flash gelang | P0 |
| **O9** | Kontak darurat | Minimal satu kontak wajib diisi sebelum sesi pertama. **Dipindahkan keluar dari Pengaturan** — tangga eskalasi tidak punya arti tanpa ini | P0 |
| **O10** | Siap | Ringkasan apa yang sudah tersambung, jendela bangun, tombol "Mulai malam pertama" | P1 |

> **Kenapa O8 punya gerbang kekencangan.** MAX30102 butuh kontak kulit dengan tekanan yang benar — terlalu longgar menghasilkan sampah, terlalu kencang menutup aliran darah. Kalibrasi **menolak mulai** sampai indeks kualitas sinyal memadai, dengan bilah yang mengisi saat gelang dikencangkan.
>
> Murah dibuat, dan mencegah hal yang jauh lebih mahal: baseline sampah yang dipakai sebagai pembanding selama dua minggu. Baseline salah berarti setiap ambang personal salah, dan alarm palsu setiap malam. WHOOP menaruh video "Set up your strap" di awal onboarding bukan karena mereka suka video.

### 10.2a Sesi, penjagaan rute, dan keadaan O2

**Ditambahkan 13 Agustus.** O2 adalah satu-satunya layar onboarding yang tidak pernah diurai keadaannya, padahal ia punya paling banyak — O6 dapat tiga, O8 dapat empat, O2 dapat satu baris. Kekosongan itu menghasilkan tiga cacat nyata di implementasi pertamanya, jadi keadaannya dikunci di sini.

#### Sesi

| Ketentuan | Perilaku |
|---|---|
| Ketahanan sesi | Sesi Firebase bertahan melewati penutupan aplikasi. Pengguna login **sekali**, bukan tiap malam |
| O1 menahan | Splash menahan sampai callback auth pertama tiba, lalu meneruskan ke **M1 bila sudah login**, ke O2 bila belum. Bukan timer tetap |
| Batas tahan | Kalau auth belum menjawab dalam 2 detik, teruskan ke O2. Pengguna yang sudah login akan ditarik balik oleh penjaga rute begitu jawabannya datang |
| Arah balik | Perpindahan keluar dari O1 dan O2 memakai `replace`. Tombol back Android tidak boleh mengembalikan pengguna yang sudah login ke layar login |
| Keluar | Dari D1. Mengembalikan ke O2, riwayat dikosongkan |

#### Penjagaan rute

Seluruh isi tab bar dan laci menuntut sesi. Tanpa sesi, rute apa pun di dalamnya melempar ke O2.

Dua pengecualian, keduanya disengaja:

1. **Layar darurat (X1, X2) tidak dijaga.** Layar yang muncul di atas lock screen saat ada nyawa dipertaruhkan tidak boleh gagal karena token kedaluwarsa. Keduanya tidak membaca Firestore.
2. **Tanpa proyek Firebase, penjaga membiarkan lewat.** `configured = false` adalah keadaan yang didukung (§11.5) — aplikasi berjalan di atas data sintetis supaya bisa diperagakan tanpa backend. Penjaga yang mengunci aplikasi tanpa proyek akan membunuh jaring pengaman demo.

#### Keadaan O2

| # | Keadaan | Yang terlihat |
|---|---|---|
| 1 | Kosong | Tombol utama nonaktif abu-abu. Tidak ada pesan galat — belum ada yang salah |
| 2 | Isian sah | Tombol berubah ke `Lamp Amber`. **Ini satu-satunya umpan balik validasi** (§7.1 `DESIGN.md`) |
| 3 | Mengirim | Seluruh kontrol terkunci — termasuk Google, lupa sandi, dan tombol utama. Label jadi `SIGNING IN…` |
| 4 | Email tidak berbentuk email | Garis field email jadi `Kiln Clay`, satu baris di bawahnya. **Bukan** paragraf di tempat lain |
| 5 | Sandi terlalu pendek | Garis field sandi, satu baris di bawahnya. Aturan enam karakter disebut **sebelum** dilanggar, bukan sesudah |
| 6 | Sandi salah pada akun yang ada | Galat di field sandi: *"That password does not match this account."* |
| 7 | Akun belum ada | **Langsung dibuatkan dan diteruskan ke O3.** Lihat "satu pintu" di bawah |
| 8 | Galat jaringan, kuota, atau konfigurasi | Satu baris di bawah field, `Kiln Clay`, menyebut kodenya bila tidak dikenali |
| 9 | Tautan reset terkirim | Baris yang sama, tapi warna `Ash Grey` — ini kabar baik, dan kabar baik tidak boleh memakai warna galat |
| 10 | Tanpa proyek Firebase | Semua jalur berhasil diam-diam dan meneruskan ke O3. Ini mode demo, bukan kerusakan |

#### Satu pintu

**Tombol utama masuk, dan membuat akun bila belum ada.** Tidak ada tombol daftar terpisah.

Alasannya teknis dan tidak bisa dihindari: perlindungan enumerasi email Firebase — menyala secara bawaan — meleburkan "tidak ada pengguna itu" dan "sandi salah" menjadi satu kode `auth/invalid-credential`. Satu-satunya cara membedakannya adalah mencoba mendaftar lalu membaca balasannya. Karena kode sudah harus melakukan itu, tombol daftar kedua hanya menawarkan jalan yang sama dengan nama lain.

> Ini **menggantikan** baris `Belum punya akun? Daftar` di `WIREFRAME.md` §1. Maksud baris itu — pengguna baru harus tahu ia bisa masuk — tetap dipenuhi, tapi oleh kalimat penjelas, bukan oleh kontrol kedua. Wireframe digambar 10 Agustus, sebelum perilaku enumerasi Firebase diketahui.

#### Yang sengaja tidak ada di O2

- **Tanpa tombol back.** Layar ini datang dari splash; tidak ada tempat untuk kembali (§6.9 `DESIGN.md`)
- **Tanpa "ingat saya".** Sesi memang bertahan; sakelar yang menyalakan hal yang sudah menyala adalah kebohongan kecil
- **Tanpa pendaftaran sosial selain Google.** Satu jalur alternatif sudah cukup untuk demo
- **Tanpa verifikasi email.** Menghalangi onboarding dengan kotak masuk pada malam pertama adalah cara termahal kehilangan pengguna, dan tidak ada satu pun fitur di produk ini yang bergantung pada alamat terverifikasi

### 10.3 Tab 1 — Malam Ini

| Kode | Layar | Isi | Prioritas |
|---|---|---|---|
| **M1** | Beranda | **Tiga bentuk** — `STANDBY` · `STANDBY` menjelang jadwal (spanduk sunset + tunda) · `WIND_DOWN` berjalan. Deret chip · hero · kartu: Nadi, Napas, Kamar, Perangkat · linimasa semalam · tombol "Mulai tidur" | P0 |
| **M2** | Beranda · sesi aktif | Mode malam penuh. Deret chip dan tab bar hilang. Nadi rata kiri + jejak EKG · fase sekarang · deret kondisi kamar · tahap eskalasi bila ada · "Akhiri sesi" dengan konfirmasi | P0 |

**Tidak ada layar "Laporan pagi" terpisah.** Pengguna bangun, membuka aplikasi, dan hero M1 sudah berisi Sleep Score semalam — pagi jadi nol ketukan. Laporan lengkapnya dibuka lewat "Selengkapnya", dan layar itu adalah **S2**, yang sama persis dengan yang dipakai untuk malam mana pun dari riwayat. Satu layar, dua jalan masuk.

**Hero saat tidak ada skor.** Bedside berjalan sepanjang malam terlepas dari gelang dipakai atau tidak, jadi kita selalu punya data kamar. Saat Sleep Score tidak ada, hero menampilkan **kamarnya, bukan orangnya**: *"6j 12m gelap optimal — kamar Anda siap untuk tidur. Gelang tidak terpasang semalam."* Jujur, memakai data yang benar-benar ada, dan tidak membuat aplikasi terasa rusak.

### 10.4 Tab 2 — Vital

Lima layar, **satu templat**: header metrik · grafik utama semalam · pembanding baseline · daftar penyumbang · kalimat penjelasan · rujukan ke malam lain. Dibuka dari deret chip di M1 atau langsung dari tab.

| Kode | Layar | Isi utama | Prioritas |
|---|---|---|---|
| **V1** | Sleep Score | Rincian penyumbang: durasi, fase dalam, kegelisahan, Optimal Darkness. Pola Oura — skor besar lalu daftar apa yang menaikkan dan menurunkannya | P1 |
| **V2** | Nadi | Kurva semalam, Resting Pulse, HRV, perbandingan dengan baseline kalibrasi | P0 |
| **V3** | Napas | **Simpangan SpO₂** dari baseline tidur pribadi, desaturasi per jam, kejadian dengkur. Kalimat skrining terikat kepatuhan. Lihat catatan di bawah | P0 |
| **V4** | Gerak & posisi | Kegelisahan sepanjang malam, deret waktu posisi tidur 5 keadaan, korelasi posisi dengan desaturasi | P1 |
| **V5** | Kamar | Suhu, kelembapan, cahaya, bising sepanjang malam. Kurva lux dengan penanda sunset dan polusi cahaya | P0 |

> **Catatan V3 — SpO₂ tidak pernah ditampilkan sebagai angka absolut.**
>
> SpO₂ dari pergelangan tangan jauh lebih tidak akurat daripada dari ujung jari; galat absolutnya lazim di kisaran ±3–4%. Ambang skrining kita adalah penurunan ≥3%, jadi ambangnya berada tepat di batas kemampuan sensornya. Dibaca sebagai angka absolut, klaim itu tidak bisa dipertahankan.
>
> Metodenya sendiri sudah benar dan tinggal dinyatakan dengan tepat: yang diukur adalah **penyimpangan dari baseline tidur orang itu sendiri**, bukan kadar oksigen darah. Akurasi relatif pada sensor yang sama, tangan yang sama, malam yang sama, jauh lebih baik daripada akurasi absolutnya — galat sistematis sensor hilang saat dua bacaan dikurangkan.
>
> | Ketentuan | Isi |
> |---|---|
> | Angka utama V3 | `−4% dari baseline Anda` |
> | Sumbu grafik | relatif, bukan absolut |
> | Nilai absolut | boleh muncul kecil sebagai metadata |
> | Dilarang | `96%` sebagai angka besar di layar mana pun |
>
> Ini memperkuat posisi kepatuhan, bukan melemahkannya. Kita berhenti mengklaim mengukur oksigen darah dan mulai mengklaim mendeteksi perubahan pola — persis yang dilakukan alat ini, dan persis yang dikatakan kalimat skrining wajib kita.

### 10.5 Tab 3 — Sehat

| Kode | Layar | Isi | Prioritas |
|---|---|---|---|
| **S1** | Riwayat | Daftar kartu per malam: skor, durasi, jumlah gelisah, badge anomali, indikator Optimal Darkness | P0 |
| **S2** | Detail malam | Laporan lengkap satu malam: hypnogram, kurva detak ditumpuk suhu kamar, linimasa kejadian beserta hasil intervensi, catatan polusi cahaya, ringkasan pola napas, 2–3 kalimat wawasan. Grafik bisa di-scrub. Disclaimer wajib. **Dua jalan masuk:** "Selengkapnya" di hero M1 (malam semalam), atau dari S1 (malam mana pun) | P0 |
| **S3** | Tren napas | Mingguan: desaturasi per jam, persentase malam berdengkur, breakdown posisi saat kejadian, kalimat saran periksa. Disclaimer wajib | P0 |
| **S4** | Wawasan intervensi | Tabel Intervention Score, rata-rata waktu menenangkan per jenis, pilihan berikutnya beserta alasannya. **Ini bukti loop belajar** — yang akan ditanya juri | P0 |

### 10.6 Laci dan header

| Kode | Layar | Isi | Prioritas |
|---|---|---|---|
| **D1** | Pengaturan | Jendela bangun, durasi sunset, seluruh ambang deteksi, durasi tiap tahap eskalasi, mode monitor-only. Disclaimer wajib | P0 |
| **D2** | Perangkat & baterai | Status kedua perangkat, baterai, kekuatan sinyal, versi firmware, putus/sambung ulang. Dibuka dari ikon cincin di header | P1 |
| **D3** | Kontak darurat | Versi lengkap O9, bisa diubah kapan saja | P0 |
| **D4** | Panel uji | Tombol manual: white noise, diffuser, lampu, sirene, getar gelang. **Wajib ada untuk demo juri.** Juga bisa dibuka lewat tekan-lama 2 detik pada jam di M2 | P0 |
| **D5** | Keluarga — kelola | Buat kode undangan, daftar viewer aktif, cabut akses | P2 |
| **D7** | Rekam EKG | Instruksi memegang, indikator kontak `lead_on`, gelombang 30 detik, hasil disimpan. **Menolak menyimpan bila kontak buruk** | P1 |
| **D6** | Ekspor | CSV/JSON per malam atau rentang | P1 |

### 10.7 Di luar navigasi

| Kode | Layar | Isi | Prioritas |
|---|---|---|---|
| **X1** | `ALERT` | Rata tengah, hero rata `#1A0E0E` tanpa gradien. Indikator tahap eskalasi, hitung mundur, tombol "Saya baik-baik saja". **Tanpa tombol batal** | P0 |
| **X2** | `SOS_SENT` | Full-screen di atas lock screen. Tombol KIRIM besar, tombol BATAL jelas, pratinjau pesan WhatsApp lengkap dengan tautan lokasi. Kalimat "Message not sent yet — it needs one tap from you." wajib | P0 |
| **X3** | Lembar aksi | Dari tombol `✚`: Mulai tidur · Catat kejadian · Panel uji · **Rekam EKG 30 detik** | P1 |
| **X4** | Keluarga — viewer | Ringkasan tidur semalam + riwayat peringatan. Read-only, tanpa data mentah, **tanpa akses subkoleksi `series`** | P2 |
| **X5** | Darurat orang yang dipantau | Notifikasi + layar: siapa, kapan, lokasi terakhir, tombol telepon. **Tidak punya tombol batal** | P2 |

> **Prioritas fitur keluarga diturunkan 12 Agustus (K7, K8).** Klien mengonfirmasi hanya ada **satu set** perangkat keras, dan fokus demo adalah perangkat pribadi. Dengan satu set, tidak mungkin memperagakan dua orang sungguhan secara bersamaan.
>
> D5, X4, X5, dan pemilih orang seluruhnya jadi **P2**. Bila dibangun, keduanya diperagakan lewat data seeder — dan itu disebutkan terus terang bila juri bertanya, bukan disamarkan sebagai data hidup.
>
> Konsekuensi positifnya: **templat Vital dan S4 naik jadi tulang punggung demo.** Waktu yang tadinya dialokasikan ke tiga layar keluarga pindah ke sana.

#### Dua permukaan darurat, bukan satu

Ini yang paling mudah salah setelah keputusan "satu akun bisa pribadi sekaligus viewer".

| Kejadian | Yang muncul | Bisa dibatalkan? |
|---|---|---|
| Tubuh **saya** | X1 → X2, full-screen di atas lock screen | Ya — oleh **gerakan tubuh saya**, dibaca gelang |
| Orang yang **saya pantau** | X5, notifikasi + layar informasi | **Tidak pernah** |

Kalau saya sedang melihat data ibu saya lalu jantung **saya** yang bermasalah, X1 merebut layar dan keluar dari mode melihat. **Darurat selalu milik pemilik perangkat.**

X5 sengaja bukan X1. Layar ALERT dirancang untuk orang yang sedang dalam bahaya dan punya beberapa detik untuk merespons; orang yang memantau dari jauh butuh hal yang sepenuhnya berbeda — lokasi dan nomor telepon.

#### EKG bukan pengukuran pasif

**Diperbarui 12 Agustus: klien mengonfirmasi AD8232 jadi dipasang (K9).** Statusnya naik dari "boleh dilewati" menjadi fitur nyata, dengan layar sendiri (D7).

AD8232 butuh kontak dua titik: jari tangan sebelah menempel di elektroda kedua. Ia tidak bisa berjalan saat tidur dan tidak pernah masuk ke aliran malam. X3 memicunya, D7 menampilkannya.

Alirannya ada di `BLE_GATT_CONTRACT.md` §3.10 sebagai characteristic `000A`.

Satu aturan yang tidak bisa dinegosiasikan: **aplikasi menolak menyimpan rekaman dengan `lead_on = 0`.** Gelombang EKG sampah yang ditampilkan sebagai grafik nyata adalah hal paling berbahaya yang bisa dilakukan aplikasi ini.

#### Pemilih orang

Muncul **hanya bila** pengguna memantau seseorang. Kalau tidak, tidak ada apa-apa — nol biaya untuk kasus umum.

Tempatnya di tengah header, menggantikan wordmark. Saat melihat orang lain, sebaris tipis menetap di atas: `Viewing Sari · read only` — Inggris, dan tanpa gelar, mengikuti `DESIGN.md` §6.2. Tidak ada perubahan warna — aturan warna melarangnya, dan warna sudah dipesan untuk hal lain.

X4 tetap layar terpisah dan **tidak menumpang M1**. Bukan karena malas: viewer tidak boleh menyentuh subkoleksi `series`, dan satu layar khusus-baca lebih aman daripada mengaudit setiap field M1 dan S2 agar tidak bocor.

### 10.8 Rekapitulasi

| Kelompok | Jumlah | P0 | P1 | P2 |
|---|---|---|---|---|
| Onboarding | 11 | 9 | 2 | — |
| Malam Ini | 2 | 2 | — | — |
| Vital | 5 | 3 | 2 | — |
| Sehat | 4 | 4 | — | — |
| Laci | 7 | 3 | 3 | 1 |
| Di luar navigasi | 5 | 2 | 1 | 2 |
| **Total** | **34** | **23** | **8** | **3** |

Bandingkan: WHOOP memakai 15 layar hanya untuk onboarding; Oura memakai lebih dari 30 layar di area Home saja. Angka 34 wajar untuk kategori ini — dan 5 di antaranya (V1–V5) berbagi satu templat.

Riwayat jumlah: 32 semula · M3 dilebur ke S2 (−1) · X5 ditambahkan (+1) · D7 rekam EKG ditambahkan setelah K9 (+1) · O6b sudah ada di §10.2 tapi tidak pernah ikut dihitung (+1) = **34**.

> Prosa di sini sempat menyebut 33 sementara tabelnya menjumlahkan 34, dan selisihnya adalah O6b. Dicatat, bukan didiamkan — ini paragraf yang orang kutip untuk menghitung ruang lingkup.

**Tidak ada P0 yang bertambah sejak jawaban klien.** Yang berubah hanya distribusinya: tiga layar keluarga turun ke P2, satu layar EKG masuk di P1.

**Bangun P0 sampai selesai sebelum menyentuh P1.** P2 dipotong tanpa penyesalan bila jadwal meleset.

### 10.9 Ketentuan visual

- **Dark mode satu-satunya.** Aplikasi ini dipakai di kamar gelap; tema terang tidak masuk akal
- **Bahasa Inggris di seluruh antarmuka**, termasuk nama metrik dan rute. Diputuskan 12 Agustus, menggantikan ketetapan Indonesia sebelumnya. Nama orang di data contoh tetap Indonesia tanpa gelar
- Mobile-first 360 × 800, breakpoint tablet saja
- Dua tingkat kegelapan: layar siang dan layar sesi tidur. Tabelnya di `DESIGN.md` Bagian 9
- Satu warna satu metrik, konsisten dari chip sampai grafik sampai linimasa. Peta warnanya di `DESIGN.md` Bagian 4.2
- Nama metrik dikunci di `DESIGN.md` Bagian 5.1 dan tidak boleh diubah di layar mana pun

### 10.10 Mode monitor-only

Bisa dinyalakan dari D1. Mematikan **semua** intervensi tapi tetap merekam seluruh data. Dipakai untuk pengujian. Saat aktif, spanduk permanen muncul di M1 dan M2.

---

## 11. Kontrak BLE GATT

**Status: draf v1.1, menunggu tanda tangan penggarap firmware.**

> **Sumber kebenaran ada di `BLE_GATT_CONTRACT.md`** — itu dokumen yang dikirim dan disepakati dengan pengembang firmware, lengkap dengan tata letak byte dan formulir konfirmasi. Bagian 11 di sini adalah ringkasan untuk pembaca PRD. Bila keduanya berbeda, yang berlaku adalah berkas kontrak.

Setiap perangkat memakai BLE GATT custom service, satu characteristic per jenis data.

### 11.0 Ketentuan umum

| Hal | Ketentuan |
|---|---|
| Endianness | **Little-endian** di seluruh payload, tanpa kecuali |
| MTU | Aplikasi meminta MTU **185** setelah connect. Semua payload JSON mengasumsikan MTU ini berhasil dinegosiasikan; bila gagal, fallback ke potongan 20 byte |
| Bilangan pecahan | **Tidak ada tipe `float` di udara.** Semua nilai pecahan dikirim sebagai integer berskala. Ini menghindari perbedaan representasi antara ESP32 dan JavaScript |
| Notify vs Indicate | **Notify** untuk data yang boleh hilang satu sampel (vital, gerakan, sensor kamar). **Indicate** untuk apa pun yang berkaitan dengan keselamatan — Indicate ber-ACK, Notify tidak |
| Waktu | Semua cap waktu dalam **epoch detik UTC**, `uint32` |

> **Alasan pemisahan Notify/Indicate.** Draf awal menggabungkan flag anomali ke dalam aliran gerakan 1 Hz bertipe Notify. Notify tidak ber-ACK. Artinya paket yang berisi "anomali terdeteksi" bisa hilang tanpa jejak dan tidak ada pihak yang tahu. Untuk aliran gerakan itu tidak masalah — sampel berikutnya datang satu detik lagi. Untuk flag anomali itu tidak bisa diterima. Karena itu anomali dipindahkan ke characteristic sendiri bertipe Indicate.

### 11.1 Smartband Service

**Base UUID:** `4FA10000-8C3A-4B8F-A292-3E83D02F1A00`

| UUID | Data | Tipe | Payload | Frekuensi |
|---|---|---|---|---|
| `…-0001` | Vital signs | Notify | `uint8` bpm · `uint16` rr_ms · boleh diulang hingga 5 pasang dalam satu paket untuk batching | ~1 dtk, boleh batch 5–10 dtk |
| `…-0002` | SpO₂ & posisi tubuh | Notify | `uint8` spo2_pct · `uint8` position | 10–30 dtk |
| `…-0003` | Level gerakan | Notify | `uint16` milli_g | ~1 dtk |
| `…-0004` | Event tombol SOS | **Indicate** | `uint8` (1 = ditekan ≥2 dtk) | saat terjadi |
| `…-0005` | Konfigurasi | Write | JSON — lihat 11.3 | saat diperlukan |
| `…-0006` | Buffer offline | Notify + Write | Protokol di 11.4 | saat reconnect |
| `…-0007` | **Anomali & tahap eskalasi** | **Indicate** | `uint8` stage · `uint8` reason · `uint32` epoch_s | saat berubah |
| `…-0008` | **Status baterai** | Read / Notify | `uint8` percent · `uint8` charging | tiap 5 menit |
| `…-0009` | **Perintah** | Write | JSON — lihat 11.3 | saat diperlukan |

**Enum `position`** — 0 = telentang · 1 = **miring kiri** · 2 = **miring kanan** · 3 = tengkurap · 255 = tidak diketahui

> Draf awal menggabungkan miring kiri dan kanan menjadi satu nilai. §9 dokumen sumber mewajibkan laporan mingguan menyebut **di posisi tidur mana** kejadian desaturasi paling sering muncul. Kiri dan kanan harus terpisah, atau fitur itu tidak bisa dibangun.

**Enum `stage`** — 0 = normal · 1 = konfirmasi diam · 2 = getar halus · 3 = getar keras · 4 = tidak responsif (`SOS_SENT`)

**Enum `reason`** — 0 = tidak ada · 1 = irama tidak teratur · 2 = HR di luar ambang · 3 = tombol SOS manual

### 11.2 Bedside Service

**Base UUID:** `4FA20000-8C3A-4B8F-A292-3E83D02F1A00`

| UUID | Data | Tipe | Payload | Frekuensi |
|---|---|---|---|---|
| `…-0001` | Sensor kamar | Notify | `int16` temp_c×10 · `uint16` rh_pct×10 · `uint32` **lux×100** · `uint8` db | suhu/RH/dB tiap 5 mnt, lux tiap 1 mnt |
| `…-0002` | Flag dengkuran | Notify | `uint8` flag · `uint8` intensity | saat terdeteksi |
| `…-0003` | Kontrol aktuator | Write | JSON — lihat 11.3 | saat diperlukan |
| `…-0004` | Konfirmasi selesai | **Indicate** | `uint8` **command_id** · `uint8` status | saat terjadi |

> **Kenapa lux dikali 100.** Contoh di §7 dokumen sumber menyebut pembacaan `0.4 lux`, dan ambang gelap optimal adalah `< 3 lux`. Integer lux polos akan membulatkan 0,4 menjadi 0 dan membuat seluruh verifikasi kegelapan tidak berarti. Satuan sentilux menyelesaikan ini; `uint32` memberi jangkauan sampai puluhan ribu lux sehingga pembacaan siang hari tidak meluap.

> **Kenapa ada `command_id`.** Konfirmasi tanpa penanda tidak bisa dipasangkan ke perintah mana pun. Bila aplikasi mengirim "nyalakan white noise" lalu "matikan aroma" dalam waktu berdekatan, satu balasan `status=selesai` tidak memberi tahu yang mana. Aplikasi menyertakan `command_id` bertambah di setiap perintah tulis, firmware memantulkannya kembali.

**Enum `status`** — 0 = selesai · 1 = gagal · 2 = ditolak karena batas keselamatan (mis. kuota aroma habis)

### 11.3 Skema JSON

Aplikasi → Band, characteristic `0005` (konfigurasi):

```json
{
  "baseline_bpm": 62,
  "hr_threshold_delta": 16,
  "rr_variability_threshold": 0.18,
  "stage1_s": 20, "stage2_s": 15, "stage3_s": 30,
  "motion_response_threshold_mg": 150,
  "spo2_sample_interval_s": 20
}
```

Aplikasi → Band, characteristic `0009` (perintah):

```json
{ "cmd": "vibrate", "pattern": "soft" | "hard", "duration_ms": 800 }
{ "cmd": "sync_time", "epoch_s": 1786512000 }
{ "cmd": "record_baseline", "duration_s": 180 }
```

> Perintah `vibrate` bukan tambahan opsional. Kriteria penerimaan no. 1 mensyaratkan motor getar bisa dipicu dari aplikasi, dan Panel Uji tidak bisa dibangun tanpanya. `sync_time` juga wajib — tanpanya cap waktu di buffer offline tidak bisa dipercaya, dan kriteria no. 4 gagal.

Aplikasi → Bedside, characteristic `0003` (aktuator):

```json
{
  "command_id": 42,
  "light": { "mode": "sunset"|"sunrise"|"amber"|"alert"|"off",
             "brightness": 0-100, "kelvin": 2200, "ramp_s": 1500 },
  "white_noise": { "on": true, "volume": 0-10, "track": 2, "fade_s": 30 },
  "aroma": { "on": true, "duration_s": 25 },
  "siren": { "on": false }
}
```

Field yang tidak disertakan berarti "biarkan apa adanya". Firmware menegakkan batas durasi aroma secara independen dan membalas `status=2` bila permintaan melampaui kuota malam itu.

### 11.4 Protokol flush buffer offline

Read biasa tidak cukup — isi buffer bisa jauh melebihi satu MTU.

1. Aplikasi menulis `{"cmd":"flush_start"}` ke `0006`
2. Band mengirim rentetan Notify pada `0006`, tiap paket berisi: `uint16` seq · `uint8` count · lalu `count` entri
3. Setiap entri: `uint32` epoch_s · `uint8` type · `uint8[4]` payload
4. Band menutup dengan paket sentinel `seq = 0xFFFF`
5. Aplikasi membalas `{"cmd":"flush_ack","last_seq":N}`; band baru menghapus buffer setelah ACK diterima

> Penghapusan hanya setelah ACK. Bila koneksi putus di tengah flush, data tidak hilang dan proses diulang dari awal saat sambungan berikutnya.

**Enum `type` entri** — 1 = anomali · 2 = tahap eskalasi · 3 = tombol SOS · 4 = ringkasan vital · 5 = penanda putus/sambung

### 11.5 Lapisan mock

Aplikasi dibangun di atas antarmuka `BleTransport` dengan dua implementasi: perangkat asli, dan **mock** yang memutar ulang satu malam sintetis dari berkas JSON.

Ini bukan kemewahan. Dengan tenggat 14 hari, pengembangan aplikasi tidak boleh menunggu firmware siap. Mock juga menjadi jaring pengaman demo: bila perangkat keras bermasalah pada 24 Agustus, aplikasi tetap bisa diperagakan penuh — termasuk tangga eskalasi dan layar SOS — dengan menekan tombol di Panel Uji.

Mock wajib bisa memicu: malam normal, kejadian gelisah, anomali dengan respons tubuh, anomali tanpa respons hingga SOS, putus koneksi diikuti flush buffer.

### 11.6 Seeder riwayat

Mock memutar ulang **satu malam** secara live. Itu tidak cukup, dan alasannya soal jadwal, bukan soal teknis.

Intervention Score butuh 3 percobaan sebelum dipakai. Tren napas butuh 7 malam. Riwayat butuh riwayat. Kalau pengumpulan data sungguhan baru mulai 22 Agustus, maka pada 24 Agustus layar **S1, S3, S4, dan sebagian besar tab Vital kosong di depan juri** — dan S4 justru satu-satunya layar yang membuktikan loop belajar bekerja.

Karena itu seeder terpisah dari mock:

| | Lapisan mock (11.5) | Seeder (11.6) |
|---|---|---|
| Menghasilkan | Satu malam, live, lewat BLE palsu | 14 malam, langsung ke Firestore |
| Dipakai untuk | Menguji alur waktu-nyata | Mengisi layar riwayat, tren, dan wawasan |
| Kapan | Sepanjang pengembangan | Pengembangan dan demo |

Bentuknya satu berkas skenario yang dibaca dua perintah:

```
seed    tulis 14 malam sintetis ke akun yang sedang login
reset   hapus seluruh data malam milik akun itu, sisakan profil
```

Skenarionya harus masuk akal, bukan angka acak: nadi istirahat yang bergerak perlahan, tiga jenis intervensi dengan tingkat keberhasilan berbeda supaya S4 punya sesuatu untuk diperingkat, dua malam dengan desaturasi supaya S3 punya tren, satu malam terputus supaya linimasa memperlihatkan pembedaan asal data.

`reset` bukan tambahan. Data sintetis yang tertinggal di basis data produksi jauh lebih berbahaya daripada layar kosong, dan satu perintah untuk mengosongkannya adalah harga murah untuk menghindarinya.

---

## 12. Aturan kepatuhan UI

Aturan berikut ditanam di kode, bukan diserahkan pada kedisiplinan penulis teks.

1. **Tidak ada klaim diagnosis** di UI mana pun. Disclaimer `"Not a medical device."` wajib ada dan terlihat, persis dalam bentuk itu.
2. **Kalimat skrining napas harus persis seperti ini:**

   ✔ "Your breathing pattern during sleep shows a sign worth having checked by a doctor."

   ✘ "Sleep apnea detected." · ✘ "You have a breathing disorder."

   Alasannya bukan sekadar kehati-hatian hukum. SpO₂ dari pergelangan tangan memang jauh kurang akurat dibanding oximeter jari, dan diagnosis sebenarnya hanya bisa lewat polisomnografi. Menyebut alat ini pendeteksi apnea adalah klaim yang tidak bisa dipertahankan kalau ditanya juri.

3. **Jangan pernah menulis "SOS terkirim otomatis"** di UI mana pun.
4. **Sistem tidak boleh mengirim peringatan** tanpa melewati tangga eskalasi Bagian 6.
5. Batas durasi aroma ditegakkan di aplikasi **dan** firmware, tidak hanya salah satu.

**Saran teknis:** simpan kalimat-kalimat sensitif ini di satu berkas konstanta terpisah, dan tambahkan satu tes yang gagal bila kata terlarang muncul di sumber UI. Lebih murah daripada mengandalkan review manual.

> **Daftar katanya harus mengikuti bahasa layar.** Sejak 12 Agustus antarmuka berbahasa Inggris, jadi pelanggaran nyata akan berbunyi *"sent automatically"*, bukan *"terkirim otomatis"*. Daftar Indonesia lolos pada build yang melanggar — uji yang selalu hijau lebih berbahaya daripada tidak ada uji. Daftar yang berlaku: `apnea` · `diagnosis` · `disorder` · `sent automatically` · `automatically sent` · `terkirim otomatis`.
>
> Yang dipindai adalah **teks yang sampai ke layar**, jadi komentar dan nama simbol dibuang lebih dulu — kalau tidak, [`copy.ts`](../src/lib/copy.ts) menjatuhkan uji itu lewat komentarnya sendiri yang menyebutkan kata-kata terlarang.
>
> Implementasinya `src/lib/copy.check.ts`, dijalankan lewat `npm run check:copy`.

---

## 13. Batasan yang diakui apa adanya

1. Bukan alat medis, bukan diagnosis. Hanya screening / peringatan dini dan wellness
2. PPG di pergelangan tangan terbatas untuk analisis irama (rentan motion artifact). Hasilnya indikatif
3. Estimasi fase tidur bukan setara polisomnografi
4. Skrining napas bukan diagnosis apnea
5. Deteksi dengkuran dari mikrofon murah akan terganggu suara kipas, AC, jalan, atau orang lain di kamar yang sama. Perlu kalibrasi ambang di kamar nyata, bukan hanya di meja kerja
6. Pengiriman peringatan butuh satu ketukan manusia. Yang otomatis adalah deteksinya
7. Kalau pengguna tidur sendirian di rumah, sirene bedside tidak membangunkan siapa pun dan pesan tidak akan terkirim
8. Baterai band terbatas karena PPG kontinu + BLE
9. **Tambahan dari PRD ini:** layar SOS tidak dapat berbunyi saat HP disenyapkan (lihat 6.3). **Klien menyetujui penurunan ini pada 12 Agustus (K4)** — sirene bedside adalah sumber bunyi yang sebenarnya saat darurat
10. **Tambahan dari PRD ini:** kelangsungan JavaScript di latar belakang bergantung pada OS dan pabrikan perangkat (lihat 3.4)
11. **Tambahan 12 Agustus:** SpO₂ dari pergelangan tangan galat absolutnya ±3–4%. Karena itu yang ditampilkan adalah **simpangan dari baseline pribadi**, bukan kadar oksigen darah (lihat §10.4)
12. **Tambahan 12 Agustus:** hanya tersedia **satu set** gelang + bedside saat demo (K7). Fitur keluarga tidak bisa diperagakan hidup dengan dua orang sungguhan — ia diperagakan lewat data seeder, dan itu disebutkan terus terang bila juri bertanya
13. **Tambahan 12 Agustus:** ambang deteksi disetel konservatif dan SOS selalu butuh satu ketukan manusia, karena tanggung jawab atas alarm palsu belum ditetapkan (K11)

**Dihapus dari daftar ini pada 12 Agustus:** batasan "sirene bedside bisu bila HP mati saat band mendeteksi anomali". Klien menyetujui gelang dan bedside berkomunikasi langsung (K3); mekanismenya di `BLE_GATT_CONTRACT.md` §2.1. Batasan ini kembali berlaku bila firmware tidak sempat mengerjakannya.

---

## 14. Milestone

**Tenggat demo: 24 Agustus 2026. Tersedia 14 hari kalender sejak 10 Agustus.**

| Tanggal | Milestone | Keluaran | Selesai kalau |
|---|---|---|---|
| **10–11 Ags** | **M0 — Spike + kerangka** | Foreground service + BLE + interval JS berjalan semalaman. Proyek Vite + Capacitor + shadcn berdiri. Lapisan mock BLE (11.5) | Uji semalaman lolos tanpa putus > 60 dtk. **Bila gagal, arsitektur Bagian 3 dibahas ulang sebelum apa pun dibangun** |
| 12–13 Ags | M1 — Autentikasi & data | O1, O2. Security rules, skema Firestore + RTDB, kerangka 3 tab + laci, token desain dari `DESIGN.md` | Rules lulus uji baca-tulis lintas akun (A2) |
| 14–16 Ags | M2 — Izin, pairing, live | O3, O4, O6, O7, O8, O9 · M1, M2. Penulisan deret waktu | Data live tampil, satu malam tersimpan sesuai anggaran 9.3 (A5) |
| 17–18 Ags | M3 — Mesin status & loop belajar | Status, matriks aktuator, log verifikasi, skor adaptasi · D4 | Kejadian `COMFORT` menghasilkan satu baris log lengkap; skor berubah (no. 12, 13) |
| 19–20 Ags | M4 — Eskalasi & SOS | X1, X2, full-screen intent, pesan WhatsApp + lokasi | Uji penerimaan no. 5, 6, 9, 10 lulus |
| 21 Ags | M5 — Pelaporan | S1, S2, S4 · templat Vital + V2, V5 | Hero M1 berisi skor semalam; S2 lengkap dengan kalimat wawasan |
| 22 Ags | M6 — Skrining napas | V3, S3 | Uji penerimaan no. 15 lulus |
| 23 Ags | M7 — Sisa P1 & ekspor | D1, D2, D3, D6, **D7 (EKG)** · O5, O10 · V1, V4 · X3. **Build freeze pukul 18.00** | Uji penerimaan no. 7, 14 lulus |
| 24 Ags | Demo | Gladi pagi, tanpa perubahan kode | Seluruh Bagian 15.1 hijau di HP demo |

### Cadangan waktu

Jadwal di atas **tidak punya hari kosong**. Bila ada milestone yang meleset, pemotongan dilakukan dari bawah mengikuti urutan §14 dokumen sumber, bukan dengan menggeser tenggat:

| Urutan potong | Yang dikorbankan | Konsekuensi |
|---|---|---|
| 1 | D5, X4, X5 + pemilih orang — seluruh fitur keluarga | ✅ **Klien menyetujui pemotongan ini (K5), dan mengonfirmasi fokus ada di perangkat pribadi (K8).** Sudah berstatus P2, jadi ini pemotongan pertama tanpa perlu bertanya lagi |
| 2 | Scrub grafik di S2 | S2 tetap ada — ia sekarang satu-satunya laporan malam. Yang dipotong hanya interaksi scrub-nya |
| 3 | V1, V4 — skor tidur & gerak | Rinciannya pindah ke dalam S2 sebagai satu blok. Templat Vital tetap hidup lewat V2, V3, V5 |
| 4 | O5, O10 — panduan pasang & layar siap | Onboarding jadi lebih kasar tapi tetap berfungsi. Pairing tetap utuh |
| 5 | X3 — lembar aksi | "Mulai tidur" tetap ada sebagai tombol di M1 |
| 6 | D7 — rekam EKG | AD8232 memang dipasang (K9), tapi ia satu-satunya P1 yang bisa hilang tanpa merusak klaim lain. Bila dipotong, klaim EKG dihapus dari **seluruh** materi, bukan disembunyikan |
| 7 | D6 — ekspor CSV/JSON | Melanggar kriteria no. 14 — potong hanya sebagai pilihan terakhir |

**S4 (Wawasan intervensi) tidak ada di daftar potong.** Ia satu-satunya layar yang memperlihatkan loop belajar bekerja, dan itu klaim inti produk ini.

**Tidak boleh dipotong dalam keadaan apa pun:** tangga eskalasi, polaritas terbalik, loop verifikasi, verifikasi kegelapan, skrining napas, panel uji. Empat yang pertama adalah inti klaim produk; panel uji adalah satu-satunya cara memperagakannya di depan juri.

### Ketergantungan pada firmware

Jadwal ini mengasumsikan firmware siap diuji sekitar **16 Agustus**. Bila mundur, pengembangan aplikasi **tidak berhenti** — seluruh milestone dikerjakan di atas lapisan mock (11.5), dan integrasi perangkat asli digeser ke 21–22 Agustus dengan risiko yang ditanggung bersama.

### Urutan prioritas bila waktu menipis

Mengikuti Bagian 14 dokumen sumber:

| Prioritas | Bagian |
|---|---|
| **Wajib** | Tangga eskalasi (§6) dan polaritas terbalik (Aturan 3) |
| **Wajib** | Sensor kamar + verifikasi kegelapan (§8) dan loop verifikasi (§7) — keduanya menghasilkan bukti |
| **Wajib** | Skrining pola napas (§9) — perekaman SpO₂, deteksi dengkuran, dan laporannya |
| **Boleh sederhana** | Adaptasi (§7) cukup berupa tabel penghitung |
| **Boleh dilewati** | ECG spot-check, layar keluarga, sensor kebisingan |

> Yang paling ingin dihindari adalah semuanya setengah jadi. Prototipe yang berjalan mulus dengan satu fitur cerdas lebih baik daripada prototipe ambisius yang macet di meja juri.

**Catatan:** klien sudah meminta layar keluarga tetap dibuat, jadi baris "boleh dilewati" untuk layar keluarga tidak berlaku kecuali waktu benar-benar habis.

---

## 15. Kriteria penerimaan

### 15.1 Yang menjadi tanggung jawab aplikasi

Diambil dari checklist §13 dokumen sumber, disaring hanya yang menyangkut aplikasi.

| # | Yang diuji | Diterima kalau |
|---|---|---|
| 1 | Smartband berfungsi | Detak tampil di aplikasi dengan selisih wajar terhadap oximeter pembanding; tombol SOS mengirim event di bawah 2 detik; motor getar bisa dipicu dari aplikasi |
| 4 | Buffer offline | Setelah 10 menit terputus, semua kejadian muncul lengkap di aplikasi saat tersambung lagi, dengan cap waktu yang benar |
| 5 | Tangga eskalasi | Picu anomali lalu gerakkan tangan di tahap 2 → sistem turun jadi peringatan biasa. Ulangi tanpa bergerak → sistem sampai ke layar SOS |
| 6 | Layar SOS | Muncul di atas lock screen, pesan terisi lengkap dengan tautan lokasi yang benar. **Butir "berbunyi walau HP disenyapkan" diturunkan — lihat 6.3** |
| 7 | Aktuator bedside | White noise, diffuser, lampu, sirene semuanya bisa dipicu dari panel uji |
| 8 | Sensor kamar | Suhu, kelembapan, lux, dan level bising tampil di aplikasi dan berubah saat kondisi kamar diubah |
| 9 | Polaritas terbalik | Saat `COMFORT` aktif dengan white noise menyala, picu anomali → white noise dan aroma mati, lampu amber menyala |
| 10 | Prioritas status | Saat urutan sunrise berjalan, picu anomali → urutan bangun dibatalkan, sistem masuk `ALERT` |
| 11 | Sunset & verifikasi gelap | Aplikasi melaporkan lux kamar sepanjang malam dan menandai polusi cahaya |
| 12 | Loop verifikasi | Setiap kejadian `COMFORT` menghasilkan satu baris log lengkap sesuai format 7.1 |
| 13 | Adaptasi | Setelah data cukup, aplikasi memilih intervensi berskor tertinggi, dan pilihannya bisa dilihat pengguna |
| 14 | Ekspor & monitor-only | Log semalam bisa diekspor CSV/JSON; mode monitor-only bisa dinyalakan dari pengaturan |
| 15 | Skrining napas | SpO₂ terekam sepanjang malam; aplikasi menghitung kejadian desaturasi per jam; dengkuran yang disengaja di depan bedside terdeteksi dan tercatat; laporan mingguan tampil dengan **bahasa saran periksa, bukan bahasa diagnosis** |

Butir 2, 3, 16, 17 dokumen sumber adalah tanggung jawab firmware dan dokumentasi perangkat keras.

### 15.2 Tambahan khusus PRD ini

| # | Yang diuji | Diterima kalau |
|---|---|---|
| A1 | Kelangsungan background | Sesi 8 jam dengan layar mati, aplikasi di latar → tidak ada putus data melebihi 60 detik |
| A2 | Isolasi data | Akun B tidak bisa membaca apa pun milik akun A lewat SDK maupun REST |
| A3 | Layar keluarga | Viewer melihat ringkasan malam, dan **tidak** bisa mengakses subkoleksi `series` |
| A4 | Kepatuhan bahasa | `npm run check:copy` lolos: tidak ada `apnea`, `diagnosis`, `disorder`, `sent automatically`, `automatically sent`, atau `terkirim otomatis` di teks yang sampai ke layar. Daftarnya berbahasa Inggris karena layarnya berbahasa Inggris — lihat §12 |
| A5 | Anggaran kuota | Satu malam penuh menghasilkan kurang dari 50 penulisan Firestore |

---

## 16. Asumsi dan pertanyaan terbuka

### 16.1 Asumsi yang dipakai PRD ini

| # | Asumsi | Dampak bila salah |
|---|---|---|
| A | Perangkat demo adalah Android dengan Chrome WebView terbaru | Sedang — iOS tidak dicakup sama sekali |
| B | Firmware band dan bedside digarap pihak lain sesuai §5 dokumen sumber | **Tinggi** — diredam oleh lapisan mock 11.5, tapi tidak dihilangkan |
| C | Firmware menyetujui kontrak GATT tanpa perubahan besar | **Tinggi** — firmware belum dibuat, kontrak masih menunggu balasan |
| D | Satu akun pengguna utama per instalasi untuk prototipe | Rendah. Diperkuat oleh K8 — fokus perangkat pribadi |
| E | ~~Klien menyetujui penyimpanan data kesehatan di Firebase~~ | ✅ **Bukan lagi asumsi** — disetujui 12 Ags |
| F | Firmware menyanggupi siaran eskalasi (§2.1) dan aliran EKG (§3.10) | **Tinggi untuk siaran** — bila ditolak, lubang keselamatan kembali terbuka. Sedang untuk EKG — bila ditolak, klaimnya dihapus |
| G | **Baru:** satu set perangkat keras cukup untuk memperagakan seluruh klaim P0 | Rendah. Hanya fitur keluarga yang terdampak, dan itu sudah P2 |

Stack (Bagian 3.2), tenggat 24 Agustus 2026, dan izin Firebase sudah dikonfirmasi klien dan bukan lagi asumsi.

### 16.2 Pertanyaan yang harus dijawab klien

Diurutkan berdasarkan seberapa cepat jawabannya dibutuhkan.

**Dijawab klien 12 Agustus 2026 — sepuluh dari dua belas tertutup.**

| # | Pertanyaan | Jawaban klien | Akibatnya di dokumen |
|---|---|---|---|
| **K1** | Siapa penggarap firmware? | ⏳ **Firmware belum dibuat** — kontrak dikirim ulang | Blocker M2 masih terbuka. Aplikasi jalan di atas lapisan mock |
| **K2** | Firebase boleh simpan data kesehatan? | ✅ **Boleh**, dengan perlindungan §9.4 | Blocker M1 hilang. Asumsi E naik jadi fakta |
| **K3** | Gelang & bedside boleh terhubung langsung? | ✅ **Boleh** | **Lubang keselamatan ditutup.** Aturan 1 dapat pengecualian kedua (§4.1). Batasan §13 no. 7-lama dihapus. Mekanisme di kontrak §2.1 |
| **K4** | Kriteria no. 6 boleh diturunkan? | ✅ **Boleh** | Batasan §13 no. 9 dikonfirmasi, bukan lagi menunggu persetujuan |
| **K5** | Fitur keluarga boleh dipotong duluan? | ✅ **Boleh** | Urutan potong §14 no. 1 dikonfirmasi tanpa catatan "perlu konfirmasi klien" |
| **K6** | Anggaran plugin BLE berbayar? | ❌ **Tidak ada** | Bila M0 gagal, arsitektur §3 dibahas ulang. Tidak ada jalan keluar berbayar |
| **K7** | Berapa set perangkat keras saat demo? | **Satu set** gelang + bedside | Fitur keluarga tidak bisa diperagakan hidup. Diperagakan lewat seeder, dan disebutkan terus terang. Batasan §13 no. 12 |
| **K8** | Siapa pengguna yang diperagakan? | **Perangkat pribadi jadi fokus, keluarga jadi pelengkap** | D5, X4, X5 turun ke **P2**. Pemilih orang turun ke P2. Templat Vital dan S4 naik jadi tulang punggung demo |
| **K9** | AD8232 jadi dipasang? | ✅ **Ya, dipasang** | Characteristic `000A` masuk kontrak §3.10. X3 dan D7 dapat aksi nyata |
| **K10** | Ada data uji nyata dari perangkat? | ⏳ **Belum tahu** | Seeder tetap memakai nilai sintetis yang wajar. Satu malam nyata akan sangat membantu bila nanti ada |
| **K11** | Tanggung jawab atas alarm palsu? | Mengikuti rekomendasi | Ambang konservatif, SOS selalu butuh satu ketukan. Batasan §13 no. 13 |
| **K12** | Aroma dipakai saat demo di ruang tertutup? | ⏳ **Belum tahu** | Panel Uji tetap punya sakelar mematikan aroma. Dibangun apa pun jawabannya — biayanya nol |

### 16.3 Yang masih terbuka

| # | Pertanyaan | Ke siapa | Kapan |
|---|---|---|---|
| **K10** | Data uji nyata satu malam | Klien | Kapan saja, tidak memblokir |
| **K12** | Aroma saat demo | Klien | Sebelum 23 Ags |
| **Kontrak** | Seluruh formulir §7 `BLE_GATT_CONTRACT.md` | **Firmware** | Secepatnya — firmware belum dibuat |

Firmware belum digarap, jadi seluruh kontrak masih terbuka. Bila siaran eskalasi (§2.1) tidak sempat dikerjakan, batasan lubang keselamatan **kembali berlaku** dan harus disebut terus terang di depan juri.

---

## Lampiran — nilai default parameter

Semua nilai berikut wajib bisa diubah dari layar Pengaturan tanpa membangun ulang aplikasi.

| Parameter | Default | Sumber |
|---|---|---|
| Tahap eskalasi 1 — konfirmasi diam | 20 dtk | §6 |
| Tahap eskalasi 2 — getar halus | 15 dtk | §6 |
| Tahap eskalasi 3 — getar keras | 30 dtk | §6 |
| Total sampai `SOS_SENT` | 65 dtk | §6 |
| Pengulangan SOS bila tanpa respons | 2 menit | §6 |
| Jendela verifikasi `COMFORT` | 5 menit | §5 |
| Percobaan minimum sebelum skor dipakai | 3 | §7 |
| Rasio eksplorasi | 1 dari 5 | §7 |
| Durasi sunset | 25 menit (rentang 20–30) | §8 |
| Durasi sunrise | 25 menit (rentang 20–30) | §8 |
| Suhu warna sunset | 2200–2700K | §8 |
| Kecerahan awal sunset | 30–50 lux | §8 |
| Ambang gelap optimal | < 3 lux | §8 |
| Ambang polusi cahaya | > 5 lux berkelanjutan | §8 |
| Interval sampling SpO₂ | 20 dtk (rentang 10–30) | §9 |
| Ambang desaturasi | turun ≥ 3% dari baseline | §9 |
| Durasi minimum desaturasi | 10 dtk | §9 |
| Rentang frekuensi dengkuran | 0,2–0,5 Hz | §9 |
| Durasi aroma per kejadian | 25 dtk (maks 30) | §12 |
| Batas kejadian aroma per malam | 4 | turunan §12 |
| Ambang putus koneksi → `OFFLINE` | 30 dtk | §4 |
| Downsample deret waktu | 1 sampel / 5 dtk | Bagian 9.3 |
