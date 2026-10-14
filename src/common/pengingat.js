/**
 * pengingat.js - Logika Pengingat 10 Menit Sebelum Sholat
 * Metode A: cek tiap 30 detik saat aplikasi terbuka -> notifikasi layar + getaran
 * (Metode B / alarm sistem hmAlarm ditangani di halaman index via device-api.js)
 */
var jadwal = require('./jadwal-sholat.js');
var api = require('./device-api.js');

var INTERVAL_CEK_MS = 30 * 1000;   // cek waktu tiap 30 detik (hemat baterai)
var OFFSET_MENIT = 10;             // pengingat 10 menit sebelum sholat

/**
 * Buat mesin pengingat Metode A.
 * @param {Function} onPengingat callback(pesan, judul) utk tampil di layar
 * @param {Function} onTick      callback(statusObj) utk refresh tampilan
 * @return {object} {mulai, berhenti}
 */
function buatMesinPengingat(onPengingat, onTick) {
  var timerId = null;
  var sudahDiperingatkan = {}; // kunci 'YYYY-MM-DD|sholat' agar tidak dobel

  function cekSekarang() {
    var now = new Date();
    var st = jadwal.statusSholatHariIni(now);
    if (onTick) onTick(st);
    if (!st.berikutnya) return;

    var sisaDetik = st.detikPersis;                 // detik menuju masuk waktu
    var selangMenit = Math.ceil(sisaDetik / 60);    // menit (pembulatan atas)
    var target = OFFSET_MENIT;                      // peringatan tepat di H-10 menit

    // Kondisi trigger: selang sudah <= 10 menit dan > 10-2 menit jendela cek
    // (interval 30 detik => aman memakai rentang [target-1, target]).
    var kunci = jadwal.dateToStr(now) + '|' + st.berikutnya.key;
    if (selangMenit <= target && selangMenit > 0 && !sudahDiperingatkan[kunci]) {
      sudahDiperingatkan[kunci] = true;
      var pesan = 'Waktu masuk: ' + st.berikutnya.waktu;
      var judul = '\u23F0 ' + st.berikutnya.label + ' ' + OFFSET_MENIT + ' menit lagi!';
      // Getaran + notifikasi sistem; fallback banner teks via callback
      api.tampilkanNotifikasi(judul, pesan);
      api.bergetar(800);
      if (onPengingat) onPengingat(judul + ' ' + pesan, pesan);
    }
  }

  return {
    mulai: function () {
      this.berhenti();
      cekSekarang();                                  // render awal langsung
      timerId = setInterval(cekSekarang, INTERVAL_CEK_MS);
    },
    berhenti: function () {
      if (timerId !== null) { clearInterval(timerId); timerId = null; }
    }
  };
}

/**
 * Susun daftar kejadian alarm Metode B (hmAlarm) untuk hari ini & besok,
 * hanya yang masih akan datang. Tiap item: {trigger:Date,labelAlarm,requestId}
 * requestId dipakai ulang tiap hari (0..9) agar hemat slot alarm sistem.
 * @param {Date} now
 * @return {Array}
 */
function daftarKejadianAlarm(now) {
  var out = [];
  var id = 0;
  for (var d = 0; d < 2; d++) {
    var tgl = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    var row = jadwal.getJadwalTanggal(tgl);
    if (!row) continue;
    var alarms = jadwal.hitungAlarmHarian(row, OFFSET_MENIT);
    for (var i = 0; i < alarms.length; i++) {
      var a = alarms[i];
      var trig = new Date(tgl.getFullYear(), tgl.getMonth(), tgl.getDate(), a.jam, a.menit, 0, 0);
      if (trig.getTime() > now.getTime()) {
        out.push({ trigger: trig, labelAlarm: a.labelAlarm, requestId: id++ });
      }
    }
  }
  return out;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    INTERVAL_CEK_MS: INTERVAL_CEK_MS,
    OFFSET_MENIT: OFFSET_MENIT,
    buatMesinPengingat: buatMesinPengingat,
    daftarKejadianAlarm: daftarKejadianAlarm
  };
}
