import type { Metadata } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import { Toaster } from '@/components/ui/toast';
import { QueryProvider } from '@/components/providers/query-provider';
import './globals.css';

// Figma: headings — Source Serif 4, body — Inter (both with Cyrillic subset).
const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin', 'cyrillic'],
  weight: ['600', '700'],
  variable: '--font-source-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Strategy Law Firm',
    template: '%s | Strategy Law Firm',
  },
  description: '2009 оноос хойш иргэд, аж ахуйн нэгжид найдвартай эрх зүйн туслалцаа үзүүлж байна.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body className="flex min-h-screen flex-col">
        <QueryProvider>{children}</QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
