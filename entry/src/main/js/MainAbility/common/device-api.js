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

// Jalur 2 (cadangan): pembungkus statis modul '@ohos.hmAlarm'. Bila build
// DevEco SDK Anda menolak modul tersebut, komentar SATU baris import ini —
// jalur 1 (global `hmAlarm`) tetap dicoba lebih dulu dan Metode A utuh.
import { HmAlarm } from './hm-alarm.js';

// Satu variabel pemuat alarm; dideteksi lewat dua jalur aman di bawah.
var hmAlarm = null;

// ============================================================================
// PEMUATAN MODUL ALARM (hmAlarm) — dua jalur, aman untuk semua SDK:
//
//  JALUR 1 (utama, standar OpenHarmony liteWearable): modul global `hmAlarm`
//    yang sudah terdaftar oleh runtime pada objek `global`. Inilah cara resmi
//    contoh SDK: hmAlarm.setAlarm({ hour, minute, vibration, label }).
//  JALUR 2 (cadangan): import statis dari common/hm-alarm.js untuk SDK yang
//    mengekspor hmAlarm sebagai paket '@ohos.hmAlarm' (konstruktor/objek).
//
//  DILARANG memakai fungsi global require() — runtime liteWearable tidak
//  mendukungnya; ReferenceError yang lolos membuat seluruh halaman gagal
//  render (layar blank hitam). Kedua jalur di bawah dilindungi try/catch,
//  sehingga kegagalan salah satunya TIDAK pernah menghentikan JS halaman.
// ============================================================================
try {
  var _g = (typeof global !== 'undefined') ? global
         : ((typeof window !== 'undefined') ? window : {});
  if (_g.hmAlarm && typeof _g.hmAlarm.setAlarm === 'function') {
    hmAlarm = _g.hmAlarm; // jalur 1 berhasil
  }
} catch (e) { /* lanjut ke jalur 2 */ }

if (!hmAlarm) {
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
 * Parameter mengikuti format RESMI contoh SDK liteWearable:
 *   hmAlarm.setAlarm({ hour, minute, vibration, label })
 * Field tambahan (time/delay) ikut dikirim untuk SDK varian lain; field
 * yang tidak dikenal akan diabaikan runtime.
 *
 * Catatan penting LiteWearable:
 *  - Kapasitas alarm sistem terbatas (umumnya ±10 alarm aktif).
 *  - Sebagian SDK hanya mendukung alarm one-shot dalam hitungan detik/menit,
 *    bukan "alarm harian". Karena itu kita pasang ulang tiap kali aplikasi
 *    dibuka DAN saat pergantian hari (lihat pasangDeretAlarm + pengingat.js),
 *    sehingga tetap "otomatis terpasang untuk tiap hari".
 *
 * @param {number} detikDariSekarang - delay dalam DETIK (>= 1)
 * @param {string} label             - keterangan yang tampil saat alarm bunyi
 * @param {boolean} getarkan         - aktifkan getaran saat alarm
 * @returns {boolean} sukses dipasang
 */
export function pasangAlarm(detikDariSekarang, label, getarkan) {
  if (!hmAlarm) return false;
  try {
    var wktuTrigger = Date.now() + Math.max(1, detikDariSekarang) * 1000;
    var d = new Date(wktuTrigger);
    hmAlarm.setAlarm({
      hour: d.getHours(),                 // jam trigger (waktu lokal)
      minute: d.getMinutes(),             // menit trigger
      time: wktuTrigger,                  // beberapa SDK memakai epoch-ms
      delay: Math.max(1, detikDariSekarang), // ...beberapa memakai delay-detik
      label: label,                       // teks keterangan saat alarm berbunyi
      vibration: !!getarkan,              // getaran saat alarm (Metode B)
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
    var delayDetik = ev.triggerMenit * 60;
    var label = '⏰ ' + ev.nama + ' ' + ev.masuk + ' (' + ev.tanggalKey + ')';
    if (pasangAlarm(delayDetik, label, true)) count++;
  }
  setJumlahAlarmTerpasang(count);
  console.info('[device-api] pasangDeretAlarm: ' + count + ' alarm terpasang');
  return count;
}
