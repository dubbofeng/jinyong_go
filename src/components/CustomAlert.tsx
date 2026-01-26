'use client';

import { useEffect } from 'react';

export type AlertType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

interface CustomAlertProps {
  isOpen: boolean;
  type?: AlertType;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose: () => void;
}

export default function CustomAlert({
  isOpen,
  type = 'info',
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  onClose,
}: CustomAlertProps) {
  const isConfirm = type === 'confirm';

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  // ESC键关闭
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  // 根据类型选择图标和颜色
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: '✅',
          gradient: 'from-green-900 to-green-800',
          border: 'border-green-500',
          buttonBg: 'bg-green-600 hover:bg-green-500',
        };
      case 'warning':
        return {
          icon: '⚠️',
          gradient: 'from-yellow-900 to-yellow-800',
          border: 'border-yellow-500',
          buttonBg: 'bg-yellow-600 hover:bg-yellow-500',
        };
      case 'error':
        return {
          icon: '❌',
          gradient: 'from-red-900 to-red-800',
          border: 'border-red-500',
          buttonBg: 'bg-red-600 hover:bg-red-500',
        };
      case 'confirm':
        return {
          icon: '❓',
          gradient: 'from-blue-900 to-blue-800',
          border: 'border-blue-500',
          buttonBg: 'bg-blue-600 hover:bg-blue-500',
        };
      default: // info
        return {
          icon: 'ℹ️',
          gradient: 'from-gray-900 to-gray-800',
          border: 'border-gray-500',
          buttonBg: 'bg-gray-600 hover:bg-gray-500',
        };
    }
  };

  const config = getTypeConfig();

  return (
    <div
      className="inset-0 flex items-center justify-center p-4"
      style={{
        position: 'fixed',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 9999,
      }}
      onClick={handleCancel}
    >
      <div
        className={`bg-gradient-to-br ${config.gradient} border-4 ${config.border} rounded-xl shadow-2xl p-6 max-w-md w-full`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">{config.icon}</div>
          {title && <h3 className="text-xl font-bold text-white mb-3">{title}</h3>}
          <p className="text-white whitespace-pre-line">{message}</p>
        </div>

        <div className={`flex gap-3 ${isConfirm ? '' : 'justify-center'}`}>
          <button
            onClick={handleConfirm}
            className={`${isConfirm ? 'flex-1' : 'min-w-[120px]'} ${config.buttonBg} text-white py-3 px-6 rounded-lg font-bold transition-colors`}
          >
            {confirmText}
          </button>
          {isConfirm && (
            <button
              onClick={handleCancel}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-3 px-6 rounded-lg font-bold transition-colors"
            >
              {cancelText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
