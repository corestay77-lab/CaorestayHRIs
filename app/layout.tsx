import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'CoreStay People | HR, Attendance & Payroll', description: 'CoreStay People — Human Resources, Attendance & Payroll Management' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="id"><body>{children}</body></html>; }
