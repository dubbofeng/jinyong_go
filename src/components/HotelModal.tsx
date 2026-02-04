import { useState } from 'react';

interface HotelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrder: (item: MenuItem) => Promise<void>;
  onRest: () => Promise<void>;
}

interface MenuItem {
  id: string;
  name: string;
  nameEn: string;
  price: number;
  staminaRestore: number;
  qiRestore: number;
  description: string;
  descriptionEn: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'steamed_bun',
    name: '馒头',
    nameEn: 'Steamed Bun',
    price: 5,
    staminaRestore: 10,
    qiRestore: 0,
    description: '简单的馒头，恢复少量体力',
    descriptionEn: 'Simple steamed bun, restores a little stamina',
  },
  {
    id: 'noodles',
    name: '阳春面',
    nameEn: 'Plain Noodles',
    price: 15,
    staminaRestore: 25,
    qiRestore: 5,
    description: '热腾腾的阳春面，恢复体力和少量内力',
    descriptionEn: 'Hot noodles, restores stamina and a bit of qi',
  },
  {
    id: 'roast_chicken',
    name: '烧鸡',
    nameEn: 'Roast Chicken',
    price: 30,
    staminaRestore: 50,
    qiRestore: 10,
    description: '香喷喷的烧鸡，恢复大量体力和内力',
    descriptionEn: 'Fragrant roast chicken, restores lots of stamina and qi',
  },
  {
    id: 'medicinal_soup',
    name: '药膳汤',
    nameEn: 'Medicinal Soup',
    price: 50,
    staminaRestore: 30,
    qiRestore: 50,
    description: '滋补的药膳汤，恢复大量内力',
    descriptionEn: 'Nourishing soup, restores lots of qi',
  },
  {
    id: 'wine',
    name: '女儿红',
    nameEn: 'Daughter Red Wine',
    price: 40,
    staminaRestore: 0,
    qiRestore: 60,
    description: '上等好酒，恢复内力效果极佳',
    descriptionEn: 'Premium wine, excellent for restoring qi',
  },
];

export default function HotelModal({ isOpen, onClose, onOrder, onRest }: HotelModalProps) {
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleOrder = async (item: MenuItem) => {
    setBusy(true);
    try {
      await onOrder(item);
    } finally {
      setBusy(false);
    }
  };

  const handleRest = async () => {
    setBusy(true);
    try {
      await onRest();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-amber-50 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto border-4 border-amber-800">
        {/* 标题 */}
        <div className="bg-gradient-to-r from-amber-700 to-amber-600 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-center">🏨 客栈</h2>
            <p className="text-center text-sm mt-1 opacity-90">Inn</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-red-400 transition-colors text-3xl font-bold"
          >
            ✕
          </button>
        </div>
        {/* 内容区 */}
        <div className="p-6">
          {/* 住宿区 */}
          <div className="mb-6 bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-lg border-2 border-purple-300">
            <h3 className="text-lg font-bold mb-2 text-purple-800">
              💤 住宿休息
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              睡一觉，体力内力全部恢复
            </p>
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-amber-700">
                💰 价格: 100 银两
              </div>
              <button
                onClick={handleRest}
                disabled={busy}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-bold transition-colors"
              >
                {busy ? '休息中...' : '住店休息'}
              </button>
            </div>
          </div>

          {/* 菜品菜单 */}
          <h3 className="text-lg font-bold mb-3 text-amber-800">🍜 点菜</h3>
          <div className="space-y-3">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-lg border-2 border-amber-200 hover:border-amber-400 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-amber-900">
                      {item.name}
                      <span className="text-sm text-gray-500 ml-2 font-normal">
                        {item.nameEn}
                      </span>
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {item.description}
                    </p>
                    <div className="flex gap-3 mt-2 text-sm">
                      {item.staminaRestore > 0 && (
                        <span className="text-green-600 font-medium">
                          ⚡ +{item.staminaRestore} 体力
                        </span>
                      )}
                      {item.qiRestore > 0 && (
                        <span className="text-blue-600 font-medium">
                          🔮 +{item.qiRestore} 内力
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <div className="text-lg font-bold text-amber-700">
                      💰 {item.price}
                    </div>
                    <button
                      onClick={() => handleOrder(item)}
                      disabled={busy}
                      className="px-4 py-1 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white rounded font-medium transition-colors text-sm"
                    >
                      {busy ? '...' : '点菜'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-4 bg-amber-100 rounded-b-lg border-t-2 border-amber-300">
          <button
            onClick={onClose}
            disabled={busy}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-bold transition-colors"
          >
            离开客栈
          </button>
        </div>
      </div>
    </div>
  );
}
