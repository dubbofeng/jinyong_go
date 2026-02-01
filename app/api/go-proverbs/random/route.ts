import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

interface GoProverb {
  id: string;
  text: string;
  explanation?: string;
  tutorialId?: string;
}

const pickRandom = <T,>(items: T[]): T | null => {
  if (!items.length) return null;
  const idx = Math.floor(Math.random() * items.length);
  return items[idx];
};

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'src/data/go-proverbs.json');
    const raw = await fs.readFile(filePath, 'utf8');
    const list = JSON.parse(raw) as GoProverb[];

    if (!Array.isArray(list) || list.length === 0) {
      return NextResponse.json({ success: false, error: 'No proverbs found' }, { status: 404 });
    }

    const proverb = pickRandom(list);
    if (!proverb) {
      return NextResponse.json({ success: false, error: 'No proverbs found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: proverb });
  } catch (error) {
    console.error('Failed to load proverbs:', error);
    return NextResponse.json({ success: false, error: 'Failed to load proverbs' }, { status: 500 });
  }
}
