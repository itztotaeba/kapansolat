/**
 * ============================================================================
 * hm-alarm.js — Pembungkus SATU TITIK pemuatan modul alarm sistem hmAlarm
 * ============================================================================
 * STATUS SEKARANG: baris import '@ohos.hmAlarm' AKTIF (sebelumnya selalu
 * dikomentari sehingga JALUR ini tidak pernah sempat dicoba oleh firmware —
 * salah satu penyebab alarm Metode B tidak pernah berbunyi). Deteksi lengkap
 * ada di common/alarm.js:
 *   JALUR 1: modul GLOBAL `hmAlarm` bawaan runtime liteWearable (paling umum
 *            tersedia di GT 7 Pro — tidak perlu import apa pun);
 *   JALUR 2: this.requireNapi('hmAlarm') pada instance halaman;
 *   JALUR 3: import statis '@ohos.hmAlarm' di file ini → jembatan global
 *            `__hmAlarmMod`.
 *
 * BILA BUILD DEV ECO MENOLAK modul '@ohos.hmAlarm' (SDK tanpa paket itu):
 * komentar SATU baris import di bawah lalu build ulang — jalur 1 & 2 tetap
 * dicoba otomatis, aplikasi tidak crash.
 * ============================================================================
 */

import HmAlarmDefault from "@ohos.hmAlarm"; // AKTIF (JALUR 3) — komentar baris ini bila build DevEco menolak modul

// Beberapa SDK mengekspor konstruktor (dipakai `new`), sebagian lain langsung
// mengekspor objek berisi setAlarm/cancel. Keduanya diteruskan apa adanya.
export var HmAlarm = (typeof HmAlarmDefault !== 'undefined') ? HmAlarmDefault : null;

/* ----------------------------------------------------------------------------
 * JEMBATAN GLOBAL: daftarkan modul hasil import ke objek global runtime.
 * alarm-detector.js (JALUR 2) membaca nilai ini lewat globalThis.__hmAlarmMod.
 * Dilindungi try/catch — kegagalan registrasi tidak pernah menghentikan JS.
 * -------------------------------------------------------------------------- */
try {
  var _g = (typeof globalThis !== 'undefined') ? globalThis
         : ((typeof global !== 'undefined') ? global : null);
  if (_g && HmAlarm) _g.__hmAlarmMod = HmAlarm;
} catch (e) { /* lanjut: jalur lain tetap dicoba */ }
