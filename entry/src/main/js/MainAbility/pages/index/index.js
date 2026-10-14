/**
 * ============================================================================
 * index.js — LOGIKA LAYAR UTAMA (versi bersih, semua dalam box)
 * ============================================================================
 * Alur:
 *   onInit      : siapkan data awal + daftarkan konteks halaman utk hmAlarm.
 *   onShow      : jalankan METODE A (timer 30 dtk) + METODE B (hmAlarm),
 *                 lalu refresh tampilan.
 *   onHide/
 *   onDestroy   : hentikan timer (hemat baterai; aplikasi tidak berjalan di
 *                 latar belakang). Alarm sistem tetap bekerja sendiri.
 * Refresh cukup tiap 30 detik — perubahan menit baru terlihat tiap 1 menit.
 *
 * Perubahan vs versi lama (permintaan pengguna):
 *   - jam pada kartu "Menuju" diperkecil & sejajar label (lihat CSS) agar
 *     tidak menutupi hitung mundur;
 *   - tiap kotak grid = NAMA + JAM sholat (tanpa penanda ✓/▶/➜, tanpa dome);
 *   - box status pengingat setelah Isya DIHAPUS; info singkat berikutnya
 *     menempati kotak ke-6 grid.
 * ============================================================================
 */

import { statusHariIni, formatTanggalID } from '../../common/waktu.js';
import { aktifkanSemuaMetode, hentikanPemantauan } from '../../common/pengingat.js';
import { daftarkanKonteksAlarm } from '../../common/device-api.js';

export default {
  data: {
    tanggalHariIni: '',
    jamSekarang: '',
    tersedia: false,
    tidakTersedia: true, // kebalikan eksplisit (hindari operator '!' di binding)
    pesanNext: '',       // satu string utuh 'Menuju Ashar'
    waktuBerikutnya: '', // jam sholat berikutnya (font kecil, sejajar label)
    sisaWaktu: '',       // hitung mundur 'x jam y menit lagi'
    jadwal: [],          // [{nama,waktu,status,bg,warnaTeks,warnaJam}]
    infoJudul: 'Berikutnya',   // kotak ke-6 grid: ringkasan sholat berikutnya
    infoTeks: '--:--',
    warnaInfo: '#ffffff',
    bgInfo: '#101a2b'
  },

  onInit() {
    // Proteksi total: exception saat memuat halaman TIDAK boleh lolos ke
    // runtime liteWearable (gejala bila lolos: layar blank hitam).
    try {
      // Daftarkan konteks halaman → memungkinkan deteksi alarm Metode B
      // lewat jalur this.requireNapi('hmAlarm') pada sebagian SDK.
      daftarkanKonteksAlarm(this);
      this.refresh();
    } catch (e) {
      console.warn('[index] onInit dicegat: ' + e);
    }
  },

  onShow() {
    try {
      // Nyalakan kedua metode pengingat saat halaman tampil:
      //   Metode A : timer 30 detik (notifikasi + getar H-10 menit)
      //   Metode B : daftar alarm sistem hmAlarm (tetap jalan saat app tutup)
      daftarkanKonteksAlarm(this);
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
      // Kartu "Menuju ..." — label & jam sejajar satu baris, countdown di
      // baris kedua (jam sudah diperkecil di CSS agar tidak menutupi).
      if (st.berikutnya) {
        this.pesanNext = 'Menuju ' + st.berikutnya.nama + (st.berikutnya.besok ? ' (besok)' : '');
        this.waktuBerikutnya = st.berikutnya.waktu;
        this.sisaWaktu = hitungSisa(st.berikutnya.selangMenit);
      } else {
        this.pesanNext = 'Semua selesai';
        this.waktuBerikutnya = '--:--';
        this.sisaWaktu = 'Jadwal hari ini selesai';
      }

      // GRID 5 waktu sholat + penanda status via WARNA LATAR saja (kelas
      // statis; binding ke atribut tag tunggal — aturan LiteWearable).
      var daftar = [];
      for (var i = 0; i < st.daftar.length; i++) {
        var it = st.daftar[i];
        var t = temaStatus(it.status);
        daftar.push({
          nama: it.nama,
          waktu: it.waktu || '--:--',   // JAM SELALU DITAMPILKAN di tiap kotak
          status: it.status,
          bg: t.bg,
          warnaTeks: t.teks,
          warnaJam: t.jam
        });
      }
      this.jadwal = daftar;

      // Kotak ke-6: ringkasan sholat berikutnya (pengganti box pengingat).
      if (st.berikutnya) {
        this.infoTeks = st.berikutnya.nama + ' ' + st.berikutnya.waktu;
        this.warnaInfo = '#ffd166';
        this.bgInfo = '#1a1508';
      } else {
        this.infoTeks = 'Selesai';
        this.warnaInfo = '#9fb0c3';
        this.bgInfo = '#101a2b';
      }
    } else {
      this.jadwal = [];
      this.pesanNext = '';
      this.waktuBerikutnya = '';
      this.sisaWaktu = '';
      this.infoTeks = '--:--';
      this.warnaInfo = '#9fb0c3';
      this.bgInfo = '#101a2b';
    }
  }
};

/* ----------------------------- fungsi kecil ------------------------------- */
function pad2(n) { return (n < 10 ? '0' + n : '' + n); }

/** Palet per-status utk kotak grid (binding atribut background-color/color,
    BUKAN kelas — aturan LegacyCompileLiteJS). Semua varian kontras penuh:
    nama & JAM selalu mudah dibaca; hanya tingkat kecerahan latar yang
    membedakan status (tidak ada lagi garis/centang pengganggu). */
function temaStatus(status) {
  if (status === 'lewat') {
    // sudah lewat → latar paling gelap, teks tetap jelas terbaca
    return { bg: '#0c1119', teks: '#aab4c0', jam: '#c3ccd6' };
  }
  if (status === 'berlangsung') {
    // masa H-10 menit menjelang masuk waktu → aksen hijau lembut
    return { bg: '#103524', teks: '#dff7e7', jam: '#8ef0b8' };
  }
  // berikutnya / mendatang → biru standar
  return { bg: '#152a45', teks: '#eaf1f8', jam: '#ffffff' };
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
