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

      // GRID 5 waktu sholat + penanda status via WARNA LATAR & TEKS.
      // Nilai warna disiapkan di SINI ($item.bg / $item.warnaNama /
      // $item.warna) lalu di-binding ke ATRIBUT tag tunggal di HML.
      // TIDAK ADA binding pada atribut class dalam bentuk apa pun —
      // LegacyCompileLiteJS menolaknya secara mutlak.
      var daftar = [];
      for (var i = 0; i < st.daftar.length; i++) {
        var it = st.daftar[i];
        var k = kelasStatus(it.status, st.berikutnya, it); // 'mendatang' dll.
        var c = warnaStatus(k);
        daftar.push({
          id: i,                     // tid utk for-loop
          nama: it.nama,
          waktu: it.waktu || '--:--', // JAM SELALU DITAMPILKAN di tiap kotak
          status: it.status,
          bg: c.bg,                  // background-color kartu (string hex)
          warnaNama: c.nama,         // color teks nama sholat
          warna: c.jam               // color teks jam
        });
      }
      this.jadwal = lengkapiJadwal(daftar);
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

/** Jaminan: daftar jadwal SELALU berisi tepat 5 elemen (Subuh..Isya) agar
    binding bertingkat `jadwal[n].bg` di index.hml tidak pernah membaca
    properti dari undefined (penyebab umum render gagal / kotak kosong). */
function lengkapiJadwal(daftar) {
  var namaBaku = ['Subuh', 'Zuhur', 'Ashar', 'Maghrib', 'Isya'];
  var hasil = [];
  for (var i = 0; i < 5; i++) {
    hasil.push(daftar[i] || {
      id: i, nama: namaBaku[i], waktu: '--:--', status: 'mendatang',
      bg: '#152a45', warnaNama: '#eaf1f8', warna: '#ffffff'
    });
  }
  return hasil;
}

/** Palet per-status — DIPAKAI SEBAGAI NILAI BINDING atribut tag tunggal
    (background-color / color) di index.hml. Sengaja berupa string hex biasa
    karena compiler LiteWearable melarang binding pada atribut class.
      bg        : latar kartu
      nama      : warna teks nama sholat
      jam       : warna teks jam masuk */
function warnaStatus(k) {
  if (k === 'berlangsung') return { bg: '#103524', nama: '#d6ffe9', jam: '#7cf5b8' };
  if (k === 'berikutnya')  return { bg: '#1d3a5f', nama: '#ffffff', jam: '#ffffff' };
  if (k === 'lewat')       return { bg: '#23282f', nama: '#9aa4b2', jam: '#9aa4b2' };
  return { bg: '#152a45', nama: '#eaf1f8', jam: '#ffffff' }; // mendatang
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
