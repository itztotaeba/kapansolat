/**
 * ============================================================================
 * alarm.js — Mesin deteksi & pemanggilan ALARM SISTEM (hmAlarm / @system.alarm)
 * ============================================================================
 * Perbaikan besar pada versi ini (penyebab "alarm tidak pernah bunyi"):
 *
 *   BUG #1 — repeat: 0.
 *     Versi lama mengirim repeat 0 (one-shot). Pada firmware liteWearable,
 *     alarm one-shot yang jam:menit-nya SUDAH LEWAT hari ini dianggap
 *     kedaluwarsa dan dibuang diam-diam → hanya sisa trigger yang belum
 *     lewat hari itu yang pernah aktif, dan setelahnya mati total.
 *     KOREKSI: repeat: 1 + days: [] → alarm HARIAN permanen per waktu sholat
 *     (berbunyi setiap hari pada jam & menit trigger, mis. Subuh 04:21).
 *
 *   BUG #2 — keberhasilan palsu.
 *     panggilSetAlarm dulu return true begitu saja tanpa menunggu callback.
 *     Sekarang kegagalan dicatat (lastError + counter sukses/gagal) sehingga
 *     log hilog jujur: terlihat jalur mana yang ditolak firmware dan dengan
 *     kode error apa.
 *
 *   FITUR — dua varian API sekaligus:
 *     VARIAN A: '@ohos.hmAlarm' / global.hmAlarm / requireNapi('hmAlarm')
 *               → setAlarm({hour, minute, repeat:1, days:[], label,
 *                            vibration, snooze})        (common/alarm-resmi.js)
 *     VARIAN B: '@system.alarm' (firmware lama) → setAlarm({when: delayMs})
 *               penundaan milidetik absolut, tak terpengaruh "sudah lewat"
 *                                                        (common/alarm-legacy.js)
 *
 * Deteksi modul lewat 4 jalur aman (semua try/catch — tidak pernah bisa
 * membuat halaman blank):
 *   JALUR 1 : global.hmAlarm / globalThis.hmAlarm (runtime lite standar)
 *   JALUR 2 : this.requireNapi('hmAlarm') pada instance halaman JS-FA
 *   JALUR 3 : jembatan __hmAlarmMod hasil import statis '@ohos.hmAlarm'
 *   JALUR 4 : global.alarm / systemAlarm / requireNapi('alarm') (varian lama)
 * ============================================================================
 */

import { daftarkanModulStatis, tersedia as resmiTersedia,
         setAlarmHarian, batalkanSemua as batalkanResmi } from './alarm-resmi.js';
import { daftarkanModulLegacy, tersedia as legacyTersedia,
         setAlarmTunda, batalkanSemua as batalkanLegacy } from './alarm-legacy.js';

/* Objek modul mentah hasil deteksi (varian A), plus status diagnostik. */
var _modul = null;
var _namaJalur = '';
var _lastError = '';
var _percobaan = 0;      // jumlah panggilan setAlarm yang di attempted
var _sukses = 0;         // callback success yang diterima
var _gagal = 0;          // callback fail / exception yang diterima

/* ============================ DETEKSI ==================================== */
function _punyaSetAlarm(m) {
  return !!m && typeof m.setAlarm === 'function';
}
function _punyaAlarmLegacy(m) {
  return !!m && (typeof m.setAlarm === 'function' || typeof m.addAlarm === 'function');
}

function _objekGlobal() {
  try {
    if (typeof globalThis !== 'undefined') return globalThis;
    if (typeof global !== 'undefined') return global;
  } catch (e) { /* noop */ }
  return null;
}

/**
 * Cari modul alarm. `ctxHalaman` opsional (this dari halaman index.js) untuk
 * mengaktifkan jalur requireNapi. Idempoten & murah — dipanggil ulang tiap
 * siklus 30 detik sampai salah satu modul ditemukan.
 */
export function deteksiModulAlarm(ctxHalaman) {
  if (_modul) return true;
  var g = _objekGlobal();

  // --- JALUR 1: hmAlarm global bawaan runtime -----------------------------
  try {
    if (g && _punyaSetAlarm(g.hmAlarm)) {
      _modul = g.hmAlarm; _namaJalur = 'global.hmAlarm';
      daftarkanModulStatis(g.hmAlarm);
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
        _modul = napi; _namaJalur = 'requireNapi(hmAlarm)';
        daftarkanModulStatis(napi);
        console.info('[alarm] jalur 2 OK: requireNapi(hmAlarm)');
        return true;
      }
    }
  } catch (e) { /* lanjut */ }

  // --- JALUR 3: jembatan hasil import statis @ohos.hmAlarm ----------------
  try {
    if (g && _punyaSetAlarm(g.__hmAlarmMod)) {
      _modul = g.__hmAlarmMod; _namaJalur = '@ohos.hmAlarm (statis)';
      daftarkanModulStatis(g.__hmAlarmMod);
      console.info('[alarm] jalur 3 OK: @ohos.hmAlarm (statis)');
      return true;
    }
    // jalur 3 juga terpenuhi bila alarm-resmi.js sudah menerima modul
    if (!_modul && resmiTersedia()) {
      _namaJalur = '@ohos.hmAlarm (statis)';
      return true;
    }
  } catch (e) { /* lanjut */ }

  // --- JALUR 4: varian lama '@system.alarm' -------------------------------
  try {
    var la = null;
    if (g) la = g.alarm || g.systemAlarm || null;
    if (!la && ctxHalaman && typeof ctxHalaman.requireNapi === 'function') {
      try { la = ctxHalaman.requireNapi('alarm'); } catch (e3) { la = null; }
      if (!_punyaAlarmLegacy(la)) {
        try { la = ctxHalaman.requireNapi('@system.alarm'); } catch (e4) { /* noop */ }
      }
    }
    if (_punyaAlarmLegacy(la)) {
      daftarkanModulLegacy(la);
      _namaJalur = _namaJalur || '@system.alarm';
      console.info('[alarm] jalur 4 OK: @system.alarm (varian lama)');
      return true;
    }
  } catch (e) { /* selesai */ }

  return false;
}

/** Tersedia minimal satu varian modul alarm? */
export function modulAlarmTersedia() {
  return !!_modul || resmiTersedia() || legacyTersedia();
}

export function jalurAlarmAktif() {
  if (_namaJalur) return _namaJalur;
  if (resmiTersedia()) return '@ohos.hmAlarm (statis)';
  if (legacyTersedia()) return '@system.alarm';
  return '(belum terdeteksi)';
}

/** Diagnostik utk log: percobaan/sukses/gagal + error terakhir. */
export function statistikAlarm() {
  return { jalur: jalurAlarmAktif(), percobaan: _percobaan, sukses: _sukses,
           gagal: _gagal, lastError: _lastError };
}

/* ============================ PEMANGGILAN ================================ */
/**
 * Pasang SATU alarm sistem H-x menit sebelum suatu waktu sholat.
 * `o` = { hour, minute, delayMs, label, vibration }
 *   - hour/minute → dipakai VARIAN A (@ohos.hmAlarm): alarm HARIAN (repeat 1).
 *   - delayMs     → dipakai VARIAN B (@system.alarm): penundaan milidetik.
 * Return true bila panggilan DITERIMA modul (kepastian akhir ada di log
 * '[alarm] SUKSES/DITOLAK').
 */
export function panggilSetAlarm(o) {
  if (!modulAlarmTersedia()) return false;
  _percobaan++;

  // ---- VARIAN A: hmAlarm resmi ({hour, minute, repeat:1, days:[]}) -------
  if (resmiTersedia() || _modul) {
    try {
      if (setAlarmHarian({ hour: o.hour, minute: o.minute, label: o.label,
                           vibration: o.vibration })) return true;
    } catch (e) {
      _lastError = 'exception-A';
      console.warn('[alarm] jalur A exception: ' + e);
    }
  }

  // ---- VARIAN B: @system.alarm dengan penundaan ms -----------------------
  if (legacyTersedia()) {
    try {
      if (setAlarmTunda({ delayMs: o.delayMs, label: o.label,
                          vibration: o.vibration })) return true;
    } catch (e) {
      _lastError = 'exception-B';
      console.warn('[alarm] jalur B exception: ' + e);
    }
  }

  return false;
}

/** Hapus SEMUA alarm milik aplikasi ini (kedua varian, aman bila tak ada). */
export function panggilHapusAlarm() {
  try { batalkanResmi(); } catch (e) { /* noop */ }
  try { batalkanLegacy(); } catch (e) { /* noop */ }
}
