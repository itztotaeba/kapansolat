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
    tidakTersedia: true, // kebalikan eksplisit (hindari operator '!' di binding)
    namaBerikutnya: '',
    waktuBerikutnya: '',
    sisaWaktu: '',
    jadwal: [] // [{nama, waktu, status, penanda}]
  },

  onInit() {
    // Proteksi total: exception saat memuat halaman TIDAK boleh lolos ke
    // runtime liteWearable (gejala bila lolos: layar blank hitam).
    try {
      this.refresh();
    } catch (e) {
      console.warn('[index] onInit dicegat: ' + e);
    }
  },

  onShow() {
    try {
      // Nyalakan kedua metode pengingat saat halaman tampil
      aktifkanSemuaMetode();
      this.refresh();
    } catch (e) {
      console.warn('[index] onShow dicegat: ' + e);
    }
  },

  onHide() {
    // Matikan timer Metode A; alarm sistem (Metode B) tetap bekerja sendiri
    try { hentikanPemantauan(); } catch (e) { console.warn('' + e); }
  },

  onDestroy() {
    try { hentikanPemantauan(); } catch (e) { console.warn('' + e); }
  },

  /** Hitung ulang seluruh data tampilan dari jam sistem + blok jadwal. */
  refresh() {
    var now = new Date();
    var st = statusHariIni(now);

    this.tanggalHariIni = formatTanggalID(now);
    this.jamSekarang = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
    this.tersedia = st.tersedia;
    this.tidakTersedia = !st.tersedia;

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

      // Daftar 5 waktu + penanda status.
      // PENTING (LiteWearable): class selector di HML tidak mendukung data
      // binding, jadi tampilan per-status dibawa lewat atribut warna/opacity
      // yang di-binding langsung ke field di bawah ini.
      var daftar = [];
      for (var i = 0; i < st.daftar.length; i++) {
        var it = st.daftar[i];
        var t = temaStatus(it.status);
        daftar.push({
          nama: it.nama,
          waktu: it.waktu || '--:--',
          status: it.status,
          penanda: penandaStatus(it),
          bg: t.bg,
          warnaTeks: t.teks,
          warnaPenanda: t.penanda,
          opacity: t.opacity
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

/** ✓ lewat | ▶ berlangsung/masuk waktu | ➜ berikutnya/mendatang */
function penandaStatus(it) {
  if (it.status === 'lewat') return '✓';
  if (it.status === 'berlangsung') return '▶';
  return '➜';
}

/** Palet warna per-status (dipakai binding atribut, bukan pergantian kelas —
    karena class selector LiteWearable tidak mendukung data binding).
    opacity dikirim sebagai STRING agar runtime liteWearable menerima tipe
    yang paling andal untuk nilai atribut. */
function temaStatus(status) {
  if (status === 'lewat') {
    // redup agar fokus pada waktu yang tersisa
    return { bg: '#000000', teks: '#5f6368', penanda: '#5f6368', opacity: '1' };
  }
  if (status === 'berlangsung') {
    // masa 10 menit menjelang masuk waktu (hijau)
    return { bg: '#0d3320', teks: '#6ee7a0', penanda: '#6ee7a0', opacity: '1' };
  }
  // mendatang / berikutnya
  return { bg: '#101418', teks: '#e8eaed', penanda: '#7ec8ff', opacity: '1' };
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
