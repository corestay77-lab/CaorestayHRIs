'use client';
import { useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { useDB } from '@/lib/store';
import { calc, rp } from '@/lib/payroll';
export default function Payroll(){
  const {db,update,status}=useDB();const [slip,setSlip]=useState<string|null>(null);
  const act=db.emps.filter(e=>e.status==='Aktif'),R=act.map(e=>({e,c:calc(e,db)}));
  const tot=R.reduce((s,r)=>s+r.c.net,0),s=R.find(r=>r.e.id===slip);
  return <Shell title="Payroll Processing" sub="Dihitung otomatis dari Employee, Kompensasi, Absensi, dan Koreksi periode aktif.">
    <div className="card panel" style={{marginBottom:12}}>Potongan alpa & telat serta lembur diambil otomatis dari <Link href="/attendance">Rekap Absensi</Link> {db.period}. Tidak ada langkah penutupan absensi.</div>
    <section className="card panel"><div className="toolbar"><h2>Perhitungan {db.period}</h2><button className="button" disabled={status!=='draft'||!R.length} onClick={()=>update(d=>({...d,periods:{...d.periods,[d.period]:'submitted'}}),`Ajukan approval payroll ${db.period}`)}>{status==='draft'?'Ajukan Approval':'Status: '+status}</button></div>
      <div className="table-wrap"><table><thead><tr><th>Nama</th><th>Gaji pokok</th><th>Tunjangan</th><th>Lembur</th><th>THR</th><th>BPJS Kes</th><th>BPJS TK</th><th>Potongan</th><th>Koreksi</th><th>Gaji bersih</th><th></th></tr></thead><tbody>
      {R.map(({e,c})=><tr key={e.id}><td>{e.name}</td><td>{rp(e.basic)}</td><td>{rp(e.allowance)}</td><td>{rp(c.overtime)}</td><td>{rp(c.thr)}</td><td>{rp(c.kesEmp)}</td><td>{rp(c.jhtEmp+c.jpEmp)}</td><td>{rp(e.deduction+c.alpaCut+c.lateCut)}</td><td>{rp(c.corr)}</td><td><b>{rp(c.net)}</b></td><td><button className="button secondary" onClick={()=>setSlip(e.id)}>Slip</button></td></tr>)}
      {R.length?<tr><td colSpan={9}><b>Total</b></td><td><b>{rp(tot)}</b></td><td/></tr>:<tr><td className="muted" colSpan={11}>Belum ada karyawan aktif.</td></tr>}</tbody></table></div></section>
    {s&&<section className="card panel" style={{marginTop:12}}><h2>Slip Gaji · {db.period}</h2><p className="muted">{db.settings.company} · ID {db.settings.companyId}{db.settings.npwp?` · NPWP ${db.settings.npwp}`:''}</p><p><b>{s.e.name}</b> · {s.e.code||'—'} · {s.e.hotel} · {s.e.dept}</p><div className="table-wrap"><table><tbody>
      {([['Gaji pokok',s.e.basic],['Tunjangan',s.e.allowance],[`Lembur (${s.c.otHours} jam)`,s.c.overtime],['THR',s.c.thr],['Pendapatan kotor',s.c.gross],['BPJS Kesehatan (1%)',-s.c.kesEmp],['BPJS TK · JHT (2%)',-s.c.jhtEmp],['BPJS TK · JP (1%)',-s.c.jpEmp],['Potongan tetap',-s.e.deduction],[`Potongan alpa (${s.c.alpa} hari)`,-s.c.alpaCut],[`Potongan telat (${s.c.lateMin} menit)`,-(s.c.lateCut||0)],['Koreksi',s.c.corr],['Gaji bersih',s.c.net]] as [string,number][]).map(([l,v])=><tr key={l}><td>{l}</td><td>{rp(v)}</td></tr>)}</tbody></table></div>
      <p className="muted">Jam kerja disetujui: {s.c.hours.toFixed(1)} jam · Keterlambatan: {s.c.lateMin} menit{db.settings.lateCut?` × ${rp(db.settings.lateCut)}`:' (potongan telat Rp 0: atur di Pengaturan bila diperlukan)'}.</p><p className="muted">PPh 21 belum dihitung. Tarif BPJS default, verifikasi sebelum dipakai nyata.</p><button className="button" onClick={()=>window.print()}>Cetak / PDF</button> <button className="button secondary" onClick={()=>setSlip(null)}>Tutup</button></section>}</Shell>}
