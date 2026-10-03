import type { Metadata } from 'next';
import {
  Inter,
  Noto_Sans_Arabic,
} from 'next/font/google';

import '../globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  variable: '--font-arabic',
  display: 'swap',
  weight: [
    '400',
    '500',
    '600',
    '700',
  ],
});

export const metadata: Metadata = {
  title: {
    default: 'NGO Hub',
    template: '%s | NGO Hub',
  },
  description:
    'Bilingual operations management platform for healthcare NGOs.',
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{
    lang: string;
  }>;
}>;

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  const { lang } = await params;
  const locale =
    lang === 'ar'
      ? 'ar'
      : 'en';

  const direction =
    locale === 'ar'
      ? 'rtl'
      : 'ltr';

  return (
    <html
      lang={locale}
      dir={direction}
      className={`${inter.variable} ${notoArabic.variable}`}
      suppressHydrationWarning
    >
      <body>
        {children}
      </body>
    </html>
  );
}