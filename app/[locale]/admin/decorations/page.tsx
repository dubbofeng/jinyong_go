import { redirect } from 'next/navigation';
import { auth } from '../../../auth';
import { db } from '../../../db';
import { decorationDefinitions } from '../../../../src/db/schema';
import { eq, or } from 'drizzle-orm';

export default async function DecorationsPage() {
  // 检查用户是否登录
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  // 获取所有装饰物定义
  const allDecorations = await db.select().from(decorationDefinitions);

  // 按类型分组
  const decorations = allDecorations.filter(d => d.type === 'decoration');
  const plants = allDecorations.filter(d => d.type === 'plant');
  const buildings = allDecorations.filter(d => d.type === 'building');

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">装饰物管理</h1>
        <p className="text-gray-600">
          管理游戏中的所有装饰物、植物和建筑定义
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">{allDecorations.length}</div>
          <div className="text-gray-600">总计</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">{decorations.length}</div>
          <div className="text-gray-600">装饰物</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-emerald-600">{plants.length}</div>
          <div className="text-gray-600">植物</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">{buildings.length}</div>
          <div className="text-gray-600">建筑</div>
        </div>
      </div>

      {/* 装饰物列表 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">🎨 装饰物 ({decorations.length})</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">预览</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">分类</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">大小</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">属性</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {decorations.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <img 
                      src={item.imagePath} 
                      alt={item.name}
                      className="w-16 h-16 object-contain"
                    />
                  </td>
                  <td className="px-6 py-4 font-medium">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.category}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      {item.size}格
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {item.blocking && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">阻挡</span>
                      )}
                      {item.interactable && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">可交互</span>
                      )}
                      {item.pickable && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">可拣取</span>
                      )}
                      {item.animated && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">动画</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 植物列表 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">🌿 植物 ({plants.length})</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">预览</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">植物类型</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">大小</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">属性</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用途</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {plants.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <img 
                      src={item.imagePath} 
                      alt={item.name}
                      className="w-16 h-16 object-contain"
                    />
                  </td>
                  <td className="px-6 py-4 font-medium">{item.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-sm ${
                      item.plantType === 'tree' ? 'bg-green-100 text-green-800' :
                      item.plantType === 'herb' ? 'bg-emerald-100 text-emerald-800' :
                      item.plantType === 'bamboo' ? 'bg-teal-100 text-teal-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.plantType === 'tree' ? '🌳 树木' :
                       item.plantType === 'herb' ? '🌿 草药' :
                       item.plantType === 'bamboo' ? '🎋 竹子' :
                       '❓ 未分类'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      {item.size}格
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {item.blocking && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">阻挡</span>
                      )}
                      {item.harvestable && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">可采集</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.plantType === 'tree' ? '可制作棋盘、棋子' :
                     item.plantType === 'herb' ? '可制作药物' :
                     item.plantType === 'bamboo' ? '可制作棋盘' :
                     item.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 建筑列表 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">🏛️ 建筑 ({buildings.length})</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">预览</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">分类</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">大小</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">属性</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {buildings.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <img 
                      src={item.imagePath} 
                      alt={item.name}
                      className="w-16 h-16 object-contain"
                    />
                  </td>
                  <td className="px-6 py-4 font-medium">{item.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.category}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-sm ${
                      item.size === 4 ? 'bg-purple-100 text-purple-800' :
                      item.size === 3 ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.size}格
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {item.enterable && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">可进入</span>
                      )}
                      {item.interactable && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">可交互</span>
                      )}
                      {item.dialogueId && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">有对话</span>
                      )}
                      {item.questId && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">有任务</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 底部说明 */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>说明：</strong>
            </p>
            <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
              <li><strong>装饰物</strong>：可交互、可拣取的物品，如宝箱、蘑菇等</li>
              <li><strong>植物</strong>：草药可制药，树木/竹子可制作棋盘和棋子</li>
              <li><strong>建筑</strong>：可进入触发剧情，同一图片可用于不同剧情实例</li>
              <li><strong>大小</strong>：表示在地图上占用的格子数（1-4格）</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
