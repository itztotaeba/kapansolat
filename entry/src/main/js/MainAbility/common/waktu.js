/**
 * ============================================================================
 * waktu.js — Fungsi bantu tanggal & waktu (murni JavaScript, tanpa library)
 * ============================================================================
 * Semua perhitungan memakai jam SISTEM perangkat (Date), karena aplikasi
 * offline dan tidak punya akses internet. Ringan, tanpa proses berat.
 * ============================================================================
 */

import { JADWAL_SHOLAT, DAFTAR_WAKTU, NAMA_TAMPIL, MENIT_SEBELUM } from './jadwal-sholat.js';

/* ---- Indeks jadwal O(1) --------------------------------------------------
 * cariJadwal() dulu memindai SELURUH array pada setiap pemanggilan; dengan
 * data 30–400 hari dan siklus cek tiap 30 detik, ini pemborosan CPU di jam.
 * Peta 'YYYY-MM-DD' -> record dibangun sekali per isi data (penanda panjang
 * array — pembaruan selalu lewat penggantian blok data + build ulang). */
var _indeksJadwal = null;
var _indeksLen = -1;
function _punyaIndeksJadwal() {
  if (_indeksJadwal === null || _indeksLen !== JADWAL_SHOLAT.length) {
    _indeksJadwal = {};
    for (var i = 0; i < JADWAL_SHOLAT.length; i++) {
      var r = JADWAL_SHOLAT[i];
      if (r && typeof r.tanggal === 'string') _indeksJadwal[r.tanggal] = r;
    }
    _indeksLen = JADWAL_SHOLAT.length;
  }
  return _indeksJadwal;
}

/* ---------------------- Nama hari & bulan bahasa Indonesia ---------------- */
export const NAMA_HARI = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Tanggal lokal dalam format kunci data: 'YYYY-MM-DD'.
 * (Memakai komponen lokal Date, bukan UTC, agar cocok dengan jam displayed.)
 */
export function tanggalKey(d) {
  var y = d.getFullYear();
  var m = d.getMonth() + 1;
  var h = d.getDate();
  return y + '-' + (m < 10 ? '0' + m : '' + m) + '-' + (h < 10 ? '0' + h : '' + h);
}

/** Format tanggal tampil, contoh: "Jumat, 16 Oktober 2026" */
export function formatTanggalID(d) {
  return NAMA_HARI[d.getDay()] + ', ' + d.getDate() + ' ' + NAMA_BULAN[d.getMonth()] + ' ' + d.getFullYear();
}

/** Cache hasil parsing 'JJ:MM' — waktu yang sama muncul berulang kali tiap
 *  siklus cek; pemetaan string->menit jauh lebih murah daripada split+parseInt. */
var _cacheMenit = {};
var _cacheMenitN = 0;

/** 'JJ:MM' -> total menit sejak tengah malam (0..1439). Tidak valid -> -1 */
export function timeToMenit(str) {
  if (!str || typeof str !== 'string') return -1;
  if (_cacheMenitN > 512) { _cacheMenit = {}; _cacheMenitN = 0; } // batasi memori
  var hit = _cacheMenit[str];
  if (hit !== undefined) return hit;
  var hasil;
  if (/^\d{2}:\d{2}$/.test(str)) {
    // Parsing numerik langsung (tanpa alokasi array split)
    var jj = (+str.charAt(0)) * 10 + (+str.charAt(1));
    var mm = (+str.charAt(3)) * 10 + (+str.charAt(4));
    hasil = (jj <= 23 && mm <= 59) ? jj * 60 + mm : -1;
  } else {
    hasil = -1;
  }
  _cacheMenit[str] = hasil;
  _cacheMenitN++;
  return hasil;
}

/** Total menit -> 'JJ:MM' */
export function menitToTime(menit) {
  var x = ((menit % 1440) + 1440) % 1440; // normalisasi ke 0..1439
  var j = Math.floor(x / 60);
  var m = x % 60;
  return (j < 10 ? '0' + j : '' + j) + ':' + (m < 10 ? '0' + m : '' + m);
}

/** Menit sekarang sejak tengah malam (waktu sistem) */
export function menitSekarang(d) {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Selang waktu menjadi teks ringkas untuk layar jam.
 * Contoh: 75 -> "1 jam 15 menit", 10 -> "10 menit", 60 -> "1 jam".
 */
export function formatSelang(totalMenit) {
  if (totalMenit <= 0) return 'tepat waktu';
  var j = Math.floor(totalMenit / 60);
  var m = totalMenit % 60;
  if (j === 0) return m + ' menit';
  if (m === 0) return j + ' jam';
  return j + ' jam ' + m + ' menit';
}

/** Ambil record jadwal untuk tanggal key tertentu; null jika belum diisi */
export function cariJadwal(keyTanggal) {
  var idx = _punyaIndeksJadwal();
  var r = idx[keyTanggal];
  return r || null;
}

/** Record jadwal berikutnya setelah `key` yang ada di data; null bila habis */
export function jadwalBerikutnya(keyTanggal) {
  var terbaik = null;
  for (var i = 0; i < JADWAL_SHOLAT.length; i++) {
    var r = JADWAL_SHOLAT[i];
    if (r.tanggal > keyTanggal) {
      if (terbaik === null || r.tanggal < terbaik.tanggal) terbaik = r;
    }
  }
  return terbaik;
}

/**
 * Status lengkap satu hari untuk tampilan utama.
 * Mengembalikan:
 * {
 *   tersedia   : boolean,          // data hari ini ada?
 *   daftar     : [ {key, nama, waktu, menit, status, selangMenit}, ... ],
 *   berikutnya : {key,nama,waktu,selangMenit,...} | null,
 *   pesanBerikut : string | null   // mis. "Ashar: 1 jam 15 menit lagi"
 * }
 * status per sholat: 'lewat' | 'berlangsung' | 'mendatang'
 * ('berlangsung' = masa 10 menit menjelang masuk waktu)
 */
export function statusHariIni(now) {
  var key = tanggalKey(now);
  var rec = cariJadwal(key);
  var hasil = { tersedia: !!rec, daftar: [], berikutnya: null, pesanBerikut: null };
  if (!rec) return hasil;

  var kini = menitSekarang(now);

  // Bangun daftar 5 waktu + tentukan mana yang berikutnya (termasuk besok Subuh)
  var besokD = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0);
  var recBesok = cariJadwal(tanggalKey(besokD));

  var items = [];
  for (var i = 0; i < DAFTAR_WAKTU.length; i++) {
    var k = DAFTAR_WAKTU[i];
    var mt = timeToMenit(rec[k]);
    items.push({ key: k, nama: NAMA_TAMPIL[k], waktu: rec[k], menit: mt });
  }

  var foundNext = false;
  for (var j = 0; j < items.length; j++) {
    var it = items[j];
    if (it.menit < 0) {
      it.status = 'mendatang';
      it.selangMenit = -1;
      continue;
    }
    var selisih = it.menit - kini;
    if (selisih <= 0 && !(foundNext)) {
      // sudah lewat ATAU sedang berlangsung (<=10 mnt sebelum, dicek di bawah)
      it.status = 'lewat';
      it.selangMenit = 0;
    } else if (!foundNext) {
      // waktu berikutnya hari ini — jendela 'berlangsung' memakai
      // MENIT_SEBELUM yang sama dengan pengingat (bukan angka 10 patokan),
      // agar status layar & notifikasi konsisten bila nilai diubah.
      it.status = selisih <= MENIT_SEBELUM ? 'berlangsung' : 'mendatang';
      it.selangMenit = selisih;
      foundNext = true;
      hasil.berikutnya = it;
    } else {
      it.status = 'mendatang';
      it.selangMenit = selisih;
    }
  }

  // Jika semua hari ini sudah lewat -> berikutnya = Subuh besok
  if (!foundNext && recBesok) {
    var mtB = timeToMenit(recBesok.subuh);
    var selangB = (mtB < 0) ? -1 : (1440 - kini) + mtB;
    hasil.berikutnya = {
      key: 'subuh', nama: NAMA_TAMPIL.subuh, waktu: recBesok.subuh,
      menit: mtB, status: 'mendatang', selangMenit: selangB, besok: true
    };
  }

  if (hasil.berikutnya && hasil.berikutnya.selangMenit >= 0) {
    var b = hasil.berikutnya;
    hasil.pesanBerikut = b.nama + (b.besok ? ' (besok)' : '') + ': ' +
      formatSelang(b.selangMenit) + ' lagi';
  }

  hasil.daftar = items;
  return hasil;
}

/**
 * Kumpulan kejadian pengingat H-`menitSebelum` menit mulai hari ini sampai
 * akhir BESOK (maksimal 10 — batas kapasitas alarm liteWearable).
 * Dipakai oleh Metode A (cek berkala dalam aplikasi) dan Metode B (alarm
 * sistem hmAlarm harian).
 *
 * Karena Metode B memakai alarm REPEAT-HARIAN (hour+minute lokal, bukan
 * hitung mundur epoch), yang dibutuhkan tiap kejadian adalah:
 *   triggerJam        : jam LOCAL saat alarm harus berbunyi (0..23)
 *   triggerMenitLokal : menit LOCAL (0..59)
 *   selangMenit       : perkiraan menit menuju trigger dari `now` (Metode A)
 * Perhitungan selang memakai EPOCH-MENIT absolut agar akurat lintas tengah
 * malam / ganti bulan / DST.
 *
 * Mengembalikan array terurut terdekat-dulu.
 */
export function kejadianPengingat(now, menitSebelum) {
  var keluar = [];
  var nowEpoch = Math.floor(now.getTime() / 60000);

  // helper: epoch-menit utk 'JJ:MM' pada hari objek Date tertentu (lokal)
  function epochMenitPada(dHari, strWaktu) {
    var mt = timeToMenit(strWaktu);
    if (mt < 0) return -1;
    var t = new Date(dHari.getFullYear(), dHari.getMonth(), dHari.getDate(),
                     Math.floor(mt / 60), mt % 60, 0, 0);
    return Math.floor(t.getTime() / 60000);
  }

  var hariList = [
    { rec: cariJadwal(tanggalKey(now)), d: now, key: tanggalKey(now) }
  ];
  var besokD = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0);
  var keyBesok = tanggalKey(besokD);
  hariList.push({ rec: cariJadwal(keyBesok), d: besokD, key: keyBesok });

  // Validasi rentang menitSebelum (proteksi input — lihat setMenitSebelum):
  // nilai non-numerik/ekstrem menghasilkan trigger NaN yang diam-diam membuat
  // seluruh alarm ditolak firmware. Dibatasi ke rentang waras 0..720 (12 jam).
  var ms = parseInt(menitSebelum, 10);
  if (isNaN(ms) || ms < 0) ms = 0;
  if (ms > 720) ms = 720;

  for (var h = 0; h < hariList.length; h++) {
    var hr = hariList[h];
    if (!hr.rec) continue;
    for (var i = 0; i < DAFTAR_WAKTU.length; i++) {
      var k = DAFTAR_WAKTU[i];
      var mtMasuk = timeToMenit(hr.rec[k]);
      if (mtMasuk < 0) continue;
      var em = epochMenitPada(hr.d, hr.rec[k]);
      var selang = (em - ms) - nowEpoch; // menit menuju trigger dr sekarang
      // Jam/menit LOCAL trigger = waktu masuk dikurangi menitSebelum.
      // Alarm bersifat repeat-harian, jadi nilai "sudah lewat hari ini" pun
      // tetap valid (berbunyi besok pada jam yang sama) → TIDAK dilewati.
      var trigAbs = mtMasuk - ms;
      var wrap = trigAbs < 0;                       // melewati tengah malam (Subuh)
      var trigNorm = ((trigAbs % 1440) + 1440) % 1440;
      // Untuk Subuh, selang versi "besok" bila trigger hari ini sudah lewat
      if (selang < 0) selang += 1440;
      keluar.push({
        id: hr.key + '-' + k,
        tanggalKey: hr.key,
        waktuKey: k,
        nama: NAMA_TAMPIL[k],
        masuk: hr.rec[k],
        menitSebelum: ms,
        triggerJam: Math.floor(trigNorm / 60),
        triggerMenitLokal: trigNorm % 60,
        /* Hari ISO (1=Senin..7=Minggu) tanggal KEY kejadian — dipakai
           '@system.alarm' liteWearable untuk field `days`. Wrap tengah
           malam (alarm Subuh H-10 = 03:5x) tetap pada hari yang sama
           karena menit hanya mundur sedikit. */
        hariIso: ((hr.d.getDay() + 6) % 7) + 1,
        /* ALIAS untuk kompatibilitas pemanggil lama (device-api.js versi
           PR#7 memakai ev.triggerMenit sebagai delay-menit Metode A). */
        triggerMenit: selang >= 0 ? selang : 0,
        lewatiTengahMalam: wrap,
        selangMenit: selang
      });
    }
  }
  // urutkan berdasarkan waktu trigger terdekat, batasi kapasitas alarm
  keluar.sort(function (a, b) { return a.selangMenit - b.selangMenit; });
  if (keluar.length > 10) keluar = keluar.slice(0, 10);
  return keluar;
}
