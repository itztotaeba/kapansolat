/**
 * ============================================================================
 * hm-alarm.js — Pembungkus SATU TITIK pemuatan modul alarm sistem hmAlarm
 * ============================================================================
 * File ini dicoba DIMUAT PALING AWAL oleh device-api.js (sebelum alarm.js),
 * sehingga bila firmware menyediakan modul '@ohos.hmAlarm', objeknya sudah
 * terdaftar ke mesin pemanggil (common/alarm-resmi.js) SEBELUM pemasangan
 * alarm pertama dilakukan.
 *
 * BILA BUILD DEV ECO MENOLAK modul '@ohos.hmAlarm' (SDK tanpa paket itu):
 * komentar SATU baris import di bawah lalu build ulang — jalur global
 * (globalThis.hmAlarm) dan requireNapi di common/alarm.js tetap dicoba
 * otomatis, aplikasi tidak crash.
 * ============================================================================
 */

import HmAlarmDefault from '@ohos.hmAlarm'; // AKTIF (JALUR 3) — komentar baris ini bila build DevEco menolak modul
import { daftarkanModulStatis } from './alarm-resmi.js';

// Beberapa SDK mengekspor konstruktor (dipakai `new`), sebagian lain langsung
// mengekspor objek berisi setAlarm/cancel. Keduanya dicoba didaftarkan.
try {
  var mod = HmAlarmDefault || null;
  if (!mod && typeof HmAlarmDefault === 'function') {
    try { mod = new HmAlarmDefault(); } catch (eBuat) { mod = null; }
  }
  if (mod) {
    daftarkanModulStatis(mod);
    // JEMBATAN GLOBAL: alarm.js (JALUR 3 deteksi) juga membaca nilai ini.
    var _g = (typeof globalThis !== 'undefined') ? globalThis
           : ((typeof global !== 'undefined') ? global : null);
    if (_g) _g.__hmAlarmMod = mod;
  }
} catch (e) {
  console.warn('[hm-alarm] registrasi statis dicegat: ' + e);
}

export var HmAlarm = (typeof HmAlarmDefault !== 'undefined') ? HmAlarmDefault : null;
