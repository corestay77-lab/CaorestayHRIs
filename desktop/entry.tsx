import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Home from '@/app/page';import Org from '@/app/organization/page';import Emp from '@/app/employees/page';import Comp from '@/app/compensation/page';import Att from '@/app/attendance/page';import Pay from '@/app/payroll/page';import Appr from '@/app/approval/page';import Corr from '@/app/correction/page';import LC from '@/app/labor-cost/page';import Sync from '@/app/sync/page';import Audit from '@/app/audit/page';import SettingsPage from '@/app/settings/page';import Absen from '@/app/absen/page';
const R:Record<string,()=>JSX.Element>={'/':Home,'/organization':Org,'/employees':Emp,'/compensation':Comp,'/attendance':Att,'/payroll':Pay,'/approval':Appr,'/correction':Corr,'/labor-cost':LC,'/sync':Sync,'/audit':Audit,'/settings':SettingsPage,'/absen':Absen};
const read=()=>{const h=location.hash.replace(/^#/,'')||'/';return R[h]?h:'/'};
function App(){const [p,setP]=useState(read());
  useEffect(()=>{const f=()=>{setP(read());window.scrollTo(0,0)};window.addEventListener('hashchange',f);return()=>window.removeEventListener('hashchange',f)},[]);
  const C=R[p];return <C/>}
createRoot(document.getElementById('root')!).render(<App/>);
