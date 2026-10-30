import type { MetadataRoute } from 'next';
export default function manifest():MetadataRoute.Manifest{return{name:'CoreStay Absensi',short_name:'Absensi',start_url:'/absen',display:'standalone',background_color:'#040d2a',theme_color:'#0a2a7a',icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/icon-512.png',sizes:'512x512',type:'image/png'}]}}
