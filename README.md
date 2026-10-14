# ⏰ KapanSholat — Jadwal Sholat & Pengingat untuk Huawei Watch GT 7 Pro

Aplikasi **LiteWearable (HarmonyOS JS)** yang berjalan **100% offline** di
Huawei Watch GT 7 Pro. Menampilkan jadwal sholat hari ini, hitung mundur ke
waktu berikutnya, dan mengingatkan **10 menit sebelum sholat** dengan dua metode.

## ✨ Fitur
| Fitur | Keterangan |
|---|---|
| Jadwal harian | Subuh, Zuhur, Ashar, Maghrib, Isya + tanggal Indonesia di header |
| Penanda status | ✓ sudah lewat (redup) · ▶ berlangsung/masuk waktu (hijau) · ➜ berikutnya |
| Hitung mundur | "Menuju Ashar — 15:09 — ⏳ 1 jam 15 menit lagi" |
| Pengingat Metode A | Aplikasi terbuka → cek tiap 30 detik → notifikasi layar + getar: `⏰ [Nama] 10 menit lagi! Waktu masuk: JJ:MM` |
| Pengingat Metode B | Alarm sistem `hmAlarm` (getar + label) → tetap berbunyi walau aplikasi ditutup; otomatis dipasang ulang saat app dibuka/ganti hari |
| Tampilan kartu "liquid glass" | Panel kaca gaya iOS 26 pada kartu utama DAN SETIAP BARIS waktu sholat: border-radius besar, rim cahaya tipis, highlight lengkung — murni lapisan div + opacity, TANPA animasi |
| Hemat baterai | Tanpa animasi, tanpa gambar besar, timer berhenti saat halaman tidak tampil, murni JS tanpa library |

## 🔔 Bagaimana pengingat H-10 menit bekerja?
**Otomatis — Anda tidak perlu menekan tombol apa pun.** Begitu aplikasi dibuka
(`onShow`), kedua metode langsung aktif:
- **Metode A**: timer 30 detik berjalan selama aplikasi terbuka. Saat tersisa
  tepat 10 menit menuju suatu waktu sholat → notifikasi layar + getar.
- **Metode B**: alarm sistem (`hmAlarm`) untuk sisa kejadian hari ini + besok
  langsung didaftarkan ulang secara otomatis (getaran + label mis.
  `⏰ Ashar 15:09 (2026-10-14)`). Alarm ini tetap berbunyi walau aplikasi ditutup.
- Pemasangan alarm dicoba OTOMATIS terus: saat app dibuka, setiap pergantian
  hari, dan setiap siklus 30 detik selama app terbuka sampai modul `hmAlarm`
  berhasil dideteksi (tidak perlu buka-tutup app bila runtime mendaftarkan
  modulnya belakangan). Sekali terpasang hari itu, tidak ada pekerjaan ulang.
- Jumlah menit sebelum sholat bisa diubah di satu tempat:
  `MENIT_SEBELUM` pada `common/jadwal-sholat.js` (default 10) — dipakai oleh
  KEDUA metode sekaligus.
- Karena alarm liteWearable bersifat one-shot dengan kapasitas ±10, biasakan
  membuka aplikasi minimal sekali sehari (mis. setelah Subuh) agar alarm hari
  berikutnya terpasang ulang.
- Status pengingat ditampilkan ringkas di kartu paling bawah layar utama,
  contoh: `⚙ Alarm sistem aktif: 8× H-10 mnt (global.hmAlarm)`. Pesan lama
  "modul alarm tak tersedia" DIHAPUS — hmAlarm dicari otomatis lewat 4 jalur
  dan tidak pernah menampilkan pesan kegagalan. Diagnostik lengkap di log:
  `hdc shell hilog | grep alarm`

## 📁 Struktur Proyek (mengikuti template default DevEco Studio)
```
entry/src/main/js/MainAbility/
├── app.js                       # lifecycle aplikasi (bawaan)
├── common/
│   ├── jadwal-sholat.js         # ★★ ISI DATA JADWAL DI SINI ★★
│   ├── waktu.js                 # konversi waktu, selang menit, status harian
│   ├── device-api.js            # pembungkus @system.vibrator, hmAlarm, notification
│   ├── alarm-detector.js        # deteksi hmAlarm 4 jalur + pasang/hapus/self-test
│   ├── hm-alarm.js              # (opsional) import statis @ohos.hmAlarm — komentar
│   │                            #   default; uncomment bila SDK menyediakan modulnya
│   └── pengingat.js             # Mesin Metode A (interval 30 dtk) + Metode B (alarm)
└── pages/index/
    ├── index.hml                # layout layar utama
    ├── index.css                # tema gelap OLED + kartu glass
    └── index.js                 # logika tampilan + siklus hidup halaman
```

## 🚀 Cara Penggunaan (3 langkah)
1. **Isi jadwal** — buka `entry/src/main/js/MainAbility/common/jadwal-sholat.js`,
   ganti blok di antara tanda `⬇⬇⬇` dan `⬆⬆⬆` dengan jadwal asli Anda
   (minimal 30 hari ke depan), format:
   ```js
   { tanggal: '2026-11-01', subuh: '04:28', zuhur: '11:45', ashar: '15:05', maghrib: '17:52', isya: '19:01' }
   ```
2. **Build** — buka proyek ini di **DevEco Studio** (project ini adalah hasil
   generate template *Lite Wearable → JS* bawaan DevEco, jadi tinggal Build
   → `Build HAP(s)`).
3. **Install ke jam** via HDC:
   ```bash
   hdc send hap entry/build/default/outputs/default/entry-default-signed.hap
   hdc install entry-default-signed.hap
   ```
Selesai — tidak ada pengaturan lain, tidak butuh koneksi HP/internet.
Saat pindah bulan cukup ganti blok data lalu build-install ulang
(alarm Metode B otomatis terpasang ulang setiap aplikasi dibuka).

## ⚠️ Catatan Penting
- **Jam sistem** adalah satu-satunya sumber waktu. Pastikan tanggal & jam
  watch benar (disinkron via Huawei Health saat pairing).
- **Metode B (hmAlarm)**: kapasitas alarm sistem terbatas (±10 aktif), dan
  sebagian SDK hanya mendukung alarm one-shot (detik dari sekarang, bukan
  harian). Karena itu aplikasi memasang alarm **sisa hari ini + besok** dan
  **memasang ulang otomatis** setiap kali aplikasi dibuka atau berganti hari
  → biasakan membuka aplikasi minimal sekali sehari (mis. setelah Subuh).
- Jika firmware GT 7 Pro Anda tidak menyediakan modul `hmAlarm`, Metode B
  dilewati secara aman (try/catch) dan **Metode A tetap berfungsi**. Nama
  modul/parameter alarm bisa sedikit berbeda antar versi SDK — sesuaikan di
  satu tempat saja: `common/device-api.js`.
- Aplikasi **tidak berjalan di latar belakang**: saat ditutup, hanya alarm
  sistem (Metode B) yang tersisa. Ini batasan platform LiteWearable.
- Setelah tanggal sampel habis, layar menampilkan *"Jadwal belum tersedia"*
  sampai blok data diisi — ini perilaku yang diharapkan.

## 🧪 Uji Logika (tanpa perangkat)
```bash
node test/logika.test.js
```
Menguji konversi waktu, format selang, status harian, dan daftar kejadian alarm.
