/**
 * logika.test.js - Uji cepat logika inti (jalankan: npm test / node test/logika.test.js)
 * Tidak butuh perangkat; menguji modul murni jadwal-sholat.js & pengingat.js.
 */
var assert = require('assert');
var J = require('../src/common/jadwal-sholat.js');
var P = require('../src/common/pengingat.js');

// 1. Konversi waktu bolak-balik
assert.strictEqual(J.timeToMenit('04:35'), 275);
assert.strictEqual(J.menitToTime(275), '04:35');
assert.strictEqual(J.timeToMenit('buruk'), -1);

// 2. Status hari ini pakai data sampel (2026-10-14 ada di JADWAL_SHOLAT)
var pagi = new Date(2026, 9, 14, 13, 55, 0); // 13:55 -> Ashar 15:10 berikutnya
var st = J.statusSholatHariIni(pagi);
assert.ok(st.tersedia, 'jadwal 2026-10-14 harus tersedia');
assert.strictEqual(st.berikutnya.key, 'ashar');
assert.strictEqual(st.selangMenit, 75);
assert.strictEqual(J.formatSelang(75), '1 jam 15 menit');

// 3. Penanda sudah lewat: Subuh/Zuhur reddup, Ashar berikutnya
assert.strictEqual(st.items[0].status, 'lewat');
assert.strictEqual(st.items[1].status, 'lewat');
assert.strictEqual(st.items[2].status, 'akan');

// 4. Setelah Isya -> berikutnya Subuh besok
var malam = new Date(2026, 9, 14, 21, 0, 0);
var st2 = J.statusSholatHariIni(malam);
assert.strictEqual(st2.berikutnya.label, 'Subuh (besok)');

// 5. Alarm harian: 10 menit sebelum tiap sholat
var row = J.getJadwalTanggal(pagi);
var alarms = J.hitungAlarmHarian(row, 10);
assert.strictEqual(alarms.length, 5);
assert.strictEqual(alarms[2].jam + ':' + alarms[2].menit, '15:0'); // Ashar 15:10 -> 15:00
assert.ok(/Ashar 10 menit lagi \(masuk 15:10\)/.test(alarms[2].labelAlarm));

// 6. daftarKejadianAlarm hanya kejadian mendatang (maks 10)
var ev = P.daftarKejadianAlarm(pagi);
assert.ok(ev.length > 0 && ev.length <= 10);
ev.forEach(function (e) { assert.ok(e.trigger.getTime() > pagi.getTime()); });

console.log('SEMUA TEST LOGIKA LULUS ✅');
