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
 * Perubahan vs versi lama (permintaan pengguna — layar BULAT GT 7 Pro):
 *   - Layout pakai MARGIN AMAN 10 dp dari tepi + lebar konten 222 dp →
 *     kotak mengisi ruang tanpa menempel lengkungan layar bulat;
 *   - GRID disusun BARIS EKSPLISIT 2+2+1 (Subuh|Zuhur / Ashar|Maghrib /
 *     Isya rata tengah) — tiap kotak = NAMA + JAM, font diperbesar
 *     secukupnya dengan padding dalam → teks UTUH tidak terpotong;
 *   - daftar `jadwal` dijamin selalu berisi tepat 5 elemen
 *     (lengkapiJadwal) agar binding `jadwal[n].bg` di HML tak pernah
 *     membaca undefined;
 *   - seluruh konten di-pusatkan vertikal & horizontal (CSS .container).
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
    /* Data grid 5 waktu sholat sebagai ARRAY SKALAR sederhana:
       namaJadwal[i]  = 'Subuh'.. ; waktuJadwal[i] = '04:21' ;
       kelasJadwal[i] = nama kelas status ('mendatang'/'berikutnya'/
       'berlangsung'/'lewat') → diikat ke class="{{ kelasJadwal[i] }}".
       Bentuk skalar dipilih karena binding bertingkat objek
       (jadwal[i].bg) pada atribut kustom terbukti TIDAK ter-render
       di runtime liteWearable GT 7 Pro (jam sholat tak muncul). */
    namaJadwal: [],
    waktuJadwal: [],
    kelasJadwal: []
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

      // GRID 5 waktu sholat: tiga array skalar (nama/jam/kelas status).
      // Kelas dipakai HML sebagai class="{{ kelasJadwal[i] }}" (binding
      // SATU-token resmi); warna per-status didefinisikan di index.css.
      var nama = [], jam = [], kelas = [];
      for (var i = 0; i < st.daftar.length; i++) {
        var it = st.daftar[i];
        kelas.push(kelasStatus(it.status, st.berikutnya, it));
        nama.push(it.nama);
        jam.push(it.waktu || '--:--');   // JAM SELALU DITAMPILKAN
      }
      var genap = lengkapi5(nama, jam, kelas);
      this.namaJadwal = genap.nama;
      this.waktuJadwal = genap.jam;
      this.kelasJadwal = genap.kelas;
    } else {
      this.namaJadwal = [];
      this.waktuJadwal = [];
      this.kelasJadwal = [];
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

/** Nama status per-kotak grid → kunci pemilihan WARNA (lihat warnaStatus).
    mendatang   → biru tenang        berikutnya → biru terang
    berlangsung → hijau (masa H-10)  lewat      → abu redup (tetap terbaca) */
function kelasStatus(status, berikutnya, it) {
  if (status === 'lewat')       return 'lewat';
  if (status === 'berlangsung') return 'berlangsung';
  if (berikutnya && !berikutnya.besok && berikutnya.nama === it.nama)
    return 'berikutnya';
  return 'mendatang';
}

/** Jaminan: ketiga array grid SELALU berisi tepat 5 elemen (Subuh..Isya)
    agar binding `namaJadwal[n]` dst. di index.hml tidak pernah membaca
    indeks kosong (penyebab umum kotak tanpa teks / item hilang). */
function lengkapi5(nama, jam, kelas) {
  var namaBaku = ['Subuh', 'Zuhur', 'Ashar', 'Maghrib', 'Isya'];
  var n = [], j2 = [], k = [];
  for (var i = 0; i < 5; i++) {
    n.push(nama[i] || namaBaku[i]);
    j2.push(jam[i] || '--:--');
    k.push(kelas[i] || 'mendatang');
  }
  return { nama: n, jam: j2, kelas: k };
}

/** Catatan: palet per-status kini TIDAK lagi dikirim JS sebagai string hex
    ke atribut kustom (runtime mengabaikannya) — warna cukup lewat NAMA
    KELAS yang dikembalikan kelasStatus() dan didefinisikan di index.css.

*/
/** "1 jam 15 menit lagi" (ringkas utk layar jam) */
function hitungSisa(menit) {
  if (menit <= 0) return 'Tepat waktu!';
  var j = Math.floor(menit / 60);
  var m = menit % 60;
  if (j === 0) return m + ' menit lagi';
  if (m === 0) return j + ' jam lagi';
  return j + ' jam ' + m + ' menit lagi';
}
