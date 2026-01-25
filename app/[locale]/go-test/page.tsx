import { Metadata } from 'next';
import GoBoardGame from '../../../src/components/GoBoardGame';

export const metadata: Metadata = {
  title: '围棋测试 - 金庸围棋',
  description: '围棋棋盘渲染和交互测试',
};

export default function GoBoardTestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8">
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold text-center text-white mb-8">
          围棋棋盘测试
        </h1>
        
        <GoBoardGame size={9} width={600} height={600} />
      </div>
    </div>
  );
}
