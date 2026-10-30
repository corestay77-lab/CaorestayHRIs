import { NextResponse } from 'next/server';
import { dbConfigured, q, missingTable } from '@/lib/db';
import { authRow, isAdmin, verifySecret, hashSecret, json, setSession, COOKIE, errMsg } from '@/lib/auth';
export const dynamic='force-dynamic';
// Status awal untuk aplikasi: database belum dihubungkan / belum dibuat / siap, dan sudah login atau belum.
export async function GET(){
  if(!dbConfigured())return json({db:'none',auth:'setup'});
  try{const row=await authRow();if(!row)return json({db:'ready',auth:'setup'});return json({db:'ready',auth:(await isAdmin())?'ok':'login'})}
  catch(e:any){if(missingTable(e))return json({db:'empty',auth:'setup'});return json({db:'error',auth:'setup',error:errMsg(e)})}}
export async function POST(req:Request){
  try{const b=await req.json().catch(()=>({}));
    if(b.action==='logout'){const r=NextResponse.json({ok:true});r.cookies.set(COOKIE,'',{path:'/',maxAge:0});return r}
    const row=await authRow();if(!row)return json({error:'Password belum dibuat. Jalankan setup awal.'},400);
    if(b.action==='login'){
      await new Promise(r=>setTimeout(r,400)); // memperlambat tebak-tebakan password
      if(!verifySecret(String(b.password||''),row.pass_hash))return json({error:'Password salah'},401);
      return setSession(NextResponse.json({ok:true}),row.secret)}
    if(b.action==='password'){
      if(!(await isAdmin()))return json({error:'Belum login'},401);
      if(!verifySecret(String(b.old||''),row.pass_hash))return json({error:'Password lama salah'},400);
      const n=String(b.password||'');if(n.length<6)return json({error:'Password baru minimal 6 karakter'},400);
      await q(`update hr_auth set pass_hash=$1 where id=1`,[hashSecret(n)]);return json({ok:true})}
    return json({error:'Aksi tidak dikenal'},400)}catch(e:any){return json({error:errMsg(e)},500)}}
