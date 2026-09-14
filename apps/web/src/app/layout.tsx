import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Хуулийн фирм',
    template: '%s | Хуулийн фирм',
  },
  description: 'Хуулийн зөвлөгөө, өмгөөлөл, харилцагчийн портал',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
