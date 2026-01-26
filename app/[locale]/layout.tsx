import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '../../src/i18n/request';
import '../globals.css';
import { GeistSans } from 'geist/font/sans';
import { SessionProvider } from 'next-auth/react';

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
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
