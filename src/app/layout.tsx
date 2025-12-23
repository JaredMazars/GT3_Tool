import './globals.css';
import { Providers } from '@/components/Providers';
import { Inter, WindSong } from 'next/font/google';
import type { Metadata } from 'next';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

const windSong = WindSong({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-windsong',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Forvis Mazars - GT3',
  description: 'Professional services task management platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${windSong.variable}`}>
      <body>
        <Providers>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
