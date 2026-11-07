import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { q, tx } from '@/lib/db';
import { auth, json, errMsg } from '@/lib/auth';
import { splitLegacy } from '@/lib/tenant';
export const dynamic='force-dynamic';
// Backup/restore seluruh database (semua hotel): hanya admin pusat.
export async function GET(req:Request){
  const a=await auth(req,{admin:true});if('res' in a)return a.res;
  try{const [h,at,p,u]=await Promise.all([q(`select id, name, version, data from hr_hotel order by name`),q(`select * from hr_att order by work_date`),q(`select emp_id, pin_hash, hotel_id from hr_pin`),q(`select id, username, pass_hash, role, hotel_id from hr_user where role='hotel'`)]);
    const body=JSON.stringify({app:'corestay-people',v:3,exported:new Date().toISOString(),hotels:h,att:at,pins:p,users:u},null,1);
    return new NextResponse(body,{headers:{'Content-Type':'application/json','Content-Disposition':`attachment; filename="corestay-people-backup-${new Date().toISOString().slice(0,10)}.json"`,'Cache-Control':'no-store'}})}
  catch(e:any){return json({error:errMsg(e)},500)}}
const COLS='id,emp_id,work_date,status,clock_in,clock_out,ot_hours,late_min,hours,dist,acc,src,note,shift,shift_start,hotel_id';
const attParams=(r:any,hid:string|null)=>[r.id||randomUUID(),r.emp_id,r.work_date,r.status||'Hadir',r.clock_in??null,r.clock_out??null,Number(r.ot_hours)||0,Number(r.late_min)||0,r.hours??null,r.dist??null,r.acc??null,r.src||'manual',r.note??null,r.shift??null,r.shift_start??null,hid];
// Restore: mengganti SELURUH isi database. Menerima backup baru (v3, semua hotel), v2 (satu dokumen), dan backup lama dari versi lokal; dua yang terakhir dipecah per hotel.
export async function POST(req:Request){
  const a=await auth(req,{admin:true});if('res' in a)return a.res;
  try{const j=await req.json();
    let hotels:{id:string;name:string;version:number;data:any}[]=[],att:any[]=[],pins:any[]=[],users:any[]=[],note='';
    if(j?.app==='corestay-people'&&j.v>=3&&Array.isArray(j.hotels)){hotels=j.hotels;att=j.att||[];pins=j.pins||[];users=j.users||[]}
    else{let state:any,rows:any[]=[];
      if(j?.app==='corestay-people'&&j.state){state=j.state;rows=j.att||[];pins=j.pins||[]}
      else if(j&&Array.isArray(j.emps)){const {att:old=[],...rest}=j;state=rest;rows=old.filter((x:any)=>x.appr!=='rejected').map((x:any)=>({id:x.id,emp_id:x.empId,work_date:x.date,status:x.status,clock_in:x.in||null,clock_out:x.out||null,ot_hours:x.otHours||0,late_min:x.lateMin||0,hours:x.hours??null,dist:x.dist??null,acc:null,src:x.src==='selfie'?'qr':'manual',note:x.note||null}))}
      else return json({error:'File backup tidak dikenali'},400);
      const parts=splitLegacy(state),emp2h=new Map<string,string>();
      hotels=parts.map(p=>{const id=randomUUID();for(const e of p.doc.emps)emp2h.set(e.id,id);return {id,name:p.name,version:1,data:p.doc}});
      att=rows.filter((r:any)=>emp2h.has(r.emp_id)).map((r:any)=>({...r,hotel_id:emp2h.get(r.emp_id)}));pins=pins.filter((r:any)=>emp2h.has(r.emp_id)).map((r:any)=>({...r,hotel_id:emp2h.get(r.emp_id)}));
      note=' Login hotel perlu dibuat ulang di menu Semua Hotel.'}
    const ids=new Set(hotels.map(h=>h.id));
    const ops:{text:string;params?:any[]}[]=[{text:`delete from hr_att`},{text:`delete from hr_pin`},{text:`delete from hr_hotel`},{text:`delete from hr_user where role='hotel'`}];
    for(const h of hotels)ops.push({text:`insert into hr_hotel(id,name,data,version,qr) values($1,$2,$3::jsonb,$4,$5)`,params:[h.id,h.name,JSON.stringify(h.data),Number(h.version)||1,h.data?.geo?.[h.name]?.qr||null]});
    for(let i=0;i<att.length;i+=300){const ch=att.slice(i,i+300),ps:any[]=[];
      const vals=ch.map((r,k)=>{ps.push(...attParams(r,ids.has(r.hotel_id)?r.hotel_id:null));const o=k*16;return `(${Array.from({length:16},(_,c)=>'$'+(o+c+1)).join(',')})`}).join(',');
      ops.push({text:`insert into hr_att(${COLS}) values ${vals} on conflict do nothing`,params:ps})}
    for(const p of pins)ops.push({text:`insert into hr_pin(emp_id,pin_hash,hotel_id) values($1,$2,$3) on conflict do nothing`,params:[p.emp_id,p.pin_hash,ids.has(p.hotel_id)?p.hotel_id:null]});
    for(const u of users)if(ids.has(u.hotel_id))ops.push({text:`insert into hr_user(id,username,pass_hash,role,hotel_id) values($1,$2,$3,'hotel',$4) on conflict do nothing`,params:[u.id,u.username,u.pass_hash,u.hotel_id]});
    await tx(ops);return json({ok:true,hotels:hotels.length,emps:hotels.reduce((t,h)=>t+(h.data?.emps||[]).length,0),att:att.length,note})}
  catch(e:any){return json({error:errMsg(e)},500)}}
