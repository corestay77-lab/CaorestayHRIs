import { q } from '@/lib/db';
import { guard, json, errMsg } from '@/lib/auth';
export const dynamic='force-dynamic';
export async function GET(){
  const g=await guard();if(g)return g;
  try{const r=await q<{data:any;version:number}>(`select data, version from hr_state where id=1`);return json({data:r[0]?.data||{},version:r[0]?.version||0})}
  catch(e:any){return json({error:errMsg(e)},500)}}
// Simpan seluruh data HRD. Ditolak (409) bila sudah diubah dari perangkat lain sejak dimuat, agar tidak saling menimpa.
export async function PUT(req:Request){
  const g=await guard();if(g)return g;
  try{const b=await req.json();if(!b||typeof b.data!=='object')return json({error:'Data tidak valid'},400);
    const {att:_a,...data}=b.data;
    const r=await q<{version:number}>(`update hr_state set data=$1::jsonb, version=version+1, updated_at=now() where id=1 and version=$2 returning version`,[JSON.stringify(data),Number(b.version)||0]);
    if(!r.length)return json({error:'Data sudah diubah dari perangkat lain. Dimuat ulang.'},409);
    return json({version:r[0].version})}catch(e:any){return json({error:errMsg(e)},500)}}
