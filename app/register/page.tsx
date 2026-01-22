import Link from 'next/link';
import { RegisterForm } from 'app/auth-forms';
import { redirect } from 'next/navigation';
import { createUser, getUser } from 'app/db';
import { SubmitButton } from 'app/submit-button';

export default function Register() {
  async function register(formData: FormData) {
    'use server';
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const username = formData.get('username') as string;

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
    redirect('/login');
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 shadow-2xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <h3 className="text-2xl font-bold text-gray-900">金庸围棋</h3>
          <p className="text-sm text-gray-500">
            创建账户，开启武侠围棋之旅
          </p>
        </div>
        <RegisterForm action={register}>
          <SubmitButton>注册</SubmitButton>
          <p className="text-center text-sm text-gray-600">
            {'已有账户？ '}
            <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
              立即登录
            </Link>
          </p>
        </RegisterForm>
      </div>
    </div>
  );
}
