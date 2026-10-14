/**
 * ============================================================================
 * alarm-detector.js — Deteksi & pemanggilan modul ALARM SISTEM (hmAlarm)
 * ============================================================================
 * Tujuan: Metode B ("alarm sistem, tetap jalan walau aplikasi ditutup")
 * harus benar-benar terpakai. Masalah pada SDK liteWearable berbeda-beda,
 * karena itu modul alarm dicari lewat EMPAT jalur aman, semuanya dibungkus
 * try/catch sehingga TIDAK PERNAH bisa membuat halaman gagal render
 * (gejala bila lolos: layar blank hitam).
 *
 *   JALUR 1 : objek global `globalThis.hmAlarm` / `global.hmAlarm`
 *             (standar runtime OpenHarmony liteWearable — inilah yang paling
 *              umum tersedia di GT 7 Pro).
 *   JALUR 2 : import statis '@ohos.hmAlarm' via common/hm-alarm.js
 *             (SDK varian paket @ohos.*). Bila build DevEco menolak modul
 *             ini, cukup komentar SATU baris import di hm-alarm.js.
 *   JALUR 3 : `this.requireNapi('hmAlarm')` — beberapa JS-FA menyediakan
 *             helper requireNapi pada instance halaman untuk menarik modul
 *             native (hmAlarm adalah modul napi resmi liteWearable).
 *   JALUR 4 : `@system.alarm` — API alarm gaya lama; dipakai bila ketiga
 *             jalur lain gagal.
 *
 * Hasil deteksi disimpan di satu variabel dan dicoba ulang secara periodik
 * (lihat pengingat.js), jadi begitu jam menyediakan modulnya, alarm langsung
 * terpasang otomatis tanpa tindakan pengguna.
 * ============================================================================
 */

var _modul = null; // { setAlarm: fn, hapus: fn|null, nama: string }

/* ---------- bantu: normalisasi bentuk modul (objek fungsi / konstruktor) -- */
function _normalisasi(mod, nama) {
  try {
    if (!mod) return null;
    var kandidat = mod;
    if (typeof mod === 'function') {
      // konstruktor: coba instansiasi; kalau gagal, pakai fungsinya langsung
      try {
        var ins = new mod();
        if (ins && typeof ins.setAlarm === 'function') kandidat = ins;
      } catch (e) { /* biarkan kandidat = mod */ }
    }
    if (kandidat && typeof kandidat.setAlarm !== 'function' &&
        typeof kandidat.set === 'function') {
      // varian API lama: .set(obj) bukan .setAlarm(obj)
      kandidat = {
        setAlarm: function (o) { return kandidat.set(o); },
        hapus: (typeof kandidat.clear === 'function') ? function () { kandidat.clear(); } : null,
        _asli: kandidat
      };
    }
    if (kandidat && typeof kandidat.setAlarm === 'function') {
      return {
        setAlarm: function (o) { kandidat.setAlarm(o); },
        hapus: (typeof kandidat.clearAllAlarms === 'function')
          ? function () { kandidat.clearAllAlarms(); }
          : ((typeof kandidat.cancel === 'function')
              ? function () { try { kandidat.cancel({}); } catch (e) {} }
              : null),
        nama: nama
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}

/* ======================= DETEKSI (dipanggil berulang, idempoten) ========== */
/**
 * Cari modul alarm. `ctxHalaman` opsional: pass `this` dari halaman index.js
 * agar JALUR 3 (this.requireNapi) bisa dicoba.
 * @returns {boolean} true bila modul sudah/perlu ditemukan
 */
export function deteksiModulAlarm(ctxHalaman) {
  if (_modul) return true;

  // --- JALUR 1: global hmAlarm -------------------------------------------
  try {
    var g = (typeof globalThis !== 'undefined') ? globalThis
          : ((typeof global !== 'undefined') ? global : null);
    if (g) {
      _modul = _normalisasi(g.hmAlarm, 'global.hmAlarm');
      if (_modul) { console.info('[alarm] jalur 1 OK: global.hmAlarm'); return true; }
    }
  } catch (e) { /* lanjut */ }

  // --- JALUR 2: import statis @ohos.hmAlarm ------------------------------
  try {
    // HmAlarm diekspor oleh hm-alarm.js; nilainya undefined bila file
    // komentar, jadi akses properti pada window/global tidak dilakukan.
    var HmAlarmRef = (typeof globalThis !== 'undefined' && globalThis.__hmAlarmMod) || null;
    if (HmAlarmRef) {
      _modul = _normalisasi(HmAlarmRef, '@ohos.hmAlarm(statis)');
      if (_modul) { console.info('[alarm] jalur 2 OK: @ohos.hmAlarm'); return true; }
    }
  } catch (e) { /* lanjut */ }

  // --- JALUR 3: this.requireNapi('hmAlarm') ------------------------------
  try {
    if (ctxHalaman && typeof ctxHalaman.requireNapi === 'function') {
      var napi = null;
      try { napi = ctxHalaman.requireNapi('hmAlarm'); }
      catch (e1) { try { napi = ctxHalaman.requireNapi('@ohos.hmAlarm'); } catch (e2) { napi = null; } }
      _modul = _normalisasi(napi, 'requireNapi(hmAlarm)');
      if (_modul) { console.info('[alarm] jalur 3 OK: requireNapi'); return true; }
    }
  } catch (e) { /* lanjut */ }

  // --- JALUR 4: @system.alarm (API lama) ---------------------------------
  try {
    var g4 = (typeof globalThis !== 'undefined') ? globalThis : (typeof global !== 'undefined' ? global : null);
    if (g4 && g4.systemAlarm) {
      _modul = _normalisasi(g4.systemAlarm, '@system.alarm');
      if (_modul) { console.info('[alarm] jalur 4 OK: system.alarm'); return true; }
    }
  } catch (e) { /* selesai */ }

  return false;
}

/** Apakah modul alarm sudah ditemukan? */
export function modulAlarmTersedia() { return !!_modul; }

/** Nama jalur yang berhasil (untuk log/diagnostik). */
export function jalurAlarmAktif() { return _modul ? _modul.nama : '(belum terdeteksi)'; }

/* ======================= PEMANGGILAN ====================================== */
/**
 * Pasang satu alarm. Obyek argumen mengikuti format resmi contoh SDK:
 *   hmAlarm.setAlarm({ hour, minute, vibration, label })
 * Field tambahan (time/delay) ikut dikirim untuk SDK varian lain; field tak
 * dikenal akan diabaikan runtime.
 * @returns {boolean} true bila panggilan diterima modul
 */
export function panggilSetAlarm(o) {
  if (!_modul) return false;
  try {
    _modul.setAlarm(o);
    return true;
  } catch (e) {
    console.warn('[alarm] setAlarm gagal (' + _modul.nama + '): ' + e);
    return false;
  }
}

/** Hapus semua alarm milik aplikasi (bila API-nya tersedia). */
export function panggilHapusAlarm() {
  if (!_modul || !_modul.hapus) return;
  try { _modul.hapus(); } catch (e) { /* sebagian SDK tanpa API hapus */ }
}

/* ----------------------------------------------------------------------------
 * SELF-TEST AMAN (diagnostik, bukan pengingat sungguhan):
 * pasang satu alarm getar 60 detik ke depan dengan label uji. Bila pengguna
 * MERASAKAN getarannya → hmAlarm benar-benar berfungsi di jam ini. Hasil
 * (nama jalur yang dipakai / kegagalan) tercatat di console log:
 *   hdc shell hilog | grep alarm
 * Tidak ada efek samping bila modul tidak tersedia — hanya mengembalikan false.
 * -------------------------------------------------------------------------- */
export function ujiAlarmSekali() {
  if (!deteksiModulAlarm(null)) return false;
  var d = new Date(Date.now() + 60 * 1000);
  var ok = panggilSetAlarm({
    hour: d.getHours(),
    minute: d.getMinutes(),
    delay: 60,
    label: 'Uji alarm Kapan Solat',
    vibration: true,
    success: function () { console.info('[alarm] UJI berhasil dijadwalkan (' + _modul.nama + ')'); },
    fail: function (err, msg) { console.warn('[alarm] UJI gagal (' + err + '): ' + msg); }
  });
  return ok;
}
