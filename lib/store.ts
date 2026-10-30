'use client';
import { useSyncExternalStore } from 'react';
import { DB, Att, EMPTY, normalize } from './payroll';
import { monthAdd } from './geo';
// Sumber data = database Vercel (Neon) lewat /api. Data HRD (karyawan, gaji, hotel, jadwal, dll.) satu dokumen;
// absensi ada di tabel sendiri dan ikut dimuat ke db.att supaya Rekap & Payroll membacanya dengan cara yang sama.
export type Gate={state:'loading'|'none'|'empty'|'error'|'setup'|'login'|'ok';msg?:string};
let doc:DB=EMPTY,att:Att[]=[],version=0,gate:Gate={state:'loading'},attFrom='',saveErr='',view:DB=EMPTY;
const subs=new Set<()=>void>();
const rebuild=()=>{view={...doc,att}};
const emit=()=>{rebuild();subs.forEach(s=>s())};
export async function api(path:string,init:RequestInit={}){
  const r=await fetch(path,{...init,headers:{'Content-Type':'application/json',...(init.headers||{})},cache:'no-store'});
  const j=await r.json().catch(()=>({}));
  if(!r.ok){const e:any=new Error(j.error||`HTTP ${r.status}`);e.status=r.status;throw e}return j}
export const read=():DB=>view;
let booted=false;
export async function refreshGate(){
  try{const s=await api('/api/auth');
    if(s.db==='none')gate={state:'none'};else if(s.db==='empty')gate={state:'empty'};else if(s.db==='error')gate={state:'error',msg:s.error};
    else if(s.auth==='setup')gate={state:'setup'};else if(s.auth==='login')gate={state:'login'};else{gate={state:'ok'};await loadAll();return}
  }catch(e:any){gate={state:'error',msg:e.message}}
  emit()}
export async function loadAll(){
  const s=await api('/api/state');doc=normalize(s.data);version=s.version;
  if(!s.data?.period)doc={...doc,period:new Date().toISOString().slice(0,7)};
  attFrom='';await loadAtt(true)}
// absensi dimuat 6 bulan ke belakang dari periode aktif (untuk grafik tren); dimuat ulang bila periode digeser lebih jauh
export async function loadAtt(force=false){
  const from=monthAdd(doc.period,-6);if(!force&&attFrom&&from>=attFrom){emit();return}
  try{const r=await api('/api/att?from='+from);att=r.att;attFrom=from}catch(e:any){if(e.status===401){gate={state:'login'}}}emit()}
let timer:any=null,saving=false,dirty=false;
async function flush(){
  if(saving){dirty=true;return}saving=true;dirty=false;
  try{const d:any={...doc};delete d.att;
    const cut=new Date(Date.now()-200*864e5).toISOString().slice(0,10);d.sched=d.sched.filter((s:any)=>s.date>=cut); // jadwal lama dipangkas agar data tetap ringan
    const r=await api('/api/state',{method:'PUT',body:JSON.stringify({data:d,version})});version=r.version;saveErr=''}
  catch(e:any){if(e.status===409){saveErr=e.message;await loadAll()}else if(e.status===401){gate={state:'login'}}else saveErr='Gagal menyimpan: '+e.message}
  saving=false;emit();if(dirty)flush()}
const save=()=>{clearTimeout(timer);timer=setTimeout(flush,500)};
export function update(fn:(d:DB)=>DB,log?:string){
  let n=fn(view);const{att:_a,...rest}=n;n={...rest,att:[]} as DB;
  if(log){const u=n.settings.users.find(x=>x.id===n.settings.activeUser)?.name;n={...n,audit:[{t:new Date().toISOString(),m:log,u},...n.audit].slice(0,300)}}
  const periodChanged=n.period!==doc.period;doc=n;emit();save();if(periodChanged)loadAtt()}
// Absensi: perubahan lewat API lalu dimuat ulang. Log aktivitas ikut tersimpan di Audit Log.
const afterAtt=async(log:string)=>{await loadAtt(true);update(d=>d,log)};
export const attAdd=async(r:{empId:string;date:string;status:string;otHours?:number;note?:string},log:string)=>{await api('/api/att',{method:'POST',body:JSON.stringify(r)});await afterAtt(log)};
export const attSet=async(id:string,patch:{otHours?:number;status?:string},log:string)=>{await api('/api/att',{method:'PATCH',body:JSON.stringify({id,...patch})});await afterAtt(log)};
export const attDel=async(id:string,log:string)=>{await api('/api/att?id='+id,{method:'DELETE'});await afterAtt(log)};
export const attDelEmp=async(empId:string)=>{await api('/api/att?emp='+empId,{method:'DELETE'});await loadAtt(true)};
const sub=(f:()=>void)=>{subs.add(f);if(!booted){booted=true;refreshGate()}return()=>{subs.delete(f)}};
export function useDB(){
  const db=useSyncExternalStore(sub,()=>view,()=>EMPTY);
  const locked=db.periods[db.period]==='locked';
  return {db,update,locked,status:db.periods[db.period]||'draft',gate,saveErr};
}
export const uid=()=>crypto.randomUUID();
export const newToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b=>b.toString(16).padStart(2,'0')).join('');
export function assignCode(d:DB):[string,DB]{const s=d.settings;return[`${s.empPrefix}-${String(s.empNext).padStart(s.empDigits,'0')}`,{...d,settings:{...s,empNext:s.empNext+1}}]}
