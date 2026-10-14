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
 *   - box/kotak setelah Isya DIHAPUS (kotak ke-6 grid ikut dihapus — info
 *     sholat berikutnya sudah ada di BOX "Menuju ...");
 *   - seluruh konten di-pusatkan vertikal (lihat CSS .container).
 * ============================================================================
 */

import { statusHariIni, formatTanggalID } from '../../common/waktu.js';
import { aktifkanSemuaMetode, hentikanPemantauan } from '../../common/pengingat.js';
import { daftarkanKonteksAlarm, getarPanjang } from '../../common/device-api.js';

export default {
  data: {
    tanggalHariIni: '',
    jamSekarang: '',
    tersedia: false,
    tidakTersedia: true, // kebalikan eksplisit (hindari operator '!' di binding)
    pesanNext: '',       // satu string utuh 'Menuju Ashar'
    waktuBerikutnya: '', // jam sholat berikutnya (font kecil, sejajar label)
    sisaWaktu: '',       // hitung mundur 'x jam y menit lagi'
    jadwal: []           // [{nama,waktu,status,bg,warnaTeks,warnaJam}]
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
      // UJI GETAR ±8 detik setelah dibuka → bukti nyata API getar berjalan
      // di jam ini. Bila getaran TIDAK terasa, berarti firmware menolak
      // @system.vibrator (catat di log hilog).
      setTimeout(aman(function () {
        console.info('[index] uji-getar: mengirim pola panjang (bukti vibrator hidup)');
        getarPanjang();
      }), 8000);
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

      // GRID 5 waktu sholat + penanda status via WARNA LATAR saja.
      // Warna per-status disiapkan di SINI sebagai $item.bg / $item.warna
      // lalu di-binding ke ATRIBUT tag tunggal di HML. Tidak ada binding
      // ekspresi pada atribut class (ditolak LegacyCompileLiteJS).
      var daftar = [];
      for (var i = 0; i < st.daftar.length; i++) {
        var it = st.daftar[i];
        var k = kelasStatus(it.status, st.berikutnya, it); // 'mendatang' dll.
        daftar.push({
          id: i,                     // tid utk for-loop
          nama: it.nama,
          waktu: it.waktu || '--:--', // JAM SELALU DITAMPILKAN di tiap kotak
          status: it.status,
          kelas: 'sel-' + k,           // kelas latar kartu (satu token statis+var)
          kelasNama: 't-nama-' + k,    // kelas warna teks nama
          kelasJam: 't-jam-' + k       // kelas warna teks jam
        });
      }
      this.jadwal = daftar;
    } else {
      this.jadwal = [];
      this.pesanNext = '';
      this.waktuBerikutnya = '';
      this.sisaWaktu = '';
    }
  }
};

/* ----------------------------- fungsi kecil ------------------------------- */
function pad2(n) { return (n < 10 ? '0' + n : '' + n); }

/** Pembungkus aman callback setTimeout/timer — exception tidak boleh lolos
    ke runtime liteWearable (gejala bila lolos: layar blank). */
function aman(fn) {
  return function () {
    try { fn(); } catch (e) { console.warn('[index] timer dicegat: ' + e); }
  };
}

/** Nama status per-kotak grid → dipakai JavaScript untuk MEMILIH KELAS CSS
    (satu token variabel sederhana pada atribut class — pola binding resmi
    liteWearable; ekspresi kompleks pada class yang ditolak compiler sudah
    tidak dipakai lagi). Kelas menentukan latar kartu + warna teks:
      mendatang   → biru tenang        berikutnya → biru terang
      berlangsung → hijau (masa H-10)  lewat      → abu redup (tetap terbaca) */
function kelasStatus(status, berikutnya, it) {
  if (status === 'lewat')       return 'lewat';
  if (status === 'berlangsung') return 'berlangsung';
  if (berikutnya && !berikutnya.besok && berikutnya.nama === it.nama)
    return 'berikutnya';
  return 'mendatang';
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
