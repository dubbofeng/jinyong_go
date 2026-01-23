'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { locales } from '../i18n/request';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLanguage = (newLocale: string) => {
    // 从当前路径中提取locale之后的部分
    const segments = pathname.split('/');
    const currentLocaleIndex = segments.findIndex((seg) => locales.includes(seg as any));
    
    if (currentLocaleIndex !== -1) {
      segments[currentLocaleIndex] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }
    
    const newPath = segments.join('/') || '/';
    router.push(newPath);
  };

  return (
    <div className="fixed top-4 left-4 z-50">
      <select
        value={locale}
        onChange={(e) => switchLanguage(e.target.value)}
        className="bg-slate-800 text-white px-4 py-2 rounded-lg border-2 border-slate-600 hover:bg-slate-700 cursor-pointer transition-colors shadow-lg font-medium"
      >
        <option value="zh">🇨🇳 中文</option>
        <option value="en">🇬🇧 English</option>
      </select>
    </div>
  );
}
