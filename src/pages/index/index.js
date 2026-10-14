/**
 * index.js - LOGIKA LAYAR UTAMA
 * Huawei Watch GT 7 Pro (LiteWearable / HarmonyOS JS)
 *
 * Tanggung jawab:
 *  1. Render jadwal hari ini + penanda lewat/berlangsung/berikutnya
 *  2. Countdown "x jam y menit lagi" menuju sholat berikutnya
 *  3. METODA A: mesin cek waktu tiap 30 detik -> banner + getaran H-10 menit
 *  4. METODA B: daftarkan alarm hmAlarm (getar + label) utk hari ini & besok;
 *     otomatis terpasang ulang setiap aplikasi dibuka / ganti hari /
 *     setiap data jadwal diperbarui (build ulang).
 */
import router from '@system.router';

var jadwalLib = require('../../common/jadwal-sholat.js');
var pengingatLib = require('../../common/pengingat.js');
var api = require('../../common/device-api.js');

export default {
  // ------------------------- state tampilan -------------------------
  private: {
    tanggalHariIni: '',
    items: [],            // daftar baris sholat hari ini
    adaBerikutnya: false,
    labelBerikutnya: '',
    waktuBerikutnya: '',
    sisaWaktu: '',
    jadwalKosong: false,
    bannerTampil: false,
    bannerPesan: ''
  },

  // ------------------------- siklus hidup halaman -------------------
  onInit() {
    this.mesin = pengingatLib.buatMesinPengingat(
      this.tampilkanBanner.bind(this),
      this.renderStatus.bind(this)
    );
    this.tanggalTerakhir = jadwalLib.dateToStr(new Date());
  },

  onShow() {
    // Aplikasi sedang tampil -> nyalakan Metode A, dan pasang Metode B.
    this.mesin.mulai();
    this.pasangUlangAlarmSistem();
  },

  onHide() {
    // Hemat baterai: hentikan polling saat halaman tidak terlihat.
    // Alarm Metode B (hmAlarm) TETAP jalan di sistem walau app ditutup.
    this.mesin.berhenti();
  },

  onDestroy() {
    this.mesin.berhenti();
  },

  // ------------------------- render -------------------------------
  /** Dipanggil mesin pengingat tiap 30 detik dengan objek status terbaru. */
  renderStatus(st) {
    var now = new Date();

    // Ganti hari? -> gulung ulang alarm Metode B (otomatis tiap hari).
    var tglKini = jadwalLib.dateToStr(now);
    if (tglKini !== this.tanggalTerakhir) {
      this.tanggalTerakhir = tglKini;
      this.pasangUlangAlarmSistem();
    }

    this.tanggalHariIni = jadwalLib.formatTanggalID(now);
    this.jadwalKosong = !st.tersedia;

    var items = [];
    for (var i = 0; i < st.items.length; i++) {
      var it = st.items[i];
      var tanda = '·';
      var kelas = '';
      if (it.status === 'lewat') { tanda = '✓'; kelas = 'lewat'; }
      else if (it.status === 'berlangsung') { tanda = '▶'; kelas = 'berlangsung'; }
      else if (st.berikutnya && st.berikutnya.key === it.key) { tanda = '➜'; }
      items.push({
        label: it.label, waktu: it.waktu, tanda: tanda, kelas: kelas
      });
    }
    this.items = items;

    if (st.berikutnya) {
      this.adaBerikutnya = true;
      this.labelBerikutnya = 'Menuju ' + st.berikutnya.label;
      this.waktuBerikutnya = st.berikutnya.waktu;
      this.sisaWaktu = jadwalLib.formatSelang(st.selangMenit);
    } else {
      this.adaBerikutnya = false;
    }
  },

  /** Callback Metode A dari mesin pengingat: tampilkan banner H-10 menit. */
  tampilkanBanner(pesanLengkap) {
    this.bannerPesan = pesanLengkap; // mis. "⏰ Ashar 10 menit lagi! Waktu masuk: 15:10"
    this.bannerTampil = true;
    // Sembunyikan banner setelah 5 menit agar layar bersih & hemat.
    var self = this;
    setTimeout(function () { self.bannerTampil = false; }, 5 * 60 * 1000);
  },

  // ------------------------- METODE B: ALARM SISTEM ----------------
  /**
   * Pasang ulang alarm hmAlarm untuk seluruh kejadian yang masih akan datang
   * (hari ini + besok). Fungsi ini juga menjadi titik masuk bila Anda ingin
   * memasang ulang alarm SETIAP KALI blok data jadwal diperbarui:
   * cukup rebuild & buka aplikasi sekali — alarm baru langsung terdaftar.
   */
  pasangUlangAlarmSistem() {
    // Bersihkan slot lama (id 0..9) lalu pasang yang baru.
    for (var k = 0; k < 10; k++) api.hapusAlarmSatu(k);
    var kejadian = pengingatLib.daftarKejadianAlarm(new Date());
    var n = api.pasangAlarmHarian(kejadian);
    console.log('[sholat] alarm sistem terpasang: ' + n + '/' + kejadian.length);
  },

  // ------------------------- navigasi ------------------------------
  bukaDetail() {
    router.push({ uri: 'pages/detail' });
  }
};
