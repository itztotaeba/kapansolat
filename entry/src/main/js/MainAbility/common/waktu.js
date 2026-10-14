/**
 * ============================================================================
 * waktu.js — Fungsi bantu tanggal & waktu (murni JavaScript, tanpa library)
 * ============================================================================
 * Semua perhitungan memakai jam SISTEM perangkat (Date), karena aplikasi
 * offline dan tidak punya akses internet. Ringan, tanpa proses berat.
 * ============================================================================
 */

import { JADWAL_SHOLAT, DAFTAR_WAKTU, NAMA_TAMPIL } from './jadwal-sholat.js';

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

/** 'JJ:MM' -> total menit sejak tengah malam (0..1439). Tidak valid -> -1 */
export function timeToMenit(str) {
  if (!str || typeof str !== 'string') return -1;
  var p = str.split(':');
  if (p.length !== 2) return -1;
  var j = parseInt(p[0], 10);
  var m = parseInt(p[1], 10);
  if (isNaN(j) || isNaN(m) || j < 0 || j > 23 || m < 0 || m > 59) return -1;
  return j * 60 + m;
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
  for (var i = 0; i < JADWAL_SHOLAT.length; i++) {
    if (JADWAL_SHOLAT[i].tanggal === keyTanggal) return JADWAL_SHOLAT[i];
  }
  return null;
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
  var besok = new Date(now.getTime());
  besok.setDate(besok.getDate() + 1);
  var recBesok = cariJadwal(tanggalKey(besok));

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
      // waktu berikutnya hari ini
      it.status = selisih <= 10 ? 'berlangsung' : 'mendatang';
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
 * Kumpulan kejadian pengingat H-10 menit mulai saat `now` sampai akhir hari BESOK.
 * Dipakai oleh Metode A (cek berkala) dan Metode B (alarm sistem).
 *
 * Perhitungan memakai EPOCH-MENIT absolut (menit sejak 1 Jan 1970 UTC):
 *   epochMenit(d) = Math.floor(d.getTime() / 60000)
 * Karena jam & tanggal dibuat dari objek Date yang SAMA (zona waktu lokal),
 * selisih epoch-menit selalu akurat — bahkan saat melewati tengah malam,
 * pergantian bulan, atau perubahan DST. Ini menghindari jebakan umum
 * "menit-siang-malam" yang salah bila tanggal record ≠ tanggal sistem.
 *
 * Mengembalikan array terurut terdekat-dulu:
 * { id, tanggalKey, waktuKey, nama, masuk:'JJ:MM', triggerMenit }
 * triggerMenit = berapa MENIT lagi alarm harus berbunyi (>= 0).
 */
export function kejadianPengingat(now, menitSebelum) {
  var keluar = [];
  var nowEpoch = Math.floor(now.getTime() / 60000);

  // helper: epoch-menit utk 'JJ:MM' pada hari objek Date tertentu (waktu lokal)
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

  for (var h = 0; h < hariList.length; h++) {
    var hr = hariList[h];
    if (!hr.rec) continue;
    for (var i = 0; i < DAFTAR_WAKTU.length; i++) {
      var k = DAFTAR_WAKTU[i];
      var em = epochMenitPada(hr.d, hr.rec[k]);
      if (em < 0) continue;
      var trigger = (em - menitSebelum) - nowEpoch; // menit menuju alarm dr sekarang
      if (trigger < 0) continue;                    // sudah terlewat, lewati
      keluar.push({
        id: hr.key + '-' + k,
        tanggalKey: hr.key,
        waktuKey: k,
        nama: NAMA_TAMPIL[k],
        masuk: hr.rec[k],
        triggerMenit: trigger
      });
    }
  }
  // urutkan berdasarkan waktu trigger terdekat
  keluar.sort(function (a, b) { return a.triggerMenit - b.triggerMenit; });
  return keluar;
}
