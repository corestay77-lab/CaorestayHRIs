import { nowWIB } from './geo';
export type Emp={id:string;code?:string;name:string;hotel:string;dept:string;position:string;joinDate:string;status:'Aktif'|'Nonaktif';basic:number;allowance:number;deduction:number;thrFactor:number};
// Satu baris absensi. Karyawan yang scan QR tercatat otomatis (src 'qr'); sakit/izin/cuti/koreksi diinput HRD (src 'manual').
export type Att={id:string;empId:string;date:string;status:'Hadir'|'Sakit'|'Izin'|'Alpa'|'Cuti';otHours:number;src?:'manual'|'qr'|'selfie';in?:string;out?:string;dist?:number;late?:boolean;lateMin?:number;hours?:number;note?:string};
export type Shift={name:string;start:string;end:string};
export type Sched={id:string;empId:string;date:string;shift:string};
export type Geo={lat:number;lng:number;radius:number;shift:string;qr?:string};
export type Corr={id:string;entered?:string;empId:string;from:string;period:string;desc:string;amount:number};
export type User={id:string;name:string;email:string;role:string;active:boolean};
export type Settings={company:string;companyId:string;npwp:string;address:string;phone:string;email:string;empPrefix:string;empDigits:number;empNext:number;radius:number;shift:string;tol:number;maxAcc:number;lateCut:number;activeUser:string;users:User[]};
export type PStatus='draft'|'submitted'|'approved'|'locked';
export type DB={hotels:string[];depts:string[];emps:Emp[];att:Att[];corr:Corr[];geo:Record<string,Geo>;shifts:Shift[];sched:Sched[];closed:Record<string,boolean>;budget:Record<string,number>;periods:Record<string,PStatus>;period:string;audit:{t:string;m:string;u?:string}[];snap:Record<string,Record<string,any>>;settings:Settings;lastSync:string|null};
export const EMPTY:DB={hotels:[],depts:['Front Office','Housekeeping','F&B','Engineering','Sales & Marketing','Finance','HR'],emps:[],att:[],corr:[],geo:{},shifts:[{name:'Pagi',start:'07:00',end:'15:00'},{name:'Siang',start:'15:00',end:'23:00'},{name:'Malam',start:'23:00',end:'07:00'}],sched:[],closed:{},budget:{},periods:{},period:new Date().toISOString().slice(0,7),audit:[],snap:{},settings:{company:'CoreStay Advisory',companyId:'CSA-001',npwp:'',address:'',phone:'',email:'',empPrefix:'EMP',empDigits:4,empNext:1,radius:100,shift:'08:00',tol:0,maxAcc:100,lateCut:0,activeUser:'USR-001',users:[{id:'USR-001',name:'HR Manager',email:'',role:'Admin',active:true}]},lastSync:null};
// Gabungkan data (mis. dari backup versi lama) dengan nilai default agar field baru selalu ada.
export const normalize=(j:any):DB=>({...EMPTY,...j,settings:{...EMPTY.settings,...(j?.settings||{})}});
// Tarif BPJS default. Verifikasi dengan regulasi terbaru sebelum dipakai untuk payroll nyata.
export const RATE={kesEmp:.01,kesEr:.04,jhtEmp:.02,jhtEr:.037,jpEmp:.01,jpEr:.02,jkk:.0024,jkm:.003};
export const CAP={kes:12_000_000,jp:10_042_300};
export const rp=(n:number)=>'Rp '+Math.round(n).toLocaleString('id-ID');
// REKAP absensi per karyawan per bulan. Satu-satunya sumber angka absensi untuk halaman Rekap dan Payroll.
// Alpa = input manual + hari terjadwal yang sudah lewat tanpa absensi (otomatis, hanya bila karyawan memakai jadwal).
export function recap(empId:string,db:DB,p=db.period){
  const att=db.att.filter(a=>a.empId===empId&&a.date.startsWith(p)),has=new Set(att.map(a=>a.date)),today=nowWIB().date;
  const autoAlpa=db.sched.filter(s=>s.empId===empId&&s.date.startsWith(p)&&s.date<today&&!has.has(s.date)).length;
  const n=(s:Att['status'])=>att.filter(a=>a.status===s).length,sum=(f:(a:Att)=>number)=>att.reduce((t,a)=>t+f(a),0);
  return {hadir:n('Hadir'),telat:att.filter(a=>a.status==='Hadir'&&(a.lateMin||0)>0).length,lateMin:sum(a=>a.lateMin||0),sakit:n('Sakit'),izin:n('Izin'),cuti:n('Cuti'),alpa:n('Alpa')+autoAlpa,autoAlpa,otHours:sum(a=>a.otHours||0),hours:sum(a=>a.hours||0),belumPulang:att.filter(a=>a.in&&!a.out).length}}
export function compute(e:Emp,db:DB){
  const r=recap(e.id,db),p=db.period,{otHours,lateMin,hours,alpa}=r;
  const h1=Math.min(otHours,1),h2=Math.max(otHours-1,0);
  const overtime=e.basic/173*(1.5*h1+2*h2),thr=e.basic*e.thrFactor;
  const alpaCut=e.basic/26*alpa,lateCut=lateMin*(db.settings.lateCut||0); // potongan dari rekap absensi, otomatis
  const corr=db.corr.filter(c=>c.empId===e.id&&c.period===p).reduce((s,c)=>s+c.amount,0);
  const gross=e.basic+e.allowance+overtime+thr,wage=e.basic+e.allowance;
  const kb=Math.min(wage,CAP.kes),jb=Math.min(wage,CAP.jp);
  const kesEmp=kb*RATE.kesEmp,jhtEmp=wage*RATE.jhtEmp,jpEmp=jb*RATE.jpEmp,empBpjs=kesEmp+jhtEmp+jpEmp;
  const erBpjs=kb*RATE.kesEr+wage*(RATE.jhtEr+RATE.jkk+RATE.jkm)+jb*RATE.jpEr;
  return {otHours,alpa,lateMin,hours,overtime,thr,alpaCut,lateCut,corr,gross,kesEmp,jhtEmp,jpEmp,empBpjs,erBpjs,net:gross-empBpjs-e.deduction-alpaCut-lateCut+corr,laborCost:gross+erBpjs+corr};
}
// Periode terkunci memakai snapshot hasil hitung saat dikunci, bukan hitung ulang.
export const calc=(e:Emp,db:DB)=>{const s=db.snap?.[db.period]?.[e.id] as ReturnType<typeof compute>|undefined;return s?{...s,lateCut:s.lateCut||0}:compute(e,db)};
