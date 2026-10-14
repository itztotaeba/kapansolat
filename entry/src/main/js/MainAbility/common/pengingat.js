/**
 * ============================================================================
 * pengingat.js — MESIN PENGINGAT H-10 MENIT
 * ============================================================================
 * Memenuhi dua metode sekaligus sesuai spesifikasi:
 *
 * METODOLOGI A (aplikasi terbuka):
 *   - setInterval 30 detik (ringan, hemat baterai).
 *   - Saat tersisa <= MENIT_SEBELUM (10) menit menuju suatu waktu sholat:
 *       * notifikasi layar : "⏰ [Nama] 10 menit lagi! Waktu masuk: JJ:MM"
 *       * getar            : vibrator.vibrate short
 *   - Tiap kejadian hanya dipicu SEKALI (dicatat di `sudahPicu`).
 *   - Timer otomatis dihentikan saat halaman tidak tampil (onHide/destroy)
 *     agar tidak membebani kinerja jam.
 *
 * METODOLOGI B (alarm sistem, tetap jalan walau aplikasi ditutup):
 *   - Hitung mundur 10 menit dari tiap waktu sholat (hari ini + besok).
 *   - Didaftarkan ke hmAlarm lewat device-api.pasangDeretAlarm().
 *   - Otomatis DIPASANG ULANG setiap aplikasi dibuka / ganti hari,
 *     sehingga cukup buka aplikasi sekali sehari (mis. saat Subuh) untuk
 *     memastikan alarm hari berikutnya terpasang.
 * ============================================================================
 */

import { MENIT_SEBELUM } from './jadwal-sholat.js';
import { tanggalKey, kejadianPengingat, formatSelang } from './waktu.js';
import {
  getar, tampilkanNotifikasi, pasangDeretAlarm,
  alarmTersedia, jumlahAlarmTerpasang, jalurAlarmLabel
} from './device-api.js';

var INTERVAL_MS = 30 * 1000; // cek tiap 30 detik — cukup & hemat daya

var _timer = null;          // id setInterval aktif
var _sudahPicu = {};        // {'YYYY-MM-DD-namaWaktu': true} anti pemicuan ganda
var _keyHariTerakhir = '';  // deteksi pergantian hari utk pasang ulang alarm B
var _alarmTerpasangHariIni = ''; // kunci hari saat alarm B sukses terpasang

/**
 * PROTEKSI TOTAL: seluruh isi siklus pengecekan dibungkus try/catch.
 * Di runtime liteWearable, satu exception yang lolos dari callback timer
 * dapat menghentikan proses JS halaman (gejala: layar blank). Dengan
 * pembungkusan ini, kegagalan sekecil apa pun hanya tercatat di log dan
 * aplikasi tetap berjalan.
 */
function aman(fn) {
  return function () {
    try {
      fn();
    } catch (e) {
      console.warn('[pengingat] siklus dicegat try/catch: ' + e);
    }
  };
}

/**
 * Satu siklus pengecekan (dipanggil tiap 30 detik oleh timer).
 * Ringan: hanya beberapa perbandingan integer per iterasi.
 */
function satuKaliCek() {
  var now = new Date();
  var key = tanggalKey(now);

  // --- PERGANTIAN HARI: bersihkan catatan & pasang ulang alarm Metode B ---
  if (_keyHariTerakhir && _keyHariTerakhir !== key) {
    _sudahPicu = {};
    pasangUlangAlarmSistem();
  }
  _keyHariTerakhir = key;

  // --- PEMASANGAN ULANG OTOMATIS: bila pada pengecekan sebelumnya modul
  // hmAlarm belum terdeteksi (mis. baru didaftarkan runtime belakangan),
  // coba lagi sekarang tanpa menunggu aplikasi dibuka ulang. Sekali alarm
  // terpasang hari ini, tidak ada pekerjaan tambahan (hemat baterai). ---
  if (!_alarmTerpasangHariIni || _alarmTerpasangHariIni !== key) {
    var n = pasangUlangAlarmSistem();
    if (n > 0) _alarmTerpasangHariIni = key;
  }

  // --- METODE A: cari kejadian yang jatuh dalam jendela 10 menit ---
  var kejadian = kejadianPengingat(now, MENIT_SEBELUM);
  for (var i = 0; i < kejadian.length; i++) {
    var ev = kejadian[i];
    var id = ev.id;
    if (_sudahPicu[id]) continue;          // sudah pernah dipicu hari ini
    if (ev.triggerMenit <= MENIT_SEBELUM) {
      // TEPAT 10 MENIT (atau kurang) SEBELUM WAKTU MASUK → PICU SEKALI
      _sudahPicu[id] = true;
      var pesan = '⏰ ' + ev.nama + ' ' + MENIT_SEBELUM + ' menit lagi! Waktu masuk: ' + ev.masuk;
      tampilkanNotifikasi({ title: 'Jadwal Sholat', text: pesan });
      getar();
      console.info('[pengingat] METODA A picu: ' + pesan);
    }
  }
}

/** Mulai timer Metode A. Aman dipanggil berkali-kali. */
export function mulaiPemantauan() {
  if (_timer !== null) return;
  aman(satuKaliCek)(); // sinkronkan status segera saat aplikasi dibuka
  _timer = setInterval(aman(satuKaliCek), INTERVAL_MS);
  console.info('[pengingat] Metode A aktif (interval ' + INTERVAL_MS / 1000 + 's)');
}

/** Hentikan timer Metode A. WAJIB dipanggil saat halaman onHide/onDestroy. */
export function hentikanPemantauan() {
  if (_timer !== null) {
    clearInterval(_timer);
    _timer = null;
    console.info('[pengingat] Metode A berhenti (hemat baterai)');
  }
}

/**
 * METODE B — Pasang ulang seluruh alarm sistem untuk sisa hari ini + besok.
 * Panggil fungsi ini SETIAP KALI JADWAL DIPERBARUI (build/install baru),
 * dan otomatis juga dipanggil saat aplikasi dibuka / ganti hari.
 * Mengembalikan jumlah alarm yang terpasang (0 bila hmAlarm tak tersedia).
 */
export function pasangUlangAlarmSistem() {
  var kejadian = kejadianPengingat(new Date(), MENIT_SEBELUM);
  var n = pasangDeretAlarm(kejadian);
  console.info('[pengingat] Metode B: ' + n + ' alarm sistem terpasang');
  return n;
}

/** Inisialisasi lengkap saat halaman muncul: Metode A + Metode B. */
export function aktifkanSemuaMetode() {
  mulaiPemantauan();
  pasangUlangAlarmSistem();
}

/**
 * Status Metode B untuk ditampilkan di kartu layar utama.
 * { tersedia: boolean (modul hmAlarm ada?), dipasang: number (alarm aktif) }
 */
export function statusAlarmSistem() {
  return { tersedia: alarmTersedia(), dipasang: jumlahAlarmTerpasang() };
}

/**
 * TEKS KARTU STATUS PENGINGAT (satu string utuh, aman untuk binding lite).
 * Tidak pernah menampilkan pesan "tak tersedia" yang menakutkan — bila modul
 * hmAlarm belum terdeteksi, sistem terus mencoba otomatis tiap siklus 30 dtk.
 */
export function teksStatusPengingat() {
  try {
    var n = jumlahAlarmTerpasang();
    if (alarmTersedia() && n > 0) {
      return '⚙ Alarm sistem aktif: ' + n + '× H-' + MENIT_SEBELUM + ' mnt (' + jalurAlarmLabel() + ')';
    }
    if (alarmTersedia()) {
      return '⚙ Alarm sistem siap · pasang ulang ' + MENIT_SEBELUM + ' mnt otomatis';
    }
    // Bukan pesan error: metode A tetap jalan penuh dan pencarian modul
    // alarm (hmAlarm, 4 jalur) dicoba ulang otomatis tiap siklus 30 detik.
    return '⚙ Pengingat H-' + MENIT_SEBELUM + ' mnt aktif · alarm sistem sedang disiapkan otomatis';
  } catch (e) {
    return '⚙ Pengingat berjalan';
  }
}

/** Util: teks "x menit/y jam lagi" utk debug/log. */
export function ringkasSelang(menit) {
  return formatSelang(menit);
}
