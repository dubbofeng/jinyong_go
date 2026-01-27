'use client';

import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  const t = useTranslations('common');

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-10 w-full items-center justify-center rounded-md border text-sm font-semibold transition-all focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-600"
    >
      {pending ? t('processing') : children}
    </button>
  );
}
