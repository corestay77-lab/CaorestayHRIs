import { NextResponse } from 'next/server';
import { randomBytes, randomUUID } from 'node:crypto';
import { dbConfigured, ensureSchema, q } from '@/lib/db';
import { authRow, getMe, hashSecret, json, setSession, errMsg } from '@/lib/auth';
export const dynamic='force-dynamic';
// "Buat database": membuat tabel (aman diulang), memigrasikan data versi lama, dan pada setup pertama membuat akun admin pusat.
export async function POST(req:Request){
  if(!dbConfigured())return json({error:'Database belum dihubungkan. Di Vercel: Storage → Create Database → Connect ke proyek, lalu Redeploy.'},400);
  try{const b=await req.json().catch(()=>({}));
    let users=0;try{users=(await q(`select count(*)::int as c from hr_user`))[0].c}catch{}
    if(users>0){const me=await getMe();if(!me||me.role!=='admin')return json({error:'Hanya admin pusat'},403);await ensureSchema();return json({ok:true,created:false})}
    let legacy=null;try{legacy=await authRow()}catch{}
    if(legacy){await ensureSchema();return json({ok:true,upgraded:true})} // password lama menjadi login admin (username: admin)
    const pw=String(b.password||'');if(pw.length<6)return json({error:'Buat password admin minimal 6 karakter'},400);
    await ensureSchema();
    await q(`insert into hr_auth(id,pass_hash,secret) values(1,$1,$2) on conflict (id) do nothing`,[hashSecret(pw),randomBytes(32).toString('hex')]);
    const a=await authRow();if(!a)return json({error:'Gagal menyimpan password'},500);
    const id=randomUUID();await q(`insert into hr_user(id,username,pass_hash,role) values($1,'admin',$2,'admin') on conflict do nothing`,[id,a.pass_hash]);
    const u=(await q(`select id from hr_user where lower(username)='admin'`))[0];
    return setSession(NextResponse.json({ok:true,created:true}),a.secret,u.id)}
  catch(e:any){return json({error:errMsg(e)},500)}}
