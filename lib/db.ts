// Server saja. Database = Neon Postgres dari Vercel → Storage. Variabel DATABASE_URL / POSTGRES_URL
// diisi otomatis oleh Vercel saat database dihubungkan ke proyek; tidak ada kunci yang perlu disalin.
import { neon } from '@neondatabase/serverless';
const url=()=>process.env.DATABASE_URL||process.env.POSTGRES_URL||'';
export const dbConfigured=()=>!!url();
let _sql:any=null;
const sql=()=>_sql||(_sql=neon(url()));
export async function q<T=any>(text:string,params:any[]=[]):Promise<T[]>{return (await sql().query(text,params)) as T[]}
// Beberapa perintah sekaligus dalam satu transaksi (semua berhasil atau semua dibatalkan).
export async function tx(list:{text:string;params?:any[]}[]){await sql().transaction(list.map(x=>sql().query(x.text,x.params||[])))}
export const missingTable=(e:any)=>e?.code==='42P01'||/relation .* does not exist/i.test(String(e?.message||''));
const SCHEMA=[
 `create table if not exists hr_state(id int primary key, data jsonb not null default '{}'::jsonb, version int not null default 0, updated_at timestamptz not null default now())`,
 `create table if not exists hr_att(id text primary key, emp_id text not null, work_date text not null, status text not null default 'Hadir', clock_in text, clock_out text, ot_hours double precision not null default 0, late_min int not null default 0, hours double precision, dist int, acc int, src text not null default 'qr', note text, created_at timestamptz not null default now())`,
 `create index if not exists hr_att_date on hr_att(work_date)`,
 `create index if not exists hr_att_emp on hr_att(emp_id, work_date)`,
 `create unique index if not exists hr_att_one_qr on hr_att(emp_id, work_date) where src='qr'`,
 `create table if not exists hr_pin(emp_id text primary key, pin_hash text not null, fails int not null default 0, locked_until timestamptz)`,
 `create table if not exists hr_auth(id int primary key, pass_hash text not null, secret text not null)`,
 `insert into hr_state(id,data) values(1,'{}'::jsonb) on conflict (id) do nothing`];
// Aman dijalankan berulang kali (hanya membuat yang belum ada).
export async function ensureSchema(){for(const s of SCHEMA)await q(s)}
export type AttRow={id:string;emp_id:string;work_date:string;status:string;clock_in:string|null;clock_out:string|null;ot_hours:number;late_min:number;hours:number|null;dist:number|null;acc:number|null;src:string;note:string|null};
export const toAtt=(r:AttRow)=>({id:r.id,empId:r.emp_id,date:r.work_date,status:r.status,in:r.clock_in||undefined,out:r.clock_out||undefined,otHours:r.ot_hours||0,lateMin:r.late_min||0,late:r.late_min>0,hours:r.hours??undefined,dist:r.dist??undefined,src:r.src,note:r.note||undefined});
export const periodLocked=async(date:string)=>{const r=await q<{s:string|null}>(`select data->'periods'->>$1 as s from hr_state where id=1`,[date.slice(0,7)]);return r[0]?.s==='locked'};
