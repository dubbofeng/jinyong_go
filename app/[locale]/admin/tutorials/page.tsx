import TutorialBoardsEditor from '@/src/components/admin/TutorialBoardsEditor';

export default async function TutorialBoardsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return <TutorialBoardsEditor locale={locale} />;
}
