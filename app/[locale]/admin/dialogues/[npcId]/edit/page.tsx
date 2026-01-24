'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function EditDialoguePage({
  params,
}: {
  params: { locale: string; npcId: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = searchParams.get('lang') || 'zh';
  const { locale, npcId } = params;

  const [dialogue, setDialogue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDialogue();
  }, [npcId, lang]);

  const loadDialogue = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dialogues/${npcId}?lang=${lang}`);
      if (response.ok) {
        const data = await response.json();
        setDialogue(data);
      } else {
        // 文件不存在，初始化空对话
        setDialogue({
          npcId,
          startNode: 'start',
          nodes: {
            start: {
              id: 'start',
              text: lang === 'zh' ? '你好，我是...' : 'Hello, I am...',
              options: []
            }
          }
        });
      }
    } catch (err) {
      console.error('Error loading dialogue:', err);
      setError('Failed to load dialogue');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/dialogues/${npcId}?lang=${lang}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dialogue),
      });

      if (response.ok) {
        alert(lang === 'zh' ? '保存成功！' : 'Saved successfully!');
      } else {
        alert(lang === 'zh' ? '保存失败' : 'Failed to save');
      }
    } catch (err) {
      console.error('Error saving dialogue:', err);
      alert(lang === 'zh' ? '保存失败' : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-white">
          {lang === 'zh' ? '加载中...' : 'Loading...'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href={`/${locale}/admin/dialogues`}
          className="text-blue-400 hover:text-blue-300 mb-4 inline-block"
        >
          ← {lang === 'zh' ? '返回对话列表' : 'Back to Dialogues'}
        </Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {lang === 'zh' ? '编辑对话' : 'Edit Dialogue'}: {npcId} ({lang.toUpperCase()})
            </h1>
            <p className="text-gray-400">
              {lang === 'zh' ? '编辑NPC对话树' : 'Edit NPC dialogue tree'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/${locale}/admin/dialogues/${npcId}/edit?lang=${lang === 'zh' ? 'en' : 'zh'}`}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              {lang === 'zh' ? '切换到英文' : 'Switch to Chinese'}
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
            >
              {saving 
                ? (lang === 'zh' ? '保存中...' : 'Saving...') 
                : (lang === 'zh' ? '保存' : 'Save')}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-4 mb-6">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-4">
            {lang === 'zh' ? 'JSON编辑器' : 'JSON Editor'}
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            {lang === 'zh' 
              ? '直接编辑对话JSON数据。格式：{ "npcId": "...", "startNode": "start", "nodes": {...} }' 
              : 'Edit dialogue JSON data directly. Format: { "npcId": "...", "startNode": "start", "nodes": {...} }'}
          </p>
          <textarea
            value={JSON.stringify(dialogue, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setDialogue(parsed);
                setError('');
              } catch (err) {
                setError(lang === 'zh' ? 'JSON格式错误' : 'Invalid JSON format');
              }
            }}
            className="w-full h-96 px-4 py-3 bg-gray-900 text-white font-mono text-sm rounded-lg focus:ring-2 focus:ring-blue-500 border border-gray-700"
            spellCheck={false}
          />
        </div>

        {/* Node Preview */}
        {dialogue?.nodes && (
          <div className="mt-6">
            <h3 className="text-xl font-bold text-white mb-4">
              {lang === 'zh' ? '节点预览' : 'Node Preview'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(dialogue.nodes).map(([nodeId, node]: [string, any]) => (
                <div key={nodeId} className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-xs text-gray-400 font-mono mb-2">{nodeId}</div>
                  <div className="text-sm text-white mb-2">{node.text}</div>
                  {node.options && node.options.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {node.options.map((option: any, idx: number) => (
                        <div key={idx} className="text-xs text-blue-300 pl-3 border-l-2 border-blue-500">
                          {idx + 1}. {option.text} → {option.next}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-6 bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-300 mb-2">
            {lang === 'zh' ? '对话格式说明' : 'Dialogue Format Guide'}
          </h4>
          <pre className="text-xs text-blue-200 font-mono overflow-x-auto">
{`{
  "npcId": "${npcId}",
  "startNode": "start",
  "nodes": {
    "start": {
      "id": "start",
      "text": "${lang === 'zh' ? '对话文本' : 'Dialogue text'}",
      "options": [
        {
          "text": "${lang === 'zh' ? '选项文本' : 'Option text'}",
          "next": "node_id"
        }
      ]
    }
  }
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
