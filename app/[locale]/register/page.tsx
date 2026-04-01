import Link from 'next/link';
import { RegisterForm } from '../../../src/components/AuthForms';
import { createUser, getUser } from '../../db';
import { SubmitButton } from '../../../src/components/SubmitButton';
import { getTranslations } from 'next-intl/server';
import LanguageSwitcher from '../../../src/components/LanguageSwitcher';

export default async function Register({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('auth');
  const tGame = await getTranslations('game');

  async function register(formData: FormData) {
    'use server';
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const username = formData.get('username') as string;

    try {
      // 检查用户是否已存在
      const existingUser = await getUser(email);

      if (existingUser.length > 0) {
        return '该邮箱已被注册'; // TODO: Handle errors with useFormStatus
      }

      // 验证密码长度
      if (password.length < 6) {
        return '密码至少需要6个字符';
      }

      // 创建用户和初始游戏进度
      await createUser(email, password, username);
    } catch (error: any) {
      console.error('注册错误:', error);

      // 处理数据库约束错误
      if (error?.code === '23505') {
        if (error?.constraint_name === 'users_email_key') {
          return '该邮箱已被注册';
        }
        return '注册失败：用户已存在';
      }

      return '注册失败，请稍后重试';
    }

    // 返回成功标志
    return 'success';
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <LanguageSwitcher />
      <div className="z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 shadow-2xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <h3 className="text-2xl font-bold text-gray-900">{tGame('title')}</h3>
          <p className="text-sm text-gray-500">
            {t('registerPrompt')}
          </p>
        </div>
        <RegisterForm action={register} locale={locale}>
          <SubmitButton>{t('register')}</SubmitButton>
          <p className="text-center text-sm text-gray-600">
            {t('hasAccount')}{' '}
            <Link href={`/${locale}/login`} className="font-semibold text-indigo-600 hover:text-indigo-500">
              {t('loginNow')}
            </Link>
          </p>
        </RegisterForm>
      </div>
    </div>
  );
}
