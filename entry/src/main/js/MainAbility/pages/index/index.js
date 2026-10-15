/**
 * ============================================================================
 * index.js — LOGIKA LAYAR UTAMA (versi FINAL: binding string skalar statis)
 * ============================================================================
 * Kenapa versi ini (riwayat masalah di jam pengguna):
 *   - Binding class  → DITOLAK compiler LegacyCompileLiteJS.
 *   - Binding atribut kustom background-color/color → runtime GT 7 Pro
 *     mengabaikannya → kotak tampil kosong/sebagian.
 *   - For-loop bersarang → tidak stabil per-render di firmware ini.
 *   Solusi: HML murni statis; JS hanya menyiapkan STRING BIASA per-field:
 *     tanggalHariIni, jamSekarang, pesanNext, waktuBerikutnya, sisaWaktu,
 *     subuhTeks ... isyaTeks — masing-masing SATU string gabungan
 *     "Nama-JJ:MM" (mis. 'Subuh-04:16'). Penanda status ✓/▶/➜ DIHAPUS
 *     sesuai permintaan pengguna.
 *   BUG "hanya Subuh & Zuhur yang tampil" (menetap hingga PR#27): ternyata
 *   dipicu struktur grid bertingkat (div .baris > div .sel > text) —
 *   firmware GT 7 Pro hanya me-render baris pertama. Kini HML memakai 5
 *   <text> LANGSUNG sebagai anak .grid (satu baris penuh per waktu), pola
 *   paling datar yang selalu ter-render. Sisi JS tidak berubah: kelima
 *   field Teks SELALU di-assign tiap refresh (dibuktikan simulasi node).
 *   Pola binding string skalar adalah yang paling dasar & selalu berhasil
 *   di semua versi liteWearable.
 *
 * Alur hidup:
 *   onInit/onShow : refresh data + nyalakan METODE A (timer 30 dtk) &
 *                   METODE B (alarm sistem hmAlarm, tetap jalan saat app
 *                   ditutup).
 *   onHide/onDestroy : hentikan timer saja (hemat baterai); alarm sistem
 *                   terus bekerja sendiri.
 * ============================================================================
 */

import { statusHariIni, formatTanggalID } from '../../common/waktu.js';
import { NAMA_TAMPIL } from '../../common/jadwal-sholat.js';
import { aktifkanSemuaMetode, hentikanPemantauan } from '../../common/pengingat.js';
import { daftarkanKonteksAlarm, getarPanjang } from '../../common/device-api.js';

// Kunci internal 5 waktu (samai urutan DAFTAR_WAKTU di waktu.js)
var KEYS = ['subuh', 'zuhur', 'ashar', 'maghrib', 'isya'];

export default {
  data: {
    // ---- Header & kartu "Menuju" ----
    tanggalHariIni: '',
    jamSekarang: '',
    tersedia: false,
    tidakTersedia: true,            // kebalikan eksplisit (hindari '!' di binding)
    pesanNext: '',                  // 'Menuju Ashar'
    waktuBerikutnya: '',            // '15:09'
    sisaWaktu: '',                  // '1 jam 15 menit lagi'

    // ---- Grid 5 waktu: SATU string gabungan "Nama-JJ:MM" per kotak ----
    // (Penanda ✓/▶/➜ dihapus sesuai permintaan; struktur 1-teks menjamin
    //  kelima kotak ter-render — versi 3-kolom sebelumnya bikin sebagian
    //  kotak hilang hanya menampilkan Subuh & Zuhur di GT 7 Pro.)
    subuhTeks: 'Subuh--:--',    zuhurTeks: 'Zuhur--:--',
    asharTeks: 'Ashar--:--',    maghribTeks: 'Maghrib--:--',
    isyaTeks: 'Isya--:--'
  },

  onInit() {
    // Proteksi total: exception saat memuat halaman TIDAK boleh lolos ke
    // runtime liteWearable (gejala bila lolos: layar blank hitam).
    try {
      daftarkanKonteksAlarm(this);  // memungkinkan jalur requireNapi('hmAlarm')
      this.refresh();
    } catch (e) {
      console.warn('[index] onInit dicegat: ' + e);
    }
  },

  onShow() {
    try {
      daftarkanKonteksAlarm(this);
      aktifkanSemuaMetode();        // Metode A + Metode B
      this.refresh();
      // Uji-getar ±8 detik setelah dibuka = bukti API vibrator hidup.
      setTimeout(aman(function () {
        console.info('[index] uji-getar: mengirim pola panjang');
        getarPanjang();
      }), 8000);
    } catch (e) {
      console.warn('[index] onShow dicegat: ' + e);
    }
  },

  onHide() {
    try { hentikanPemantauan(); } catch (e) { console.warn('' + e); }
  },

  onDestroy() {
    try { hentikanPemantauan(); } catch (e) { console.warn('' + e); }
  },

  /** Hitung ulang SELURUH field tampilan dari jam sistem + blok jadwal. */
  refresh() {
    var now = new Date();
    var st = statusHariIni(now);

    this.tanggalHariIni = formatTanggalID(now);
    this.jamSekarang = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
    this.tersedia = st.tersedia;
    this.tidakTersedia = !st.tersedia;

    if (!st.tersedia) {
      // Jadwal belum diisi untuk hari ini → reset teks grid ke '--:--'.
      this.pesanNext = '';
      this.waktuBerikutnya = '';
      this.sisaWaktu = '';
      for (var i = 0; i < KEYS.length; i++) {
        this[KEYS[i] + 'Teks'] = Capital(KEYS[i]) + '--:--';
      }
      return;
    }

    // ---- Kartu "Menuju ..." (info utama) ----
    if (st.berikutnya) {
      this.pesanNext = 'Menuju ' + st.berikutnya.nama + (st.berikutnya.besok ? ' (besok)' : '');
      this.waktuBerikutnya = st.berikutnya.waktu;
      this.sisaWaktu = hitungSisa(st.berikutnya.selangMenit);
    } else {
      this.pesanNext = 'Semua selesai';
      this.waktuBerikutnya = '--:--';
      this.sisaWaktu = 'Jadwal hari ini selesai';
    }

    // ---- Grid 5 waktu: SATU string gabungan per kotak, format "Nama-JJ:MM"
    //      (mis. 'Subuh-04:16'). Kelima key KEYS selalu di-assign tiap
    //      refresh — tanpa penanda ✓/▶/➜, sesuai permintaan pengguna. ----
    for (var j = 0; j < KEYS.length; j++) {
      var it = (j < st.daftar.length) ? st.daftar[j] : null;
      var nama = it ? it.nama : NAMA_TAMPIL[KEYS[j]];
      var jam = (it && it.waktu) ? it.waktu : '--:--';
      this[KEYS[j] + 'Teks'] = nama + '-' + jam;
    }
  }
};

/* ----------------------------- fungsi kecil ------------------------------- */
function pad2(n) { return (n < 10 ? '0' + n : '' + n); }

function Capital(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/** Pembungkus aman callback timer — exception tidak boleh lolos ke runtime. */
function aman(fn) {
  return function () {
    try { fn(); } catch (e) { console.warn('[index] timer dicegat: ' + e); }
  };
}

/** "1 jam 15 menit lagi" (ringkas utk layar jam) */
function hitungSisa(menit) {
  if (menit <= 0) return 'Tepat waktu!';
  var j = Math.floor(menit / 60);
  var m = menit % 60;
  if (j === 0) return m + ' menit lagi';
  if (m === 0) return j + ' jam lagi';
  return j + ' jam ' + m + ' menit lagi';
}
