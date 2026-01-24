import { redirect } from 'next/navigation';
import { auth } from '@/app/auth';
import { getTranslations } from 'next-intl/server';
import { db } from '@/app/db';
import { npcs } from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import fs from 'fs';
import path from 'path';

export default async function NPCDialoguesPage({
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

  // 读取对话文件
  const dialoguesDir = path.join(process.cwd(), 'src/data/dialogues');
  const zhFile = `${npc.npcId}.zh.json`;
  const enFile = `${npc.npcId}.en.json`;

  let zhDialogue = null;
  let enDialogue = null;

  try {
    const zhPath = path.join(dialoguesDir, zhFile);
    if (fs.existsSync(zhPath)) {
      zhDialogue = JSON.parse(fs.readFileSync(zhPath, 'utf-8'));
    }
  } catch (e) {
    // ignore
  }

  try {
    const enPath = path.join(dialoguesDir, enFile);
    if (fs.existsSync(enPath)) {
      enDialogue = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
    }
  } catch (e) {
    // ignore
  }

  const zhNodeCount = zhDialogue ? Object.keys(zhDialogue.nodes || {}).length : 0;
  const enNodeCount = enDialogue ? Object.keys(enDialogue.nodes || {}).length : 0;

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
          {t('dialogues.title') || 'NPC Dialogues'}: {npc.name}
        </h1>
        <p className="text-gray-400">
          {t('dialogues.subtitle') || 'Manage dialogue trees for this NPC'}
        </p>
      </div>

      {/* Dialogue Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Chinese Dialogue */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">中文对话</h3>
            {zhDialogue ? (
              <span className="px-3 py-1 bg-green-900 text-green-200 text-sm rounded-full">
                ✓ 已创建
              </span>
            ) : (
              <span className="px-3 py-1 bg-red-900 text-red-200 text-sm rounded-full">
                ✗ 未创建
              </span>
            )}
          </div>
          
          {zhDialogue ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">对话节点数：</span>
                <span className="text-white font-medium">{zhNodeCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">起始节点：</span>
                <span className="text-white font-mono text-xs">
                  {zhDialogue.startNode || 'N/A'}
                </span>
              </div>
              <Link
                href={`/${locale}/admin/dialogues/${npc.npcId}/edit?lang=zh`}
                className="block w-full text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition mt-4"
              >
                编辑中文对话
              </Link>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">还未创建中文对话文件</p>
              <Link
                href={`/${locale}/admin/dialogues/${npc.npcId}/edit?lang=zh`}
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                创建中文对话
              </Link>
            </div>
          )}
        </div>

        {/* English Dialogue */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">English Dialogue</h3>
            {enDialogue ? (
              <span className="px-3 py-1 bg-green-900 text-green-200 text-sm rounded-full">
                ✓ Created
              </span>
            ) : (
              <span className="px-3 py-1 bg-red-900 text-red-200 text-sm rounded-full">
                ✗ Not Created
              </span>
            )}
          </div>
          
          {enDialogue ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Dialogue Nodes:</span>
                <span className="text-white font-medium">{enNodeCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Start Node:</span>
                <span className="text-white font-mono text-xs">
                  {enDialogue.startNode || 'N/A'}
                </span>
              </div>
              <Link
                href={`/${locale}/admin/dialogues/${npc.npcId}/edit?lang=en`}
                className="block w-full text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition mt-4"
              >
                Edit English Dialogue
              </Link>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No English dialogue file yet</p>
              <Link
                href={`/${locale}/admin/dialogues/${npc.npcId}/edit?lang=en`}
                className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Create English Dialogue
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Dialogue Preview (if exists) */}
      {(zhDialogue || enDialogue) && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">
            {t('dialogues.preview') || 'Dialogue Preview'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {zhDialogue && (
              <div>
                <h4 className="text-lg font-medium text-white mb-3">中文节点</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {Object.entries(zhDialogue.nodes || {}).map(([key, node]: [string, any]) => (
                    <div key={key} className="bg-gray-700 p-3 rounded">
                      <div className="text-xs text-gray-400 font-mono mb-1">{key}</div>
                      <div className="text-sm text-white">{node.text?.substring(0, 100)}...</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {enDialogue && (
              <div>
                <h4 className="text-lg font-medium text-white mb-3">English Nodes</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {Object.entries(enDialogue.nodes || {}).map(([key, node]: [string, any]) => (
                    <div key={key} className="bg-gray-700 p-3 rounded">
                      <div className="text-xs text-gray-400 font-mono mb-1">{key}</div>
                      <div className="text-sm text-white">{node.text?.substring(0, 100)}...</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
