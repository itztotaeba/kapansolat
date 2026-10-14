/**
 * ============================================================================
 * jadwal-sholat.js  —  SUMBER DATA JADWAL SHOLAT (100% OFFLINE)
 * ============================================================================
 *
 * ⚠️⚠️⚠️ INI SATU-SATUNYA BAGIAN YANG PERLU ANDA ISI ⚠️⚠️⚠️
 *
 * Cara pakai:
 *   1. Ambil jadwal sholat bulanan dari sumber manapun (cetak/PDF/website di HP).
 *   2. Salin ke array JADWAL_SHOLAT di bawah dengan format yang sama.
 *   3. Simpan, build ulang di DevEco Studio, install ke jam. Selesai.
 *
 * Format tiap baris WAJIB:
 *   { tanggal: 'YYYY-MM-DD', subuh: 'JJ:MM', zuhur: 'JJ:MM',
 *     ashar: 'JJ:MM', maghrib: 'JJ:MM', isya: 'JJ:MM' }
 * - 'JJ:MM' memakai format 24 jam, dua digit (contoh '04:37', '17:52').
 * - Sediakan minimal 30 hari ke depan agar pengingat tidak bolong.
 * - Saat ganti bulan, cukup GANTI SELURUH BLOK DATA di antara tanda ⬇ dan ⬆.
 *
 * Tidak ada koneksi internet / sinkronisasi HP — semua data dibaca lokal.
 * ============================================================================
 */

/* ================= NAMA WAKTU SHOLAT (jangan diubah) ===================== */
export const DAFTAR_WAKTU = ['subuh', 'zuhur', 'ashar', 'maghrib', 'isya'];

export const NAMA_TAMPIL = {
  subuh: 'Subuh',
  zuhur: 'Zuhur',
  ashar: 'Ashar',
  maghrib: 'Maghrib',
  isya: 'Isya'
};

/* =========================================================================
 * ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇
 * BLOK DATA JADWAL — GANTI / TAMBAH BARIS DI SINI
 *
 * Sampel 3 hari (Oktober 2026, waktu sekitar Jakarta) agar aplikasi bisa
 * langsung diuji. CATATAN: setelah hari-hari ini lewat, aplikasi akan
 * menampilkan "Jadwal belum tersedia" sampai Anda mengisi data berikutnya.
 * Isi minimal 30 hari ke depan untuk pemakaian nyata.
 * ⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆
 * ========================================================================= */
export const JADWAL_SHOLAT = [
  { tanggal: '2026-10-14', subuh: '04:31', zuhur: '11:46', ashar: '15:09', maghrib: '17:51', isya: '19:00' },
  { tanggal: '2026-10-15', subuh: '04:31', zuhur: '11:46', ashar: '15:08', maghrib: '17:51', isya: '19:00' },
  { tanggal: '2026-10-16', subuh: '04:30', zuhur: '11:46', ashar: '15:08', maghrib: '17:51', isya: '18:59' }
];
/* ⬆⬆⬆⬆⬆ AKHIR BLOK DATA JADWAL — JANGAN MENGEDIT DI ATAS GARIS INI ⬆⬆⬆⬆⬆ */

/* ==================== KONSTANTA PENGINGAT (boleh diubah) ================== */
// Berapa menit SEBELUM waktu sholat pengingat berbunyi.
export const MENIT_SEBELUM = 10;
