/**
 * ============================================================================
 * alarm-legacy.js — Pemanggilan modul ALARM SISTEM varian lama `@system.alarm`
 * ============================================================================
 * (Varian API @system.* pada sebagian firmware liteWearable / JS-FA lama.)
 *
 * Bentuk panggilan tipikal:
 *   alarm.setAlarm({
 *     when: <milidetik dari sekarang>,   // penundaan absolut → TIDAK punya
 *                                        // masalah "jam sudah lewat hari ini"
 *     label: 'teks',
 *     vibration: true,
 *     success/fail callbacks
 *   });
 *   alarm.cancelAll ? cancelAll() : (cancel ? cancel(id) : noop)
 *
 * Dipakai SEBAGAI CADANGAN bila '@ohos.hmAlarm' tidak ada di firmware, dan
 * sebagai pembanding diagnostik. Semua try/catch — tak pernah bisa membuat
 * halaman blank.
 * ============================================================================
 */

var _modul = null;

/** Daftarkan objek modul @system.alarm hasil deteksi global/requireNapi. */
export function daftarkanModulLegacy(m) {
  if (m && (typeof m.setAlarm === 'function' || typeof m.addAlarm === 'function')) {
    _modul = m;
    console.info('[alarm-legacy] modul @system.alarm terdaftar');
    return true;
  }
  return false;
}

export function tersedia() { return !!_modul; }

/**
 * Pasang SATU alarm dengan PENUNDAAN milidetik (when).
 * `res` = { delayMs, label, vibration }
 * @returns {boolean} true bila panggilan diterima modul.
 */
export function setAlarmTunda(res) {
  if (!_modul) return false;
  var fn = (typeof _modul.setAlarm === 'function') ? 'setAlarm' : 'addAlarm';
  try {
    _modul[fn]({
      when: res.delayMs,
      label: res.label,
      vibration: (res.vibration !== false),
      success: function () { console.info('[alarm-legacy] SUKSES terpasang: ' + res.label); },
      fail: function (code, msg) {
        console.warn('[alarm-legacy] DITOLAK (' + code + '): ' + msg + ' | ' + res.label);
      }
    });
    return true;
  } catch (e) {
    console.warn('[alarm-legacy] exception: ' + e);
    return false;
  }
}

/** Hapus seluruh alarm milik aplikasi (bila API tersedia). */
export function batalkanSemua() {
  if (!_modul) return;
  try {
    if (typeof _modul.cancelAll === 'function') _modul.cancelAll();
    else if (typeof _modul.clearAlarm === 'function') _modul.clearAlarm();
    else if (typeof _modul.cancel === 'function') _modul.cancel(0);
  } catch (e) { /* varian tanpa API hapus — pasang ulang tetap aman */ }
}
