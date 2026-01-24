import { redirect } from 'next/navigation';
import { auth } from '@/app/auth';
import { getTranslations } from 'next-intl/server';
import { db } from '@/app/db';
import { npcs, maps } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';

export default async function EditNPCPage({
  params,
}: {
  params: Promise<{ locale: string; npcId: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const { locale, npcId } = await params;
  const t = await getTranslations('admin.npcs');

  // 获取NPC数据
  const isNumericId = /^\d+$/.test(npcId);
  const [npc] = isNumericId
    ? await db.select().from(npcs).where(eq(npcs.id, parseInt(npcId)))
    : await db.select().from(npcs).where(eq(npcs.npcId, npcId));

  if (!npc) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-white mb-4">NPC Not Found</h2>
          <Link
            href={`/${locale}/admin/npcs`}
            className="text-blue-400 hover:text-blue-300"
          >
            Back to NPC List
          </Link>
        </div>
      </div>
    );
  }

  // 获取所有地图用于下拉选择
  const allMaps = await db.select().from(maps);

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href={`/${locale}/admin/npcs`}
          className="text-blue-400 hover:text-blue-300 mb-4 inline-block"
        >
          ← {t('backToList') || 'Back to List'}
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">
          {t('edit.title') || 'Edit NPC'}: {npc.name}
        </h1>
        <p className="text-gray-400">{t('edit.subtitle') || 'Update NPC information and properties'}</p>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <form className="space-y-6">
          {/* NPC ID - Read Only */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              NPC ID
            </label>
            <input
              type="text"
              value={npc.npcId}
              disabled
              className="w-full px-4 py-2 bg-gray-700 text-gray-500 rounded-lg cursor-not-allowed"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('edit.name') || 'Name'} *
            </label>
            <input
              type="text"
              name="name"
              defaultValue={npc.name}
              required
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('edit.description') || 'Description'}
            </label>
            <textarea
              name="description"
              defaultValue={npc.description || ''}
              rows={3}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* NPC Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('edit.type') || 'Type'} *
            </label>
            <select
              name="npcType"
              defaultValue={npc.npcType}
              required
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="teacher">Teacher (导师)</option>
              <option value="opponent">Opponent (对手)</option>
              <option value="merchant">Merchant (商人)</option>
              <option value="guide">Guide (向导)</option>
            </select>
          </div>

          {/* Map */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('edit.map') || 'Map'} *
            </label>
            <select
              name="mapId"
              defaultValue={npc.mapId}
              required
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {allMaps.map((map) => (
                <option key={map.id} value={map.mapId}>
                  {map.name} ({map.mapId})
                </option>
              ))}
            </select>
          </div>

          {/* Position */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Position X *
              </label>
              <input
                type="number"
                name="positionX"
                defaultValue={npc.positionX}
                required
                min="0"
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Position Y *
              </label>
              <input
                type="number"
                name="positionY"
                defaultValue={npc.positionY}
                required
                min="0"
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Difficulty (for opponents) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('edit.difficulty') || 'Difficulty'} (1-9, for opponents)
            </label>
            <input
              type="number"
              name="difficulty"
              defaultValue={npc.difficulty || ''}
              min="1"
              max="9"
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Teachable Skills */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('edit.skills') || 'Teachable Skills'} (comma-separated)
            </label>
            <input
              type="text"
              name="teachableSkills"
              defaultValue={
                npc.teachableSkills && Array.isArray(npc.teachableSkills)
                  ? npc.teachableSkills.join(', ')
                  : ''
              }
              placeholder="e.g., kanglongyouhui, dugujiujian"
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
              href={`/${locale}/admin/npcs`}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              {t('edit.cancel') || 'Cancel'}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
