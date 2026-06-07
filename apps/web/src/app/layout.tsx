import type { Metadata } from 'next';
import AppShell from '@/components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'TiltCheck — Built for Degens. By Degens.',
  description: 'Read-only browser extension that stops you from giving your wins back to the machine.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="degen-background">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
