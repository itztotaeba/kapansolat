# 🕌 Jadwal Sholat & Pengingat — Huawei Watch GT 7 Pro

Aplikasi **100% offline** untuk **Huawei LiteWearable** (JavaScript) pada
**Huawei Watch GT 7 Pro**. Menampilkan jadwal sholat hari ini, hitung mundur
menuju sholat berikutnya, dan pengingat **10 menit sebelum sholat** dengan
**dua metode sekaligus**.

---

## ✨ Fitur

| Fitur | Keterangan |
|---|---|
| Jadwal hari ini | Subuh, Zuhur, Ashar, Maghrib, Isya dalam satu daftar ringkas |
| Penanda status | ✓ sudah lewat (redup) · ▶ sedang berlangsung (hijau) · ➜ berikutnya |
| Countdown | Contoh: `Ashar — 1 jam 15 menit lagi` + waktu masuk besar di kartu atas |
| Tanggal otomatis | Diambil dari sistem jam, format Indonesia ("Jumat, 14 Oktober 2026") |
| Metode A | Saat app terbuka: cek tiap 30 detik → banner notifikasi di layar + getaran tepat H-10 menit |
| Metode B | Alarm sistem `hmAlarm`: getaran + label keterangan, **tetap jalan walau aplikasi ditutup** |
| Gulung otomatis | Alarm hari ini + besok dipasang ulang setiap app dibuka / ganti hari |
| Halaman detail | Jadwal 3 hari ke depan untuk mengecek kelengkapan data |
| Hemat baterai | Hanya elemen teks/div, polling 30 detik berhenti saat layar tidak aktif, tanpa pustaka luar |

---

## 📁 Struktur Proyek

```
config.json                    Konfigurasi paket LiteWearable (bundleName, ikon, device: watch)
src/
  app.js                       Daftar halaman (index, detail)
  common/
    jadwal-sholat.js           ★★★ DATA JADWAL + fungsi waktu/status (INI YANG ANDA ISI) ★★★
    device-api.js              Pembungkus API resmi: vibrator, hmAlarm, notification
    pengingat.js               Mesin pengingat Metode A + penyusun kejadian alarm Metode B
    logo.png                   Ikon aplikasi
  i18n/                        Berkas manifest nama aplikasi
  pages/
    index/index.hml|.css|.js   Layar utama
    detail/detail.hml|.css|.js Jadwal 3 hari
test/logika.test.js            Uji logika offline (node test/logika.test.js)
```

---

## 🚀 Cara Penggunaan (3 langkah)

### 1. Isi data jadwal
Buka **`src/common/jadwal-sholat.js`**, cari blok bertanda:

```js
// ██  ⬇⬇⬇  MULAI DATA JADWAL — GANTI / TAMBAHKAN BARIS DI DALAM ARRAY  ⬇⬇⬇  ██
var JADWAL_SHOLAT = [ ... ];
```

Format tiap baris (sudah tersedia 3 hari sampel agar bisa langsung diuji):

```js
{ tanggal: 'YYYY-MM-DD', subuh: 'JJ:MM', zuhur: 'JJ:MM', ashar: 'JJ:MM', maghrib: 'JJ:MM', isya: 'JJ:MM' },
```

Isi **minimal 30 hari ke depan**. Tidak ada pengaturan lain, tidak butuh
koneksi HP/internet — begitu file ini diisi, seluruh aplikasi langsung berfungsi.

> Saat pindah bulan / ganti jadwal: **cukup ganti blok data ini saja**, lalu
> build & install ulang. Alarm Metode B otomatis terpasang ulang ketika
> aplikasi pertama dibuka setelah update.

### 2. Build dengan DevEco Studio (SDK LiteWearable)
1. Install **DevEco Studio** + HarmonyOS **Lite Wearable JS SDK**.
2. *File → Open* → pilih folder proyek ini.
3. Samakan `bundleName` di `config.json` dengan sertifikat developer Anda.
4. *Build → Build HAP(s)* → hasil: `*.hap`.

Alternatif CLI (toolchain resmi):
```bash
ajgen publish -t release     # menghasilkan jadwalsholat-release-unsigned.hap
```

### 3. Install ke GT 7 Pro
- **Sideload (dev):** hubungkan jam ke PC via WiFi debugging / `hdc`:
  ```bash
  hdc install jadwalsholat.hap
  ```
- **Ritel:** unggah `.hap` ke **AppGallery Connect**, daftarkan sebagai aplikasi
  wearable, lalu pasang dari Huawei Health / Galeri Aplikasi di jam.

---

## ⏰ Dua Metode Pengingat (H-10 menit)

**Metode A — aplikasi terbuka** (`src/common/pengingat.js`)
- Timer `setInterval` 30 detik; saat sisa waktu ≤ 10 menit untuk sholat
  berikutnya: notifikasi layar (`@system.notification`) + getaran
  (`@system.vibrator`) + banner oranye di halaman.
- Pesan: `⏰ [Nama Sholat] 10 menit lagi! Waktu masuk: JJ:MM`
- Tiap kejadian hanya dipicu sekali (anti-dua-kali-getar).

**Metode B — alarm sistem, app boleh ditutup** (`src/common/device-api.js`)
- Untuk tiap sholat dihitung `waktu masuk − 10 menit`, didaftarkan ke
  **`hmAlarm.setAlarm()`** dengan `vibration: true` + `label` keterangan
  (mis. `Ashar 10 menit lagi (masuk 15:10)`).
- Maksimal 10 alarm aktif (sisa hari ini + seluruh besok) → hemat resource.
- **Otomatis terpasang ulang**: setiap aplikasi dibuka (`onShow`) dan setiap
  terjadi ganti hari. Fungsi `pasangUlangAlarmSistem()` di `pages/index/index.js`
  adalah titik yang dipanggil bila jadwal diperbarui.

---

## 🔋 Catatan Penting & Batasan Perangkat

1. **Tidak ada internet.** Semua data berasal dari `jadwal-sholat.js`.
2. **Tidak ada proses latar belakang.** Metode A hanya hidup saat aplikasi
   terbuka — karena itu Metode B (hmAlarm) disediakan sebagai pelengkap.
3. **Alarm bersifat one-shot.** Jam akan memasang ulang alarm besok saat
   aplikasi dibuka keesokan harinya. Buka aplikasi minimal 1× sehari
   (misal saat cek jadwal) agar rantai alarm tidak putus.
4. **Waktu & tanggal mengikuti sistem jam.** Pastikan zona waktu jam benar
   (sinkron lewat Huawei Health) — aplikasi memakai `new Date()` lokal.
5. API `hmAlarm`/`vibrator` dibungkus `try/catch`; bila firmware tertentu
   memakai tanda tangan (signature) API yang berbeda, aplikasi tetap menampilkan jadwal tanpa crash.
   Sesuaikan nama modul bila dokumentasi SDK Anda berubah.
6. Uji logika tanpa perangkat: `node test/logika.test.js`.

---

## 🧪 Kustomisasi Cepat

| Ingin ubah | Lokasi |
|---|---|
| Menit sebelum pengingat (default 10) | `OFFSET_MENIT` di `src/common/pengingat.js` |
| Interval cek Metode A (default 30 dtk) | `INTERVAL_CEK_MS` di `src/common/pengingat.js` |
| Durasi tampil banner (default 5 mnt) | `tampilkanBanner()` di `src/pages/index/index.js` |
| Jumlah hari tampilan detail (default 3) | loop `onInit()` di `src/pages/detail/detail.js` |
| Warna/ukuran font | berkas `.css` masing-masing halaman |

Dibuat tanpa pustaka luar — murni JavaScript LiteWearable. Selamat menggunakan. 🕌
