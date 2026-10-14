/**
 * ============================================================================
 *  jadwal-sholat.js  -  SUMBER DATA JADWAL SHOLAT (100% OFFLINE)
 *  Aplikasi Jadwal Sholat & Pengingat - Huawei Watch GT 7 Pro (LiteWearable)
 * ============================================================================
 *
 *  >>> BAGIAN YANG WAJIB ANDA ISI: blok `JADWAL_SHOLAT` di bawah <<<
 *
 *  CARA PAKAI:
 *  1. Isi data jadwal dengan format yang sudah disediakan (3 hari contoh terisi).
 *  2. Sediakan minimal 30 hari ke depan agar pengingat tidak bolong-bolong.
 *  3. Saat pindah bulan / ganti jadwal, CUKUP ganti blok data ini saja —
 *     seluruh logika aplikasi (tampilan, countdown, alarm) otomatis mengikuti.
 *  4. Setelah mengubah file ini, build & install ulang aplikasi (lihat README.md).
 *
 *  CATATAN:
 *  - Tidak ada akses internet sama sekali; semua data berasal dari file ini.
 *  - Tanggal harus unik dan berformat 'YYYY-MM-DD' (mengikuti tanggal sistem jam).
 *  - Waktu berformat 'JJ:MM' (24 jam), contoh: '04:35', '18:02'.
 */

// ============================================================================
// ████████████████████████████████████████████████████████████████████████████
// ██  ⬇⬇⬇  MULAI DATA JADWAL — GANTI / TAMBAHKAN BARIS DI DALAM ARRAY  ⬇⬇⬇  ██
// ████████████████████████████████████████████████████████████████████████████
var JADWAL_SHOLAT = [
  // ------- CONTOH SAMPEL 3 HARI (silakan uji coba dengan data ini dulu) -----
  { tanggal: '2026-10-14', subuh: '04:32', zuhur: '11:45', ashar: '15:10', maghrib: '17:58', isya: '19:11' },
  { tanggal: '2026-10-15', subuh: '04:32', zuhur: '11:45', ashar: '15:10', maghrib: '17:58', isya: '19:11' },
  { tanggal: '2026-10-16', subuh: '04:31', zuhur: '11:44', ashar: '15:10', maghrib: '17:58', isya: '19:11' },

  // ══════════════════════════════════════════════════════════════════════════
  // ▓▓▓ RUANG UNTUK ±30 HARI KE DEPAN — ISI DATA ASLI DI SINI ▓▓▓
  // Template baris (salin & sesuaikan):
  //
  // { tanggal: 'YYYY-MM-DD', subuh: 'JJ:MM', zuhur: 'JJ:MM', ashar: 'JJ:MM', maghrib: 'JJ:MM', isya: 'JJ:MM' },
  //
  // Contoh pengisian:
  // { tanggal: '2026-10-17', subuh: '04:31', zuhur: '11:44', ashar: '15:09', maghrib: '17:57', isya: '19:10' },
  // { tanggal: '2026-10-18', subuh: '04:31', zuhur: '11:44', ashar: '15:09', maghrib: '17:57', isya: '19:10' },
  // ...dan seterusnya sampai minimal 30 hari ke depan.
  // ══════════════════════════════════════════════════════════════════════════
];
// ████████████████████████████████████████████████████████████████████████████
// ██  ⬆⬆⬆  AKHIR DATA JADWAL — JANGAN UBAH FORMAT DI BAWAH INI  ⬆⬆⬆          ██
// ████████████████████████████████████████████████████████████████████████████

// ============================================================================
// STRUKTUR PENDUKUNG (tidak perlu diubah)
// ============================================================================

/** Daftar nama sholat, urut sesuai waktu dalam satu hari. */
var DAFTAR_SHOLAT = ['subuh', 'zuhur', 'ashar', 'maghrib', 'isya'];

/** Label tampilan untuk tiap sholat. */
var LABEL_SHOLAT = {
  subuh: 'Subuh',
  zuhur: 'Zuhur',
  ashar: 'Ashar',
  maghrib: 'Maghrib',
  isya: 'Isya'
};

/** Nama hari dalam Bahasa Indonesia (indeks = getDay()). */
var NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** Nama bulan dalam Bahasa Indonesia (indeks = getMonth()). */
var NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Konversi string waktu 'JJ:MM' -> total menit sejak tengah malam.
 * @param {string} hhmm contoh '04:35'
 * @returns {number} menit (0..1439), atau -1 bila format salah
 */
function timeToMenit(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return -1;
  var parts = hhmm.split(':');
  if (parts.length !== 2) return -1;
  var h = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return -1;
  return h * 60 + m;
}

/**
 * Konversi total menit sejak tengah malam -> string 'JJ:MM'.
 * @param {number} menit
 * @returns {string}
 */
function menitToTime(menit) {
  var m = ((menit % 1440) + 1440) % 1440; // normalisasi
  var h = Math.floor(m / 60);
  var mm = m % 60;
  return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
}

/**
 * Format objek Date menjadi kunci 'YYYY-MM-DD' (waktu lokal).
 * @param {Date} d
 * @returns {string}
 */
function dateToStr(d) {
  var y = d.getFullYear();
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

/**
 * Ambil objek jadwal untuk tanggal tertentu.
 * @param {Date} d objek Date (pakai komponen lokal)
 * @returns {object|null} baris jadwal atau null bila belum diisi
 */
function getJadwalTanggal(d) {
  var key = dateToStr(d);
  for (var i = 0; i < JADWAL_SHOLAT.length; i++) {
    if (JADWAL_SHOLAT[i].tanggal === key) return JADWAL_SHOLAT[i];
  }
  return null;
}

/**
 * Menit saat ini sejak tengah malam (0..1439) berdasarkan jam sistem.
 * @param {Date} d
 * @returns {number}
 */
function menitSekarang(d) {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Bangun objek Date untuk tanggal `d` pada waktu 'JJ:MM'.
 * Dipakai untuk mendaftarkan alarm hmAlarm.
 * @param {Date} d tanggal acuan
 * @param {string} hhmm waktu 'JJ:MM'
 * @returns {Date}
 */
function datePadaWaktu(d, hhmm) {
  var t = timeToMenit(hhmm);
  if (t < 0) t = 0;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(),
    Math.floor(t / 60), t % 60, 0, 0);
}

/**
 * Ringkasan status sholat hari ini — dipakai layar utama & pengingat Metode A.
 *
 * Mengembalikan:
 * {
 *   tersedia   : boolean,      // data jadwal hari ini ditemukan?
 *   jadwal     : object|null,  // baris jadwal mentah
 *   items      : [ {key,label,waktu,menit,status} ],  // per sholat
 *   berikutnya : {key,label,waktu,menit}|null,       // sholat terdekat yg akan datang
 *   selangMenit: number,       // sisa menit menuju `berikutnya`
 *   detikPersis: number        // sisa detik persis
 * }
 * status: 'lewat' | 'berlangsung' | 'akan'
 * ('berlangsung' = tepat pada menit masuk; setelah itu dianggap 'lewat' utk list,
 *  tetapi tetap ditandai berlangsung selama 90 menit pada field `sedangBerlangsung`)
 *
 * @param {Date} now
 * @returns {object}
 */
function statusSholatHariIni(now) {
  var jd = getJadwalTanggal(now);
  var res = {
    tersedia: !!jd,
    jadwal: jd,
    items: [],
    berikutnya: null,
    selangMenit: -1,
    detikPersis: -1,
    sedangBerlangsung: null // {key,label,waktu} jika sedang dalam periode sholat
  };
  if (!jd) return res;

  var nowMenit = menitSekarang(now);
  var nowDetik = nowMenit * 60 + now.getSeconds();
  var idxBerikut = -1;
  var i, key, w, m;

  for (i = 0; i < DAFTAR_SHOLAT.length; i++) {
    key = DAFTAR_SHOLAT[i];
    w = jd[key];
    m = timeToMenit(w);
    if (m < 0) m = 0;
    var st = (nowMenit > m) ? 'lewat' : 'akan';
    if (st === 'akan' && idxBerikut < 0) idxBerikut = i;
    res.items.push({ key: key, label: LABEL_SHOLAT[key], waktu: w, menit: m, status: st });
  }

  // Periode "berlangsung": waktu masuk sudah tiba, tapi belum lebih dari 90 menit,
  // dan belum bergeser ke sholat berikutnya secara daftar.
  for (i = 0; i < res.items.length; i++) {
    var it = res.items[i];
    if (nowMenit >= it.menit && (nowMenit - it.menit) <= 90) {
      // cek apakah sudah lewat 90 mnt dari masuk → bukan berlangsung
      if (nowMenit > it.menit) {
        res.sedangBerlangsung = { key: it.key, label: it.label, waktu: it.waktu };
        it.status = 'berlangsung';
      } else {
        // tepat di menit masuk
        res.sedangBerlangsung = { key: it.key, label: it.label, waktu: it.waktu };
        it.status = 'berlangsung';
        if (idxBerikut === i) {
          // cari berikutnya setelah ini
          idxBerikut = -1;
          for (var j = i + 1; j < res.items.length; j++) {
            if (res.items[j].status === 'akan') { idxBerikut = j; break; }
          }
        }
      }
      break; // hanya satu periode berlangsung
    }
  }

  if (idxBerikut >= 0) {
    var nb = res.items[idxBerikut];
    res.berikutnya = { key: nb.key, label: nb.label, waktu: nb.waktu, menit: nb.menit };
    res.detikPersis = nb.menit * 60 - nowDetik;
    if (res.detikPersis < 0) res.detikPersis = 0;
    res.selangMenit = Math.ceil(res.detikPersis / 60);
  } else {
    // Semua sholat hari ini sudah lewat -> berikutnya adalah Subuh besok.
    var besok = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    var jdBesok = getJadwalTanggal(besok);
    if (jdBesok) {
      var mBesok = timeToMenit(jdBesok.subuh);
      if (mBesok < 0) mBesok = 0;
      res.berikutnya = { key: 'subuh', label: 'Subuh (besok)', waktu: jdBesok.subuh, menit: mBesok };
      res.detikPersis = (1440 * 60 - nowDetik) + mBesok * 60;
      res.selangMenit = Math.ceil(res.detikPersis / 60);
    }
  }
  return res;
}

/**
 * Format selang waktu menjadi teks manusia, mis. "1 jam 15 menit".
 * @param {number} menit
 * @returns {string}
 */
function formatSelang(menit) {
  if (menit <= 0) return 'sekarang';
  var h = Math.floor(menit / 60);
  var m = menit % 60;
  if (h > 0 && m > 0) return h + ' jam ' + m + ' menit';
  if (h > 0) return h + ' jam';
  return m + ' menit';
}

/**
 * Format tanggal lengkap Bahasa Indonesia, mis. "Jumat, 14 Oktober 2026".
 * Otomatis menyesuaikan tanggal sistem jam.
 * @param {Date} d
 * @returns {string}
 */
function formatTanggalID(d) {
  return NAMA_HARI[d.getDay()] + ', ' + d.getDate() + ' ' +
    NAMA_BULAN[d.getMonth()] + ' ' + d.getFullYear();
}

/**
 * Hitung daftar alarm untuk SATU hari (Metode B):
 * 10 menit sebelum tiap waktu sholat, siap didaftarkan ke hmAlarm.
 * @param {object} row baris jadwal {tanggal, subuh, ...}
 * @param {number} offsetMenit default 10
 * @returns {Array<{key,label,jam,menit,labelAlarm}>}
 */
function hitungAlarmHarian(row, offsetMenit) {
  if (typeof offsetMenit !== 'number') offsetMenit = 10;
  var out = [];
  for (var i = 0; i < DAFTAR_SHOLAT.length; i++) {
    var key = DAFTAR_SHOLAT[i];
    var m = timeToMenit(row[key]);
    if (m < 0) continue;
    var target = m - offsetMenit;
    if (target < 0) target += 1440; // melewati tengah malam (sangat jarang)
    out.push({
      key: key,
      label: LABEL_SHOLAT[key],
      jam: Math.floor(target / 60),
      menit: target % 60,
      labelAlarm: LABEL_SHOLAT[key] + ' ' + offsetMenit + ' menit lagi (masuk ' + row[key] + ')'
    });
  }
  return out;
}

// Export untuk lingkungan HarmonyOS/LiteWearable (module.exports) dan
// fallback global agar bisa dipakai juga di browser/node saat pengujian.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    JADWAL_SHOLAT: JADWAL_SHOLAT,
    DAFTAR_SHOLAT: DAFTAR_SHOLAT,
    LABEL_SHOLAT: LABEL_SHOLAT,
    timeToMenit: timeToMenit,
    menitToTime: menitToTime,
    dateToStr: dateToStr,
    getJadwalTanggal: getJadwalTanggal,
    menitSekarang: menitSekarang,
    datePadaWaktu: datePadaWaktu,
    statusSholatHariIni: statusSholatHariIni,
    formatSelang: formatSelang,
    formatTanggalID: formatTanggalID,
    hitungAlarmHarian: hitungAlarmHarian
  };
}
