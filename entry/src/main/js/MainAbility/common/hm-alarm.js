/**
 * ============================================================================
 * hm-alarm.js — Pembungkus SATU TITIK pemuatan modul alarm sistem hmAlarm
 * ============================================================================
 * File ini dicoba DIMUAT PALING AWAL oleh device-api.js (sebelum alarm.js),
 * sehingga bila firmware menyediakan modul '@ohos.hmAlarm', objeknya sudah
 * terdaftar ke mesin pemanggil (common/alarm-resmi.js) SEBELUM pemasangan
 * alarm pertama dilakukan.
 *
 * BILA BUILD DEV ECO MENOLAK modul '@ohos.hmAlarm' (SDK tanpa paket itu):
 * komentar SATU baris import di bawah lalu build ulang — jalur global
 * (globalThis.hmAlarm) dan requireNapi di common/alarm.js tetap dicoba
 * otomatis, aplikasi tidak crash.
 * ============================================================================
 */

// PERBAIKAN KRITIS "alarm tidak pernah bunyi":
//   1) Import statis '@ohos.hmAlarm' DIHAPUS. Pada banyak firmware liteWearable
//      modul itu TIDAK ada dalam registry paket JS → loader gagal memuat file
//      ini SEBELUM kode sempat jalan, dan karena device-api.js meng-import-nya,
//      RANTAI MODUL ALARM MATI TOTAL → hmAlarm global sekalipun tak pernah
//      dipakai. Deteksi kini lewat jalur runtime aman saja (globalThis,
//      requireNapi, '@system.alarm') — semuanya try/catch, tak bisa mematikan
//      rantai modul.
//   2) Bila SDK Anda MEMANG menyediakan paket '@ohos.hmAlarm', cukup
//      UNCOMMENT dua baris di blok opsional di bawah untuk mengaktifkan
//      JALUR 3 (statis).
import { daftarkanModulStatis } from './alarm-resmi.js';

/* ---- BLOK OPSIONAL JALUR 3 ( uncomment bila paket @ohos.hmAlarm tersedia
di SDK Anda dan build lolos ) ----------------------------------------------
import HmAlarmDefault from '@ohos.hmAlarm';
try { daftarkanModulStatis(HmAlarmDefault); } catch (e) { /* noop */ }
-------------------------------------------------------------------------- */

// Catatan: tanpa import statis, tidak ada objek yang perlu didaftarkan di
// sini. Registrasi modul terjadi lewat deteksi runtime (common/alarm.js):
// globalThis.hmAlarm → requireNapi('hmAlarm') → '@system.alarm'.
// File ini tetap dipelihara sebagai titik masuk JALUR 3 opsional (blok
// comment di atas) agar dokumentasi cara mengaktifkannya mudah ditemukan.
