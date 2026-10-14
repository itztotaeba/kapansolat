/**
 * ============================================================================
 * hm-alarm.js — Pembungkus SATU TITIK pemuatan modul alarm sistem hmAlarm
 * ============================================================================
 * Kenapa file ini ada?
 *   Runtime liteWearable TIDAK mendukung fungsi global `require()`. Dulu
 *   pemuatannya lewat try { require('@ohos.hmAlarm') } dan ReferenceError yang
 *   muncul membuat halaman gagal dimuat (layar blank hitam). Sekarang hmAlarm
 *   dimuat dengan pola RESMI DevEco LiteWearable untuk modul @ohos.*:
 *       import HmAlarm from '@ohos.hmAlarm'   →   var ins = new HmAlarm();
 *
 * Bila build di DevEco Studio Anda menolak modul '@ohos.hmAlarm' (SDK tertentu
 * tidak menyertakannya), cukup KOMENTARI satu baris import di bawah lalu build
 * ulang. Konsekuensinya hanya Metode B (alarm saat app tertutup) nonaktif —
 * seluruh tampilan & Metode A (pengingat saat app terbuka) tetap berjalan.
 * ============================================================================
 */

import HmAlarmDefault from '@ohos.hmAlarm'; // ← komentar baris ini bila SDK tak punya modulnya

// Beberapa SDK mengekspor konstruktor (dipakai `new`), sebagian lain langsung
// mengekspor objek berisi setAlarm/cancel. Keduanya diteruskan apa adanya.
export var HmAlarm = HmAlarmDefault;
