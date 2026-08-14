# Rencana MVP — 14 sampai 24 Agustus 2026

**Ditulis 14 Agustus, setelah M0 gagal.** Dokumen kerja, bukan dokumen otoritas.
`PRD.md`, `DESIGN.md`, dan `BLE_GATT_CONTRACT.md` tetap yang memutuskan.

---

## 1. Apa yang M0 buktikan, dan apa yang tidak

Tiga run pada 13–14 Agustus. Yang terbaik menerima **7 tick dari 511**.
Tick kembali muncul persis saat layar menyala, lalu berhenti lagi.

Prosesnya **tidak mati** — kalau mati, `setInterval` hilang bersama halamannya
dan tidak akan pernah ada tick lagi tanpa Start ulang. Yang terjadi: halaman
hidup, JavaScript-nya dibekukan selama Activity tidak terlihat.

> **Kesimpulan: apa pun yang harus berjalan saat layar mati tidak boleh berupa
> JavaScript di dalam WebView.**

Yang M0 **tidak** buktikan: bahwa foreground service-nya gagal. Service-nya
justru bekerja — itu sebabnya prosesnya bertahan tujuh jam.

## 2. Kenapa ini lebih kecil daripada kelihatannya

`BLE_GATT_CONTRACT.md` §3.5 dan `PRD.md` §4.1 sudah menetapkan:

> Tangga eskalasi berjalan penuh di firmware, tersambung maupun tidak.
> Aplikasi adalah cermin dan antarmuka, bukan pengendali.

Jadi lapisan native **tidak** perlu mendeteksi anomali, tidak perlu menghitung
tangga, tidak perlu memutuskan apa pun soal keselamatan. Gelang yang
melakukannya. Yang native perlu lakukan hanya empat hal:

1. Memegang koneksi GATT supaya tidak putus saat layar mati
2. Menerima Indicate `0007` (tahap) dan `0004` (tombol SOS)
3. Menyalakan layar lewat full-screen intent saat tahap ≥ 3
4. Menampung sampel `0001`/`0002`/`0003` dan menyerahkannya ke JS saat aplikasi kembali terlihat

Ditambah satu yang memang milik aplikasi (Aturan 1): **sistem kenyamanan**.
Evaluator ambang sederhana — gelisah naik → perintah aktuator ke bedside.
Bukan mesin status penuh; mesin status tetap di TypeScript untuk tampilan.

## 3. Pembagian

| Lapisan | Isi | Diuji di |
|---|---|---|
| **Kotlin** — plugin `RepulseMonitor` | Foreground service · BLE scan/connect/bond/MTU · langganan characteristic · evaluator kenyamanan · full-screen intent · ring buffer sampel | HP |
| **Kotlin** — mode mock | Aliran kejadian yang sama, dibangkitkan tanpa perangkat | HP |
| **TypeScript** — `BleTransport` | Antarmuka. Tiga implementasi: native, mock-browser, mock-native | Browser + HP |
| **TypeScript** — sisanya | Mesin status, loop verifikasi, seluruh layar, laporan, skrining | Browser |

Mock hidup **di dalam** service, bukan di sampingnya. Demo 24 Agustus lewat
jalur kode yang sama dengan perangkat asli — itu satu-satunya cara jaring
pengaman `PRD.md` §11.5 benar-benar menguji sesuatu.

## 4. Urutan, dan alasannya

Setiap iterasi Kotlin butuh satu putaran Android Studio di HP Anda. Maka
seluruh lapisan TypeScript diselesaikan dan dibuktikan di browser lebih dulu,
supaya dorongan native cukup sekali-dua kali, bukan sepuluh.

| Hari | Kerjakan | Selesai kalau |
|---|---|---|
| **14 Ags** | `BleTransport` + mock browser + skenario malam (§11.5) | Panel Uji memutar malam sintetis, kelima skenario bisa dipicu |
| **15 Ags** | Mesin status §4 + perilaku §5 + matriks aktuator §4.4 | Anomali saat sunrise membatalkan sunrise (uji wajib §4.3) |
| **16 Ags** | Loop verifikasi §7.1 + skor adaptasi §7.2 | Satu kejadian `COMFORT` menghasilkan satu baris log lengkap |
| **17–18 Ags** | Plugin Kotlin: service, mock mode, full-screen intent | Layar menyala sendiri saat mock mengirim tahap 3, HP terkunci |
| **19 Ags** | Kotlin: BLE asli di belakang antarmuka yang sama | Tersambung ke gelang bila firmware ada; kalau belum, mock tetap jalan |
| **20 Ags** | SOS §6: pesan WhatsApp + lokasi, satu ketukan | Uji penerimaan 5, 6, 9, 10 |
| **21 Ags** | Laporan S1, S2, S4 | Hero berisi skor semalam |
| **22 Ags** | Skrining napas V3, S3 | Uji penerimaan 15 |
| **23 Ags** | Sisa P1, ekspor, **build freeze 18.00** | Uji penerimaan 7, 14 |
| **24 Ags** | Gladi. Tanpa perubahan kode | §15.1 hijau |

## 5. Yang dipotong lebih dulu bila meleset

Urutannya sudah ada di `PRD.md` §14 dan sudah disetujui klien. Tidak diubah di
sini. Yang **tidak boleh** dipotong dalam keadaan apa pun tetap sama: tangga
eskalasi, polaritas terbalik, loop verifikasi, verifikasi kegelapan, skrining
napas, panel uji.

Satu tambahan yang khusus rencana ini: **bila plugin Kotlin meleset dari 19
Agustus, yang dipotong adalah BLE asli, bukan lapisan native-nya.** Demo di atas
mock lewat service yang benar jauh lebih jujur daripada demo di atas BLE asli
yang mati saat layar terkunci.

## 6. Risiko yang diketahui

| Risiko | Sikap |
|---|---|
| Firmware belum menjawab `BLE_GATT_CONTRACT.md` §7 — termasuk nomor 14, tanggal siap uji | Seluruh jadwal berdiri di atas mock. Perangkat asli masuk 19 Ags, dan boleh tidak datang |
| Setiap iterasi Kotlin butuh HP Anda | Lapisan TS diselesaikan lebih dulu; native didorong sekali-dua kali |
| MIUI membunuh aplikasi di luar aturan Android | Layar Autostart sudah ada di onboarding. Harus benar-benar diaktifkan sebelum uji semalaman berikutnya |
| Sisa 9 hari kerja untuk M2–M7 plus lapisan native | Nyata. Urutan potong §5 dipakai tanpa menunda tenggat |
