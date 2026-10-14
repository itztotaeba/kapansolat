/**
 * ============================================================================
 * device-api.js — Pembungkus API RESMI LiteWearable (HarmonyOS JS / JS-FA)
 * ============================================================================
 * Modul yang dipakai:
 *   - @system.vibrator    → getaran (API resmi, tersedia di liteWearable)
 *   - hmAlarm             → alarm sistem: tetap berbunyi walau app ditutup.
 *                           Dimuat lewat DUA jalur aman (lihat catatan di bawah).
 *   - @system.notification→ notifikasi teks di layar (Metode A)
 *
 * SEMUA pemanggilan dibungkus try/catch agar aplikasi tidak pernah crash
 * bila suatu API tidak tersedia di firmware jam. Hemat daya: tidak ada
 * polling di file ini.
 * ============================================================================
 */

import vibrator from '@system.vibrator';
import notification from '@system.notification';

// Catatan: modul '@ohos.hmAlarm' TIDAK di-import statis di sini. Deteksi
// hmAlarm dilakukan oleh common/alarm-detector.js lewat 4 jalur aman
// (global.hmAlarm → jembatan global hasil import di hm-alarm.js →
// this.requireNapi → @system.alarm), semuanya try/catch sehingga tidak
// pernah bisa membuat halaman gagal render (gejala lama: blank hitam).
// File common/hm-alarm.js tetap tersedia sebagai opsi jalur-2: bila SDK
// Anda menyediakan paket @ohos.hmAlarm, cukup uncomment baris import di
// hm-alarm.js — device-api akan memakainya otomatis via jembatan global.
import {
  deteksiModulAlarm,
  modulAlarmTersedia,
  jalurAlarmAktif,
  panggilSetAlarm,
  panggilHapusAlarm
} from './alarm-detector.js';

/** Beri kesempatan deteksi memakai konteks halaman (requireNapi). */
export function daftarkanKonteksAlarm(ctx) {
  try { deteksiModulAlarm(ctx); } catch (e) { /* aman */ }
}

// ============================================================================
// PEMUATAN MODUL ALARM (hmAlarm) — delegasi ke alarm-detector.js (4 jalur):
//   1) global.hmAlarm        (standar runtime liteWearable / OpenHarmony)
//   2) @ohos.hmAlarm statis  (via hm-alarm.js + jembatan global __hmAlarmMod)
//   3) this.requireNapi('hmAlarm') (helper JS-FA pada instance halaman)
//   4) @system.alarm         (API lama)
// Semua dibungkus try/catch; kegagalan satu jalur TIDAK pernah membuat
// halaman gagal render (gejala lama: layar blank hitam).
// ============================================================================
try { deteksiModulAlarm(null); } catch (e) { /* dicoba lagi berkala */ }

/* ------------------------------ GETARAN ---------------------------------- */
/**
 * Getar pendek (sekali) untuk pengingat. mode 'short' hemat baterai.
 */
export function getar() {
  try {
    vibrator.vibrate({ mode: 'short' });
  } catch (e) {
    console.warn('[device-api] getar gagal: ' + e);
  }
}

/** Getar panjang/berulang lembut untuk momen masuk waktu sholat. */
export function getarPanjang() {
  try {
    vibrator.vibrate({ mode: 'long' });
  } catch (e) {
    console.warn('[device-api] getarPanjang gagal: ' + e);
  }
}

/* ---------------------------- NOTIFIKASI ---------------------------------- */
/**
 * Tampilkan notifikasi teks di layar jam (Metode A).
 * `s` = { title, text }
 */
export function tampilkanNotifikasi(s) {
  try {
    notification.show({
      content: {
        title: s.title || 'Pengingat',
        text: s.text || '',
        additionalText: s.text || ''
      },
      level: 'primary'
    });
  } catch (e) {
    console.warn('[device-api] notifikasi gagal: ' + e);
  }
}

/* ------------------------------- ALARM ------------------------------------ */
/**
 * Pasang SATU alarm sistem H-x menit sebelum waktu sholat.
 * Alarm bekerja walau aplikasi ditutup — inilah Metode B.
 *
 * Parameter mengikuti format RESMI contoh SDK liteWearable:
 *   hmAlarm.setAlarm({ hour, minute, vibration, label })
 * Field tambahan (time/delay) ikut dikirim untuk SDK varian lain yang
 * memakai hitungan-detik; field yang tidak dikenal akan diabaikan runtime.
 *
 * BUG VERSI LAMA YANG DIPERBAIKI DI SINI:
 *  - delay dihitung dari `ev.triggerMenit` yang TIDAK ADA di objek kejadian
 *    (NaN → semua permintaan alarm ditolak firmware → "alarm tidak pernah
 *    berjalan"). Sekarang memakai selangMenit yang benar (epoch-menit).
 *  - jam trigger memakai Date lokal dari epoch — kini diambil langsung dari
 *    ev.triggerJam/triggerMenitLokal hasil perhitungan waktu.js (robust
 *    terhadap wrap tengah malam pada Subuh).
 *
 * Catatan penting LiteWearable:
 *  - Kapasitas alarm sistem terbatas (umumnya ±10 alarm aktif).
 *  - Sebagian SDK hanya mendukung alarm one-shot dalam hitungan detik/menit,
 *    bukan "alarm harian". Karena itu kita pasang ulang tiap aplikasi dibuka
 *    DAN saat pergantian hari (lihat pasangDeretAlarm + pengingat.js),
 *    sehingga tetap "otomatis terpasang untuk tiap hari".
 *
 * @param {Object} ev - satu kejadian dari waktu.js#kejadianPengingat
 * @returns {boolean} sukses dipasang
 */
export function pasangAlarmKejadian(ev) {
  // coba deteksi ulang bila belum ketemu (idempoten & murah)
  if (!modulAlarmTersedia()) { try { deteksiModulAlarm(null); } catch (e) {} }
  if (!modulAlarmTersedia()) return false;
  try {
    var selangDetik = Math.max(30, (ev.selangMenit || 0) * 60);
    var ok = panggilSetAlarm({
      hour: ev.triggerJam,                  // jam LOCAL trigger (H-10 mnt)
      minute: ev.triggerMenitLokal,         // menit LOCAL trigger
      time: Date.now() + selangDetik * 1000,  // varian SDK berbasis epoch-ms
      delay: selangDetik,                     // varian SDK berbasis detik
      label: '⏰ ' + ev.nama + ' ' + (ev.menitSebelum || 10) + ' menit lagi · masuk ' + ev.masuk,
      vibration: true,                    // getaran saat alarm (Metode B)
      success: function () {
        console.info('[device-api] alarm terpasang: ' + ev.nama + ' ' + ev.triggerJam + ':' + ev.triggerMenitLokal);
      },
      fail: function (err, msg) {
        console.warn('[device-api] alarm gagal (' + err + '): ' + msg);
      }
    });
    return ok;
  } catch (e) {
    console.warn('[device-api] pasangAlarmKejadian exception: ' + e);
    return false;
  }
}

/**
 * Pasang SATU alarm sistem untuk `detikDariSekarang` ke depan (API umum,
 * dipakai juga oleh skenario kustom). Lihat catatan pada pasangAlarmKejadian.
 */
export function pasangAlarm(detikDariSekarang, label, getarkan) {
  if (!modulAlarmTersedia()) { try { deteksiModulAlarm(null); } catch (e) {} }
  if (!modulAlarmTersedia()) return false;
  try {
    var detik = Math.max(1, detikDariSekarang || 0);
    var wktuTrigger = Date.now() + detik * 1000;
    var d = new Date(wktuTrigger);
    var ok = panggilSetAlarm({
      hour: d.getHours(),                 // jam trigger (waktu lokal)
      minute: d.getMinutes(),             // menit trigger
      time: wktuTrigger,                  // beberapa SDK memakai epoch-ms
      delay: detik,                       // ...beberapa memakai delay-detik
      label: label,                       // teks keterangan saat alarm berbunyi
      vibration: !!getarkan,              // getaran saat alarm (Metode B)
      success: function () {
        console.info('[device-api] alarm terpasang: ' + label);
      },
      fail: function (err, msg) {
        console.warn('[device-api] alarm gagal (' + err + '): ' + msg);
      }
    });
    return ok;
  } catch (e) {
    console.warn('[device-api] pasangAlarm exception: ' + e);
    return false;
  }
}

/** Hapus seluruh alarm milik aplikasi (dipakai sebelum pasang ulang). */
export function hapusSemuaAlarm() {
  try { panggilHapusAlarm(); } catch (e) {
    console.warn('[device-api] hapusSemuaAlarm gagal: ' + e);
  }
}

/** Apakah modul alarm tersedia di perangkat ini? */
export function alarmTersedia() {
  try { return modulAlarmTersedia(); } catch (e) { return false; }
}

/** Nama jalur hmAlarm yang aktif — untuk kartu status Metode B. */
export function jalurAlarmLabel() {
  try { return jalurAlarmAktif(); } catch (e) { return '(belum terdeteksi)'; }
}

/** Jumlah alarm yang berhasil dipasang pada pemanggilan terakhir. */
var _terakhirDipasang = 0;
export function setJumlahAlarmTerpasang(n) { _terakhirDipasang = n; }
export function jumlahAlarmTerpasang() { return _terakhirDipasang; }

/**
 * METODOLOGI PEMASANGAN ULANG OTOMATIS:
 * Daftar `kejadian` (dari waktu.js.kejadianPengingat) diubah menjadi alarm
 * sistem. Dipanggil setiap aplikasi dibuka DAN setiap pergantian hari,
 * sehingga "otomatis terpasang untuk tiap hari" tanpa interaksi pengguna.
 *
 * Batas aman: maksimal 10 alarm (kapasitas tipikal liteWearable).
 *
 * @param {Array} kejadian - hasil kejadianPengingat(now, MENIT_SEBELUM)
 * @returns {number} jumlah alarm yang berhasil dipasang
 */
export function pasangDeretAlarm(kejadian) {
  hapusSemuaAlarm();
  var MAX_ALARM = 10;
  var count = 0;
  for (var i = 0; i < kejadian.length && count < MAX_ALARM; i++) {
    var ev = kejadian[i];
    if (!ev || ev.triggerJam === undefined || ev.triggerMenitLokal === undefined) continue;
    // BUG LAMA: memakai ev.triggerMenit (undefined → NaN → firmware menolak
    // semua alarm). Kini lewat pasangAlarmKejadian yang memakai selangMenit.
    if (pasangAlarmKejadian(ev)) count++;
  }
  setJumlahAlarmTerpasang(count);
  console.info('[device-api] pasangDeretAlarm: ' + count + '/' + kejadian.length + ' alarm terpasang');
  return count;
}
