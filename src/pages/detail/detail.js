/**
 * detail.js - Jadwal 3 hari ke depan (hari ini + 2 hari berikut).
 * Sumber data tetap blok JADWAL_SHOLAT di src/common/jadwal-sholat.js.
 */
import router from '@system.router';

var jadwalLib = require('../../common/jadwal-sholat.js');

export default {
  private: {
    hari: [] // [{tanggal, subuh, zuhur, ashar, maghrib, isya}]
  },

  onInit() {
    var daftar = [];
    var now = new Date();
    for (var d = 0; d < 3; d++) {
      var tgl = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
      var row = jadwalLib.getJadwalTanggal(tgl);
      if (row) {
        daftar.push({
          tanggal: jadwalLib.formatTanggalID(tgl),
          subuh: row.subuh, zuhur: row.zuhur, ashar: row.ashar,
          maghrib: row.maghrib, isya: row.isya
        });
      } else {
        daftar.push({
          tanggal: jadwalLib.formatTanggalID(tgl) + ' (belum diisi)',
          subuh: '--:--', zuhur: '--:--', ashar: '--:--',
          maghrib: '--:--', isya: '--:--'
        });
      }
    }
    this.hari = daftar;
  },

  kembali() {
    router.back();
  }
};
