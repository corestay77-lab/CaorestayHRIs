import { randomBytes, randomUUID } from 'node:crypto';
import { q } from '@/lib/db';
import { auth, json, errMsg, hashSecret } from '@/lib/auth';
import { newHotelDoc } from '@/lib/tenant';
export const dynamic='force-dynamic';
const USER=/^[a-z0-9._-]{3,30}$/i;
// Daftar hotel: admin pusat melihat semua; login hotel hanya hotelnya sendiri. Kode QR & data hotel tidak ikut dikirim.
export async function GET(req:Request){
  const a=await auth(req);if('res' in a)return a.res;
  try{const r=await q(`select h.id, h.name, u.username from hr_hotel h left join hr_user u on u.hotel_id=h.id and u.role='hotel' ${a.me.role==='admin'?'':'where h.id=$1'} order by h.name`,a.me.role==='admin'?[]:[a.me.hotelId]);
    return json({hotels:r})}catch(e:any){return json({error:errMsg(e)},500)}}
// Daftarkan hotel baru + login-nya (admin pusat). Database tetap satu; data hotel baru berdiri sendiri di dokumennya.
export async function POST(req:Request){
  const a=await auth(req,{admin:true});if('res' in a)return a.res;
  try{const b=await req.json(),name=String(b.name||'').trim(),username=String(b.username||'').trim(),pw=String(b.password||'');
    if(!name)return json({error:'Nama hotel wajib diisi'},400);if(!USER.test(username))return json({error:'Username 3–30 karakter: huruf, angka, titik, minus, garis bawah'},400);if(pw.length<6)return json({error:'Password hotel minimal 6 karakter'},400);
    if((await q(`select 1 from hr_user where lower(username)=lower($1)`,[username])).length)return json({error:'Username sudah dipakai'},409);
    if((await q(`select 1 from hr_hotel where lower(name)=lower($1)`,[name])).length)return json({error:'Nama hotel sudah terdaftar'},409);
    const num=(v:any)=>Number.isFinite(Number(v))?Number(v):0,id=randomUUID(),doc=newHotelDoc(name,{lat:num(b.lat),lng:num(b.lng),radius:num(b.radius)||undefined,shift:b.shift||undefined,tz:b.tz||undefined});
    await q(`insert into hr_hotel(id,name,data,version,qr) values($1,$2,$3::jsonb,1,$4)`,[id,name,JSON.stringify(doc),doc.geo[name].qr]);
    try{await q(`insert into hr_user(id,username,pass_hash,role,hotel_id) values($1,$2,$3,'hotel',$4)`,[randomUUID(),username,hashSecret(pw),id])}
    catch(e){await q(`delete from hr_hotel where id=$1`,[id]);throw e}
    return json({id,name,qr:doc.geo[name].qr})}catch(e:any){return json({error:errMsg(e)},500)}}
// Ganti username / reset password login sebuah hotel (admin pusat).
export async function PATCH(req:Request){
  const a=await auth(req,{admin:true});if('res' in a)return a.res;
  try{const b=await req.json(),id=String(b.id||'');if(!(await q(`select 1 from hr_hotel where id=$1`,[id])).length)return json({error:'Hotel tidak ditemukan'},404);
    if(b.regenQr){const h=(await q(`select name from hr_hotel where id=$1`,[id]))[0],tok=randomBytes(12).toString('hex');
      await q(`update hr_hotel set data=jsonb_set(data,ARRAY['geo',$2::text,'qr'],to_jsonb($3::text)), qr=$3::text, version=version+1 where id=$1`,[id,h.name,tok]);return json({ok:true,qr:tok})}
    const un=b.username?String(b.username).trim():'',pw=b.password?String(b.password):'';
    if(un&&!USER.test(un))return json({error:'Username tidak valid'},400);if(pw&&pw.length<6)return json({error:'Password minimal 6 karakter'},400);
    if(un&&(await q(`select 1 from hr_user where lower(username)=lower($1) and hotel_id is distinct from $2`,[un,id])).length)return json({error:'Username sudah dipakai'},409);
    const u=(await q(`select id from hr_user where hotel_id=$1 and role='hotel'`,[id]))[0];
    if(!u){if(!un||!pw)return json({error:'Hotel ini belum punya login: isi username dan password'},400);await q(`insert into hr_user(id,username,pass_hash,role,hotel_id) values($1,$2,$3,'hotel',$4)`,[randomUUID(),un,hashSecret(pw),id])}
    else{if(un)await q(`update hr_user set username=$1 where id=$2`,[un,u.id]);if(pw)await q(`update hr_user set pass_hash=$1 where id=$2`,[hashSecret(pw),u.id])}
    return json({ok:true})}catch(e:any){return json({error:errMsg(e)},500)}}
