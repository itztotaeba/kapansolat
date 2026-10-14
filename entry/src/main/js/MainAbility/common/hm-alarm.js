/**
 * ============================================================================
 * hm-alarm.js — Pembungkus SATU TITIK pemuatan modul alarm sistem hmAlarm
 * ============================================================================
 * STATUS DEFAULT: baris import '@ohos.hmAlarm' di bawah TERKOMENTARI agar
 * build DevEco Studio tidak pernah gagal pada SDK yang tidak menyertakan
 * modul tersebut. Deteksi utama hmAlarm terjadi lewat jalur lain di
 * common/alarm-detector.js:
 *   JALUR 1: modul GLOBAL `hmAlarm` bawaan runtime liteWearable (paling umum
 *            tersedia di GT 7 Pro — tidak perlu import apa pun);
 *   JALUR 3: this.requireNapi('hmAlarm') pada instance halaman;
 *   JALUR 4: @system.alarm (API lama).
 *
 * KAPAN MENGUNCOMMENT? Bila log jam menunjukkan "(belum terdeteksi)" padahal
 * SDK project Anda menyediakan paket @ohos.hmAlarm, uncomment SATU baris
 * import di bawah dan build ulang — device-api akan memakainya otomatis
 * melalui jembatan global `__hmAlarmMod`.
 * ============================================================================
 */

// import HmAlarmDefault from '@ohos.hmAlarm'; // ← uncomment bila SDK menyediakan modul ini

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
