/* eslint-disable react-hooks/exhaustive-deps */
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Shell from '@/components/Shell';
import HotelQr from '@/components/HotelQr';
import { useDB, api, reloadHotels, switchHotel } from '@/lib/store';
import { TZS, detectTz, okTz } from '@/lib/geo';
import { rp } from '@/lib/payroll';
// Admin pusat: ringkasan semua hotel, daftarkan hotel baru + login-nya, reset login. Database tetap satu; data tiap hotel terpisah.
type Row={id:string;name:string;username:string;karyawan:number;biayaModel:number;hadirHariIni:number;belumPulang:number;periode:string;statusPayroll:string;qr:boolean;qrToken:string;lokasi:boolean};
export default function Hotels(){
  const {me,db,hotelId}=useDB(),router=useRouter();
  const [rows,setRows]=useState<Row[]>([]),[err,setErr]=useState(''),[ok,setOk]=useState(''),[busy,setBusy]=useState(false);
  const [f,setF]=useState({name:'',lat:'',lng:'',radius:'100',shift:'08:00',tz:detectTz()||okTz(db.settings.tz),username:'',password:''});
  const [reset,setReset]=useState<{id:string;username:string;password:string}|null>(null),[qrv,setQrv]=useState<{id:string;name:string;token:string}|null>(null);
  const load=()=>api('/api/overview').then(r=>setRows(r.hotels)).catch(e=>setErr(e.message));
  useEffect(()=>{if(me?.role==='admin')load()},[me?.role]);
  if(me&&me.role!=='admin')return <Shell title="Semua Hotel"><section className="card panel">Halaman ini hanya untuk admin pusat.</section></Shell>;
  const here=()=>navigator.geolocation.getCurrentPosition(p=>setF(x=>({...x,lat:p.coords.latitude.toFixed(6),lng:p.coords.longitude.toFixed(6)})),()=>setErr('Lokasi tidak bisa diakses. Isi koordinat manual.'),{enableHighAccuracy:true,timeout:15000});
  const run=async(fn:()=>Promise<void>)=>{setBusy(true);setErr('');setOk('');try{await fn()}catch(e:any){setErr(e.message)}setBusy(false)};
  const create=()=>run(async()=>{const r=await api('/api/hotels',{method:'POST',body:JSON.stringify({...f,lat:Number(f.lat)||0,lng:Number(f.lng)||0,radius:Number(f.radius)||100})});
    await reloadHotels();await switchHotel(r.id);setQrv({id:r.id,name:f.name.trim(),token:r.qr});setOk(`Hotel ${f.name} terdaftar. Login: ${f.username}. Poster QR absen ada di bawah: cetak dan tempel di pos security.`);setF({...f,name:'',lat:'',lng:'',username:'',password:''});await load()});
  const doReset=()=>run(async()=>{if(!reset)return;await api('/api/hotels',{method:'PATCH',body:JSON.stringify(reset)});setOk('Login hotel diperbarui.');setReset(null);await load()});
  const ready=f.name.trim()&&/^[a-z0-9._-]{3,30}$/i.test(f.username)&&f.password.length>=6;
  return <Shell title="Semua Hotel & Login" sub="Satu database, data tiap hotel terpisah. Tiap hotel punya login sendiri dan hanya melihat hotelnya; admin pusat melihat semua.">
    <section className="card panel"><h2>Ringkasan hotel</h2>
      <div className="table-wrap"><table><thead><tr><th>Hotel</th><th>Login</th><th>Karyawan aktif</th><th>Hadir hari ini</th><th>Belum pulang</th><th>Biaya perusahaan / bln (model)</th><th>Payroll {rows[0]?.periode||''}</th><th>Setup</th><th></th></tr></thead><tbody>
      {rows.map(r=><tr key={r.id}><td><b>{r.name}</b>{r.id===hotelId&&<span className="badge ok" style={{marginLeft:6}}>aktif</span>}</td><td>{r.username||<span className="badge wait">belum ada</span>}</td><td>{r.karyawan}</td><td>{r.hadirHariIni}</td><td>{r.belumPulang||'—'}</td><td>{rp(r.biayaModel)}</td><td><span className="badge">{r.statusPayroll}</span></td>
        <td>{r.lokasi?'📍':<span className="badge wait">lokasi?</span>} {r.qr?'QR ✓':'QR ✗'}</td>
        <td style={{whiteSpace:'nowrap'}}><button className="button" onClick={()=>{switchHotel(r.id);router.push('/')}}>Buka</button> <button className="button secondary" disabled={!r.qrToken} onClick={()=>setQrv({id:r.id,name:r.name,token:r.qrToken})}>QR absen</button> <button className="button secondary" onClick={()=>setReset({id:r.id,username:r.username,password:''})}>Reset login</button></td></tr>)}
      {!rows.length&&<tr><td className="muted" colSpan={9}>Belum ada hotel. Daftarkan hotel pertama di bawah.</td></tr>}</tbody></table></div>
      {reset&&<div style={{marginTop:10,padding:12,background:'#f6f9ff',borderRadius:14,display:'flex',gap:8,flexWrap:'wrap',alignItems:'flex-end'}}>
        <div className="field" style={{margin:0}}><label>Username</label><input value={reset.username} onChange={e=>setReset({...reset,username:e.target.value})}/></div>
        <div className="field" style={{margin:0}}><label>Password baru (kosong = tidak diubah)</label><input type="password" value={reset.password} onChange={e=>setReset({...reset,password:e.target.value})}/></div>
        <button className="button" disabled={busy} onClick={doReset}>Simpan</button><button className="button secondary" onClick={()=>setReset(null)}>Batal</button></div>}
      {err&&<p role="alert" className="badge bad" style={{whiteSpace:'normal',marginTop:10}}>{err}</p>}{ok&&<p role="status" className="badge ok" style={{whiteSpace:'normal',marginTop:10}}>{ok}</p>}</section>
    {qrv&&<HotelQr hotel={qrv.name} token={qrv.token} onClose={()=>setQrv(null)} onRegen={()=>run(async()=>{const r=await api('/api/hotels',{method:'PATCH',body:JSON.stringify({id:qrv.id,regenQr:true})});setQrv({...qrv,token:r.qr});await load()})}/>}
    <section className="card panel" style={{marginTop:12}}><h2>Daftarkan hotel baru</h2>
      <p className="muted">Hotel baru mendapat data sendiri (karyawan, jadwal, payroll, QR absen) di database yang sama, plus satu login hotel. Isi lokasi hotel dari lobi agar absen karyawan tervalidasi.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:'0 12px'}}>
        <div className="field"><label>Nama hotel</label><input value={f.name} onChange={e=>setF({...f,name:e.target.value})}/></div>
        <div className="field"><label>Latitude</label><input inputMode="decimal" value={f.lat} onChange={e=>setF({...f,lat:e.target.value})}/></div>
        <div className="field"><label>Longitude</label><input inputMode="decimal" value={f.lng} onChange={e=>setF({...f,lng:e.target.value})}/></div>
        <div className="field"><label>Radius (m)</label><input type="number" value={f.radius} onChange={e=>setF({...f,radius:e.target.value})}/></div>
        <div className="field"><label>Zona waktu</label><select value={f.tz} onChange={e=>setF({...f,tz:e.target.value})}>{TZS.map(t=><option key={t[0]} value={t[0]}>{t[2]}</option>)}</select></div>
        <div className="field"><label>Username login hotel</label><input value={f.username} autoCapitalize="none" onChange={e=>setF({...f,username:e.target.value})} placeholder="mis. hotel-makassar"/></div>
        <div className="field"><label>Password login hotel (min. 6)</label><input type="password" value={f.password} autoComplete="new-password" onChange={e=>setF({...f,password:e.target.value})}/></div></div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button className="button secondary" onClick={here}>Pakai lokasi saya</button><button className="button" disabled={busy||!ready} onClick={create}>{busy?'Mendaftarkan…':'Daftarkan hotel & login'}</button></div></section>
  </Shell>}
