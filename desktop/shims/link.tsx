// Pengganti next/link untuk versi desktop (rute berbasis #hash agar jalan dari file://)
export default function Link({href,children,...p}:any){return <a href={'#'+href} {...p}>{children}</a>}
