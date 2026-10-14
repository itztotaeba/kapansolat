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
  src = src.replace(/export\s+(const|function)/g, '$1')
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

// Kejadian pengingat: pada 13:54, Ashar trigger = 75-10 = 65 menit lagi
const ev = ctx.kejadianPengingat(new Date(2026, 9, 14, 13, 54), 10);
const evAshar = ev.filter(e => e.waktuKey === 'ashar')[0];
eq('trigger Ashar 65', evAshar.triggerMenit, 65);
eq('label id', evAshar.id, '2026-10-14-ashar');
eq('sorted asc', ev[0].triggerMenit <= ev[ev.length - 1].triggerMenit, true);

console.log(gagal === 0 ? '\nSEMUA UJI LULUS ✅' : `\n${gagal} UJI GAGAL ❌`);
process.exit(gagal === 0 ? 0 : 1);
