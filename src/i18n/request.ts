import { getRequestConfig } from 'next-intl/server';

// 支持的语言列表
export const locales = ['zh', 'en'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ requestLocale }) => {
  // 等待获取 locale
  let locale = await requestLocale;
  
  // 如果 locale 无效，使用默认语言
  if (!locale || !locales.includes(locale as any)) {
    locale = 'zh';
  }
  
  // 直接导入对应的语言文件
  let messages;
  if (locale === 'zh') {
    messages = (await import('../../messages/zh.json')).default;
  } else {
    messages = (await import('../../messages/en.json')).default;
  }

  return {
    locale,
    messages,
  };
});
