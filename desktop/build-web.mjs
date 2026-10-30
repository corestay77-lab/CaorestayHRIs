// Membangun aplikasi menjadi satu paket web statis (desktop/web) tanpa Next.js, untuk dibungkus Electron.
import { build } from 'esbuild';
import fs from 'node:fs';import path from 'node:path';import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'desktop/web');
const env={};for(const f of ['.env','.env.local']){try{for(const l of fs.readFileSync(path.join(root,f),'utf8').split(/\r?\n/)){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);if(m)env[m[1]]=m[2].replace(/^['"]|['"]$/g,'')}}catch{}}
const val=k=>JSON.stringify(process.env[k]||env[k]||'');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
await build({entryPoints:[path.join(root,'desktop/entry.tsx')],bundle:true,minify:true,outfile:path.join(out,'bundle.js'),jsx:'automatic',loader:{'.tsx':'tsx'},logLevel:'info',
  define:{'process.env.NODE_ENV':'"production"'},
  alias:{'@':root,'next/link':path.join(root,'desktop/shims/link.tsx'),'next/navigation':path.join(root,'desktop/shims/navigation.ts')}});
// Aset memakai alamat relatif agar termuat dari file:// (Electron)
const bj=path.join(out,'bundle.js');fs.writeFileSync(bj,fs.readFileSync(bj,'utf8').replace(/(["'`])\/(logo(?:-icon)?\.png)\1/g,'$1$2$1'));
for(const f of fs.readdirSync(path.join(root,'public')))fs.copyFileSync(path.join(root,'public',f),path.join(out,f));
const css=fs.readFileSync(path.join(root,'app/globals.css'),'utf8').replace(/@import url\([^)]*\);?/,'');
fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' https:"><title>CoreStay People</title><style>${css}</style></head><body><div id="root"></div><script src="bundle.js"></script></body></html>`);
console.log('Selesai: desktop/web');
