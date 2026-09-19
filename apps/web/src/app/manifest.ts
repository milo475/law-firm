import type { MetadataRoute } from 'next';
import { BRAND, FIRM_NAME } from '@/lib/brand';

/** Home-screen metadata: the navy brand colour, the firm mark, Mongolian as the default language. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: FIRM_NAME,
    short_name: 'Strategy',
    description: 'Хууль зүйн мэргэжлийн туслалцаа: өмгөөлөл, эрх зүйн зөвлөгөө, харилцагчийн портал.',
    lang: 'mn',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: BRAND.navy,
    icons: [
      { src: '/brand/mark.png', sizes: '146x127', type: 'image/png' },
      { src: '/icon.png', sizes: '158x158', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
