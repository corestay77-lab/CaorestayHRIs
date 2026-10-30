'use client';
import Shell from '@/components/Shell';
import { useDB } from '@/lib/store';
import { calc } from '@/lib/payroll';
export default function Sync(){
  const {db,update}=useDB();
  const exp=()=>{const data={period:db.period,laborCost:Object.fromEntries(db.depts.map(d=>[d,Math.round(db.emps.filter(e=>e.dept===d&&e.status==='Aktif').reduce((s,e)=>s+calc(e,db).laborCost,0))]))};
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download=`people-to-budget-${db.period}.json`;a.click();update(d=>({...d,lastSync:new Date().toISOString()}),`Ekspor labor cost ${db.period} untuk CoreStay Budget`)};
  const imp=async(f?:File)=>{if(!f)return;try{const j=JSON.parse(await f.text()),b:Record<string,number>={};for(const d of db.depts)if(typeof j[d]==='number')b[d]=j[d];update(d=>({...d,budget:{...d.budget,...b},lastSync:new Date().toISOString()}),`Impor budget (${Object.keys(b).length} departemen)`)}catch{alert('File JSON tidak valid. Format: {"Front Office":50000000,…}')}};
  return <Shell title="Integrasi · CoreStay Sync" sub="Pertukaran data dengan CoreStay Budget lewat file (belum ada koneksi API langsung).">
    <section className="grid"><article className="card panel"><h2>Ekspor ke Budget</h2><p className="muted">Aktual labor cost per departemen periode {db.period}.</p><button className="button" onClick={exp}>Unduh JSON</button></article>
      <article className="card panel"><h2>Impor budget dari Budget</h2><p className="muted">JSON {'{"Departemen": nilai}'} mengisi kolom budget di Labor Cost Control.</p><input type="file" accept="application/json" onChange={e=>imp(e.target.files?.[0])}/></article></section>
    <p className="muted" style={{marginTop:12}}>Sinkron terakhir: {db.lastSync?new Date(db.lastSync).toLocaleString('id-ID'):'belum pernah'}</p></Shell>}
