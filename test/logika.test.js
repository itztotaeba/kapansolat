/**
 * logika.test.js — uji fungsi murni (tanpa API perangkat) dengan meniru ESM sederhana.
 * Jalankan: node test/logika.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const base = path.join(__dirname, '..', 'entry', 'src', 'main', 'js', 'MainAbility', 'common');

// Muat jadwal-sholat.js dan waktu.js dengan transform import/export -> global sederhana
function muat(file, ctx) {
  let src = fs.readFileSync(path.join(base, file), 'utf8');
  src = src.replace(/export\s+(const|var|function)/g, '$1')
            .replace(/import\s*\{([^}]*)\}\s*from\s*'[^']*';?/g, '');
  vm.runInContext(src, ctx);
}
const ctx = vm.createContext({ console, Date, Math, JSON, parseInt, isNaN });
muat('jadwal-sholat.js', ctx);
muat('waktu.js', ctx);

let gagal = 0;
function eq(nama, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? 'PASS' : 'FAIL') + ' - ' + nama + (ok ? '' : ` (dapat ${JSON.stringify(actual)}, harap ${JSON.stringify(expected)})`));
  if (!ok) gagal++;
}

eq('timeToMenit 04:31', ctx.timeToMenit('04:31'), 4 * 60 + 31);
eq('timeToMenit invalid', ctx.timeToMenit('25:00'), -1);
eq('menitToTime wrap', ctx.menitToTime(1445), '00:05');
eq('formatSelang 75', ctx.formatSelang(75), '1 jam 15 menit');
eq('formatSelang 10', ctx.formatSelang(10), '10 menit');
eq('formatSelang 60', ctx.formatSelang(60), '1 jam');
eq('tanggalKey', ctx.tanggalKey(new Date(2026, 9, 14)), '2026-10-14');
eq('cariJadwal ada', !!ctx.cariJadwal('2026-10-14'), true);
eq('cariJadwal kosong', ctx.cariJadwal('2030-01-01'), null);

// Status pada 14 Okt 2026 pukul 13:54 -> Ashar 15:09 berjarak 75 menit
const st = ctx.statusHariIni(new Date(2026, 9, 14, 13, 54));
eq('status tersedia', st.tersedia, true);
eq('berikutnya = Ashar', st.berikutnya.nama, 'Ashar');
eq('selang 75 mnt', st.berikutnya.selangMenit, 75);
eq('pesan', st.pesanBerikut, 'Ashar: 1 jam 15 menit lagi');
eq('Subuh lewat', st.daftar[0].status, 'lewat');
eq('Zuhur lewat', st.daftar[1].status, 'lewat');
eq('Maghrib mendatang', st.daftar[3].status, 'mendatang');

// Pada 15:02 -> Ashar (15:09) dalam jendela 10 menit => berlangsung
const st2 = ctx.statusHariIni(new Date(2026, 9, 14, 15, 2));
eq('Ashar berlangsung', st2.daftar[2].status, 'berlangsung');

// Setelah Isya -> berikutnya Subuh besok
const st3 = ctx.statusHariIni(new Date(2026, 9, 14, 21, 0));
eq('besok flag', st3.berikutnya.besok, true);
eq('besok subuh', st3.berikutnya.waktu, '04:31');

// Kejadian pengingat (alarm HARIAN repeat): pada 13:54, Ashar 15:09 ->
// trigger lokal 14:59, selang 65 menit dari sekarang.
const ev = ctx.kejadianPengingat(new Date(2026, 9, 14, 13, 54), 10);
const evAshar = ev.filter(e => e.waktuKey === 'ashar')[0];
eq('selang Ashar 65', evAshar.selangMenit, 65);
eq('jam trigger Ashar 14', evAshar.triggerJam, 14);
eq('menit trigger Ashar 59', evAshar.triggerMenitLokal, 59);
eq('label id', evAshar.id, '2026-10-14-ashar');
eq('sorted asc', ev[0].selangMenit <= ev[ev.length - 1].selangMenit, true);
eq('maks 10 alarm', ev.length <= 10, true);

// Subuh 04:31 - 10 mnt = 04:21 (tidak melewati tengah malam)
const subuhData = { subuh: '00:05' }; // uji wrap tengah-malam via fungsi internal:
const evSore = ctx.kejadianPengingat(new Date(2026, 9, 14, 21, 0), 10);
const evSubuhBesok = evSore.filter(e => e.waktuKey === 'subuh')[0];
eq('Subuh jam 4 menit 21', [evSubuhBesok.triggerJam, evSubuhBesok.triggerMenitLokal], [4, 21]);

// Wrap tengah malam: waktu 00:05 - 10 = 23:55 (const array -> pakai vm eval)
vm.runInContext("JADWAL_SHOLAT.length = 0; JADWAL_SHOLAT.push({ tanggal: '2026-12-20', subuh: '00:05', zuhur: '12:00', ashar: '15:00', maghrib: '18:00', isya: '19:00' });", ctx);
const evWrap = ctx.kejadianPengingat(new Date(2026, 11, 20, 10, 0), 10);
const w = evWrap.filter(e => e.waktuKey === 'subuh')[0];
eq('wrap 23:55', [w.triggerJam, w.triggerMenitLokal], [23, 55]);
eq('wrap flag', w.lewatiTengahMalam, true);

console.log(gagal === 0 ? '\nSEMUA UJI LULUS ✅' : `\n${gagal} UJI GAGAL ❌`);
process.exit(gagal === 0 ? 0 : 1);
