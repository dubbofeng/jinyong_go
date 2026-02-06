'use client';

import { useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';

interface StoryChoiceRewardItem {
  itemId: string;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  quantity?: number;
}

interface StoryChoice {
  choiceId: string;
  text: string;
  textEn?: string;
  rewards?: {
    exp?: number;
    silver?: number;
    items?: StoryChoiceRewardItem[];
  };
}

interface StoryLine {
  type: 'narration' | 'dialogue';
  text: string;
  textEn?: string;
  speaker?: string;
  speakerEn?: string;
  speakerId?: string;
}

interface StoryScene {
  sceneId: string;
  backgroundId: string;
  lines: StoryLine[];
  choices?: StoryChoice[];
}

interface StoryData {
  storyId: string;
  title: string;
  titleEn?: string;
  scenes: StoryScene[];
}

interface StoryModalProps {
  isOpen: boolean;
  story: StoryData | null;
  sceneIndex: number;
  lineIndex: number;
  onAdvance: () => void;
  onChoose: (choice: StoryChoice) => void;
  onClose: () => void;
}

export default function StoryModal({
  isOpen,
  story,
  sceneIndex,
  lineIndex,
  onAdvance,
  onChoose,
  onClose,
}: StoryModalProps) {
  const locale = useLocale();
  const isEnglish = locale === 'en';
  const t = useTranslations('common');
  const tDialogue = useTranslations('game.dialogue');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !story) return null;

  const scene = story.scenes[sceneIndex];
  const line = scene.lines[Math.min(lineIndex, scene.lines.length - 1)];
  const isLastLine = lineIndex >= scene.lines.length - 1;
  const hasChoices = Boolean(scene.choices && scene.choices.length > 0);
  const showChoices = isLastLine && hasChoices;
  const backgroundUrl = `/generated/story/${scene.backgroundId}.png`;

  const resolveText = (text?: string, textEn?: string) =>
    isEnglish ? textEn || text : text || textEn;
  const resolveSpeaker = (speaker?: string, speakerEn?: string) =>
    isEnglish ? speakerEn || speaker : speaker || speakerEn;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80">
      <div className="relative w-full h-full">
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{ backgroundImage: `url(${backgroundUrl})` }}
        />
        <div className="absolute inset-0 bg-black/40" />

        <div className="absolute top-6 left-6 right-6 flex items-center justify-between text-white z-10">
          <div>
            <div className="text-2xl font-bold">{resolveText(story.title, story.titleEn)}</div>
            {story.titleEn && (
              <div className="text-sm text-white/70">{resolveText(story.titleEn, story.title)}</div>
            )}
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl font-bold">
            ✕
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 px-8 pb-10">
          <div className="max-w-3xl mx-auto bg-black/70 text-white rounded-xl p-6 shadow-2xl">
            {line.type === 'dialogue' && (
              <div className="text-sm text-yellow-300 mb-2">
                {resolveSpeaker(line.speaker || '旁白', line.speakerEn || 'Narrator')}
              </div>
            )}
            <div className={line.type === 'narration' ? 'italic text-base' : 'text-base'}>
              {resolveText(line.text, line.textEn)}
            </div>

            {showChoices ? (
              <div className="mt-6 space-y-3">
                {scene.choices?.map((choice) => (
                  <button
                    key={choice.choiceId}
                    onClick={() => onChoose(choice)}
                    className="w-full text-left bg-amber-700/80 hover:bg-amber-600 transition-colors px-4 py-3 rounded-lg"
                  >
                    <div className="font-semibold">{resolveText(choice.text, choice.textEn)}</div>
                    {choice.rewards && (
                      <div className="mt-1 text-xs text-amber-100">
                        {choice.rewards.exp ? `${t('exp')} +${choice.rewards.exp} ` : ''}
                        {choice.rewards.silver ? `${t('silver')} +${choice.rewards.silver}` : ''}
                        {choice.rewards.items && choice.rewards.items.length > 0 && (
                          <span>
                            {' '}
                            · {t('items')}{' '}
                            {choice.rewards.items
                              .map((i) => (isEnglish ? i.nameEn || i.name : i.name || i.nameEn))
                              .join(isEnglish ? ', ' : '、')}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={onAdvance}
                  className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-lg text-sm"
                >
                  {isLastLine ? tDialogue('continue') : tDialogue('continueEllipsis')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
