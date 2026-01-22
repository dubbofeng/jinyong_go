import { Metadata } from 'next';
import { auth } from '../auth';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: '金庸围棋 - 游戏',
  description: '在金庸武侠世界中体验围棋对战',
};

export default async function GamePage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-white mb-2">金庸围棋</h1>
        <p className="text-lg text-gray-300">
          欢迎回来，{session.user?.email}
        </p>
      </div>
      
      <div className="text-center">
        <p className="text-gray-300 mb-4">游戏正在开发中...</p>
        <p className="text-sm text-gray-400">RPG引擎已集成，即将推出</p>
      </div>
      
      <div className="mt-8 text-center">
        <a
          href="/api/auth/signout"
          className="text-sm text-gray-400 hover:text-gray-200 underline"
        >
          退出登录
        </a>
      </div>
    </div>
  );
}
