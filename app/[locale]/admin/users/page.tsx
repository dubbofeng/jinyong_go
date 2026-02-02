import { redirect } from 'next/navigation';
import { auth } from '@/app/auth';
import { getTranslations } from 'next-intl/server';
import { db } from '@/app/db';
import { users, playerStats, chessRecords } from '@/src/db/schema';
import { desc, eq, count, sql } from 'drizzle-orm';
import Link from 'next/link';

export default async function UsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const { locale } = await params;
  const t = await getTranslations('admin.users');

  // 获取所有用户
  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

  // 获取用户统计信息
  const userStats = await Promise.all(
    allUsers.map(async (user) => {
      // 获取游戏进度
      const [stats] = await db
        .select()
        .from(playerStats)
        .where(eq(playerStats.userId, user.id))
        .limit(1);

      // 获取对战记录数
      const [recordCount] = await db
        .select({ count: count() })
        .from(chessRecords)
        .where(eq(chessRecords.userId, user.id));

      // 获取胜场数
      const [winCount] = await db
        .select({ count: count() })
        .from(chessRecords)
        .where(sql`${chessRecords.userId} = ${user.id} AND ${chessRecords.result} = 'win'`);

      return {
        ...user,
        level: stats?.level || 1,
        experience: stats?.experience || 0,
        gamesPlayed: recordCount?.count || 0,
        gamesWon: winCount?.count || 0,
      };
    })
  );

  const totalUsers = allUsers.length;
  const totalGames = userStats.reduce((sum, u) => sum + u.gamesPlayed, 0);
  const avgLevel = totalUsers > 0 
    ? Math.round(userStats.reduce((sum, u) => sum + u.level, 0) / totalUsers) 
    : 0;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('title')}</h1>
          <p className="text-gray-400">{t('subtitle')}</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">{t('stats.totalUsers')}</div>
          <div className="text-2xl font-bold text-white mt-1">{totalUsers}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">{t('stats.totalGames')}</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{totalGames}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">{t('stats.avgLevel')}</div>
          <div className="text-2xl font-bold text-green-400 mt-1">{avgLevel}</div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="text-gray-400 text-sm">{t('stats.activeToday')}</div>
          <div className="text-2xl font-bold text-yellow-400 mt-1">
            {allUsers.filter(u => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return u.createdAt >= today;
            }).length}
          </div>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.id')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.username')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.email')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.level')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.gamesPlayed')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.winRate')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.joinDate')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {t('table.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {userStats.map((user) => {
              const winRate = user.gamesPlayed > 0 
                ? Math.round((user.gamesWon / user.gamesPlayed) * 100) 
                : 0;

              return (
                <tr key={user.id} className="hover:bg-gray-750">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {user.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{user.username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {user.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-white">{user.level}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        ({user.experience} XP)
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {user.gamesPlayed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-sm font-medium ${
                        winRate >= 60 ? 'text-green-400' :
                        winRate >= 40 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {winRate}%
                      </span>
                      <span className="ml-2 text-xs text-gray-500">
                        ({user.gamesWon}W)
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/${locale}/admin/users/${user.id}`}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      {t('actions.view')}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {allUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {t('empty')}
          </div>
        )}
      </div>
    </div>
  );
}
