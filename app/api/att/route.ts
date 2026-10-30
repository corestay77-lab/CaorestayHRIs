import { q, toAtt, periodLocked, AttRow } from '@/lib/db';
import { guard, json, errMsg } from '@/lib/auth';
export const dynamic='force-dynamic';
const ST=['Hadir','Sakit','Izin','Alpa','Cuti'],okDate=(s:any)=>/^\d{4}-\d{2}-\d{2}$/.test(String(s));
// Daftar absensi sejak bulan tertentu (?from=YYYY-MM): catatan scan karyawan + input manual HRD, tanpa persetujuan berlapis.
export async function GET(req:Request){
  const g=await guard();if(g)return g;
  try{const from=new URL(req.url).searchParams.get('from')||'0000-00';
    const r=await q<AttRow>(`select * from hr_att where work_date>=$1 order by work_date desc, clock_in desc nulls last`,[from+'-01']);
    return json({att:r.map(toAtt)})}catch(e:any){return json({error:errMsg(e)},500)}}
export async function POST(req:Request){ // input manual: sakit / izin / cuti / alpa / koreksi
  const g=await guard();if(g)return g;
  try{const b=await req.json();
    if(!b.empId||!okDate(b.date)||!ST.includes(b.status))return json({error:'Karyawan, tanggal, dan status wajib diisi'},400);
    if(await periodLocked(b.date))return json({error:'Payroll periode ini sudah dikunci'},423);
    const id=crypto.randomUUID();
    await q(`insert into hr_att(id,emp_id,work_date,status,clock_in,clock_out,ot_hours,src,note) values($1,$2,$3,$4,$5,$6,$7,'manual',$8)`,
      [id,b.empId,b.date,b.status,b.in||null,b.out||null,Math.max(0,Number(b.otHours)||0),b.note||null]);
    return json({id})}catch(e:any){return json({error:errMsg(e)},500)}}
export async function PATCH(req:Request){
  const g=await guard();if(g)return g;
  try{const b=await req.json();const r=await q<AttRow>(`select * from hr_att where id=$1`,[b.id]);if(!r[0])return json({error:'Data tidak ditemukan'},404);
    if(await periodLocked(r[0].work_date))return json({error:'Payroll periode ini sudah dikunci'},423);
    const ot=b.otHours===undefined?r[0].ot_hours:Math.max(0,Number(b.otHours)||0),st=b.status===undefined?r[0].status:b.status;
    if(!ST.includes(st))return json({error:'Status tidak valid'},400);
    await q(`update hr_att set ot_hours=$2, status=$3 where id=$1`,[b.id,ot,st]);return json({ok:true})}catch(e:any){return json({error:errMsg(e)},500)}}
export async function DELETE(req:Request){ // ?id=… satu baris, atau ?emp=… semua absensi karyawan (saat karyawan dihapus)
  const g=await guard();if(g)return g;
  try{const u=new URL(req.url).searchParams,id=u.get('id'),emp=u.get('emp');
    if(id){const r=await q<AttRow>(`select work_date from hr_att where id=$1`,[id]);if(r[0]&&await periodLocked(r[0].work_date))return json({error:'Payroll periode ini sudah dikunci'},423);await q(`delete from hr_att where id=$1`,[id])}
    else if(emp){await q(`delete from hr_att where emp_id=$1`,[emp]);await q(`delete from hr_pin where emp_id=$1`,[emp])}
    else return json({error:'id atau emp wajib'},400);
    return json({ok:true})}catch(e:any){return json({error:errMsg(e)},500)}}
