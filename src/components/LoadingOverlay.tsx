'use client';

import { useLoading } from '@/src/contexts/LoadingContext';

export default function LoadingOverlay() {
  const { isLoading, loadingMessage } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-slate-800/90 p-8 shadow-2xl border-2 border-amber-500/30">
        {/* 旋转的围棋图标 */}
        <div className="relative">
          <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-amber-400/50 rounded-full animate-spin-slow"></div>
        </div>

        {/* Loading 文本 */}
        <div className="text-center">
          <p className="text-white font-medium text-lg mb-1">{loadingMessage}</p>
          <p className="text-gray-400 text-sm">请稍候...</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite reverse;
        }
      `}</style>
    </div>
  );
}
