// Server saja. Setiap pengguna punya username + password (hash scrypt). Dua peran:
//  admin = admin pusat (melihat & mengelola semua hotel)   hotel = login satu hotel (hanya melihat hotelnya sendiri)
// Sesi = cookie httpOnly bertanda tangan HMAC; kunci tanda tangan acak disimpan di database (tidak perlu env).
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { q } from './db';
export const COOKIE='cs_session',TTL=12*3600e3;
export type Me={id:string;username:string;role:'admin'|'hotel';hotelId:string|null};
export const hashSecret=(s:string)=>{const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(s,salt,32).toString('hex')};
export const verifySecret=(s:string,h:string)=>{const[salt,hex]=h.split(':');if(!salt||!hex)return false;const a=scryptSync(s,salt,32),b=Buffer.from(hex,'hex');return a.length===b.length&&timingSafeEqual(a,b)};
export const authRow=async()=>(await q<{pass_hash:string;secret:string}>(`select pass_hash, secret from hr_auth where id=1`))[0]||null;
const sign=(secret:string,payload:string)=>createHmac('sha256',secret).update(payload).digest('hex');
export const sessionValue=(secret:string,uid:string)=>{const exp=Date.now()+TTL;return `${exp}.${uid}.${sign(secret,exp+'.'+uid)}`};
export const json=(body:any,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
export const errMsg=(e:any)=>String(e?.message||e||'Terjadi kesalahan');
export async function getMe():Promise<Me|null>{
  try{const v=(await cookies()).get(COOKIE)?.value;if(!v)return null;const[e,uid,sig]=v.split('.'),exp=Number(e);if(!exp||exp<Date.now()||!uid||!sig)return null;
    const r=(await q(`select u.id, u.username, u.role, u.hotel_id, a.secret from hr_user u cross join hr_auth a where u.id=$1`,[uid]))[0];if(!r)return null;
    const want=sign(r.secret,e+'.'+uid);if(want.length!==sig.length||!timingSafeEqual(Buffer.from(want),Buffer.from(sig)))return null;
    return {id:r.id,username:r.username,role:r.role,hotelId:r.hotel_id}}catch{return null}}
export const setSession=(res:NextResponse,secret:string,uid:string)=>{res.cookies.set(COOKIE,sessionValue(secret,uid),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:TTL/1000});return res};
// Pintu masuk semua route HRD. Login hotel dikunci ke hotelnya sendiri; admin memilih hotel lewat header X-Hotel.
export async function auth(req:Request,o:{admin?:boolean;hotel?:boolean}={}):Promise<{me:Me;hotelId:string|null}|{res:NextResponse}>{
  const me=await getMe();if(!me)return {res:json({error:'Belum login'},401)};
  if(o.admin&&me.role!=='admin')return {res:json({error:'Hanya admin pusat yang boleh melakukan ini'},403)};
  let hotelId:string|null=me.role==='hotel'?me.hotelId:null;
  if(me.role==='admin'){const h=req.headers.get('x-hotel');if(h&&(await q(`select 1 from hr_hotel where id=$1`,[h])).length)hotelId=h}
  if(o.hotel&&!hotelId)return {res:json({error:'Pilih hotel terlebih dahulu (belum ada hotel terdaftar?)'},400)};
  return {me,hotelId}}
