/**
 * ============================================================================
 * device-api.js — Pembungkus API RESMI LiteWearable (HarmonyOS JS / JS-FA)
 * ============================================================================
 * Modul yang dipakai:
 *   - @system.vibrator     → getaran (Metode A)
 *   - @system.notification → notifikasi teks di layar (Metode A)
 *   - hmAlarm              → ALARM SISTEM (Metode B): tetap berbunyi walau
 *                            aplikasi ditutup. Pemetaan & pemanggilan ada di
 *                            common/alarm.js (format parameter resmi +
 *                            cancelAlarm yang benar).
 *
 * SEMUA pemanggilan dibungkus try/catch agar aplikasi tidak pernah crash
 * bila suatu API tidak tersedia di firmware jam. Hemat daya: tanpa polling.
 * ============================================================================
 */

import vibrator from '@system.vibrator';
import notification from '@system.notification';

// Dimuat paling awal: JALUR 3 (import statis '@ohos.hmAlarm' + jembatan
// registrasi ke alarm-resmi.js/global). Tidak dipakai langsung, cukup import.
import './hm-alarm.js';

import {
  deteksiModulAlarm,
  modulAlarmTersedia,
  jalurAlarmAktif,
  panggilSetAlarm,
  panggilHapusAlarm
} from './alarm.js';

/** Beri kesempatan deteksi memakai konteks halaman (requireNapi). */
export function daftarkanKonteksAlarm(ctx) {
  try { deteksiModulAlarm(ctx); } catch (e) { /* aman */ }
}

/* ------------------------------ GETARAN ---------------------------------- */
export function getar() {
  try {
    vibrator.vibrate({ mode: 'short' });
  } catch (e) {
    console.warn('[device-api] getar gagal: ' + e);
  }
}

export function getarPanjang() {
  try {
    vibrator.vibrate({ mode: 'long' });
  } catch (e) {
    console.warn('[device-api] getarPanjang gagal: ' + e);
  }
}

/* ---------------------------- NOTIFIKASI ---------------------------------- */
/** Tampilkan notifikasi teks di layar jam (Metode A). s = {title, text} */
export function tampilkanNotifikasi(s) {
  try {
    notification.show({
      content: {
        title: s.title || 'Pengingat',
        text: s.text || '',
        additionalText: s.text || ''
      },
      level: 'primary'
    });
  } catch (e) {
    console.warn('[device-api] notifikasi gagal: ' + e);
  }
}

/* ------------------------------- ALARM ------------------------------------ */
/**
 * Pasang SATU alarm sistem H-x menit sebelum waktu sholat (METODE B).
 * `ev` = satu kejadian dari waktu.js#kejadianPengingat:
 *   ev.triggerJam        → jam LOCAL trigger (0..23)  [varian A: hmAlarm]
 *   ev.triggerMenitLokal → menit LOCAL trigger (0..59)[varian A: hmAlarm]
 *   ev.selangMenit       → menit menuju trigger       [varian B: delay ms]
 *   ev.nama / ev.masuk   → untuk label keterangan
 * Alarm dikirim sebagai HARIAN (repeat:1, days:[]) oleh alarm-resmi.js —
 * koreksi atas bug repeat:0 versi lama yang membuat alarm one-shot dibuang
 * firmware saat jam trigger-nya sudah lewat hari ini.
 * @returns {boolean} true bila panggilan diterima modul
 */
export function pasangAlarmKejadian(ev) {
  if (!modulAlarmTersedia()) { try { deteksiModulAlarm(null); } catch (e) {} }
  if (!modulAlarmTersedia()) return false;
  if (!ev || typeof ev.triggerJam !== 'number' || typeof ev.triggerMenitLokal !== 'number') return false;
  var selang = (typeof ev.selangMenit === 'number' && ev.selangMenit >= 0) ? ev.selangMenit : 0;
  return panggilSetAlarm({
    hour: ev.triggerJam,
    minute: ev.triggerMenitLokal,
    delayMs: selang * 60 * 1000,   // utk varian '@system.alarm' (when: ms)
    label: '⏰ ' + ev.nama + ' — masuk ' + ev.masuk + ' (H-' + (ev.menitSebelum || 10) + ' mnt)',
    vibration: true
  });
}

/** Apakah modul alarm tersedia di perangkat ini? */
export function alarmTersedia() {
  try { return modulAlarmTersedia(); } catch (e) { return false; }
}

/** Nama jalur hmAlarm yang aktif — untuk log/diagnostik. */
export function jalurAlarmLabel() {
  try { return jalurAlarmAktif(); } catch (e) { return '(belum terdeteksi)'; }
}

/** Hapus seluruh alarm milik aplikasi (dipakai sebelum pasang ulang). */
export function hapusSemuaAlarm() {
  try { panggilHapusAlarm(); } catch (e) {
    console.warn('[device-api] hapusSemuaAlarm gagal: ' + e);
  }
}

/** Jumlah alarm yang BERHASIL dipasang pada pemanggilan terakhir. */
var _terakhirDipasang = 0;
export function setJumlahAlarmTerpasang(n) { _terakhirDipasang = n; }
export function jumlahAlarmTerpasang() { return _terakhirDipasang; }

/**
 * METODOLOGI PEMASANGAN ULANG OTOMATIS:
 * Daftar `kejadian` (waktu.js.kejadianPengingat) diubah menjadi alarm sistem
 * HARIAN (repeat:1) H-x menit sebelum tiap waktu sholat. Dipanggil setiap
 * aplikasi dibuka DAN setiap pergantian hari, sehingga "otomatis terpasang
 * untuk tiap hari" tanpa interaksi pengguna. Saat jadwal diperbarui
 * (build/install baru), fungsi ini juga memuatnya otomatis.
 *
 * Penghitungan JUJUR: hanya alarm yang panggilan modulnya DITERIMA yang
 * dihitung (bukan asal count seperti versi lama). Diagnostik lengkap
 * (jalur aktif, sukses/gagal callback) tercatat di hilog.
 *
 * Batas aman: maksimal 10 alarm (kapasitas tipikal liteWearable).
 * @returns {number} jumlah alarm yang berhasil dipasang
 */
export function pasangDeretAlarm(kejadian) {
  hapusSemuaAlarm();
  var MAX_ALARM = 10;
  var count = 0;
  for (var i = 0; i < kejadian.length && count < MAX_ALARM; i++) {
    if (pasangAlarmKejadian(kejadian[i])) count++;
  }
  setJumlahAlarmTerpasang(count);
  console.info('[device-api] pasangDeretAlarm: ' + count + '/' + kejadian.length +
               ' alarm HARIAN diajukan via ' + jalurAlarmLabel());
  return count;
}
