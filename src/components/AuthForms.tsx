'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

export function LoginForm({
  action,
  children,
}: {
  action: (formData: FormData) => Promise<void | string>;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      className="flex flex-col space-y-4 bg-gray-50 px-4 py-8 sm:px-16"
    >
      <div>
        <label
          htmlFor="email"
          className="block text-xs text-gray-600 uppercase"
        >
          邮箱
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="user@example.com"
          autoComplete="email"
          required
          className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-xs text-gray-600 uppercase"
        >
          密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      {children}
    </form>
  );
}

export function RegisterForm({
  action,
  children,
  locale,
}: {
  action: (formData: FormData) => Promise<void | string>;
  children: React.ReactNode;
  locale: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations('auth');

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    const result = await action(formData);

    if (result === 'success') {
      // 注册成功，跳转到登录页
      router.push(`/${locale}/login`);
    } else if (result) {
      // 有错误消息
      setError(result);
    }
  };

  return (
    <form
      action={handleSubmit}
      className="flex flex-col space-y-4 bg-gray-50 px-4 py-8 sm:px-16"
    >
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}
      <div>
        <label
          htmlFor="username"
          className="block text-xs text-gray-600 uppercase"
        >
          {t('username')}
        </label>
        <input
          id="username"
          name="username"
          type="text"
          placeholder={t('usernamePlaceholder')}
          autoComplete="username"
          required
          className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="email"
          className="block text-xs text-gray-600 uppercase"
        >
          {t('email')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="user@example.com"
          autoComplete="email"
          required
          className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-xs text-gray-600 uppercase"
        >
          {t('password')}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          required
          minLength={6}
          className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="goLevel"
          className="block text-xs text-gray-600 uppercase"
        >
          {t('goLevel')}
        </label>
        <select
          id="goLevel"
          name="goLevel"
          className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white"
        >
          <option value="">{t('goLevelPlaceholder')}</option>
          {[
            '18k', '17k', '16k', '15k', '14k', '13k', '12k', '11k', '10k',
            '9k', '8k', '7k', '6k', '5k', '4k', '3k', '2k', '1k',
            '1d', '2d', '3d', '4d', '5d', '6d', '7d', '8d', '9d'
          ].map(level => (
            <option key={level} value={level}>
              {t(`goLevels.${level}`)}
            </option>
          ))}
        </select>
      </div>
      {children}
    </form>
  );
}
