import Link from 'next/link';
import { LoginForm } from '../../../src/components/AuthForms';
import { signIn } from '../../auth';
import { SubmitButton } from '../../../src/components/SubmitButton';
import { getTranslations } from 'next-intl/server';
import LanguageSwitcher from '../../../src/components/LanguageSwitcher';

export default async function Login({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('auth');
  const tGame = await getTranslations('game');

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <LanguageSwitcher />
      <div className="z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 shadow-2xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <h3 className="text-2xl font-bold text-gray-900">{tGame('title')}</h3>
          <p className="text-sm text-gray-500">
            {t('loginPrompt')}
          </p>
        </div>
        <LoginForm
          action={async (formData: FormData) => {
            'use server';
            await signIn('credentials', {
              redirectTo: `/${locale}/game`,
              email: formData.get('email') as string,
              password: formData.get('password') as string,
            });
          }}
        >
          <SubmitButton>{t('login')}</SubmitButton>
          <p className="text-center text-sm text-gray-600">
            {t('noAccount')}{' '}
            <Link href={`/${locale}/register`} className="font-semibold text-indigo-600 hover:text-indigo-500">
              {t('registerNow')}
            </Link>
          </p>
        </LoginForm>
      </div>
    </div>
  );
}
