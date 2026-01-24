import { redirect } from 'next/navigation';
import { auth } from '@/app/auth';
import { getTranslations } from 'next-intl/server';
import { db } from '@/app/db';
import { quests } from '@/src/db/schema';
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
    ? await db.select().from(quests).where(eq(quests.id, parseInt(questId)))
    : await db.select().from(quests).where(eq(quests.questId, questId));

  if (!quest) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-white mb-4">Quest Not Found</h2>
          <Link
            href={`/${locale}/admin/quests`}
            className="text-blue-400 hover:text-blue-300"
          >
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
          {t('edit.title') || 'Edit Quest'}: {quest.title}
        </h1>
        <p className="text-gray-400">{t('edit.subtitle') || 'Update quest information'}</p>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <form className="space-y-6">
          {/* Quest ID - Read Only */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quest ID
            </label>
            <input
              type="text"
              value={quest.questId}
              disabled
              className="w-full px-4 py-2 bg-gray-700 text-gray-500 rounded-lg cursor-not-allowed"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('edit.title') || 'Title'} *
            </label>
            <input
              type="text"
              name="title"
              defaultValue={quest.title}
              required
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('edit.description') || 'Description'} *
            </label>
            <textarea
              name="description"
              defaultValue={quest.description}
              required
              rows={4}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Quest Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('edit.type') || 'Type'} *
            </label>
            <select
              name="questType"
              defaultValue={quest.questType}
              required
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="main">Main Quest (主线任务)</option>
              <option value="side">Side Quest (支线任务)</option>
              <option value="tutorial">Tutorial (教学任务)</option>
            </select>
          </div>

          {/* Chapter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('edit.chapter') || 'Chapter'} *
            </label>
            <input
              type="number"
              name="chapter"
              defaultValue={quest.chapter}
              required
              min="1"
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Requirements (JSON) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('edit.requirements') || 'Requirements'} (JSON) *
            </label>
            <textarea
              name="requirements"
              defaultValue={JSON.stringify(quest.requirements, null, 2)}
              required
              rows={6}
              className="w-full px-4 py-2 bg-gray-900 text-white font-mono text-sm rounded-lg focus:ring-2 focus:ring-blue-500"
              spellCheck={false}
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: {`{ "level": 1, "defeat": "hong_qigong", "boardSize": 9 }`}
            </p>
          </div>

          {/* Rewards (JSON) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('edit.rewards') || 'Rewards'} (JSON) *
            </label>
            <textarea
              name="rewards"
              defaultValue={JSON.stringify(quest.rewards, null, 2)}
              required
              rows={6}
              className="w-full px-4 py-2 bg-gray-900 text-white font-mono text-sm rounded-lg focus:ring-2 focus:ring-blue-500"
              spellCheck={false}
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: {`{ "experience": 100, "skills": ["kanglongyouhui"], "items": [] }`}
            </p>
          </div>

          {/* Prerequisite Quests */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('edit.prerequisites') || 'Prerequisite Quests'} (comma-separated)
            </label>
            <input
              type="text"
              name="prerequisiteQuests"
              defaultValue={
                quest.prerequisiteQuests && Array.isArray(quest.prerequisiteQuests)
                  ? quest.prerequisiteQuests.join(', ')
                  : ''
              }
              placeholder="e.g., tutorial_1, first_battle"
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
          <p><strong>Requirements:</strong> Define what the player needs to complete the quest.</p>
          <p><strong>Rewards:</strong> Specify experience, skills, and items to grant upon completion.</p>
          <p><strong>Prerequisites:</strong> List quest IDs that must be completed first.</p>
        </div>
      </div>
    </div>
  );
}
