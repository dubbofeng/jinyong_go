import { redirect } from 'next/navigation';
import { auth } from '@/app/auth';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';

export default async function DialoguesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const { locale } = await params;
  const t = await getTranslations('admin.dialogues');

  // 读取对话文件列表
  const dialoguesDir = path.join(process.cwd(), 'src/data/dialogues');
  const files = fs.readdirSync(dialoguesDir);
  
  // 按NPC分组对话文件
  const dialoguesByNPC = new Map<string, { zh?: string; en?: string }>();
  
  files.forEach((file) => {
    const match = file.match(/^(.+)\.(zh|en)\.json$/);
    if (match) {
      const [, npcId, lang] = match;
      if (!dialoguesByNPC.has(npcId)) {
        dialoguesByNPC.set(npcId, {});
      }
      const npcDialogues = dialoguesByNPC.get(npcId)!;
      if (lang === 'zh' || lang === 'en') {
        npcDialogues[lang] = file;
      }
    }
  });

  // 读取每个NPC的对话数据统计
  const npcDialogueStats = Array.from(dialoguesByNPC.entries()).map(([npcId, files]) => {
    let zhNodeCount = 0;
    let enNodeCount = 0;
    
    if (files.zh) {
      try {
        const zhPath = path.join(dialoguesDir, files.zh);
        const zhData = JSON.parse(fs.readFileSync(zhPath, 'utf-8'));
        zhNodeCount = Object.keys(zhData.nodes || {}).length;
      } catch (e) {
        // ignore
      }
    }
    
    if (files.en) {
      try {
        const enPath = path.join(dialoguesDir, files.en);
        const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
        enNodeCount = Object.keys(enData.nodes || {}).length;
      } catch (e) {
        // ignore
      }
    }

    return {
      npcId,
      hasZh: !!files.zh,
      hasEn: !!files.en,
      zhNodeCount,
      enNodeCount,
    };
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('title')}</h1>
          <p className="text-gray-400">{t('subtitle')}</p>
        </div>
        <Link
          href={`/${locale}/admin/dialogues/create`}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          {t('createNew')}
        </Link>
      </div>

      {/* 对话文件列表 */}
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.npcId')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.chinese')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.english')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.totalNodes')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {npcDialogueStats.map((stat) => {
              const isComplete = stat.hasZh && stat.hasEn;
              const totalNodes = stat.zhNodeCount + stat.enNodeCount;

              return (
                <tr key={stat.npcId} className="hover:bg-gray-750">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{stat.npcId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {stat.hasZh ? (
                      <div className="flex items-center">
                        <span className="text-green-400 mr-2">✓</span>
                        <span className="text-sm text-gray-300">
                          {stat.zhNodeCount} {t('nodes')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-red-400">✗</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {stat.hasEn ? (
                      <div className="flex items-center">
                        <span className="text-green-400 mr-2">✓</span>
                        <span className="text-sm text-gray-300">
                          {stat.enNodeCount} {t('nodes')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-red-400">✗</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {totalNodes}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      isComplete 
                        ? 'bg-green-900 text-green-200' 
                        : 'bg-yellow-900 text-yellow-200'
                    }`}>
                      {isComplete ? t('status.complete') : t('status.incomplete')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                    <Link
                      href={`/${locale}/admin/dialogues/${stat.npcId}/edit?lang=zh`}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      {t('actions.editZh')}
                    </Link>
                    <Link
                      href={`/${locale}/admin/dialogues/${stat.npcId}/edit?lang=en`}
                      className="text-green-400 hover:text-green-300"
                    >
                      {t('actions.editEn')}
                    </Link>
                    <Link
                      href={`/${locale}/admin/dialogues/${stat.npcId}/preview`}
                      className="text-purple-400 hover:text-purple-300"
                    >
                      {t('actions.preview')}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {npcDialogueStats.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {t('empty')}
          </div>
        )}
      </div>

      {/* 统计信息 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">{t('stats.totalNPCs')}</div>
          <div className="text-2xl font-bold text-white mt-1">
            {npcDialogueStats.length}
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">{t('stats.complete')}</div>
          <div className="text-2xl font-bold text-green-400 mt-1">
            {npcDialogueStats.filter(s => s.hasZh && s.hasEn).length}
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">{t('stats.totalNodes')}</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {npcDialogueStats.reduce((sum, s) => sum + s.zhNodeCount + s.enNodeCount, 0)}
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">{t('stats.avgNodesPerNPC')}</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">
            {npcDialogueStats.length > 0
              ? Math.round(
                  npcDialogueStats.reduce((sum, s) => sum + s.zhNodeCount, 0) /
                    npcDialogueStats.length
                )
              : 0}
          </div>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="mt-6 bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-300">{t('info.title')}</h3>
            <div className="mt-2 text-sm text-blue-200">
              <p>{t('info.description')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
