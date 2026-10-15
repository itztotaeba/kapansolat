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

/** Nama fungsi alarm yang benar-benar tersedia pada modul (diagnostik). */
function _namaFungsiAlarm(m) {
  if (!m) return '';
  var kandidat = ['setAlarm', 'addAlarm', 'createAlarm', 'startAlarm'];
  for (var i = 0; i < kandidat.length; i++) {
    try { if (typeof m[kandidat[i]] === 'function') return kandidat[i]; }
    catch (e) { /* getter bermasalah — lewati */ }
  }
  return '';
}

/** Daftarkan objek modul @system.alarm hasil deteksi global/requireNapi. */
export function daftarkanModulLegacy(m) {
  var fn = _namaFungsiAlarm(m);
  if (fn) {
    _modul = m;
    console.info('[alarm-legacy] modul alarm varian lama terdaftar (fungsi: ' + fn + ')');
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
/**
 * KOREKSI BESAR: API '@system.alarm' LITE WEARABLE yang sebenarnya memakai
 * HARI/JAM/MENIT (bukan milidetik 'when'):
 *
 *   alarm.setAlarm({
 *     hour: 4, minute: 21,              // jam & menit berbunyi (local)
 *     days: [1,2,3,4,5,6,7],            // hari aktif (1=Senin .. 7=Minggu)
 *     label: 'teks',                    // keterangan di layar alarm
 *     success/fail callbacks
 *   });
 *   alarm.cancelAll();                  // hapus seluruh alarm aplikasi ini
 *
 * Versi lama mengirim { when: <ms> } — field yang TIDAK dikenal modul ini,
 * sehingga firmware menolak diam-diam → "alarm tidak pernah bunyi" walau
 * modulnya ada. Kini jam & MENIT trigger dihitung dari kejadian
 * (ev.triggerJam / ev.triggerMenitLokal yang sudah dibagikan device-api ke
 * properti hour/minute), plus daftar hari sesuai hari kejadian.
 */
export function setAlarmLite(res) {
  if (!_modul || typeof _modul.setAlarm !== 'function') return false;
  var hariAktif = (res.days && res.days.length) ? res.days : [1, 2, 3, 4, 5, 6, 7];
  try {
    // PERBAIKAN "tidak ada getar/notifikasi sama sekali": sebagian firmware
    // hanya membunyikan alarm bila field `vibration` & `snooze` DIKIRIM
    // secara eksplisit. Versi lama tidak mengirim keduanya → alarm terpasang
    // (callback success) tapi berbunyi senyap tanpa getaran.
    _modul.setAlarm({
      hour: res.hour,
      minute: res.minute,
      second: 0,
      days: hariAktif,
      label: res.label,
      vibration: true,                // ← getar saat alarm bunyi
      snooze: 0,                      // ← tanpa tunda (hindari diam-diam batal)
      success: function () {
        console.info('[alarm-legacy] SUKSES terpasang: ' + res.label +
                     ' @ ' + pad(res.hour) + ':' + pad(res.minute));
      },
      fail: function (code, msg) {
        console.warn('[alarm-legacy] DITOLAK (' + code + '): ' + msg + ' | ' + res.label);
      }
    });
    return true;
  } catch (e) {
    console.warn('[alarm-legacy] setAlarm-lite exception: ' + e);
    return false;
  }
}

/** Varian lama berbasis penundaan ms — dipertahankan utk firmware varian lain
    yang benar-benar menerima 'when'. Dicoba hanya bila pola hour/minute gagal. */
export function setAlarmTunda(res) {
  if (!_modul) return false;
  var fn = (typeof _modul.setAlarm === 'function') ? 'setAlarm' : 'addAlarm';
  try {
    _modul[fn]({
      when: res.delayMs,
      label: res.label,
      vibration: (res.vibration !== false),
      success: function () { console.info('[alarm-legacy] SUKSES (when) terpasang: ' + res.label); },
      fail: function (code, msg) {
        console.warn('[alarm-legacy] DITOLAK (when) (' + code + '): ' + msg + ' | ' + res.label);
      }
    });
    return true;
  } catch (e) {
    console.warn('[alarm-legacy] exception: ' + e);
    return false;
  }
}

function pad(n) { return (n < 10 ? '0' + n : '' + n); }

/** Hapus seluruh alarm milik aplikasi (bila API tersedia). */
export function batalkanSemua() {
  if (!_modul) return;
  try {
    if (typeof _modul.cancelAll === 'function') _modul.cancelAll();
    else if (typeof _modul.clearAlarm === 'function') _modul.clearAlarm();
    else if (typeof _modul.cancel === 'function') _modul.cancel(0);
  } catch (e) { /* varian tanpa API hapus — pasang ulang tetap aman */ }
}
