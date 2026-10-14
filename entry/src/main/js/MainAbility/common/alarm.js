/**
 * ============================================================================
 * alarm.js — Pemetaan & pemanggilan modul ALARM SISTEM resmi (hmAlarm)
 * ============================================================================
 * Ganti dari versi lama (alarm-detector.js) yang menebak-nebak nama fungsi.
 * Fakta API resmi liteWearable / JS-FA (contoh SDK Huawei):
 *
 *   hmAlarm.setAlarm({
 *       hour: 7, minute: 30, repeat: 0, days: [],
 *       label: 'teks', vibration: true,
 *       success: fn, fail: fn(code, msg)
 *   });
 *   hmAlarm.cancelAlarm();     // hapus SEMUA alarm milik aplikasi ini
 *
 * Kesalahan fatal versi lama: memanggil `modul.clear()` / `clearAllAlarms()`
 * yang TIDAK ADA → TypeError di dalam try/catch → seluruh operasi pasang
 * alarm ikut gagal diam-diam. Versi ini memakai cancelAlarm() yang benar.
 *
 * Deteksi modul lewat 3 jalur aman (semua try/catch — tidak pernah bisa
 * membuat halaman blank):
 *   JALUR 1 : global.hmAlarm / globalThis.hmAlarm (standar runtime lite)
 *   JALUR 2 : this.requireNapi('hmAlarm') pada instance halaman JS-FA
 *   JALUR 3 : jembatan global __hmAlarmMod hasil import statis '@ohos.hmAlarm'
 *             (lihat common/hm-alarm.js — uncomment SATU baris bila perlu)
 * ============================================================================
 */

var _modul = null; // objek modul mentah yang terbukti punya setAlarm

/* ============================ DETEKSI ==================================== */
function _punyaSetAlarm(m) {
  return !!m && typeof m.setAlarm === 'function';
}

/**
 * Cari modul hmAlarm. `ctxHalaman` opsional (this dari halaman index.js)
 * untuk mengaktifkan JALUR 2. Idempoten & murah — boleh dipanggil tiap
 * siklus 30 detik sampai modul ditemukan.
 */
export function deteksiModulAlarm(ctxHalaman) {
  if (_modul) return true;
  var g = null;
  try {
    g = (typeof globalThis !== 'undefined') ? globalThis
      : ((typeof global !== 'undefined') ? global : null);
  } catch (e) { g = null; }

  // --- JALUR 1: hmAlarm global bawaan runtime -----------------------------
  try {
    if (g && _punyaSetAlarm(g.hmAlarm)) {
      _modul = g.hmAlarm;
      console.info('[alarm] jalur 1 OK: global.hmAlarm');
      return true;
    }
  } catch (e) { /* lanjut */ }

  // --- JALUR 2: requireNapi pada konteks halaman --------------------------
  try {
    if (ctxHalaman && typeof ctxHalaman.requireNapi === 'function') {
      var napi = null;
      try { napi = ctxHalaman.requireNapi('hmAlarm'); }
      catch (e1) { try { napi = ctxHalaman.requireNapi('@ohos.hmAlarm'); } catch (e2) { napi = null; } }
      if (_punyaSetAlarm(napi)) {
        _modul = napi;
        console.info('[alarm] jalur 2 OK: requireNapi(hmAlarm)');
        return true;
      }
    }
  } catch (e) { /* lanjut */ }

  // --- JALUR 3: jembatan hasil import statis @ohos.hmAlarm ----------------
  try {
    if (g && _punyaSetAlarm(g.__hmAlarmMod)) {
      _modul = g.__hmAlarmMod;
      console.info('[alarm] jalur 3 OK: @ohos.hmAlarm (statis)');
      return true;
    }
  } catch (e) { /* selesai */ }

  return false;
}

export function modulAlarmTersedia() { return !!_modul; }

export function jalurAlarmAktif() {
  if (!_modul) return '(belum terdeteksi)';
  try {
    var g = (typeof globalThis !== 'undefined') ? globalThis : global;
    if (g && g.hmAlarm === _modul) return 'global.hmAlarm';
    if (g && g.__hmAlarmMod === _modul) return '@ohos.hmAlarm';
    return 'requireNapi(hmAlarm)';
  } catch (e) { return 'hmAlarm'; }
}

/* ============================ PEMANGGILAN ================================ */
/**
 * Bangun objek parameter setAlarm sesuai format RESMI.
 * - hour/minute  : jam-menit LOCAL trigger (H-10 menit sebelum masuk waktu).
 *                  Alarm hmAlarm adalah one-shot harian → dipasang ulang
 *                  otomatis oleh pengingat.js setiap app dibuka/ganti hari.
 * - repeat/days  : dikirim 0/[] agar firmware tidak menolak field hilang.
 * - vibration    : TRUE → alarm berbunyi dengan GETARAN (spesifikasi B).
 * - label        : teks keterangan yang tampil saat alarm berbunyi.
 * - success/fail : callback diagnostik (tercatat di hilog).
 */
function _param(res, getarAktif) {
  return {
    hour: res.hour,
    minute: res.minute,
    second: 0,
    repeat: 0,
    days: [],
    label: res.label,
    vibration: (getarAktif !== false),
    success: function () { console.info('[alarm] SUKSES terpasang: ' + res.label); },
    fail: function (code, msg) { console.warn('[alarm] DITOLAK (' + code + '): ' + msg + ' | ' + res.label); }
  };
}

/**
 * Pasang SATU alarm sistem. Return true bila panggilan diterima modul
 * (keberhasilan akhir dikonfirmasi callback success di log hilog).
 */
export function panggilSetAlarm(o) {
  if (!_modul) return false;
  try {
    _modul.setAlarm(_param(o, o.vibration));
    return true;
  } catch (e) {
    console.warn('[alarm] setAlarm exception (' + jalurAlarmAktif() + '): ' + e);
    return false;
  }
}

/** Hapus SEMUA alarm milik aplikasi ini (API resmi: cancelAlarm). */
export function panggilHapusAlarm() {
  if (!_modul) return;
  try {
    if (typeof _modul.cancelAlarm === 'function') {
      _modul.cancelAlarm();
    } else if (typeof _modul.clearAlarm === 'function') {
      _modul.clearAlarm();
    }
  } catch (e) { /* sebagian varian tanpa API hapus — pasang ulang tetap aman */ }
}
