import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { dbConfigured, ensureSchema, q } from '@/lib/db';
import { authRow, hashSecret, isAdmin, json, setSession, errMsg } from '@/lib/auth';
export const dynamic='force-dynamic';
// "Buat database": membuat tabel (aman diulang) dan, pada setup pertama, menetapkan password HRD.
export async function POST(req:Request){
  if(!dbConfigured())return json({error:'Database belum dihubungkan. Di Vercel: Storage → Create Database → Connect ke proyek, lalu Redeploy.'},400);
  try{const b=await req.json().catch(()=>({}));
    let row=null;try{row=await authRow()}catch{}
    if(row){ // sudah pernah disetup: hanya HRD yang login boleh menjalankan ulang (memperbarui tabel)
      if(!(await isAdmin()))return json({error:'Belum login'},401);
      await ensureSchema();return json({ok:true,created:false})}
    const pw=String(b.password||'');if(pw.length<6)return json({error:'Buat password HRD minimal 6 karakter'},400);
    await ensureSchema();
    const secret=randomBytes(32).toString('hex');
    await q(`insert into hr_auth(id,pass_hash,secret) values(1,$1,$2) on conflict (id) do nothing`,[hashSecret(pw),secret]);
    const r=await authRow();if(!r)return json({error:'Gagal menyimpan password'},500);
    return setSession(NextResponse.json({ok:true,created:true}),r.secret)}
  catch(e:any){return json({error:errMsg(e)},500)}}
