import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '../../src/i18n/request';
import '../globals.css';
import { GeistSans } from 'geist/font/sans';
import { SessionProvider } from 'next-auth/react';
import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: '金庸棋侠传',
  description: '围棋与武侠结合的冒险游戏',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
  },
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 验证locale
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // 加载消息 - 传递locale参数
  const messages = await getMessages({ locale });

  return (
    <html lang={locale}>
      <body className={GeistSans.variable}>
        <SessionProvider>
          <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
