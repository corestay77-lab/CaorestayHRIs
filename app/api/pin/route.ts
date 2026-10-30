import { q } from '@/lib/db';
import { guard, json, errMsg, hashSecret } from '@/lib/auth';
export const dynamic='force-dynamic';
export async function GET(){ // karyawan mana yang sudah punya PIN (PIN-nya sendiri tidak pernah dikirim)
  const g=await guard();if(g)return g;
  try{const r=await q<{emp_id:string}>(`select emp_id from hr_pin`);return json({set:r.map(x=>x.emp_id)})}catch(e:any){return json({error:errMsg(e)},500)}}
export async function POST(req:Request){
  const g=await guard();if(g)return g;
  try{const b=await req.json();if(!b.empId||!/^\d{4,8}$/.test(String(b.pin||'')))return json({error:'PIN harus 4–8 digit angka'},400);
    await q(`insert into hr_pin(emp_id,pin_hash) values($1,$2) on conflict (emp_id) do update set pin_hash=excluded.pin_hash, fails=0, locked_until=null`,[b.empId,hashSecret(String(b.pin))]);
    return json({ok:true})}catch(e:any){return json({error:errMsg(e)},500)}}
