import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FactoryMatch — Verified Manufacturing for Indian D2C Brands',
  description:
    'Submit a brief, get 3-5 verified factories with transparent MOQ, certifications, and quotes in 48 hours.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
