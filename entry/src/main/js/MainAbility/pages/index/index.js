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
import { aktifkanSemuaMetode, hentikanPemantauan, teksStatusPengingat } from '../../common/pengingat.js';
import { daftarkanKonteksAlarm } from '../../common/device-api.js';

export default {
  data: {
    tanggalHariIni: '',
    jamSekarang: '',
    tersedia: false,
    tidakTersedia: true, // kebalikan eksplisit (hindari operator '!' di binding)
    pesanNext: '',   // satu string utuh 'Menuju Ashar' (hindari binding dua token)
    waktuBerikutnya: '',
    sisaWaktu: '',
    jadwal: [], // [{nama,waktu,status,penanda,bg,rim,dome,warnaTeks,warnaPenanda}]
    statusPengingat: '', // teks kartu Metode B (satu string utuh)
    warnaAlarm: '#7fdca4'
  },

  onInit() {
    // Proteksi total: exception saat memuat halaman TIDAK boleh lolos ke
    // runtime liteWearable (gejala bila lolos: layar blank hitam).
    try {
      // beri detektor hmAlarm akses this.requireNapi (JALUR 3)
      daftarkanKonteksAlarm(this);
      this.refresh();
    } catch (e) {
      console.warn('[index] onInit dicegat: ' + e);
    }
  },

  onShow() {
    try {
      daftarkanKonteksAlarm(this);
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
        this.pesanNext = 'Menuju ' + st.berikutnya.nama + (st.berikutnya.besok ? ' (besok)' : '');
        this.waktuBerikutnya = st.berikutnya.waktu;
        this.sisaWaktu = hitungSisa(st.berikutnya.selangMenit);
      } else {
        this.pesanNext = 'Menuju —';
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
          rim: t.rim,
          dome: t.dome,
          warnaTeks: t.teks,
          warnaPenanda: t.penanda
        });
      }
      this.jadwal = daftar;

      // Kartu status Metode B: SATU string utuh + warna, selalu terisi
      // (tidak pernah lagi menampilkan pesan 'modul alarm tak tersedia').
      try {
        this.statusPengingat = teksStatusPengingat();
        this.warnaAlarm = '#7fdca4';
      } catch (e) {
        this.statusPengingat = '⚙ Pengingat berjalan';
        this.warnaAlarm = '#9fb0c3';
      }
    } else {
      this.jadwal = [];
      this.pesanNext = '';
      this.waktuBerikutnya = '';
      this.sisaWaktu = '';
      try { this.statusPengingat = teksStatusPengingat(); } catch (e) { this.statusPengingat = '⚙ Pengingat berjalan'; }
      this.warnaAlarm = '#9fb0c3';
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

/** Palet per-status untuk kartu glass (dipakai binding atribut, bukan kelas —
    class selector LiteWearable tidak mendukung data binding). `rim` = warna
    border tipis yang memberi kesan tepi kaca. opacity dikirim sebagai STRING
    agar runtime liteWearable menerima tipe atribut yang paling andal. */
function temaStatus(status) {
  if (status === 'lewat') {
    // kartu kaca redup agar fokus pada waktu yang tersisa
    return { bg: '#0a0e15', rim: '#1d2530', dome: '#2a3644', teks: '#67707b', penanda: '#67707b' };
  }
  if (status === 'berlangsung') {
    // masa H-10 menit menjelang masuk waktu (glass hijau)
    return { bg: '#103524', rim: '#3ddc84', dome: '#4fe08f', teks: '#b9f5d3', penanda: '#6ee7a0' };
  }
  // berikutnya / mendatang — glass biru seperti kartu utama
  return { bg: '#152a45', rim: '#4a6fa5', dome: '#55719a', teks: '#eaf1f8', penanda: '#9ed4ff' };
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
