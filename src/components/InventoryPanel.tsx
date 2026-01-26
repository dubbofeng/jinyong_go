/**
 * 背包面板
 * 显示玩家物品，支持使用
 */

'use client';

import { useEffect, useState } from 'react';
import CustomAlert from './CustomAlert';

interface ItemEffects {
  stamina?: number;
  qi?: number;
  experience?: number;
}

interface InventoryItem {
  id: number;
  itemId: string;
  quantity: number;
  equipped: boolean;
  item: {
    name: string;
    nameEn: string;
    description: string;
    itemType: string;
    rarity: string;
    effects: ItemEffects;
    iconPath: string | null;
  };
}

const RARITY_COLORS = {
  common: 'border-gray-300 bg-gray-50',
  uncommon: 'border-green-300 bg-green-50',
  rare: 'border-blue-300 bg-blue-50',
  epic: 'border-purple-300 bg-purple-50',
  legendary: 'border-yellow-300 bg-yellow-50',
};

export function InventoryPanel() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [using, setUsing] = useState<number | null>(null);
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    type: 'info' | 'success' | 'warning' | 'error' | 'confirm';
    message: string;
    title?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({ isOpen: false, type: 'info', message: '' });

  // CustomAlert 辅助方法
  const showAlert = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', title?: string): Promise<void> => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        type,
        message,
        title,
        onConfirm: () => {
          setAlertState(prev => ({ ...prev, isOpen: false }));
          resolve();
        },
      });
    });
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/player/inventory');
      const data = await response.json();
      
      console.log('📦 背包API返回:', data);
      
      if (data.success) {
        console.log('📦 背包物品总数:', data.data.length);
        data.data.forEach((item: any, index: number) => {
          console.log(`  物品${index + 1}:`, {
            id: item.id,
            itemId: item.itemId,
            quantity: item.quantity,
            hasItemData: !!item.item,
            itemData: item.item
          });
        });
        setInventory(data.data);
      }
    } catch (error) {
      console.error('获取背包失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseItem = async (inventoryId: number) => {
    if (using) return;

    setUsing(inventoryId);
    
    try {
      const response = await fetch('/api/player/inventory/use', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inventoryId }),
      });

      const data = await response.json();

      if (data.success) {
        // 刷新背包和玩家属性
        await fetchInventory();
        
        // 触发全局事件通知属性面板刷新
        window.dispatchEvent(new Event('player-stats-update'));
        
        // 显示效果提示
        const effectText = Object.entries(data.effects)
          .map(([key, value]) => {
            if (key === 'stamina') return `体力 +${value}`;
            if (key === 'qi') return `内力 +${value}`;
            if (key === 'experience') return `经验 +${value}`;
            return '';
          })
          .filter(Boolean)
          .join(', ');

        await showAlert(`${data.message}\n${effectText}`, 'success', '使用成功');
      } else {
        await showAlert(data.error || '使用失败', 'error', '使用失败');
      }
    } catch (error) {
      console.error('使用物品失败:', error);
      await showAlert('使用失败', 'error', '使用失败');
    } finally {
      setUsing(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-md">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-20 mb-3"></div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-md border-2 border-slate-200">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-slate-900">背包</h3>
        <div className="text-sm text-slate-600">
          {inventory.length} 件物品
        </div>
      </div>

      {/* 物品网格 */}
      {inventory.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <div className="text-3xl mb-2">🎒</div>
          <div className="text-sm">背包空空如也</div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
          {inventory.filter(item => item.item !== null).map((item) => (
            <div
              key={item.id}
              className={`relative border-2 rounded-lg p-2 cursor-pointer hover:shadow-lg transition-all ${
                RARITY_COLORS[item.item.rarity as keyof typeof RARITY_COLORS] || RARITY_COLORS.common
              } ${using === item.id ? 'opacity-50' : ''}`}
              onClick={() => handleUseItem(item.id)}
              title={`${item.item.description}\n点击使用`}
            >
              {/* 数量 */}
              {item.quantity > 1 && (
                <div className="absolute top-1 right-1 bg-slate-700 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {item.quantity}
                </div>
              )}

              {/* 图标 */}
              <div className="flex items-center justify-center h-12 mb-1 text-3xl">
                {item.item.itemType === 'consumable' && '🧪'}
                {item.item.itemType === 'potion' && '🧪'}
                {item.item.itemType === 'material' && '⚙️'}
                {item.item.itemType === 'quest' && '📜'}
                {item.item.itemType === 'equipment' && '⚔️'}
                {item.item.itemType === 'decoration' && '🏮'}
                {item.item.itemType === 'plant' && '🌿'}
                {item.item.itemType === 'building' && '🏠'}
                {!['consumable', 'potion', 'material', 'quest', 'equipment', 'decoration', 'plant', 'building'].includes(item.item.itemType) && '📦'}
              </div>

              {/* 名称 */}
              <div className="text-xs text-center font-semibold truncate text-slate-800">
                {item.item.name}
              </div>

              {/* 效果 */}
              <div className="text-xs text-center text-slate-600 mt-1">
                {item.item.effects?.stamina && (
                  <span className="text-red-600">❤️+{item.item.effects.stamina} </span>
                )}
                {item.item.effects?.qi && (
                  <span className="text-blue-600">⚡+{item.item.effects.qi} </span>
                )}
                {item.item.effects?.experience && (
                  <span className="text-yellow-600">✨+{item.item.effects.experience}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CustomAlert */}
      {alertState.isOpen && (
        <CustomAlert
          isOpen={alertState.isOpen}
          type={alertState.type}
          message={alertState.message}
          title={alertState.title}
          onConfirm={alertState.onConfirm}
          onCancel={alertState.onCancel}
          onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
}
