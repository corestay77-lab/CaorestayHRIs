'use client';
import Shell from '@/components/Shell';
import { useDB } from '@/lib/store';
import { Emp } from '@/lib/payroll';
export default function Comp(){
  const {db,update,locked}=useDB();
  const F:[keyof Emp,string][]=[['basic','Gaji pokok (Rp)'],['allowance','Tunjangan (Rp)'],['deduction','Potongan tetap (Rp)'],['thrFactor','THR (× gaji pokok)']];
  return <Shell title="Compensation Master" sub="Gaji pokok, tunjangan, potongan, dan THR per karyawan. Dipakai langsung oleh Payroll.">
    <section className="card panel"><div className="table-wrap"><table><thead><tr><th>Karyawan</th>{F.map(f=><th key={f[0]}>{f[1]}</th>)}</tr></thead><tbody>
      {db.emps.map(e=><tr key={e.id}><td>{e.name}<div className="muted">{e.code||'—'} · {e.dept}</div></td>{F.map(([k,l])=><td key={k}><input type="number" min={0} disabled={locked} defaultValue={e[k] as number} key={e.id+k+e[k]} style={{width:130}} aria-label={`${l} ${e.name}`}
        onBlur={ev=>{const n=Number(ev.target.value)||0;if(n!==e[k])update(d=>({...d,emps:d.emps.map(x=>x.id===e.id?{...x,[k]:n}:x)}),`Kompensasi ${e.name}: ${l} → ${n}`)}}/></td>)}</tr>)}
      {!db.emps.length&&<tr><td className="muted">Belum ada karyawan di Employee Master.</td></tr>}</tbody></table></div></section></Shell>}
