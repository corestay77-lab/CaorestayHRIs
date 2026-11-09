import { q } from '@/lib/db';
import { auth, json, errMsg } from '@/lib/auth';
import { compute, normalize, tzOf } from '@/lib/payroll';
import { nowIn } from '@/lib/geo';
export const dynamic='force-dynamic';
// Ringkasan semua hotel untuk admin pusat.
export async function GET(req:Request){
  const a=await auth(req,{admin:true});if('res' in a)return a.res;
  try{const rows=await q(`select h.id, h.name, h.data, u.username from hr_hotel h left join hr_user u on u.hotel_id=h.id and u.role='hotel' order by h.name`),out=[];
    for(const r of rows){const doc=normalize(r.data),act=doc.emps.filter(e=>e.status==='Aktif'),empty={...doc,att:[],sched:[],corr:[],cuts:{}};
      const day=nowIn(tzOf(doc,r.name)).date,s=(await q(`select count(*) filter (where src='qr')::int as hadir, count(*) filter (where src='qr' and clock_out is null)::int as open from hr_att where hotel_id=$1 and work_date=$2`,[r.id,day]))[0];
      out.push({id:r.id,name:r.name,username:r.username||'',karyawan:act.length,biayaModel:Math.round(act.reduce((t,e)=>t+compute(e,empty).total,0)),hadirHariIni:s.hadir,belumPulang:s.open,periode:doc.period,statusPayroll:doc.periods[doc.period]||'draft',qr:!!doc.geo[r.name]?.qr,qrToken:doc.geo[r.name]?.qr||'',lokasi:!!(doc.geo[r.name]?.lat||doc.geo[r.name]?.lng)})}
    return json({hotels:out})}catch(e:any){return json({error:errMsg(e)},500)}}
