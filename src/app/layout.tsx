import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { TradeProvider } from '../context/TradeContext';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const outfit = Outfit({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'TradeMind - Premium AI Trading Journal',
  description: 'Track, analyze, and optimize your trades with AI-powered insights, risk calculations, and premium journaling.',
  icons: {
    icon: '/favicon.ico',
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} dark`}>
      <body className="bg-[#0b0c10] text-[#f1f3f9] font-sans antialiased min-h-screen selection:bg-indigo-500/30 selection:text-indigo-200">
        <AuthProvider>
          <TradeProvider>
            {children}
          </TradeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
