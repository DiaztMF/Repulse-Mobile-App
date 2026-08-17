# RePulse — Kontrak BLE GATT

**Versi:** 2.1 · 17 Agustus 2026
**Untuk:** pengembang firmware smartband dan bedside
**Balasan diminta pada:** formulir di Bagian 7

Dokumen ini mendefinisikan seluruh permukaan BLE antara aplikasi Android dan kedua perangkat. Aplikasi sudah dibangun di atas kontrak ini, jadi perubahan bentuk payload berarti perubahan kode di sisi aplikasi.

> **Perubahan dari 2.0:** tidak ada perubahan pada byte, UUID, atau enum mana pun — firmware yang sudah dikerjakan terhadap 2.0 tetap sah. Yang berubah hanya rujukan nomor bagian yang salah di header, dan Bagian 7 kini menyebutkan tenggat sebenarnya.

Delapan uji di Bagian 6 sekarang sudah ada sebagai layar di dalam aplikasi, bukan tabel yang dibaca sekali. Saat verifikasi bersama, aplikasi yang mengirim perintahnya dan mencatat hasilnya.

---

## 1. Ketentuan umum

Berlaku untuk kedua perangkat, tanpa kecuali.

| Hal | Ketentuan |
|---|---|
| **Endianness** | Little-endian di seluruh payload multi-byte |
| **MTU** | Aplikasi meminta 185 setelah connect. Bila negosiasi gagal, aplikasi jatuh ke potongan 20 byte dan JSON dipecah |
| **Bilangan pecahan** | **Tidak ada `float` di udara.** Semua nilai pecahan dikirim sebagai integer berskala — representasi `float` tidak dijamin identik antara ESP32 dan JavaScript |
| **Cap waktu** | `uint32`, epoch detik UTC |
| **Notify vs Indicate** | Notify untuk data yang boleh hilang satu sampel. **Indicate untuk apa pun yang menyangkut keselamatan** — Indicate ber-ACK, Notify tidak |
| **Write** | Semua characteristic tulis memakai Write With Response |
| **Bonding** | Aktif, supaya reconnect tengah malam tidak meminta pairing ulang |

Flag anomali tidak boleh menumpang aliran Notify. Paket Notify yang hilang tidak diketahui siapa pun; untuk sampel gerakan itu tidak apa-apa karena sampel berikutnya datang sedetik lagi, tapi untuk anomali artinya kejadian keselamatan hilang diam-diam.

---

## 2. Advertising & penemuan perangkat

Aplikasi memindai dengan filter service UUID, bukan nama. **Bila UUID tidak ada di paket advertising, perangkat tidak akan pernah ditemukan.**

| Perangkat | Nama iklan | Service UUID |
|---|---|---|
| Smartband | `RePulse Band` | `4FA10000-8C3A-4B8F-A292-3E83D02F1A00` |
| Bedside | `RePulse Bedside` | `4FA20000-8C3A-4B8F-A292-3E83D02F1A00` |

### 2.1 Siaran tahap eskalasi

Gelang menyertakan tahap eskalasinya di paket advertising. Bedside memindai pasif dan bisa membunyikan sirene sendiri bila HP tidak terjangkau.

**Manufacturer Specific Data (AD type `0xFF`) pada advertising gelang**

| Offset | Tipe | Field | Isi |
|---|---|---|---|
| 0–1 | `uint16` | `company_id` | `0xFFFF` |
| 2 | `uint8` | `protocol_version` | `0x01` |
| 3 | `uint8` | `escalation_stage` | enum sama dengan `0007` |
| 4 | `uint8` | `flags` | bit 7 = `worn`, bit 0 = `phone_connected` |

Anggaran paket advertising, batas 31 byte: flags 3 + service UUID 128-bit 18 + manufacturer data 7 = **28 byte**. Bila tidak muat, taruh di scan response — bedside tersambung listrik, jadi active scan tidak jadi soal.

Identitas gelang **tidak** masuk payload; bedside memakai alamat MAC yang sudah ada di header setiap paket, dan menyimpannya saat pairing.

**Bedside membunyikan sirene sendiri hanya bila keempatnya benar:**

1. `escalation_stage` ≥ 3
2. MAC pengirim cocok dengan gelang pasangannya
3. Bedside tidak punya koneksi aktif ke aplikasi
4. Bit `phone_connected` bernilai `0`

Syarat 3 dan 4 terlihat mubazir tapi menjaga kegagalan berbeda — yang satu "bedside kehilangan HP", yang lain "gelang kehilangan HP". **Bila salah satu masih punya HP, HP yang berkuasa.** Ini yang mencegah sirene diperintah dua tuan.

Siaran ini juga dipakai aplikasi: saat kehilangan gelang di tengah `ALERT`, aplikasi memindai siarannya dan membaca tahap sebenarnya tanpa menyambung ulang.

**Jeda antara tahap berubah dan siaran ikut berubah harus di bawah 2 detik.**

---

## 3. Smartband Service

`4FA10000-8C3A-4B8F-A292-3E83D02F1A00` — characteristic mengganti empat digit setelah `4FA1`.

| UUID | Data | Tipe | Frekuensi |
|---|---|---|---|
| `0001` | Vital signs | Notify | ~1 dtk, boleh dibatch 5–10 dtk |
| `0002` | SpO₂ + posisi tubuh | Notify | 10–30 dtk |
| `0003` | Level gerakan | Notify | ~1 dtk |
| `0004` | Event tombol SOS | **Indicate** | saat terjadi |
| `0005` | Konfigurasi (app → band) | Write | saat diperlukan |
| `0006` | Buffer offline | Notify + Write | saat reconnect |
| `0007` | Anomali & tahap eskalasi | **Indicate** | saat berubah |
| `0008` | Status baterai & jam | Read / Notify | tiap 5 menit |
| `0009` | Perintah (app → band) | Write | saat diperlukan |
| `000A` | Aliran EKG | Notify | hanya saat perekaman |

### 3.1 `0001` — Vital signs

Satu byte status, lalu kelompok 3 byte yang boleh diulang hingga 5 kali per paket.

| Offset | Tipe | Field | Satuan |
|---|---|---|---|
| 0 | `uint8` | `status` | bitfield di bawah |
| 1 | `uint8` | `bpm` | denyut per menit |
| 2–3 | `uint16` | `rr_ms` | milidetik |
| … | | ulangi offset 1–3 | |

Panjang = 1 + (3 × jumlah sampel), maksimum 16 byte. Sampel diurut dari paling lama.

**Bitfield `status`**

| Bit | Nama | Arti |
|---|---|---|
| 7 | `worn` | `1` = terpasang di pergelangan |
| 6–4 | — | dicadangkan, isi `0` |
| 3–0 | `signal_quality` | `0` tidak terbaca … `15` sempurna |

**Kedua field ini mencegah alarm palsu.** Bagi MAX30102, "tidak ada detak" dan "gelang di atas meja" terbaca identik — dan yang pertama memicu `ALERT`. Level DC inframerah biasanya cukup untuk membedakannya; kami hanya butuh keputusan biner yang stabil.

`signal_quality` dipakai layar kalibrasi sebagai gerbang: kalibrasi menolak mulai sampai nilainya bertahan di atas ambang selama 3 detik. Gelang longgar menghasilkan baseline sampah, dan setiap ambang personal selama dua minggu berikutnya diukur terhadap baseline itu.

### 3.2 `0002` — SpO₂ & posisi tubuh

| Offset | Tipe | Field | Satuan |
|---|---|---|---|
| 0 | `uint8` | `spo2_pct` | persen, 0 = tidak valid |
| 1 | `uint8` | `position` | enum di bawah |

**Enum `position`** — `0` telentang · `1` miring kiri · `2` miring kanan · `3` tengkurap · `255` tidak diketahui

Kiri dan kanan **tidak boleh** digabung. Ringkasan mingguan harus menyebut di posisi mana desaturasi paling sering muncul; tanpa pemisahan ini fitur itu tidak bisa dibangun.

Jangan sampling SpO₂ kontinu — cukup tiap 10–30 detik.

### 3.3 `0003` — Level gerakan

| Offset | Tipe | Field | Satuan |
|---|---|---|---|
| 0–1 | `uint16` | `milli_g` | seperseribu g. 0,42 g → `420` |

### 3.4 `0004` — Event tombol SOS

| Offset | Tipe | Field |
|---|---|---|
| 0 | `uint8` | `1` = ditekan ≥ 2 detik |

Wajib Indicate, dan harus sampai di aplikasi di bawah 2 detik.

### 3.5 `0007` — Anomali & tahap eskalasi

| Offset | Tipe | Field |
|---|---|---|
| 0 | `uint8` | `stage` |
| 1 | `uint8` | `reason` |

**Enum `stage`**

| Nilai | Tahap | Waktu |
|---|---|---|
| 0 | Normal / batal | — |
| 1 | Konfirmasi diam, tanpa tanda apa pun | 0–20 dtk |
| 2 | Getar halus + pantau accelerometer | 20–35 dtk |
| 3 | Getar keras + minta layar HP menyala | 35–65 dtk |
| 4 | Tidak responsif → `SOS_SENT` | 65 dtk |

**Enum `reason`** — `0` tidak ada · `1` irama tidak teratur · `2` HR di luar ambang personal · `3` tombol SOS manual

Turun dari tahap 2 atau 3 kembali ke 0 berarti tubuh merespons. Transisi ini **harus dikirim**, bukan didiamkan — aplikasi mencatatnya sebagai peringatan biasa dan tidak menghubungi siapa pun.

**Tangga eskalasi berjalan penuh di firmware, tersambung maupun tidak.** Aplikasi adalah cermin dan antarmuka, bukan pengendali. Fitur keselamatan tidak boleh punya titik kegagalan tunggal berupa baterai ponsel.

**Motor getar harus di-gate terhadap accelerometer.** Motor koin ada di pergelangan yang sama dengan MPU6050, jadi getarannya terbaca sebagai gerakan tubuh dan alarm membatalkan dirinya sendiri — tangga tidak akan pernah mencapai tahap 3. Pilih salah satu: abaikan pembacaan MPU selama motor menyala plus jeda ~200 ms, atau pakai ambang gerakan di atas amplitudo motor.

### 3.6 `0008` — Status baterai & jam

| Offset | Tipe | Field |
|---|---|---|
| 0 | `uint8` | `percent` 0–100 |
| 1 | `uint8` | `charging` 0 / 1 |
| 2–5 | `uint32` | `epoch_s` — jam gelang saat ini. `0` = belum pernah disinkronkan |

ESP32-C3 kehilangan waktu saat kehabisan daya atau reboot, dan kejadian di buffer `0006` jadi bercap epoch nol. Itu merusak `settle_time_s` — selisih dua cap waktu — yang merusak Skor Intervensi, satu-satunya bukti bahwa loop belajar produk ini bekerja.

Selama tersambung, cap waktu ditentukan HP. Field ini murni untuk jalur offline.

### 3.7 `0005` — Konfigurasi (app → band)

JSON UTF-8. Field yang tidak dikirim berarti tidak diubah.

```json
{
  "baseline_bpm": 62,
  "hr_threshold_delta": 16,
  "rr_variability_threshold": 0.18,
  "stage1_s": 20,
  "stage2_s": 15,
  "stage3_s": 30,
  "motion_response_threshold_mg": 150,
  "spo2_sample_interval_s": 20
}
```

### 3.8 `0009` — Perintah (app → band)

```json
{ "cmd": "vibrate", "pattern": "soft" | "hard", "duration_ms": 800 }
{ "cmd": "sync_time", "epoch_s": 1786512000 }
{ "cmd": "record_baseline", "duration_s": 180 }
{ "cmd": "ecg_start", "duration_s": 30 }
{ "cmd": "ecg_stop" }
```

`vibrate` bukan tambahan opsional — Panel Uji untuk demo juri tidak bisa dibangun tanpanya. `sync_time` dikirim **setiap kali tersambung**, bukan sekali saat pairing.

### 3.9 `0006` — Buffer offline

Saat Bluetooth putus lebih dari 30 detik, gelang menjalankan tangga eskalasi mandiri dan menyimpan setiap kejadian ke ring buffer beserta cap waktu.

Read biasa tidak cukup karena isi buffer bisa melebihi satu MTU:

1. Aplikasi menulis `{"cmd":"flush_start"}` ke `0006`
2. Gelang mengirim rentetan Notify pada `0006`
3. Gelang menutup dengan paket sentinel `seq = 0xFFFF`
4. Aplikasi membalas `{"cmd":"flush_ack","last_seq":N}`
5. **Gelang baru menghapus buffer setelah ACK diterima**

**Format paket**

| Offset | Tipe | Field |
|---|---|---|
| 0–1 | `uint16` | `seq`, mulai 0. `0xFFFF` = sentinel |
| 2 | `uint8` | `count`, maksimum 19 pada MTU 185 |
| 3… | | `count` entri, masing-masing 9 byte |

**Format satu entri**

| Offset | Tipe | Field |
|---|---|---|
| 0–3 | `uint32` | `epoch_s` — waktu kejadian sebenarnya, bukan waktu pengiriman |
| 4 | `uint8` | `type` |
| 5–8 | `uint8[4]` | payload |

**Enum `type`**

| Nilai | Arti | Payload |
|---|---|---|
| 1 | Anomali terdeteksi | `[reason, 0, 0, 0]` |
| 2 | Perubahan tahap eskalasi | `[stage, reason, 0, 0]` |
| 3 | Tombol SOS ditekan | `[0, 0, 0, 0]` |
| 4 | Ringkasan vital berkala | `[bpm, spo2, milli_g >> 8, milli_g & 0xFF]` |
| 5 | Penanda putus / sambung | `[0=putus 1=sambung, 0, 0, 0]` |

Penghapusan hanya setelah ACK, supaya putus di tengah flush tidak menghilangkan data.

### 3.10 `000A` — Aliran EKG

Aktif hanya selama perekaman yang dipicu pengguna, tidak pernah saat tidur — AD8232 butuh kontak dua titik dengan jari tangan sebelah.

| Offset | Tipe | Field |
|---|---|---|
| 0 | `uint8` | `seq`, berputar 0–255 |
| 1 | `uint8` | `flags` — bit 7 = `lead_on` |
| 2… | `int16[90]` | sampel mentah ADC |

Panjang paket 182 byte, pas di MTU 185. Pada 250 Hz: 500 byte/dtk ≈ 2,8 notifikasi/dtk, sekitar 15 KB untuk 30 detik.

**`lead_on` wajib.** Tanpa kontak jari yang benar gelombangnya sampah, dan aplikasi menolak menyimpan rekaman dengan `lead_on = 0`. Gelombang EKG sampah yang ditampilkan sebagai grafik nyata adalah hal paling berbahaya yang bisa dilakukan aplikasi ini.

---

## 4. Bedside Service

`4FA20000-8C3A-4B8F-A292-3E83D02F1A00`

| UUID | Data | Tipe | Frekuensi |
|---|---|---|---|
| `0001` | Sensor kamar | Notify | suhu/RH/dB tiap 5 mnt, lux tiap 1 mnt |
| `0002` | Flag pola dengkuran | Notify | saat terdeteksi |
| `0003` | Kontrol aktuator | Write | saat diperlukan |
| `0004` | Konfirmasi perintah selesai | **Indicate** | saat terjadi |

### 4.1 `0001` — Sensor kamar

| Offset | Tipe | Field | Satuan |
|---|---|---|---|
| 0–1 | `int16` | `temp_c_x10` | °C × 10. 29,1 → `291` |
| 2–3 | `uint16` | `rh_pct_x10` | %RH × 10. 74,0 → `740` |
| 4–7 | `uint32` | `lux_x100` | lux × 100. 0,4 → `40` |
| 8 | `uint8` | `db` | desibel, dibulatkan |

Lux dikali 100 karena ambang gelap optimal adalah `< 3 lux` dan pembacaan nyata bisa `0,4 lux`. Integer polos akan membulatkannya jadi 0 dan membuat seluruh verifikasi kegelapan tidak berarti. `uint32` supaya pembacaan siang tidak meluap.

Lux dibaca sepanjang malam meski lampu sudah mati — itu dasar penandaan gelap optimal dan pencatatan polusi cahaya. **Sensor harus BH1750**, bukan LDR: LDR hanya memberi nilai relatif, sedangkan seluruh ambang memerlukan satuan lux sungguhan.

### 4.2 `0002` — Flag pola dengkuran

| Offset | Tipe | Field |
|---|---|---|
| 0 | `uint8` | `flag` 0 / 1 |
| 1 | `uint8` | `intensity` 0–100 |

Deteksi mencari **pola berulang 0,2–0,5 Hz** mengikuti irama napas di atas ambang volume, bukan rata-rata desibel. Ambangnya harus bisa dikalibrasi di kamar sungguhan — kipas, AC, suara jalan, dan orang lain di kamar akan mengganggu.

### 4.3 `0003` — Kontrol aktuator

JSON UTF-8. Field yang tidak disertakan berarti biarkan apa adanya.

```json
{
  "command_id": 42,
  "light": { "mode": "sunset", "brightness": 40, "kelvin": 2200, "ramp_s": 1500 },
  "white_noise": { "on": true, "volume": 3, "track": 2, "fade_s": 30 },
  "aroma": { "on": true, "duration_s": 25 },
  "siren": { "on": false }
}
```

`light.mode` — `sunset` · `sunrise` · `amber` · `alert` · `off`

**Batas keselamatan wajib ditegakkan firmware, bukan hanya aplikasi:**

- Aroma maksimal **30 detik** per kejadian
- Jumlah kejadian aroma per malam dibatasi, default 4
- Permintaan yang melampaui batas dibalas `status = 2`, bukan diam-diam dijalankan

Diffuser ultrasonik yang menyala terus-menerus membuat ruangan lembap dan berisiko mengiritasi saluran napas, terutama bagi penderita asma.

**Peredupan sunset wajib eksponensial, bukan linear** — mata mempersepsi cahaya secara logaritmik, jadi peredupan linear terasa mati mendadak di ujungnya. Selama sunset, kanal biru diturunkan jauh di bawah merah.

### 4.4 `0004` — Konfirmasi perintah selesai

| Offset | Tipe | Field |
|---|---|---|
| 0 | `uint8` | `command_id`, dipantulkan dari perintahnya |
| 1 | `uint8` | `status` |

`status` — `0` selesai · `1` gagal · `2` ditolak karena batas keselamatan

Tanpa `command_id`, konfirmasi tidak bisa dipasangkan ke perintahnya: kalau aplikasi mengirim dua perintah dalam dua detik, satu balasan `status=0` tidak memberi tahu yang mana.

---

## 5. Yang tetap jadi tanggung jawab firmware

- Sampling sensor dan filternya
- Tangga eskalasi lengkap, berjalan mandiri saat HP tidak ada
- Penegakan batas keselamatan aroma
- Kurva peredupan eksponensial
- Manajemen daya dan pengisian
- Ring buffer offline beserta cap waktunya
- Gating accelerometer saat motor getar menyala
- Deteksi terpasang/terlepas

Aplikasi memegang mesin status sistem kenyamanan, penyimpanan, seluruh tampilan, dan pengiriman pesan darurat.

---

## 6. Cara aplikasi akan menguji

Panel Uji di aplikasi menyediakan tombol manual untuk tiap perintah. Ini yang dipakai saat verifikasi bersama dan saat demo di depan juri.

| # | Uji | Lulus bila |
|---|---|---|
| 1 | Getar band | Perintah `vibrate` menggerakkan motor < 1 dtk |
| 2 | Tombol SOS | Event sampai di aplikasi < 2 dtk |
| 3 | Sunset | Lampu meredup eksponensial, lux akhir < 3 |
| 4 | Batas aroma | Permintaan 60 dtk ditolak dengan `status = 2` |
| 5 | Flush buffer | Putus 10 menit, semua kejadian muncul dengan cap waktu benar |
| 6 | Sirene mandiri | HP dimatikan, tahap 3 disiarkan, bedside berbunyi sendiri |
| 7 | Gating getar | Motor menyala tidak membatalkan tangga eskalasi |
| 8 | Terlepas | Gelang di meja tidak memicu `ALERT` |

---

## 7. Untuk diisi pengembang firmware

**Demo penjurian: 24 Agustus 2026.** Pertanyaan 14 yang paling menentukan, dan jawaban jujur lebih berguna daripada jawaban optimis: bila firmware tidak siap sebelum tanggal itu, aplikasi tampil di atas lapisan simulasi dengan penanda "data contoh" di layar — itu rencana yang sudah ada, bukan kegagalan. Yang tidak bisa diselamatkan adalah mengetahuinya pada 23 Agustus.

Tidak perlu menunggu firmware lengkap untuk mulai menguji bersama. Begitu perangkat bisa *advertising* dengan service UUID yang benar dan satu characteristic saja bisa dibaca, uji 2 dan 8 di Bagian 6 sudah bisa dijalankan.

| # | Pertanyaan | Jawaban |
|---|---|---|
| 1 | Ada characteristic di Bagian 3 atau 4 yang tidak bisa dipenuhi? Yang mana? | |
| 2 | MTU 185 bisa dinegosiasikan pada kedua perangkat? | |
| 3 | Kapasitas ring buffer offline, dalam jumlah entri? | |
| 4 | Jam gelang bertahan saat restart, atau perlu `sync_time` tiap connect? | |
| 5 | BH1750 terpasang di bedside? | |
| 6 | Metode deteksi terpasang/terlepas untuk flag `worn`? | |
| 7 | Bagaimana `signal_quality` 0–15 diturunkan, dan nilai minimum apa yang Anda anggap layak untuk baseline? | |
| 8 | Gating accelerometer saat motor getar: gating waktu atau ambang amplitudo? | |
| 9 | Siaran tahap eskalasi muat di advertising utama, atau perlu scan response? | |
| 10 | Bedside bisa memindai dan menyimpan MAC gelang pasangannya? | |
| 11 | AD8232 jadi dipasang? Laju sampling dan resolusi ADC yang dipakai? | |
| 12 | Keluaran lead-off AD8232 tersambung dan bisa dilaporkan sebagai `lead_on`? | |
| 13 | Perekaman EKG memengaruhi pembacaan PPG yang berjalan bersamaan? | |
| 14 | Perkiraan tanggal firmware siap diuji? | |
| 15 | Keberatan atau usulan perubahan atas dokumen ini? | |
