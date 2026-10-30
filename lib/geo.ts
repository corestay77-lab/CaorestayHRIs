export const localDate=(off=0)=>{const d=new Date(Date.now()+off*864e5);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
export const localTime=()=>new Date().toTimeString().slice(0,5);
export function distM(a:number,b:number,c:number,d:number){const R=6371000,r=(x:number)=>x*Math.PI/180,dl=r(c-a),dn=r(d-b);
  const h=Math.sin(dl/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
export const toMin=(s:string)=>{const[h,m]=s.split(':').map(Number);return h*60+m};
export const days=(a:string,b:string)=>{const r:string[]=[];for(let t=Date.parse(a);t<=Date.parse(b)&&r.length<62;t+=864e5)r.push(new Date(t).toISOString().slice(0,10));return r};
export const monthAdd=(p:string,i:number)=>{const[y,m]=p.split('-').map(Number);return new Date(Date.UTC(y,m-1+i,1)).toISOString().slice(0,7)};
// Waktu selalu dihitung dalam WIB (Asia/Jakarta), di server maupun di browser, supaya "hari ini" sama di mana pun.
export const TZ='Asia/Jakarta';
export function nowWIB(d=new Date()){
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);
  const g=(t:string)=>p.find(x=>x.type===t)!.value;
  return {date:`${g('year')}-${g('month')}-${g('day')}`,time:`${g('hour')}:${g('minute')}`}}
export const addDays=(date:string,n:number)=>new Date(Date.parse(date+'T00:00:00Z')+n*864e5).toISOString().slice(0,10);
// menit absolut sejak epoch untuk (tanggal, jam) — dipakai menghitung jam kerja lintas tengah malam
export const absMin=(date:string,time:string)=>Date.parse(date+'T00:00:00Z')/60000+toMin(time);
