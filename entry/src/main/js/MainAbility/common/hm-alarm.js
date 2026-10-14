/**
 * ============================================================================
 * hm-alarm.js — Pembungkus SATU TITIK pemuatan modul alarm sistem hmAlarm
 * ============================================================================
 * Kenapa file ini ada?
 *   Runtime liteWearable TIDAK mendukung fungsi global `require()`. Dulu
 *   pemuatannya lewat try { require('@ohos.hmAlarm') } dan ReferenceError yang
 *   muncul membuat halaman gagal dimuat (layar blank hitam). Sekarang hmAlarm
 *   dideteksi lewat DUA jalur aman di common/device-api.js:
 *     JALUR 1: modul GLOBAL `hmAlarm` bawaan runtime liteWearable
 *              (standar OpenHarmony — tidak perlu import apa pun);
 *     JALUR 2: import statis '@ohos.hmAlarm' melalui file ini, untuk SDK yang
 *              mengekspor modul sebagai paket @ohos.*.
 *
 * Bila build DevEco Studio Anda menolak modul '@ohos.hmAlarm' (SDK tertentu
 * tidak menyertakannya), cukup KOMENTARI satu baris import di bawah lalu build
 * ulang — jalur 1 tetap dicoba lebih dulu oleh device-api.js. Konsekuensi bila
 * KEDUA jalur tidak tersedia: hanya Metode B (alarm saat app tertutup) nonaktif;
 * seluruh tampilan & Metode A (pengingat saat app terbuka) tetap berjalan.
 * ============================================================================
 */

import HmAlarmDefault from '@ohos.hmAlarm'; // ← komentar baris ini bila SDK build menolak modulnya

// Beberapa SDK mengekspor konstruktor (dipakai `new`), sebagian lain langsung
// mengekspor objek berisi setAlarm/cancel. Keduanya diteruskan apa adanya.
export var HmAlarm = HmAlarmDefault;
