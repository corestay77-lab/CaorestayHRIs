// Satu-satunya route tanpa login HRD: dipakai karyawan lewat /absen. Semua validasi dilakukan di server.
import { q, dbConfigured } from '@/lib/db';
import { verifySecret, json, errMsg } from '@/lib/auth';
import { distM, nowWIB, addDays, absMin, toMin } from '@/lib/geo';
export const dynamic='force-dynamic';
type Doc={emps:any[];geo:Record<string,any>;sched:any[];shifts:any[];settings:any;periods:Record<string,string>};
const fail=(error:string,status=200)=>json({ok:false,error},status);
async function doc():Promise<Doc>{
  const r=await q(`select data->'emps' as emps, data->'geo' as geo, data->'sched' as sched, data->'shifts' as shifts, data->'settings' as settings, data->'periods' as periods from hr_state where id=1`);
  const d=r[0]||{};return {emps:d.emps||[],geo:d.geo||{},sched:d.sched||[],shifts:d.shifts||[],settings:d.settings||{},periods:d.periods||{}}}
const hotelByQr=(d:Doc,t:string)=>t?Object.keys(d.geo).find(h=>d.geo[h]?.qr&&d.geo[h].qr===t):undefined;
// Jam masuk & pulang shift untuk karyawan pada tanggal tertentu: jadwal bila ada, kalau tidak jam masuk default hotel + 8 jam.
function shiftOf(d:Doc,empId:string,date:string,geo:any){
  const sc=d.sched.find((s:any)=>s.empId===empId&&s.date===date),sh=d.shifts.find((x:any)=>x.name===sc?.shift);
  if(sh)return {name:sh.name as string,start:sh.start as string,end:sh.end as string};
  const start=geo?.shift||d.settings.shift||'08:00',e=(toMin(start)+480)%1440;
  return {name:'',start,end:`${String(Math.floor(e/60)).padStart(2,'0')}:${String(e%60).padStart(2,'0')}`}}
export async function GET(req:Request){ // ?q=kode-QR → nama hotel (untuk ditampilkan setelah scan)
  if(!dbConfigured())return fail('Database belum dihubungkan.');
  try{const t=new URL(req.url).searchParams.get('q')||'';const d=await doc(),h=hotelByQr(d,t);
    return h?json({ok:true,hotel:h}):fail('QR tidak dikenali atau sudah diganti. Scan QR terbaru di pos security.')}catch(e:any){return fail(errMsg(e),500)}}
// Cek ID + PIN. Salah 5 kali → terkunci 15 menit.
async function checkPin(d:Doc,code:string,pin:string){
  const e=d.emps.find((x:any)=>String(x.code||'').toUpperCase()===code.trim().toUpperCase()&&x.status==='Aktif');
  if(!e)return {err:'ID karyawan atau PIN salah'};
  const r=(await q(`select pin_hash, fails, locked_until > now() as locked from hr_pin where emp_id=$1`,[e.id]))[0];
  if(!r)return {err:'PIN belum diatur. Minta HRD mengatur PIN Anda.'};
  if(r.locked)return {err:'Akun terkunci 15 menit karena PIN salah berulang kali.'};
  if(!verifySecret(pin,r.pin_hash)){await q(`update hr_pin set fails=fails+1, locked_until=case when fails+1>=5 then now()+interval '15 minutes' else locked_until end where emp_id=$1`,[e.id]);
    return {err:'ID karyawan atau PIN salah'}}
  if(r.fails)await q(`update hr_pin set fails=0, locked_until=null where emp_id=$1`,[e.id]);
  return {e}}
// Posisi absensi saat ini: baris yang masih terbuka (belum pulang, < 16 jam) → pulang; sudah ada hari ini → selesai; selain itu → masuk.
async function position(empId:string){
  const n=nowWIB(),rows=await q(`select id, work_date, clock_in, clock_out from hr_att where emp_id=$1 and src='qr' and work_date>=$2 order by work_date desc, clock_in desc`,[empId,addDays(n.date,-1)]);
  const open=rows.find((r:any)=>r.clock_in&&!r.clock_out&&absMin(n.date,n.time)-absMin(r.work_date,r.clock_in)<=960);
  const today=rows.find((r:any)=>r.work_date===n.date);
  return {n,open,today,kind:(open?'out':today?'done':'in') as 'in'|'out'|'done'}}
// JPEG sungguhan dari kamera? Foto hanya diperiksa lalu dibuang — TIDAK disimpan di mana pun.
const selfieOk=(s:any)=>{if(typeof s!=='string'||!s.startsWith('data:image/jpeg;base64,')||s.length<2000||s.length>400000)return false;try{const b=Buffer.from(s.slice(23,60),'base64');return b[0]===0xff&&b[1]===0xd8}catch{return false}};
export async function POST(req:Request){
  if(!dbConfigured())return fail('Database belum dihubungkan.');
  try{const b=await req.json(),d=await doc(),hotel=hotelByQr(d,String(b.q||''));
    if(!hotel)return fail('QR tidak dikenali atau sudah diganti. Scan QR terbaru di pos security.');
    const c=await checkPin(d,String(b.code||''),String(b.pin||''));if(!c.e)return fail(c.err!);
    const e=c.e,geo=d.geo[hotel],maxAcc=Number(d.settings.maxAcc)||100;
    if(e.hotel!==hotel)return fail(`Anda terdaftar di ${e.hotel}. Scan QR hotel Anda sendiri.`);
    const p=await position(e.id);
    if(b.op==='status'){
      const sh=shiftOf(d,e.id,p.n.date,geo),row=p.open||p.today;
      return json({ok:true,name:e.name,code:e.code,hotel,shift:sh.name?`${sh.name} ${sh.start}–${sh.end}`:`mulai ${sh.start}`,clock_in:row?.clock_in||null,clock_out:p.today?.clock_out||null,kind:p.kind,maxAcc,soft:d.settings.geoMode==='soft'})}
    if(b.op!=='clock')return fail('Permintaan tidak dikenal');
    if(p.kind==='done')return fail('Absensi hari ini sudah selesai.');
    // — validasi lokasi & selfie —
    // Mode 'strict' (default): lokasi tidak valid → absen ditolak. Mode 'soft': absen tetap masuk, tetapi diberi tanda ⚠ untuk dicek HRD.
    const soft=d.settings.geoMode==='soft',hasGeo=!!geo&&!!(geo.lat||geo.lng);let warn='',dist:number|null=null,accR:number|null=null;
    if(!hasGeo&&!soft)return fail('Lokasi hotel belum diatur oleh HRD.');
    const lat=Number(b.lat),lng=Number(b.lng),acc=Number(b.acc),radius=Number(geo?.radius)||100;
    if(!isFinite(lat)||!isFinite(lng)||!isFinite(acc)){if(!soft)return fail('Lokasi tidak terbaca. Aktifkan GPS lalu coba lagi.');warn='Lokasi tidak terbaca'}
    else{accR=Math.round(acc);if(hasGeo)dist=Math.round(distM(lat,lng,geo.lat,geo.lng));
      if(acc>maxAcc){if(!soft)return fail(`Akurasi GPS ±${accR} m (maks ${maxAcc} m). Pindah ke area terbuka lalu ulangi lokasi.`);warn=`Akurasi GPS ±${accR} m`}
      else if(dist!==null&&dist>radius){if(!soft)return fail(`Anda ${dist} m dari ${hotel} (maks ${radius} m). Absen hanya bisa di area hotel.`);warn=`${dist} m dari hotel`}}
    if(!selfieOk(b.selfie))return fail('Selfie dari kamera diperlukan untuk absen.');
    if(d.periods[p.n.date.slice(0,7)]==='locked')return fail('Payroll periode ini sudah dikunci. Hubungi HRD.');
    if(p.kind==='in'){
      const sh=shiftOf(d,e.id,p.n.date,geo),late=Math.max(0,toMin(p.n.time)-toMin(sh.start)-(Number(d.settings.tol)||0));
      await q(`insert into hr_att(id,emp_id,work_date,status,clock_in,late_min,dist,acc,src,note) values($1,$2,$3,'Hadir',$4,$5,$6,$7,'qr',$8) on conflict do nothing`,[crypto.randomUUID(),e.id,p.n.date,p.n.time,late,dist,accR,warn?'⚠ '+warn:null]);
      return json({ok:true,kind:'in',time:p.n.time,lateMin:late,warn})}
    // pulang: jam kerja & usulan lembur (kelipatan 30 menit setelah jam selesai shift, maks 4 jam) langsung masuk rekap
    const o=p.open!,sh=shiftOf(d,e.id,o.work_date,geo),hours=+((absMin(p.n.date,p.n.time)-absMin(o.work_date,o.clock_in))/60).toFixed(2);
    let end=toMin(sh.end);if(end<=toMin(sh.start))end+=1440;
    const outM=absMin(p.n.date,p.n.time)-absMin(o.work_date,'00:00'),ot=Math.min(d.settings.otMax===undefined?4:Number(d.settings.otMax)||0,Math.floor(Math.max(0,outM-end)/30)/2);
    await q(`update hr_att set clock_out=$2, hours=$3, ot_hours=$4, note=case when $5::text is null then note else coalesce(note||' · ','')||$5::text end where id=$1`,[o.id,p.n.time,hours,ot,warn?'⚠ pulang: '+warn:null]);
    return json({ok:true,kind:'out',time:p.n.time,hours,ot,warn})}catch(e:any){return fail(errMsg(e),500)}}
