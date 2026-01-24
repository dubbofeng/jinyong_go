import { redirect } from 'next/navigation';
import { auth } from '@/app/auth';
import { getTranslations } from 'next-intl/server';
import { db } from '@/app/db';
import { quests } from '@/src/db/schema';
import { desc } from 'drizzle-orm';
import Link from 'next/link';

export default async function QuestsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const { locale } = await params;
  const t = await getTranslations('admin.quests');

  // 获取所有任务
  const allQuests = await db.select().from(quests).orderBy(desc(quests.chapter), desc(quests.createdAt));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('title')}</h1>
          <p className="text-gray-400">{t('subtitle')}</p>
        </div>
        <Link
          href={`/${locale}/admin/quests/create`}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          {t('createNew')}
        </Link>
      </div>

      {/* 任务列表 */}
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.id')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.title')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.type')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.chapter')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.prerequisites')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.rewards')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {allQuests.map((quest) => (
              <tr key={quest.id} className="hover:bg-gray-750">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {quest.questId}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-white max-w-xs truncate">
                    {quest.title}
                  </div>
                  <div className="text-sm text-gray-500 max-w-xs truncate">
                    {quest.description}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    quest.questType === 'main' ? 'bg-purple-900 text-purple-200' :
                    quest.questType === 'side' ? 'bg-blue-900 text-blue-200' :
                    'bg-green-900 text-green-200'
                  }`}>
                    {quest.questType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {t('chapter')} {quest.chapter}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {quest.prerequisiteQuests && Array.isArray(quest.prerequisiteQuests)
                    ? quest.prerequisiteQuests.length
                    : 0}
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {quest.rewards && typeof quest.rewards === 'object' && (
                    <div className="space-y-1">
                      {(quest.rewards as any).experience && (
                        <div>EXP: {(quest.rewards as any).experience}</div>
                      )}
                      {(quest.rewards as any).skills?.length > 0 && (
                        <div>Skills: {(quest.rewards as any).skills.length}</div>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link
                    href={`/${locale}/admin/quests/${quest.id}/edit`}
                    className="text-blue-400 hover:text-blue-300 mr-4"
                  >
                    {t('actions.edit')}
                  </Link>
                  <button className="text-red-400 hover:text-red-300">
                    {t('actions.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {allQuests.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {t('empty')}
          </div>
        )}
      </div>

      {/* 统计信息 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">{t('stats.total')}</div>
          <div className="text-2xl font-bold text-white mt-1">{allQuests.length}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">{t('stats.main')}</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">
            {allQuests.filter(q => q.questType === 'main').length}
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">{t('stats.side')}</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {allQuests.filter(q => q.questType === 'side').length}
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">{t('stats.tutorial')}</div>
          <div className="text-2xl font-bold text-green-400 mt-1">
            {allQuests.filter(q => q.questType === 'tutorial').length}
          </div>
        </div>
      </div>
    </div>
  );
}
