/**
 * ============================================================================
 * device-api.js — Pembungkus API RESMI LiteWearable (HarmonyOS JS / JS-FA)
 * ============================================================================
 * Modul yang dipakai:
 *   - @system.vibrator    → getaran (API resmi, tersedia di liteWearable)
 *   - hmAlarm             → alarm sistem: tetap berbunyi walau app ditutup.
 *                           Dimuat lewat import statis dari common/hm-alarm.js
 *                           (LIHAT CATATAN DI BAWAH — jangan pernah memakai
 *                           fungsi global require() di runtime liteWearable).
 *   - @system.notification→ notifikasi teks di layar (Metode A)
 *
 * SEMUA pemanggilan dibungkus try/catch agar aplikasi tidak pernah crash
 * bila suatu API tidak tersedia di firmware jam. Hemat daya: tidak ada
 * polling di file ini.
 * ============================================================================
 */

import vibrator from '@system.vibrator';
import notification from '@system.notification';

// ============================================================================
// PEMUATAN MODUL ALARM — SANGAT PENTING (penyebab lama "layar blank"):
// Runtime liteWearable TIDAK mendukung fungsi global `require()`. Dulu modul
// ini memuat hmAlarm lewat try { require('@ohos.hmAlarm') } — ReferenceError
// yang muncul membuat seluruh file JS gagal dieksekusi sehingga halaman tidak
// pernah ter-render (tersisa latar hitam + garis biru bawaan sistem).
//
// Solusi: import STATIS dari pembungkus common/hm-alarm.js. Pola DevEco untuk
// modul @ohos.* adalah `import X from '@ohos.xxx'` lalu `new X()`; karena itu
// hm-alarm.js mengimpor nama default HmAlarm dan mengekspor konstruktor apa
// adanya. Bila SDK/firmware tidak menyediakan modulnya, bundler DevEco akan
// MEMINTA Anda mengomentari SATU baris import di hm-alarm.js (satu titik saja,
// lihat file tersebut) — Metode A tetap berjalan penuh.
// ============================================================================
import { HmAlarm } from './hm-alarm.js';

var hmAlarm = null;
try {
  if (typeof HmAlarm === 'function') {
    var _alarmIns = new HmAlarm();
    if (_alarmIns && typeof _alarmIns.setAlarm === 'function') hmAlarm = _alarmIns;
  } else if (HmAlarm && typeof HmAlarm.setAlarm === 'function') {
    hmAlarm = HmAlarm; // beberapa SDK mengekspor objek fungsi langsung
  }
} catch (e) {
  hmAlarm = null; // Metode B dilewati dengan aman, tanpa crash
}

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
 * Pasang SATU alarm sistem untuk `detikDariSekarang` ke depan.
 * Alarm bekerja walau aplikasi ditutup — inilah Metode B.
 *
 * Catatan penting LiteWearable:
 *  - Kapasitas alarm sistem terbatas (umumnya ±10 alarm aktif).
 *  - Sebagian SDK hanya mendukung alarm one-shot dalam hitungan detik/menit,
 *    bukan "alarm harian". Karena itu kita pasang ulang tiap kali aplikasi
 *    dibuka (lihat fungsi `pasangDeretAlarm`).
 *
 * @param {number} detikDariSekarang - delay dalam DETIK (>= 1)
 * @param {string} label             - keterangan yang tampil saat alarm bunyi
 * @param {boolean} getarkan         - aktifkan getaran saat alarm
 * @returns {boolean} sukses dipasang
 */
export function pasangAlarm(delayDetik, label, getarkan) {
  if (!hmAlarm) return false;
  try {
    var wktuTrigger = Date.now() + Math.max(1, delayDetik) * 1000;
    // Parameter dikirim lengkap; SDK akan mengabaikan field yang tak dikenal.
    hmAlarm.setAlarm({
      hour: new Date(wktuTrigger).getHours(),
      minute: new Date(wktuTrigger).getMinutes(),
      time: wktuTrigger,          // beberapa SDK memakai epoch-ms
      delay: delayDetik,          // ...beberapa memakai delay-detik
      label: label,
      vibration: !!getarkan,
      success: function () {
        console.info('[device-api] alarm terpasang: ' + label);
      },
      fail: function (err, msg) {
        console.warn('[device-api] alarm gagal (' + err + '): ' + msg);
      }
    });
    return true;
  } catch (e) {
    console.warn('[device-api] pasangAlarm exception: ' + e);
    return false;
  }
}

/** Hapus seluruh alarm milik aplikasi (dipakai sebelum pasang ulang). */
export function hapusSemuaAlarm() {
  if (!hmAlarm) return;
  try {
    if (typeof hmAlarm.clearAllAlarms === 'function') {
      hmAlarm.clearAllAlarms();
    } else if (typeof hmAlarm.cancel === 'function') {
      hmAlarm.cancel({});
    }
  } catch (e) {
    console.warn('[device-api] hapusSemuaAlarm gagal: ' + e);
  }
}

/** Apakah modul alarm tersedia di perangkat ini? */
export function alarmTersedia() {
  return !!hmAlarm;
}

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
    var delayDetik = ev.triggerMenit * 60;
    var label = '⏰ ' + ev.nama + ' ' + ev.masuk + ' (' + ev.tanggalKey + ')';
    if (pasangAlarm(delayDetik, label, true)) count++;
  }
  console.info('[device-api] pasangDeretAlarm: ' + count + ' alarm terpasang');
  return count;
}
