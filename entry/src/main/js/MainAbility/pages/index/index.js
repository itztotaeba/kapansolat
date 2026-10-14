/**
 * ============================================================================
 * index.js — LOGIKA LAYAR UTAMA (grid 2 kolom waktu sholat + pengingat)
 * ============================================================================
 * Alur:
 *   onInit      : siapkan data awal.
 *   onShow      : jalankan METODA A (timer 30 dtk) + METODA B (hmAlarm),
 *                 lalu refresh tampilan.
 *   onHide/
 *   onDestroy   : hentikan timer (hemat baterai; aplikasi tidak berjalan di
 *                 latar belakang).
 * Refresh cukup tiap 30 detik — perubahan menit baru terlihat tiap 1 menit.
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
    pesanNext: '',       // satu string utuh 'Menuju Ashar'
    waktuBerikutnya: '',
    sisaWaktu: '',
    jadwal: [],          // [{nama,waktu,penanda,bg,rim,dome,warnaTeks,warnaJam,warnaPenanda}]
    ringkasAlarm: 'H-10 mnt', // sel ke-6 grid: ringkasan status pengingat
    warnaAlarm: '#7fdca4',
    bgAlarm: '#0d1a14',  // liquid-glass utk sel pengingat (ditentukan status)
    rimAlarm: '#234034',
    domeAlarm: '#2f5a44'
  },

  onInit() {
    // Proteksi total: exception saat memuat halaman TIDAK boleh lolos ke
    // runtime liteWearable (gejala bila lolos: layar blank hitam).
    try {
      // Daftarkan konteks halaman → memungkinkan deteksi alarm Metode B
      // lewat JALUR 3 (this.requireNapi('hmAlarm')) pada sebagian SDK.
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

      // GRID 5 waktu + penanda status. PENTING (LiteWearable): class selector
      // tidak mendukung data binding → warna per-status dibawa lewat field
      // yang di-binding langsung ke atribut tag tunggal di HML.
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
          warnaJam: t.jam,
          warnaPenanda: t.penanda
        });
      }
      this.jadwal = daftar;

      // Sel pengingat: SATU string ringkas, selalu terisi (tidak pernah lagi
      // menampilkan pesan panjang 'modul alarm tak tersedia'). Warna kaca
      // mengikuti status Metode B: hijau = alarm sistem aktif, kuning =
      // sedang disiapkan otomatis, biru redup = hanya Metode A.
      try {
        var s = teksStatusPengingat();
        this.ringkasAlarm = ringkasStatus(s);
        if (s.indexOf('harian') >= 0 || s.indexOf('aktif:') >= 0) {
          this.warnaAlarm = '#7fdca4';
          this.bgAlarm = '#0d1a14'; this.rimAlarm = '#2e6b4c'; this.domeAlarm = '#3ddc84';
        } else if (s.indexOf('disiapkan') >= 0 || s.indexOf('siap') >= 0) {
          this.warnaAlarm = '#ffd166';
          this.bgAlarm = '#1a1508'; this.rimAlarm = '#6b5a2e'; this.domeAlarm = '#c9a13d';
        } else {
          this.warnaAlarm = '#9ed4ff';
          this.bgAlarm = '#101a2b'; this.rimAlarm = '#2a3a52'; this.domeAlarm = '#3d5a86';
        }
      } catch (e) {
        this.ringkasAlarm = 'Aktif';
        this.warnaAlarm = '#9fb0c3';
      }
    } else {
      this.jadwal = [];
      this.pesanNext = '';
      this.waktuBerikutnya = '';
      this.sisaWaktu = '';
      this.ringkasAlarm = 'H-10 mnt';
      this.warnaAlarm = '#9fb0c3';
      this.bgAlarm = '#101a2b'; this.rimAlarm = '#2a3a52'; this.domeAlarm = '#3d5a86';
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

/** Palet per-status utk kartu kaca grid (binding atribut, bukan kelas).
    `rim` = warna border tipis tepi kaca. */
function temaStatus(status) {
  if (status === 'lewat') {
    // kaca redup agar fokus pada waktu yang tersisa
    return { bg: '#0a0e15', rim: '#1d2530', dome: '#2a3644', teks: '#8b95a1', jam: '#67707b', penanda: '#67707b' };
  }
  if (status === 'berlangsung') {
    // masa H-10 menit menjelang masuk waktu (kaca hijau)
    return { bg: '#103524', rim: '#3ddc84', dome: '#4fe08f', teks: '#dff7e7', jam: '#7fdca4', penanda: '#6ee7a0' };
  }
  // berikutnya / mendatang — kaca biru seperti kartu utama
  return { bg: '#152a45', rim: '#4a6fa5', dome: '#55719a', teks: '#eaf1f8', jam: '#ffffff', penanda: '#9ed4ff' };
}

/** Ringkas teks status pengingat jadi label pendek utk sel grid (≤ ~10 char) */
function ringkasStatus(s) {
  if (!s) return 'Aktif';
  if (s.indexOf('harian') >= 0) return 'Alarm harian';
  if (s.indexOf('siap') >= 0) return 'Alarm siap';
  if (s.indexOf('disiapkan') >= 0) return 'Menyiapkan…';
  return 'Pengingat aktif';
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
