import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '金庸围棋 - 游戏',
  description: '在金庸武侠世界中体验围棋对战',
};

export default function GamePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">金庸围棋</h1>
      <p className="text-xl text-gray-600">游戏开发中...</p>
    </div>
  );
}
