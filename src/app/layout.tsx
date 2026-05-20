import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: {
    default: 'Shante Lyur — Premium Wellness Studio',
    template: '%s | Shante Lyur',
  },
  description:
    'Elite cosmetology, massage & wellness management platform. Manage your luxury spa with precision and elegance.',
  keywords: [
    'wellness',
    'spa',
    'cosmetology',
    'massage',
    'luxury',
    'booking',
    'management',
  ],
  authors: [{ name: 'Shante Lyur' }],
  creator: 'Shante Lyur',
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0F',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ru"
      className={`dark ${inter.variable} ${playfairDisplay.variable}`}
      suppressHydrationWarning
    >
      <body className={`${inter.className} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
