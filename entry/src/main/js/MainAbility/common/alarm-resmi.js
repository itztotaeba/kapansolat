/**
 * ============================================================================
 * alarm-resmi.js — Pemanggilan modul ALARM SISTEM resmi `@ohos.hmAlarm`
 * ============================================================================
 * (Varian paket standar HarmonyOS/OpenHarmony liteWearable.)
 *
 * API yang dipakai:
 *   hmAlarm.setAlarm({
 *     hour, minute, repeat, days, label, vibration, snooze, ring?,
 *     success: function(data){}, fail: function(code, msg){}
 *   });
 *   hmAlarm.cancelAlarm();               // hapus SEMUA alarm milik aplikasi
 *
 * Catatan penting (penyebab alarm "tidak pernah berbunyi" pada versi lama):
 *   - `repeat` HARUS 1 agar alarm harian aktif; nilai 0 = one-shot dan pada
 *     sebagian firmware alarm one-shot yang jam-menitnya sudah lewat hari ini
 *     dianggap kedaluwarsa → tidak pernah dibunyikan.
 *   - `days: []` + repeat 1 = berulang SETIAP HARI pada jam & menit itu.
 *   - Keberhasilan sejati dikonfirmasi callback `success` / penolakan oleh
 *     callback `fail` — keduanya dicatat ke hilog untuk diagnostik.
 *
 * File ini hanya dieksekusi bila import statis '@ohos.hmAlarm' berhasil
 * (lihat common/hm-alarm.js). Semua fungsi murni & aman dipanggil berkali-kali.
 * ============================================================================
 */

var _modul = null;

/** Daftarkan objek modul hasil import statis (dipanggil dari hm-alarm.js). */
export function daftarkanModulStatis(m) {
  if (m && typeof m.setAlarm === 'function') {
    _modul = m;
    console.info('[alarm-resmi] modul @ohos.hmAlarm terdaftar (jalur statis)');
    return true;
  }
  return false;
}

export function tersedia() { return !!_modul; }

/**
 * Pasang SATU alarm harian H-x menit sebelum waktu sholat.
 * `res` = { hour, minute, label, vibration }
 * @returns {boolean} true bila panggilan diterima modul (hasil akhir
 *          dikonfirmasi log 'SUKSES'/'DITOLAK').
 */
export function setAlarmHarian(res) {
  if (!_modul) return false;
  try {
    _modul.setAlarm({
      hour: res.hour,
      minute: res.minute,
      second: 0,
      repeat: 1,                     // ← HARIAN (koreksi utama)
      days: [],                      // [] + repeat 1 → setiap hari
      label: res.label,
      vibration: (res.vibration !== false),
      snooze: 0,
      success: function () { console.info('[alarm-resmi] SUKSES terpasang: ' + res.label); },
      fail: function (code, msg) {
        console.warn('[alarm-resmi] DITOLAK (' + code + '): ' + msg + ' | ' + res.label);
      }
    });
    return true;
  } catch (e) {
    console.warn('[alarm-resmi] setAlarm exception: ' + e);
    return false;
  }
}

/** Hapus seluruh alarm milik aplikasi ini sebelum pasang ulang. */
export function batalkanSemua() {
  if (!_modul) return;
  try {
    if (typeof _modul.cancelAlarm === 'function') _modul.cancelAlarm();
    else if (typeof _modul.clearAlarm === 'function') _modul.clearAlarm();
  } catch (e) { /* varian tanpa API hapus — pasang ulang tetap aman */ }
}
