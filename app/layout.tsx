import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Trade Manager - PSX Portfolio Tracker',
  description: 'Manage daily trades with PSX live prices and CSV storage',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
  <html>
    <body className="bg-gray-100">
      <nav className="bg-white shadow mb-6">
        <div className="container mx-auto px-4 py-3 flex gap-6">
          <Link href="/" className="font-semibold hover:text-blue-600">Portfolio</Link>
          <Link href="/clients" className="font-semibold hover:text-blue-600">Clients</Link>
        </div>
      </nav>
      {children}
    </body>
  </html>
  );
}