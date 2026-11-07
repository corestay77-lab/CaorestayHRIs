import { NextResponse } from 'next/server';
import { dbConfigured, q, missingTable } from '@/lib/db';
import { authRow, getMe, verifySecret, hashSecret, json, setSession, COOKIE, errMsg } from '@/lib/auth';
export const dynamic='force-dynamic';
// Status awal: database belum dihubungkan / belum dibuat / perlu upgrade (versi lama) / siap, dan sudah login atau belum.
export async function GET(){
  if(!dbConfigured())return json({db:'none',auth:'setup'});
  try{const uc=(await q(`select count(*)::int as c from hr_user`))[0].c;
    if(!uc)return json({db:'ready',auth:'setup'});
    const me=await getMe();return json({db:'ready',auth:me?'ok':'login',me})}
  catch(e:any){if(!missingTable(e))return json({db:'error',auth:'setup',error:errMsg(e)});
    try{if(await authRow())return json({db:'upgrade',auth:'setup'})}catch{}
    return json({db:'empty',auth:'setup'})}}
export async function POST(req:Request){
  try{const b=await req.json().catch(()=>({}));
    if(b.action==='logout'){const r=NextResponse.json({ok:true});r.cookies.set(COOKIE,'',{path:'/',maxAge:0});return r}
    if(b.action==='login'){
      await new Promise(r=>setTimeout(r,400)); // memperlambat tebak-tebakan password
      const u=(await q(`select id, pass_hash from hr_user where lower(username)=lower($1)`,[String(b.username||'').trim()]))[0],a=await authRow();
      if(!u||!a||!verifySecret(String(b.password||''),u.pass_hash))return json({error:'Username atau password salah'},401);
      return setSession(NextResponse.json({ok:true}),a.secret,u.id)}
    if(b.action==='password'){
      const me=await getMe();if(!me)return json({error:'Belum login'},401);
      const u=(await q(`select pass_hash from hr_user where id=$1`,[me.id]))[0];
      if(!u||!verifySecret(String(b.old||''),u.pass_hash))return json({error:'Password lama salah'},400);
      const n=String(b.password||'');if(n.length<6)return json({error:'Password baru minimal 6 karakter'},400);
      await q(`update hr_user set pass_hash=$1 where id=$2`,[hashSecret(n),me.id]);return json({ok:true})}
    return json({error:'Aksi tidak dikenal'},400)}catch(e:any){return json({error:errMsg(e)},500)}}
