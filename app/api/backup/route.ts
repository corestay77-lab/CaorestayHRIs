import { NextResponse } from 'next/server';
import { q, tx } from '@/lib/db';
import { guard, json, errMsg } from '@/lib/auth';
export const dynamic='force-dynamic';
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b=>b.toString(16).padStart(2,'0')).join('');
// Download: seluruh data (karyawan, gaji, hotel, absensi, PIN terenkripsi) dalam satu file JSON. Simpan file ini dengan aman.
export async function GET(){
  const g=await guard();if(g)return g;
  try{const [s,a,p]=await Promise.all([q(`select data from hr_state where id=1`),q(`select * from hr_att order by work_date`),q(`select emp_id, pin_hash from hr_pin`)]);
    const body=JSON.stringify({app:'corestay-people',v:2,exported:new Date().toISOString(),state:s[0]?.data||{},att:a,pins:p},null,1);
    return new NextResponse(body,{headers:{'Content-Type':'application/json','Content-Disposition':`attachment; filename="corestay-people-backup-${new Date().toISOString().slice(0,10)}.json"`,'Cache-Control':'no-store'}})}
  catch(e:any){return json({error:errMsg(e)},500)}}
// Restore: mengganti SELURUH isi database dengan isi file backup. Menerima file backup baru (v2) maupun backup lama dari versi lokal.
export async function POST(req:Request){
  const g=await guard();if(g)return g;
  try{const j=await req.json();let state:any,att:any[]=[],pins:any[]=[];
    if(j?.app==='corestay-people'&&j.state){state=j.state;att=j.att||[];pins=j.pins||[]}
    else if(j&&Array.isArray(j.emps)){ // backup lama (data dari browser)
      const {att:old=[],...rest}=j;state=rest;
      att=old.filter((a:any)=>a.appr!=='rejected').map((a:any)=>({id:a.id,emp_id:a.empId,work_date:a.date,status:a.status,clock_in:a.in||null,clock_out:a.out||null,ot_hours:a.otHours||0,late_min:a.lateMin||0,hours:a.hours??null,dist:a.dist??null,acc:null,src:a.src==='selfie'?'qr':'manual',note:a.note||null}))}
    else return json({error:'File backup tidak dikenali'},400);
    state.geo=state.geo||{};for(const h of state.hotels||[]){state.geo[h]={lat:0,lng:0,radius:100,shift:'08:00',...(state.geo[h]||{})};if(!state.geo[h].qr)state.geo[h].qr=token()}
    delete state.att;
    const ops:{text:string;params?:any[]}[]=[{text:`delete from hr_att`},{text:`delete from hr_pin`},{text:`update hr_state set data=$1::jsonb, version=version+1, updated_at=now() where id=1`,params:[JSON.stringify(state)]}];
    for(let i=0;i<att.length;i+=300){const ch=att.slice(i,i+300),ps:any[]=[];
      const vals=ch.map((r,k)=>{ps.push(r.id,r.emp_id,r.work_date,r.status||'Hadir',r.clock_in??null,r.clock_out??null,Number(r.ot_hours)||0,Number(r.late_min)||0,r.hours??null,r.dist??null,r.acc??null,r.src||'manual',r.note??null);const o=k*13;return `(${Array.from({length:13},(_,c)=>'$'+(o+c+1)).join(',')})`}).join(',');
      ops.push({text:`insert into hr_att(id,emp_id,work_date,status,clock_in,clock_out,ot_hours,late_min,hours,dist,acc,src,note) values ${vals} on conflict do nothing`,params:ps})}
    for(const p of pins)ops.push({text:`insert into hr_pin(emp_id,pin_hash) values($1,$2) on conflict (emp_id) do nothing`,params:[p.emp_id,p.pin_hash]});
    await tx(ops);return json({ok:true,emps:(state.emps||[]).length,att:att.length})}
  catch(e:any){return json({error:errMsg(e)},500)}}
