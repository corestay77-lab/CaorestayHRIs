'use client';
import { useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import Form from '@/components/Form';
import { useDB, uid, attAdd, attSet, attDel } from '@/lib/store';
import { calc, recap, rp } from '@/lib/payroll';
import { days, nowWIB } from '@/lib/geo';
const TABS=['Rekap','Harian','Jadwal (opsional)'];
export default function Attendance(){
  const {db,update,locked}=useDB();const [tab,setTab]=useState(TABS[0]),[hotel,setHotel]=useState(''),[date,setDate]=useState(nowWIB().date),[err,setErr]=useState('');
  const name=(id:string)=>db.emps.find(e=>e.id===id)?.name||'—';
  const act=db.emps.filter(e=>e.status==='Aktif'&&(!hotel||e.hotel===hotel));
  const R=act.map(e=>({e,r:recap(e.id,db),c:calc(e,db)}));
  const T=R.reduce((t,x)=>({hadir:t.hadir+x.r.hadir,telat:t.telat+x.r.telat,alpa:t.alpa+x.r.alpa,ot:t.ot+x.r.otHours,cut:t.cut+x.c.alpaCut+x.c.lateCut}),{hadir:0,telat:0,alpa:0,ot:0,cut:0});
  const run=async(f:()=>Promise<void>)=>{setErr('');try{await f()}catch(e:any){setErr(e.message)}};
  const csv=()=>{const rows=[['Kode','Nama','Hotel','Hadir','Telat (kali)','Telat (menit)','Sakit','Izin','Cuti','Alpa','Lembur (jam)','Potongan alpa','Potongan telat'],...R.map(({e,r,c})=>[e.code||'',e.name,e.hotel,r.hadir,r.telat,r.lateMin,r.sakit,r.izin,r.cuti,r.alpa,r.otHours,Math.round(c.alpaCut),Math.round(c.lateCut)])];
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n')],{type:'text/csv'}));a.download=`rekap-absensi-${db.period}.csv`;a.click()};
  const sched=db.sched.filter(s=>s.date.startsWith(db.period)).sort((a,b)=>a.date.localeCompare(b.date));
  const day=db.att.filter(a=>a.date===date).sort((a,b)=>(a.in||'').localeCompare(b.in||''));
  const step=(l:string,href?:string)=>href?<Link href={href} className="badge">{l}</Link>:<span className="badge">{l}</span>;
  return <Shell title="Rekap Absensi" sub="Karyawan scan QR & absen → otomatis masuk rekap → potongan otomatis masuk Payroll. Tanpa persetujuan berlapis.">
    <div className="card panel" style={{marginBottom:12,display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>{step('1. Karyawan absen (QR + PIN)')}→{step('2. Rekap otomatis (halaman ini)')}→{step('3. Payroll: potongan terhitung otomatis','/payroll')}</div>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>{TABS.map(t=><button key={t} className={t===tab?'button':'button secondary'} onClick={()=>setTab(t)}>{t}</button>)}</div>
    {err&&<p role="alert" className="badge bad" style={{marginBottom:10,whiteSpace:'normal'}}>{err}</p>}
    {tab==='Rekap'&&<section className="card panel"><div className="toolbar"><h2>Rekap {db.period}</h2><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      <select value={hotel} onChange={e=>setHotel(e.target.value)} aria-label="Filter hotel"><option value="">Semua hotel</option>{db.hotels.map(h=><option key={h}>{h}</option>)}</select>
      <button className="button secondary" onClick={csv} disabled={!R.length}>Unduh CSV</button><Link className="button" href="/payroll">Lihat Payroll →</Link></div></div>
      <div className="table-wrap"><table><thead><tr><th>Karyawan</th><th>Hadir</th><th>Telat</th><th>Menit telat</th><th>Sakit</th><th>Izin</th><th>Cuti</th><th>Alpa</th><th>Lembur (jam)</th><th>Potongan → Payroll</th></tr></thead><tbody>
      {R.map(({e,r,c})=>{const cut=c.alpaCut+c.lateCut;return <tr key={e.id}><td>{e.name}<div className="muted">{e.code||'—'} · {e.hotel}</div></td><td>{r.hadir}</td><td>{r.telat}×</td><td>{r.lateMin}</td><td>{r.sakit}</td><td>{r.izin}</td><td>{r.cuti}</td>
        <td>{r.alpa}{r.autoAlpa>0&&<span className="muted"> ({r.autoAlpa} dari jadwal)</span>}</td><td>{r.otHours}</td><td>{cut>0?<b style={{color:'#c0243f'}}>−{rp(cut)}</b>:<span className="muted">—</span>}{r.belumPulang>0&&<span className="badge wait" style={{marginLeft:6}}>{r.belumPulang} belum pulang</span>}</td></tr>})}
      {R.length?<tr><td><b>Total</b></td><td><b>{T.hadir}</b></td><td><b>{T.telat}×</b></td><td/><td/><td/><td/><td><b>{T.alpa}</b></td><td><b>{T.ot}</b></td><td><b>−{rp(T.cut)}</b></td></tr>:<tr><td colSpan={10} className="muted">Belum ada karyawan aktif.</td></tr>}</tbody></table></div>
      <p className="muted">Potongan = alpa (gaji pokok ÷ 26 per hari) + telat (Rp per menit, diatur di Pengaturan{db.settings.lateCut?`: sekarang ${rp(db.settings.lateCut)}/menit`:' — saat ini Rp 0, belum ada potongan telat'}). Lembur dihitung dari jam pulang setelah jam selesai shift. Alpa otomatis hanya untuk karyawan yang memakai jadwal.</p></section>}
    {tab==='Harian'&&<><section className="card panel"><div className="toolbar"><h2>Absensi {date}</h2><input type="date" value={date} onChange={e=>setDate(e.target.value)} aria-label="Tanggal"/></div>
      <div className="table-wrap"><table><thead><tr><th>Karyawan</th><th>Status</th><th>Masuk</th><th>Pulang</th><th>Telat</th><th>Jam</th><th>Jarak</th><th>Lembur (jam)</th><th></th></tr></thead><tbody>
      {day.map(a=><tr key={a.id}><td>{name(a.empId)}</td><td><span className="badge">{a.status}</span></td><td>{a.in||'—'}</td><td>{a.out||(a.in?<span className="badge wait">belum pulang</span>:'—')}</td><td>{a.lateMin?a.lateMin+' mnt':'—'}</td><td>{a.hours??'—'}</td><td>{a.dist!==undefined?a.dist+' m':'—'}</td>
        <td><input type="number" min={0} step={0.5} style={{width:70}} disabled={locked} defaultValue={a.otHours} key={a.id+a.otHours} onBlur={e=>{const n=Number(e.target.value)||0;if(n!==a.otHours)run(()=>attSet(a.id,{otHours:n},`Ubah lembur ${name(a.empId)} ${a.date} → ${n}`))}}/></td>
        <td><button className="button secondary" disabled={locked} onClick={()=>{if(confirm('Hapus absensi ini?'))run(()=>attDel(a.id,`Hapus absensi ${name(a.empId)} ${a.date}`))}}>Hapus</button></td></tr>)}
      {!day.length&&<tr><td colSpan={9} className="muted">Belum ada absensi pada tanggal ini.</td></tr>}</tbody></table></div></section>
      <section className="card panel" style={{marginTop:12}}><h2>Input manual (sakit / izin / cuti / alpa / koreksi)</h2><Form disabled={locked||!db.emps.length} fields={[{k:'emp',label:'Karyawan',type:'select',opts:db.emps.map(e=>[e.id,e.name])},{k:'date',label:'Tanggal',type:'date',req:true},{k:'st',label:'Status',type:'select',opts:['Sakit','Izin','Cuti','Alpa','Hadir'].map(s=>[s,s])},{k:'ot',label:'Jam lembur',type:'number'}]}
        onAdd={v=>{const emp=v.emp||db.emps[0].id,st=v.st||'Sakit';run(()=>attAdd({empId:emp,date:v.date,status:st,otHours:Number(v.ot)||0},`Absensi manual ${name(emp)} ${v.date}: ${st}`))}}/>
        <p className="muted">Karyawan yang tidak scan tidak perlu diinput kalau memakai jadwal: alpa dihitung otomatis. Input manual dipakai untuk sakit/izin/cuti atau koreksi.</p></section></>}
    {tab===TABS[2]&&<><section className="card panel"><h2>Atur jadwal shift</h2><p className="muted">Opsional. Tanpa jadwal, jam masuk memakai jam default hotel (+8 jam kerja). Dengan jadwal, keterlambatan, lembur, dan alpa otomatis mengikuti shift.</p>
      <Form disabled={locked||!db.emps.length} fields={[{k:'emp',label:'Karyawan',type:'select',opts:db.emps.map(e=>[e.id,e.name])},{k:'from',label:'Dari',type:'date',req:true},{k:'to',label:'Sampai',type:'date',req:true},{k:'sh',label:'Shift',type:'select',opts:db.shifts.map(s=>[s.name,`${s.name} ${s.start}–${s.end}`])}]}
      btn="Simpan jadwal" onAdd={v=>{const emp=v.emp||db.emps[0].id,sh=v.sh||db.shifts[0].name,ds=days(v.from,v.to);update(d=>({...d,sched:[...d.sched.filter(s=>!(s.empId===emp&&ds.includes(s.date))),...ds.map(date=>({id:uid(),empId:emp,date,shift:sh}))]}),`Jadwal ${name(emp)} ${v.from}–${v.to}: ${sh}`)}}/></section>
      <section className="card panel" style={{marginTop:12}}><h2>Definisi shift</h2><Form disabled={locked} fields={[{k:'n',label:'Nama',req:true},{k:'s',label:'Mulai',type:'time',req:true},{k:'e',label:'Selesai',type:'time',req:true}]} onAdd={v=>update(d=>({...d,shifts:[...d.shifts.filter(x=>x.name!==v.n),{name:v.n,start:v.s,end:v.e}]}),`Shift ${v.n} ${v.s}–${v.e}`)}/>
      <p className="muted">{db.shifts.map(s=>`${s.name} ${s.start}–${s.end}`).join(' · ')}</p></section>
      <section className="card panel" style={{marginTop:12}}><h2>Jadwal {db.period} ({sched.length})</h2><div className="table-wrap"><table><tbody>{sched.map(s=><tr key={s.id}><td>{s.date}</td><td>{name(s.empId)}</td><td><span className="badge">{s.shift}</span></td><td><button className="button secondary" disabled={locked} onClick={()=>update(d=>({...d,sched:d.sched.filter(x=>x.id!==s.id)}))}>Hapus</button></td></tr>)}{!sched.length&&<tr><td className="muted">Belum ada jadwal.</td></tr>}</tbody></table></div></section></>}
  </Shell>}
