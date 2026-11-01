import { nowIn, okTz, DEFAULT_TZ } from './geo';
export type Emp={id:string;code?:string;name:string;hotel:string;dept:string;position:string;joinDate:string;status:'Aktif'|'Nonaktif';basic:number;allowance:number;deduction:number;thrFactor:number;comps?:Record<string,number>;medical?:number;meal?:number;ptkp?:number;insurance?:number;otherCost?:number};
// Satu baris absensi. Karyawan yang scan QR tercatat otomatis (src 'qr'); sakit/izin/cuti/koreksi diinput HRD (src 'manual').
export type Att={id:string;empId:string;date:string;status:'Hadir'|'Sakit'|'Izin'|'Alpa'|'Cuti';otHours:number;src?:'manual'|'qr'|'selfie';in?:string;out?:string;dist?:number;late?:boolean;lateMin?:number;hours?:number;note?:string};
export type Shift={name:string;start:string;end:string};
export type Sched={id:string;empId:string;date:string;shift:string};
export type Geo={lat:number;lng:number;radius:number;shift:string;qr?:string;tz?:string};
export type Corr={id:string;entered?:string;empId:string;from:string;period:string;desc:string;amount:number};
export type User={id:string;name:string;email:string;role:string;active:boolean};
export type Comp={id:string;name:string;type:'Tunjangan'|'Potongan';amount:number;bpjs:boolean};
export type Settings={company:string;companyId:string;npwp:string;address:string;phone:string;email:string;empPrefix:string;empDigits:number;empNext:number;radius:number;shift:string;tol:number;maxAcc:number;lateCut:number;geoMode:'strict'|'soft';tz:string;jsCo:number;jsEmp:number;otDiv:number;otRate1:number;otRate2:number;otMax:number;alpaDiv:number;comps:Comp[];activeUser:string;users:User[]};
export type PStatus='draft'|'submitted'|'approved'|'locked';
export type DB={hotels:string[];depts:string[];emps:Emp[];att:Att[];corr:Corr[];geo:Record<string,Geo>;shifts:Shift[];sched:Sched[];closed:Record<string,boolean>;budget:Record<string,number>;periods:Record<string,PStatus>;period:string;audit:{t:string;m:string;u?:string}[];snap:Record<string,Record<string,any>>;settings:Settings;lastSync:string|null};
export const EMPTY:DB={hotels:[],depts:['Front Office','Housekeeping','F&B','Engineering','Sales & Marketing','Finance','HR'],emps:[],att:[],corr:[],geo:{},shifts:[{name:'Pagi',start:'07:00',end:'15:00'},{name:'Siang',start:'15:00',end:'23:00'},{name:'Malam',start:'23:00',end:'07:00'}],sched:[],closed:{},budget:{},periods:{},period:new Date().toISOString().slice(0,7),audit:[],snap:{},settings:{company:'CoreStay Advisory',companyId:'CSA-001',npwp:'',address:'',phone:'',email:'',empPrefix:'EMP',empDigits:4,empNext:1,radius:100,shift:'08:00',tol:0,maxAcc:100,lateCut:0,geoMode:'strict',tz:DEFAULT_TZ,jsCo:4.89,jsEmp:2,otDiv:173,otRate1:1.5,otRate2:2,otMax:4,alpaDiv:26,comps:[],activeUser:'USR-001',users:[{id:'USR-001',name:'HR Manager',email:'',role:'Admin',active:true}]},lastSync:null};
// Gabungkan data (mis. dari backup versi lama) dengan nilai default agar field baru selalu ada.
export const normalize=(j:any):DB=>({...EMPTY,...j,settings:{...EMPTY.settings,...(j?.settings||{})}});
// PTKP per tahun (TK = tidak kawin, K = kawin; angka = tanggungan). Dipakai sebagai saran pengisian kolom PTKP / tahun.
export const PTKP:[string,number][]=[['TK/0',54e6],['TK/1',58.5e6],['TK/2',63e6],['TK/3',67.5e6],['K/0',58.5e6],['K/1',63e6],['K/2',67.5e6],['K/3',72e6]];
// PPh 21 tahunan: tarif progresif 5% / 15% / 25% / 30% / 35% (lapisan 60 jt, 250 jt, 500 jt, 5 M).
export const pph21=(pkp:number)=>{let rest=pkp,prev=0,t=0;for(const[l,r] of [[60e6,.05],[250e6,.15],[500e6,.25],[5e9,.3],[Infinity,.35]]){const w=Math.min(rest,l-prev);if(w<=0)break;t+=w*r;rest-=w;prev=l}return t};
// Zona waktu sebuah hotel: pengaturan hotel → default perusahaan.
export const tzOf=(db:DB,hotel?:string)=>okTz((hotel&&db.geo[hotel]?.tz)||db.settings.tz);
export const rp=(n:number)=>'Rp '+Math.round(n).toLocaleString('id-ID');
// REKAP absensi per karyawan per bulan. Satu-satunya sumber angka absensi untuk halaman Rekap dan Payroll.
// Alpa = input manual + hari terjadwal yang sudah lewat tanpa absensi (otomatis, hanya bila karyawan memakai jadwal).
export function recap(empId:string,db:DB,p=db.period){
  const att=db.att.filter(a=>a.empId===empId&&a.date.startsWith(p)),has=new Set(att.map(a=>a.date)),today=nowIn(tzOf(db,db.emps.find(e=>e.id===empId)?.hotel)).date;
  const autoAlpa=db.sched.filter(s=>s.empId===empId&&s.date.startsWith(p)&&s.shift!=='Libur'&&s.date<today&&!has.has(s.date)).length;
  const n=(s:Att['status'])=>att.filter(a=>a.status===s).length,sum=(f:(a:Att)=>number)=>att.reduce((t,a)=>t+f(a),0);
  return {hadir:n('Hadir'),telat:att.filter(a=>a.status==='Hadir'&&(a.lateMin||0)>0).length,lateMin:sum(a=>a.lateMin||0),sakit:n('Sakit'),izin:n('Izin'),cuti:n('Cuti'),alpa:n('Alpa')+autoAlpa,autoAlpa,otHours:sum(a=>a.otHours||0),hours:sum(a=>a.hours||0),belumPulang:att.filter(a=>a.in&&!a.out).length}}
// MODEL BIAYA (sama dengan tabel "Data karyawan dan perhitungan biaya"):
//  THR provisi = gaji pokok ÷ 12 · Jamsostek perusahaan/staf = % dari gaji pokok · gross = gaji + medical + makan + THR provisi
//  biaya jabatan = 5% gross (maks 500 rb/bln) · PKP/bln = gross − biaya jabatan − PTKP÷12 · PPh/tahun = tarif progresif atas PKP×12
//  TOTAL BIAYA PERUSAHAAN = gross + Jamsostek perusahaan + asuransi perusahaan + biaya lain
// Kolom kosong dianggap 0. PPh baru dihitung setelah PTKP/tahun diisi (kosong = belum diketahui).
export function compute(e:Emp,db:DB){
  const r=recap(e.id,db),p=db.period,S=db.settings,n=(x?:number)=>Number(x)||0,{otHours,lateMin,hours,alpa}=r;
  const basic=n(e.basic),medical=n(e.medical),meal=n(e.meal),thrProv=basic/12,jsCo=basic*n(S.jsCo)/100,jsEmp=basic*n(S.jsEmp)/100;
  const gross=basic+medical+meal+thrProv,ptkp=n(e.ptkp),jabatan=Math.min(gross*.05,500000);
  const pkpM=ptkp>0?Math.max(0,gross-jabatan-ptkp/12):0,pkpY=pkpM*12,pphY=ptkp>0?pph21(pkpY):0,pphM=pphY/12;
  const insurance=n(e.insurance),other=n(e.otherCost),total=gross+jsCo+insurance+other;
  // Penyesuaian bulan berjalan dari Rekap Absensi, komponen tambahan (Pengaturan), dan koreksi
  const h1=Math.min(otHours,1),h2=Math.max(otHours-1,0);
  const overtime=basic/(S.otDiv||173)*(S.otRate1*h1+S.otRate2*h2);
  const alpaCut=basic/(S.alpaDiv||26)*alpa,lateCut=lateMin*(S.lateCut||0);
  const lines=(S.comps||[]).map(c=>({name:c.name,type:c.type,bpjs:c.bpjs,amt:Number(e.comps?.[c.id]??c.amount)||0})).filter(l=>l.amt>0);
  const extraAllow=lines.filter(l=>l.type==='Tunjangan').reduce((t,l)=>t+l.amt,0),extraDed=lines.filter(l=>l.type==='Potongan').reduce((t,l)=>t+l.amt,0);
  const corr=db.corr.filter(c=>c.empId===e.id&&c.period===p).reduce((s,c)=>s+c.amount,0);
  // Dibayar tunai bulan ini: THR provisi tidak dibayar bulanan (dicadangkan perusahaan).
  const cash=basic+medical+meal+overtime+extraAllow,cuts=alpaCut+lateCut+extraDed;
  return {basic,medical,meal,thrProv,jsCo,jsEmp,gross,ptkp,jabatan,pkpM,pkpY,pphY,pphM,insurance,other,total,
    otHours,alpa,lateMin,hours,overtime,alpaCut,lateCut,extraAllow,extraDed,lines,corr,cash,
    net:cash-jsEmp-pphM-cuts+corr,laborCost:total+overtime+extraAllow-cuts+corr};
}
export type Calc=ReturnType<typeof compute>;
// Periode terkunci memakai snapshot saat dikunci. Snapshot format lama (tanpa pphM) tidak dipakai: dihitung ulang dengan model baru.
export const calc=(e:Emp,db:DB):Calc=>{const s=db.snap?.[db.period]?.[e.id] as Calc|undefined;return s&&'pphM' in s?s:compute(e,db)};
