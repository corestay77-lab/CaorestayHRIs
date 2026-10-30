'use client';
import { useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import Form from '@/components/Form';
import { useDB, uid, attAdd, attSet, attDel } from '@/lib/store';
import { calc, recap, rp } from '@/lib/payroll';
import { nowWIB } from '@/lib/geo';
const TABS=['Rekap','Harian','Daftar Bulanan'];
const STAT=['Sakit','Izin','Cuti','Alpa'],code=(n:string)=>n.slice(0,3);
export default function Attendance(){
  const {db,update,locked}=useDB();const [tab,setTab]=useState(TABS[0]),[dept,setDept]=useState(''),[hotel,setHotel]=useState(''),[date,setDate]=useState(nowWIB().date),[err,setErr]=useState('');
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
  return <Shell title="Rekap Absensi" sub="Karyawan scan QR & absen → otomatis masuk rekap → potongan otomatis masuk Payroll. Daftar bulanan per departemen ada di tab Daftar Bulanan.">
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
    {tab===TABS[2]&&(()=>{
      const dp=dept||db.depts[0]||'',list=db.emps.filter(e=>e.status==='Aktif'&&e.dept===dp&&(!hotel||e.hotel===hotel)),[y,m]=db.period.split('-').map(Number),dim=new Date(Date.UTC(y,m,0)).getUTCDate();
      const ds=Array.from({length:dim},(_,i)=>`${db.period}-${String(i+1).padStart(2,'0')}`);
      const manual=(eid:string,d:string)=>db.att.filter(a=>a.empId===eid&&a.date===d&&a.src==='manual'&&a.status!=='Hadir');
      const val=(eid:string,d:string)=>manual(eid,d)[0]?.status||db.sched.find(x=>x.empId===eid&&x.date===d)?.shift||'';
      const qrIn=(eid:string,d:string)=>db.att.find(a=>a.empId===eid&&a.date===d&&a.src==='qr');
      // Satu sel = satu pilihan: shift / Libur (jadwal) atau Sakit/Izin/Cuti/Alpa (absensi manual). Scan karyawan tetap tercatat terpisah.
      const setCell=(e:typeof list[0],d:string,v:string)=>run(async()=>{
        update(x=>({...x,sched:[...x.sched.filter(s=>!(s.empId===e.id&&s.date===d)),...(v&&!STAT.includes(v)?[{id:uid(),empId:e.id,date:d,shift:v}]:[])]}));
        for(const a of manual(e.id,d))await attDel(a.id,`Daftar bulanan ${e.name} ${d}: ubah`);
        if(STAT.includes(v))await attAdd({empId:e.id,date:d,status:v},`Daftar bulanan ${e.name} ${d}: ${v}`)});
      const fillRow=(e:typeof list[0],v:string)=>{if(!v||!confirm(`Isi semua hari ${db.period} untuk ${e.name} dengan "${v}"? (hari yang sudah berisi akan diganti)`))return;
        update(x=>({...x,sched:[...x.sched.filter(s=>!(s.empId===e.id&&s.date.startsWith(db.period))),...(STAT.includes(v)?[]:ds.map(d=>({id:uid(),empId:e.id,date:d,shift:v})))]}),`Daftar bulanan ${e.name} ${db.period}: isi semua ${v}`)};
      const opts=[...db.shifts.map(s=>s.name),'Libur',...STAT];
      return <><section className="card panel"><div className="toolbar"><h2>Daftar hadir {db.period} · {dp||'—'}</h2><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <select value={dp} onChange={e=>setDept(e.target.value)} aria-label="Departemen">{db.depts.map(d=><option key={d}>{d}</option>)}</select>
        <select value={hotel} onChange={e=>setHotel(e.target.value)} aria-label="Filter hotel"><option value="">Semua hotel</option>{db.hotels.map(h=><option key={h}>{h}</option>)}</select></div></div>
        <p className="muted">Isi satu bulan penuh per departemen: pilih shift (jadwal) atau Libur / Sakit / Izin / Cuti / Alpa di tiap tanggal. Titik hijau (●) = karyawan sudah scan absen hari itu. Hari terjadwal yang lewat tanpa scan atau keterangan dihitung alpa otomatis; Libur tidak. Hasilnya langsung masuk Rekap dan Payroll. Shift diatur di Pengaturan.</p>
        <p className="muted">Kode: {db.shifts.map(s=>`${code(s.name)} = ${s.name} ${s.start}–${s.end}`).join(' · ')} · Lib = Libur · Sak = Sakit · Izi = Izin · Cut = Cuti · Alp = Alpa</p>
        <div className="table-wrap"><table><thead><tr><th style={{position:'sticky',left:0,background:'#f6f9ff'}}>Karyawan</th><th>Isi semua</th>{ds.map((d,i)=><th key={d} style={{padding:'11px 3px',textAlign:'center'}}>{i+1}</th>)}</tr></thead><tbody>
        {list.map(e=><tr key={e.id}><td style={{position:'sticky',left:0,background:'#fff'}}>{e.name}<div className="muted">{e.code||'—'}</div></td>
          <td><select disabled={locked} value="" aria-label={`Isi semua ${e.name}`} onChange={ev=>fillRow(e,ev.target.value)}><option value="">…</option>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select></td>
          {ds.map(d=>{const v=val(e.id,d),q=qrIn(e.id,d);return <td key={d} style={{padding:'6px 2px',textAlign:'center'}}><select disabled={locked} value={v} title={`${e.name} ${d}${q?` · scan ${q.in||''}${q.out?'–'+q.out:''}`:''}`} aria-label={`${e.name} ${d}`} style={{width:54,padding:'6px 2px',fontSize:11,background:v==='Alpa'?'#ffe4e9':v?'#eef3ff':'#fff'}} onChange={ev=>setCell(e,d,ev.target.value)}><option value=""></option>
            {opts.map(o=><option key={o} value={o}>{code(o)}</option>)}</select>{q&&<div style={{color:'#13b8aa',fontSize:9,lineHeight:1}}>●</div>}</td>})}</tr>)}
        {!list.length&&<tr><td className="muted" colSpan={dim+2}>Tidak ada karyawan aktif di departemen ini.</td></tr>}</tbody></table></div></section></>})()}
  </Shell>}
