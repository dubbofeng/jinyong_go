import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { parseSgfRoot } from '@/src/lib/sgf-server';
import { auth } from '../../../auth';
import { db } from '@/src/db';
import { gameProgress } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

const practiceDirs: Record<string, string> = {
  daoguan: 'src/data/sgf-practice/sgf',
  huashan: 'src/data/sgf-practice/sgf-unsorted',
  gop: 'src/data/sgf-practice/gop',
};

// 文件列表缓存：set -> { files: string[], timestamp: number }
const fileListCache = new Map<string, { files: string[]; timestamp: number }>();
const FILE_LIST_CACHE_TTL = 10 * 60 * 1000; // 10分钟

// SGF内容缓存：set_file -> { parsed: any, timestamp: number }
const sgfContentCache = new Map<string, { parsed: any; timestamp: number }>();
const SGF_CONTENT_CACHE_TTL = 30 * 60 * 1000; // 30分钟

const listSgfFiles = async (dir: string, baseDir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listSgfFiles(fullPath, baseDir)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.sgf')) {
      results.push(path.relative(baseDir, fullPath));
    }
  }

  return results;
};

const pickRandom = <T>(items: T[]): T | null => {
  if (!items.length) return null;
  const idx = Math.floor(Math.random() * items.length);
  return items[idx];
};

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const set = searchParams.get('set') || '';
    const fileParam = searchParams.get('file');

    const relativeDir = practiceDirs[set];
    if (!relativeDir) {
      return NextResponse.json({ success: false, error: 'Unknown SGF set' }, { status: 400 });
    }

    const baseDir = path.join(process.cwd(), relativeDir);
    const now = Date.now();

    // 检查文件列表缓存
    let allFiles: string[];
    const cachedList = fileListCache.get(set);
    if (cachedList && now - cachedList.timestamp < FILE_LIST_CACHE_TTL) {
      allFiles = cachedList.files;
    } else {
      allFiles = (await listSgfFiles(baseDir, baseDir)).sort();
      fileListCache.set(set, { files: allFiles, timestamp: now });
    }

    if (allFiles.length === 0) {
      return NextResponse.json({ success: false, error: 'No SGF files found' }, { status: 404 });
    }

    let selectedFile = fileParam && allFiles.includes(fileParam) ? fileParam : null;

    let completed: string[] = [];
    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;

    if (userId) {
      const [progress] = await db
        .select({ completedTasks: gameProgress.completedTasks })
        .from(gameProgress)
        .where(eq(gameProgress.userId, userId))
        .limit(1);

      if (progress?.completedTasks) {
        completed = (progress.completedTasks as string[]).filter((task) =>
          task.startsWith(`sgf_practice:${set}:`)
        );
      }
    }

    if (!selectedFile) {
      const completedFiles = new Set(
        completed.map((task) => task.replace(`sgf_practice:${set}:`, ''))
      );
      const remaining = allFiles.filter((file) => !completedFiles.has(file));

      if (set === 'daoguan' || set === 'huashan') {
        selectedFile = remaining[0] || allFiles[0] || null;
      } else {
        selectedFile = pickRandom(remaining) || pickRandom(allFiles);
      }
    }

    if (!selectedFile) {
      return NextResponse.json({ success: false, error: 'No SGF file selected' }, { status: 404 });
    }

    // 检查SGF内容缓存
    const contentCacheKey = `${set}_${selectedFile}`;
    let parsed: any;
    const cachedContent = sgfContentCache.get(contentCacheKey);
    if (cachedContent && now - cachedContent.timestamp < SGF_CONTENT_CACHE_TTL) {
      parsed = cachedContent.parsed;
    } else {
      const sgfPath = path.join(baseDir, selectedFile);
      const sgfContent = await fs.readFile(sgfPath, 'utf8');
      parsed = parseSgfRoot(sgfContent);
      sgfContentCache.set(contentCacheKey, { parsed, timestamp: now });
    }

    return NextResponse.json({
      success: true,
      data: {
        set,
        file: selectedFile,
        title: selectedFile,
        parsed,
      },
      progress: {
        total: allFiles.length,
        completed: completed.length,
      },
    });
  } catch (error) {
    console.error('Failed to load SGF practice:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load SGF practice' },
      { status: 500 }
    );
  }
}
