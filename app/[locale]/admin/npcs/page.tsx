import { redirect } from 'next/navigation';
import { auth } from '@/app/auth';
import { getTranslations } from 'next-intl/server';
import { db } from '@/app/db';
import { npcs } from '@/src/db/schema';
import { desc } from 'drizzle-orm';
import Link from 'next/link';

export default async function NPCsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const { locale } = await params;
  const t = await getTranslations('admin.npcs');

  // 获取所有NPC
  const allNPCs = await db.select().from(npcs).orderBy(desc(npcs.createdAt));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('title')}</h1>
          <p className="text-gray-400">{t('subtitle')}</p>
        </div>
        <Link
          href={`/${locale}/admin/npcs/create`}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          {t('createNew')}
        </Link>
      </div>

      {/* NPC列表 */}
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.id')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.name')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.type')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.location')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.difficulty')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.skills')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {allNPCs.map((npc) => (
              <tr key={npc.id} className="hover:bg-gray-750">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {npc.npcId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-white">{npc.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    npc.npcType === 'teacher' ? 'bg-green-900 text-green-200' :
                    npc.npcType === 'opponent' ? 'bg-red-900 text-red-200' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {npc.npcType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {npc.mapId} ({npc.positionX}, {npc.positionY})
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {npc.difficulty || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {npc.teachableSkills && Array.isArray(npc.teachableSkills) 
                    ? npc.teachableSkills.length 
                    : 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link
                    href={`/${locale}/admin/npcs/${npc.id}/edit`}
                    className="text-blue-400 hover:text-blue-300 mr-4"
                  >
                    {t('actions.edit')}
                  </Link>
                  <Link
                    href={`/${locale}/admin/npcs/${npc.id}/dialogues`}
                    className="text-green-400 hover:text-green-300"
                  >
                    {t('actions.editDialogues')}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {allNPCs.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {t('empty')}
          </div>
        )}
      </div>

      {/* 统计信息 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">{t('stats.total')}</div>
          <div className="text-2xl font-bold text-white mt-1">{allNPCs.length}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">{t('stats.teachers')}</div>
          <div className="text-2xl font-bold text-green-400 mt-1">
            {allNPCs.filter(n => n.npcType === 'teacher').length}
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">{t('stats.opponents')}</div>
          <div className="text-2xl font-bold text-red-400 mt-1">
            {allNPCs.filter(n => n.npcType === 'opponent').length}
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">{t('stats.merchants')}</div>
          <div className="text-2xl font-bold text-yellow-400 mt-1">
            {allNPCs.filter(n => n.npcType === 'merchant').length}
          </div>
        </div>
      </div>
    </div>
  );
}
