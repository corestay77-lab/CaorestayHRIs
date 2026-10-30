'use client';
import Shell from '@/components/Shell';
import Form from '@/components/Form';
import { useState } from 'react';
import HotelSetup from '@/components/HotelSetup';
import DatabaseCard from '@/components/DatabaseCard';
import { useDB, uid, assignCode, api, loadAll } from '@/lib/store';
import { EMPTY, Settings } from '@/lib/payroll';
const ROLES:[string,string][]=[['Admin','Akses penuh, termasuk pengaturan dan buka kunci payroll'],['HRD','Karyawan, kompensasi, dan rekap absensi'],['Payroll','Proses payroll, koreksi, approval, dan lock'],['Manager','Melihat laporan dan labor cost'],['Viewer','Hanya melihat']];
function Inp({label,v,onSave,type='text'}:{label:string;v:string|number;onSave:(s:string)=>void;type?:string}){
  return <div className="field"><label>{label}</label><input type={type} defaultValue={v} key={String(v)} onBlur={e=>{if(e.target.value!==String(v))onSave(e.target.value)}}/></div>}
export default function SettingsPage(){
  const {db,update}=useDB();const S=db.settings;
  const sv=(k:keyof Settings,label:string)=>(val:string)=>update(d=>({...d,settings:{...d.settings,[k]:typeof d.settings[k]==='number'?Math.max(0,Number(val)||0):val}}),`Pengaturan ${label} → ${val}`);
  const grid={display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'0 12px'} as const;
  const [pw,setPw]=useState({old:'',n:''}),[pwMsg,setPwMsg]=useState('');
  const chPw=async()=>{try{await api('/api/auth',{method:'POST',body:JSON.stringify({action:'password',old:pw.old,password:pw.n})});setPw({old:'',n:''});setPwMsg('Password diganti.')}catch(e:any){setPwMsg(e.message)}};
  const wipe=async()=>{if(prompt('Ini menghapus SEMUA data (karyawan, gaji, absensi, PIN). Download backup dulu. Ketik HAPUS untuk melanjutkan.')!=='HAPUS')return;
    try{await api('/api/backup',{method:'POST',body:JSON.stringify({app:'corestay-people',v:2,state:{...EMPTY,period:new Date().toISOString().slice(0,7)},att:[],pins:[]})});await loadAll()}catch(e:any){alert(e.message)}};
  const seed=()=>{update(d0=>{let d={...d0};const h='Hotel Contoh';d.hotels=d.hotels.includes(h)?d.hotels:[...d.hotels,h];
    for(const [n,dp,b,a] of [['Contoh A','Front Office',6000000,1000000],['Contoh B','Housekeeping',5000000,500000],['Contoh C','F&B',5500000,750000]] as [string,string,number,number][]){const[code,d2]=assignCode(d);d={...d2,emps:[...d2.emps,{id:uid(),code,name:`${n} (contoh)`,hotel:h,dept:dp,position:'Staff',joinDate:'2025-01-01',status:'Aktif' as const,basic:b,allowance:a,deduction:0,thrFactor:0}]}}return d},'Isi data contoh')};
  const preview=`${S.empPrefix}-${String(S.empNext).padStart(S.empDigits,'0')}`;
  const setUser=(id:string,patch:object,m:string)=>update(d=>({...d,settings:{...d.settings,users:d.settings.users.map(u=>u.id===id?{...u,...patch}:u)}}),`Pengguna ${id}: ${m}`);
  return <Shell title="Pengaturan & Hak Akses" sub="Database & backup, hotel & QR absen, identitas perusahaan, penomoran ID, pengguna & peran, dan parameter absensi.">
    <DatabaseCard/><HotelSetup/>
    <section className="card panel" style={{marginTop:12}}><h2>Profil & ID Perusahaan</h2><div style={grid}>
      <Inp label="Nama perusahaan" v={S.company} onSave={sv('company','nama perusahaan')}/><Inp label="ID / kode perusahaan (tenant)" v={S.companyId} onSave={sv('companyId','ID perusahaan')}/>
      <Inp label="NPWP perusahaan" v={S.npwp} onSave={sv('npwp','NPWP')}/><Inp label="Telepon" v={S.phone} onSave={sv('phone','telepon')}/><Inp label="Email" type="email" v={S.email} onSave={sv('email','email')}/><Inp label="Alamat" v={S.address} onSave={sv('address','alamat')}/></div>
      <p className="muted">Nama dan ID perusahaan tampil di topbar, footer sidebar, dan slip gaji.</p></section>
    <section className="card panel" style={{marginTop:12}}><h2>Penomoran ID Karyawan</h2><div style={grid}>
      <Inp label="Awalan (prefix)" v={S.empPrefix} onSave={sv('empPrefix','prefix ID')}/><Inp label="Jumlah digit" type="number" v={S.empDigits} onSave={sv('empDigits','digit ID')}/><Inp label="Nomor berikutnya" type="number" v={S.empNext} onSave={sv('empNext','nomor berikutnya')}/></div>
      <p>ID karyawan berikutnya: <span className="badge">{preview}</span> <span className="muted">Diberikan otomatis saat karyawan ditambahkan; ID yang sudah ada tidak berubah.</span></p></section>
    <section className="card panel" style={{marginTop:12}}><h2>Pengguna & Hak Akses</h2>
      <Form fields={[{k:'id',label:'User ID',req:true},{k:'name',label:'Nama',req:true},{k:'email',label:'Email'},{k:'role',label:'Peran',type:'select',opts:ROLES.map(r=>[r[0],r[0]])}]} btn="Tambah pengguna"
        onAdd={v=>{const id=v.id.trim();if(S.users.some(u=>u.id===id))return alert('User ID sudah dipakai');update(d=>({...d,settings:{...d.settings,users:[...d.settings.users,{id,name:v.name.trim(),email:v.email||'',role:v.role||'Admin',active:true}]}}),`Tambah pengguna ${id}`)}}/>
      <div className="table-wrap"><table><thead><tr><th>User ID</th><th>Nama</th><th>Email</th><th>Peran</th><th>Status</th><th></th></tr></thead><tbody>
        {S.users.map(u=><tr key={u.id}><td>{u.id}</td><td>{u.name}</td><td>{u.email||'—'}</td><td><select value={u.role} aria-label={`Peran ${u.id}`} onChange={e=>setUser(u.id,{role:e.target.value},'peran '+e.target.value)}>{ROLES.map(r=><option key={r[0]}>{r[0]}</option>)}</select></td>
          <td>{S.activeUser===u.id?<span className="badge ok">Pengguna aktif</span>:<span className={`badge ${u.active?'':'bad'}`}>{u.active?'Aktif':'Nonaktif'}</span>}</td>
          <td style={{whiteSpace:'nowrap'}}><button className="button secondary" disabled={!u.active||S.activeUser===u.id} onClick={()=>update(d=>({...d,settings:{...d.settings,activeUser:u.id}}),`Ganti pengguna aktif → ${u.id}`)}>Pakai</button> <button className="button secondary" disabled={S.activeUser===u.id} onClick={()=>setUser(u.id,{active:!u.active},u.active?'dinonaktifkan':'diaktifkan')}>{u.active?'Nonaktifkan':'Aktifkan'}</button> <button className="button secondary" disabled={S.activeUser===u.id} onClick={()=>update(d=>({...d,settings:{...d.settings,users:d.settings.users.filter(x=>x.id!==u.id)}}),`Hapus pengguna ${u.id}`)}>Hapus</button></td></tr>)}</tbody></table></div>
      <div className="table-wrap"><table><tbody>{ROLES.map(r=><tr key={r[0]}><td><b>{r[0]}</b></td><td>{r[1]}</td></tr>)}</tbody></table></div>
      <p className="muted">Akses aplikasi dilindungi satu password HRD. Pengguna aktif dipakai untuk identitas di topbar dan Audit Log; pembatasan akses per peran belum ditegakkan.</p></section>
    <section className="card panel" style={{marginTop:12}}><h2>Parameter Absensi (default)</h2><div style={grid}>
      <Inp label="Radius default hotel (meter)" type="number" v={S.radius} onSave={sv('radius','radius default')}/><Inp label="Jam masuk default hotel" type="time" v={S.shift} onSave={sv('shift','jam masuk default')}/><Inp label="Toleransi keterlambatan (menit)" type="number" v={S.tol} onSave={sv('tol','toleransi telat')}/><Inp label="Akurasi GPS maksimal (meter)" type="number" v={S.maxAcc} onSave={sv('maxAcc','akurasi GPS maks')}/><Inp label="Potongan telat (Rp per menit)" type="number" v={S.lateCut} onSave={sv('lateCut','potongan telat per menit')}/></div>
      <p className="muted">Radius dan jam masuk default dipakai saat hotel baru didaftarkan. Absen ditolak bila akurasi GPS lebih buruk dari batas. Potongan telat 0 = tidak ada potongan telat; potongan alpa (gaji pokok ÷ 26 per hari) selalu dihitung otomatis dari rekap.</p></section>
    <section className="card panel" style={{marginTop:12}}><h2>Ganti Password HRD</h2><div style={grid}><div className="field"><label>Password lama</label><input type="password" value={pw.old} onChange={e=>setPw({...pw,old:e.target.value})}/></div><div className="field"><label>Password baru (min. 6)</label><input type="password" value={pw.n} onChange={e=>setPw({...pw,n:e.target.value})}/></div></div><button className="button" disabled={!pw.old||pw.n.length<6} onClick={chPw}>Ganti password</button>{pwMsg&&<p role="status" className="muted">{pwMsg}</p>}</section>
    <section className="card panel" style={{marginTop:12}}><h2>Data contoh & reset</h2><div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}><button className="button secondary" onClick={seed}>Isi data contoh</button><button className="button secondary" onClick={wipe}>Reset semua data</button></div>
      <p className="muted">Data contoh hanya untuk uji coba. Reset menghapus semua data di database (minta ketik HAPUS).</p></section></Shell>}
