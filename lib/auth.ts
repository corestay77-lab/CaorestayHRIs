// Server saja. Satu password HRD (dibuat saat setup awal), disimpan sebagai hash scrypt di database.
// Sesi = cookie httpOnly bertanda tangan HMAC; kunci tanda tangan dibuat acak & disimpan di database (tidak perlu env).
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { q } from './db';
export const COOKIE='cs_session',TTL=12*3600e3;
export const hashSecret=(s:string)=>{const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(s,salt,32).toString('hex')};
export const verifySecret=(s:string,h:string)=>{const[salt,hex]=h.split(':');if(!salt||!hex)return false;const a=scryptSync(s,salt,32),b=Buffer.from(hex,'hex');return a.length===b.length&&timingSafeEqual(a,b)};
export const authRow=async()=>(await q<{pass_hash:string;secret:string}>(`select pass_hash, secret from hr_auth where id=1`))[0]||null;
const sign=(secret:string,exp:number)=>createHmac('sha256',secret).update(String(exp)).digest('hex');
export const sessionValue=(secret:string)=>{const exp=Date.now()+TTL;return `${exp}.${sign(secret,exp)}`};
export async function isAdmin():Promise<boolean>{
  try{const v=(await cookies()).get(COOKIE)?.value;if(!v)return false;const[e,sig]=v.split('.'),exp=Number(e);if(!exp||exp<Date.now()||!sig)return false;
    const row=await authRow();if(!row)return false;const want=sign(row.secret,exp);return want.length===sig.length&&timingSafeEqual(Buffer.from(want),Buffer.from(sig))}catch{return false}}
export const json=(body:any,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
// Pakai di awal setiap route HRD: bila belum login, kembalikan respons 401.
export async function guard():Promise<NextResponse|null>{return (await isAdmin())?null:json({error:'Belum login'},401)}
export const setSession=(res:NextResponse,secret:string)=>{res.cookies.set(COOKIE,sessionValue(secret),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:TTL/1000});return res};
export const errMsg=(e:any)=>String(e?.message||e||'Terjadi kesalahan');
