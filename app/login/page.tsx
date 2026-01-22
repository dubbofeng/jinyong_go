import Link from 'next/link';
import { LoginForm } from 'app/auth-forms';
import { signIn } from 'app/auth';
import { SubmitButton } from 'app/submit-button';

export default function Login() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 shadow-2xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <h3 className="text-2xl font-bold text-gray-900">金庸围棋</h3>
          <p className="text-sm text-gray-500">
            登录您的账户开始游戏
          </p>
        </div>
        <LoginForm
          action={async (formData: FormData) => {
            'use server';
            await signIn('credentials', {
              redirectTo: '/game',
              email: formData.get('email') as string,
              password: formData.get('password') as string,
            });
          }}
        >
          <SubmitButton>登录</SubmitButton>
          <p className="text-center text-sm text-gray-600">
            {'还没有账户？ '}
            <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
              免费注册
            </Link>
          </p>
        </LoginForm>
      </div>
    </div>
  );
}
