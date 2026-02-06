import { redirect } from 'next/navigation';
import { auth } from '@/app/auth';
import { getTranslations } from 'next-intl/server';
import { db } from '@/app/db';
import { questProgress } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';

export default async function EditQuestPage({
  params,
}: {
  params: Promise<{ locale: string; questId: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const { locale, questId } = await params;
  const t = await getTranslations('admin.quests');

  // 获取任务数据
  const isNumericId = /^\d+$/.test(questId);
  const [quest] = isNumericId
    ? await db
        .select()
        .from(questProgress)
        .where(eq(questProgress.id, parseInt(questId)))
    : await db.select().from(questProgress).where(eq(questProgress.questId, questId));

  if (!quest) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-white mb-4">Quest Not Found</h2>
          <Link href={`/${locale}/admin/quests`} className="text-blue-400 hover:text-blue-300">
            Back to Quest List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href={`/${locale}/admin/quests`}
          className="text-blue-400 hover:text-blue-300 mb-4 inline-block"
        >
          ← {t('backToList') || 'Back to List'}
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">
          {t('edit.title') || 'Edit Quest Progress'}: {quest.questId}
        </h1>
        <p className="text-gray-400">{t('edit.subtitle') || 'Update quest progress information'}</p>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <form className="space-y-6">
          {/* Quest ID - Read Only */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Quest ID</label>
            <input
              type="text"
              value={quest.questId}
              disabled
              className="w-full px-4 py-2 bg-gray-700 text-gray-500 rounded-lg cursor-not-allowed"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('edit.status') || 'Status'} *
            </label>
            <select
              name="status"
              defaultValue={quest.status}
              required
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Progress */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('edit.progress') || 'Progress'}
            </label>
            <textarea
              name="progress"
              defaultValue={JSON.stringify(quest.progress, null, 2)}
              rows={4}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>

          {/* Current Step */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('edit.currentStep') || 'Current Step'}
            </label>
            <input
              type="number"
              name="currentStep"
              defaultValue={quest.currentStep}
              min="0"
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Total Steps */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('edit.totalSteps') || 'Total Steps'}
            </label>
            <input
              type="number"
              name="totalSteps"
              defaultValue={quest.totalSteps}
              min="1"
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              {t('edit.save') || 'Save Changes'}
            </button>
            <Link
              href={`/${locale}/admin/quests`}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              {t('edit.cancel') || 'Cancel'}
            </Link>
          </div>
        </form>
      </div>

      {/* Help Section */}
      <div className="mt-6 bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-300 mb-2">Quest System Guide</h4>
        <div className="text-xs text-blue-200 space-y-2">
          <p>
            <strong>Requirements:</strong> Define what the player needs to complete the quest.
          </p>
          <p>
            <strong>Rewards:</strong> Specify experience, skills, and items to grant upon
            completion.
          </p>
          <p>
            <strong>Prerequisites:</strong> List quest IDs that must be completed first.
          </p>
        </div>
      </div>
    </div>
  );
}
