import NextAuth from 'next-auth';
import { authConfig } from 'app/auth.config';
import createMiddleware from 'next-intl/middleware';
import { locales } from './src/i18n/request';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'zh',
  localePrefix: 'always', // 总是显示语言前缀
});

const authMiddleware = NextAuth(authConfig).auth;

export default authMiddleware((req) => {
  // 应用国际化中间件
  return intlMiddleware(req);
});

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
