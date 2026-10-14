/**
 * ============================================================================
 * index.js — LOGIKA LAYAR UTAMA
 * ============================================================================
 * Alur:
 *   onInit      : siapkan data awal.
 *   onShow      : jalankan METODA A (timer 30 dtk) + METODA B (hmAlarm),
 *                 lalu refresh tampilan.
 *   onHide/
 *   onDestroy   : hentikan timer (hemat baterai; aplikasi toh tidak boleh
 *                 berjalan di latar belakang).
 *
 * Refresh tampilan cukup tiap 30 detik — perubahan menit baru terlihat
 * setiap 1 menit, jadi interval ini sudah lebih dari cukup dan ringan.
 * ============================================================================
 */

import { statusHariIni, formatTanggalID } from '../../common/waktu.js';
import { aktifkanSemuaMetode, hentikanPemantauan } from '../../common/pengingat.js';

export default {
  data: {
    tanggalHariIni: '',
    jamSekarang: '',
    tersedia: false,
    namaBerikutnya: '',
    waktuBerikutnya: '',
    sisaWaktu: '',
    jadwal: [] // [{nama, waktu, status, penanda}]
  },

  onInit() {
    this.refresh();
  },

  onShow() {
    // Nyalakan kedua metode pengingat saat halaman tampil
    aktifkanSemuaMetode();
    this.refresh();
  },

  onHide() {
    // Matikan timer Metode A; alarm sistem (Metode B) tetap bekerja sendiri
    hentikanPemantauan();
  },

  onDestroy() {
    hentikanPemantauan();
  },

  /** Hitung ulang seluruh data tampilan dari jam sistem + blok jadwal. */
  refresh() {
    var now = new Date();
    var st = statusHariIni(now);

    this.tanggalHariIni = formatTanggalID(now);
    this.jamSekarang = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
    this.tersedia = st.tersedia;

    if (st.tersedia) {
      // Kartu berikutnya
      if (st.berikutnya) {
        this.namaBerikutnya = st.berikutnya.nama + (st.berikutnya.besok ? ' (besok)' : '');
        this.waktuBerikutnya = st.berikutnya.waktu;
        this.sisaWaktu = hitungSisa(st.berikutnya.selangMenit);
      } else {
        this.namaBerikutnya = '-';
        this.waktuBerikutnya = '--:--';
        this.sisaWaktu = 'Jadwal hari ini selesai';
      }

      // Daftar 5 waktu + penanda status
      var daftar = [];
      for (var i = 0; i < st.daftar.length; i++) {
        var it = st.daftar[i];
        daftar.push({
          nama: it.nama,
          waktu: it.waktu || '--:--',
          status: it.status,
          penanda: penandaStatus(it)
        });
      }
      this.jadwal = daftar;
    } else {
      this.jadwal = [];
      this.namaBerikutnya = '';
      this.waktuBerikutnya = '';
      this.sisaWaktu = '';
    }
  }
};

/* ----------------------------- fungsi kecil ------------------------------- */
function pad2(n) { return (n < 10 ? '0' + n : '' + n); }

/** ✓ lewat | ▶ berlangsung/masuk waktu | ➜ berikutnya | • mendatang */
function penandaStatus(it) {
  if (it.status === 'lewat') return '✓';
  if (it.status === 'berlangsung') return '▶';
  return '➜';
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
