/* eslint-disable @next/next/no-img-element */
'use client';
import { useState } from 'react';
import { api, refreshGate, Gate as G } from '@/lib/store';
// Layar sebelum aplikasi bisa dipakai: hubungkan database → buat database + password HRD → login.
export default function Gate({g}:{g:G}){
  const [pw,setPw]=useState(''),[pw2,setPw2]=useState(''),[busy,setBusy]=useState(false),[err,setErr]=useState('');
  const run=async(f:()=>Promise<any>)=>{setBusy(true);setErr('');try{await f();await refreshGate()}catch(e:any){setErr(e.message)}setBusy(false)};
  const setup=()=>{if(pw!==pw2)return setErr('Konfirmasi password tidak sama');run(()=>api('/api/setup',{method:'POST',body:JSON.stringify({password:pw})}))};
  const login=()=>run(()=>api('/api/auth',{method:'POST',body:JSON.stringify({action:'login',password:pw})}));
  const wrap=(t:string,c:React.ReactNode)=><main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:16,background:'linear-gradient(180deg,#040d2a,#0a2a7a 40%,#eef3fc 40%)'}}>
    <div className="card panel" style={{width:'100%',maxWidth:460}}><img src="/logo.png" alt="CoreStay" width={130} style={{display:'block',margin:'0 auto 10px',background:'#0a2a7a',borderRadius:12,padding:8,height:'auto'}}/><h2 style={{justifyContent:'center',fontSize:18}}>{t}</h2>{c}</div></main>;
  const pwBox=<><div className="field"><label>Password HRD</label><input type="password" value={pw} onChange={e=>setPw(e.target.value)} autoComplete="new-password"/></div>
    <div className="field"><label>Ulangi password</label><input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} onKeyDown={e=>e.key==='Enter'&&pw.length>=6&&setup()}/></div></>;
  const bad=err&&<p role="alert" className="badge bad" style={{whiteSpace:'normal'}}>{err}</p>;
  if(g.state==='loading')return wrap('Memuat…',<p className="muted" style={{textAlign:'center'}}>Menghubungkan ke database.</p>);
  if(g.state==='none')return wrap('Hubungkan database',<><p>Database belum terhubung ke proyek ini. Tanpa akun lain dan tanpa menyalin kunci:</p>
    <ol style={{lineHeight:1.8,paddingLeft:20}}><li>Buka proyek di <b>Vercel</b> → <b>Storage</b></li><li><b>Create Database</b> (Postgres / Neon) → <b>Connect</b> ke proyek ini</li><li>Tab <b>Deployments</b> → <b>Redeploy</b></li><li>Buka halaman ini lagi</li></ol>
    <button className="button" onClick={()=>refreshGate()}>Saya sudah menghubungkan, cek lagi</button></>);
  if(g.state==='error')return wrap('Database bermasalah',<><p role="alert" className="badge bad" style={{whiteSpace:'normal'}}>{g.msg}</p><button className="button" onClick={()=>refreshGate()}>Coba lagi</button></>);
  if(g.state==='empty'||g.state==='setup')return wrap('Setup awal',<><p className="muted">{g.state==='empty'?'Database terhubung tetapi tabelnya belum dibuat.':'Buat password HRD untuk melindungi data karyawan & gaji.'} Klik tombol di bawah, lalu daftarkan hotel di menu Pengaturan.</p>{pwBox}{bad}
    <button className="button" style={{width:'100%'}} disabled={busy||pw.length<6||!pw2} onClick={setup}>{busy?'Membuat…':'Buat database & masuk'}</button><p className="muted">Password minimal 6 karakter. Segera buat setelah deploy agar orang lain tidak mendahului.</p></>);
  return wrap('Login HRD',<><div className="field"><label>Password</label><input type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&pw&&login()} autoFocus/></div>{bad}<button className="button" style={{width:'100%'}} disabled={busy||!pw} onClick={login}>{busy?'Memeriksa…':'Masuk'}</button></>)}
