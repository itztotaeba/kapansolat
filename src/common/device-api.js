/**
 * ============================================================================
 *  device-api.js  -  PEMBALUT (WRAPPER) API RESMI LiteWearable
 *  Huawei Watch GT 7 Pro / HarmonyOS Lite Wearable (JavaScript)
 * ============================================================================
 *
 *  Modul ini membungkus 3 kemampuan perangkat yang dipakai aplikasi:
 *   1. Getaran          -> @system.vibrator  (hmVibrator)
 *   2. Alarm sistem     -> @system.hmAlarm  (menjadwalkan pengingat agar tetap
 *                          berbunyi/getar WALAU aplikasi ditutup — Metode B)
 *   3. Notifikasi layar -> @system.notification (Metode A, saat app terbuka;
 *                          fallback teks banner di dalam halaman bila API tak ada)
 *
 *  SEMUA pemanggilan dibungkus try/catch sehingga aplikasi tidak crash bila
 *  sebuah modul tidak tersedia di versi firmware tertentu — fungsi pendukung
 *  akan diam-diam nonaktif dan aplikasi tetap menampilkan jadwal dengan benar.
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// Impor modul sistem resmi LiteWearable (harmonyos js framework)
// ---------------------------------------------------------------------------
var vibrator = null;
var hmAlarm = null;
var notification = null;

try { vibrator = require('@system.vibrator'); } catch (e) { /* opsional */ }
try { hmAlarm = require('@system.hmAlarm'); } catch (e) { /* opsional */ }
try { notification = require('@system.notification'); } catch (e) { /* opsional */ }

/** Jumlah alarm hmAlarm aktif milik aplikasi ini (untuk hemat resource). */
var MAX_ALARM_HARIAN = 5; // Subuh..Isya untuk hari berjalan + besok

/**
 * Aktifkan getaran singkat (pola 'time-up' bila didukung).
 * Dipakai oleh pengingat Metode A (10 menit sebelum sholat, app terbuka).
 * @param {number} durasiMs durasi getaran dalam milidetik (default 800)
 */
function bergetar(durasiMs) {
  if (!vibrator) return false;
  var ms = durasiMs || 800;
  try {
    // API lama: vibrate({message:'short'}); API baru: vibrate({duration:int})
    vibrator.vibrate({ mode: 'short' });
  } catch (e1) {
    try {
      vibrator.vibrate({ duration: ms });
    } catch (e2) {
      try { vibrator.startVibration({ type: 'time', duration: ms }, { id: 0, usage: 'notification' }); }
      catch (e3) { return false; }
    }
  }
  return true;
}

/**
 * Getaran panjang berulang (3x) untuk alarm sholat yang sudah masuk waktu.
 */
function bergetarKuat() {
  if (!vibrator) return false;
  var i = 0;
  function pulse() {
    bergetar(600);
    i++;
    if (i < 3) setTimeout(pulse, 900);
  }
  pulse();
  return true;
}

/**
 * Tampilkan notifikasi sistem (Metode A). Bila modul notifikasi tidak ada,
 * kembalikan false agar pemanggil menampilkan banner teks di dalam halaman.
 * @param {string} title judul, mis. '⏰ Ashar 10 menit lagi!'
 * @param {string} text  isi pesan, mis. 'Waktu masuk: 15:10'
 * @returns {boolean} sukses dikirim ke sistem?
 */
function tampilkanNotifikasi(title, text) {
  if (!notification) return false;
  try {
    notification.publish({
      title: title,
      text: text,
      additional: { notifyId: Date.now() % 100000 }
    });
    return true;
  } catch (e) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// METODA B — ALARM SISTEM (hmAlarm): tetap bunyi walau aplikasi ditutup
// ---------------------------------------------------------------------------

/**
 * Daftarkan SATU alarm ke sistem.
 * @param {Date} triggerDate waktu alarm seharusnya berbunyi
 * @param {string} label keterangan alarm (muncul saat alarm berbunyi)
 * @param {number} alarmId id unik 0..N
 * @returns {boolean}
 */
function daftarkanAlarmSatu(triggerDate, label, alarmId) {
  if (!hmAlarm) return false;
  try {
    var opts = {
      hour: triggerDate.getHours(),
      minute: triggerDate.getMinutes(),
      // sebagian implementasi hmAlarm menerima `time` (ms epoch) — kirim keduanya
      time: triggerDate.getTime(),
      label: label,
      daysOfWeek: [
        triggerDate.getFullYear(),      // pada LiteWearable beberapa vendor
        triggerDate.getMonth() + 1,     // memakai field year/month/day untuk
        triggerDate.getDate()           // alarm sekali jalan (one-shot)
      ],
      repeat: false,
      vibration: true,   // alarm berupa GETARAN + label keterangan
      snoozeTimes: 0,
      requestId: alarmId
    };
    hmAlarm.setAlarm(opts, function (err) {
      // err null/undefined = sukses; gagal pun jangan sampai crash
      if (err) console.log('[sholat] setAlarm gagal id=' + alarmId + ': ' + JSON.stringify(err));
    });
    return true;
  } catch (e) {
    console.log('[sholat] setAlarm exception: ' + e);
    return false;
  }
}

/**
 * Hapus satu alarm berdasarkan requestId.
 * @param {number} alarmId
 */
function hapusAlarmSatu(alarmId) {
  if (!hmAlarm) return;
  try {
    hmAlarm.cancelAlarm({ requestId: alarmId }, function () { /* abaikan hasil */ });
  } catch (e) { /* diam */ }
}

/**
 * Pasang ulang SELURUH alarm harian (Metode B) dari data jadwal.
 * Dipanggil: (a) saat aplikasi dibuka, (b) setiap ganti hari,
 *            (c) setiap kali blok data jadwal diperbarui lalu app dijalankan.
 *
 * Strategi hemat: hanya 10 alarm yang dipasang — 5 pengingat hari ini
 * (yang belum terlewat) + 5 pengingat besok. Alarm bersifat one-shot,
 * jadi daftar ini "digulung" ulang tiap hari ketika aplikasi sempat dibuka.
 *
 * @param {Array<object>} rowsHarian hasil hitungAlarmHarian() per tanggal,
 *         sudah difilter hanya kejadian yang masih akan datang.
 * @returns {number} jumlah alarm berhasil dipasang
 */
function pasangAlarmHarian(rowsHarian) {
  if (!hmAlarm || !rowsHarian || rowsHarian.length === 0) return 0;
  var dipasang = 0;
  for (var i = 0; i < rowsHarian.length && i < MAX_ALARM_HARIAN * 2; i++) {
    var a = rowsHarian[i];
    if (daftarkanAlarmSatu(a.trigger, a.labelAlarm, a.requestId)) dipasang++;
  }
  return dipasang;
}

/** Status ketersediaan API — berguna untuk pesan diagnostik di layar. */
function statusApi() {
  return {
    vibrator: !!vibrator,
    hmAlarm: !!hmAlarm,
    notification: !!notification
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    bergetar: bergetar,
    bergetarKuat: bergetarKuat,
    tampilkanNotifikasi: tampilkanNotifikasi,
    daftarkanAlarmSatu: daftarkanAlarmSatu,
    hapusAlarmSatu: hapusAlarmSatu,
    pasangAlarmHarian: pasangAlarmHarian,
    statusApi: statusApi
  };
}
