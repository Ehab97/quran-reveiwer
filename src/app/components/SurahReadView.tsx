import { useParams, useNavigate } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { quranData } from '../data/quranData';
import { useApp } from '../../context/AppContext';
import { MobileVerseView } from './MobileVerseView';

export function SurahReadView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDark, lang, t } = useApp();
  const surah = quranData.find((s) => s.number === Number(id));

  if (!surah) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        {t.surahRead.notFound}
      </div>
    );
  }

  const headerBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';
  const BackIcon = lang === 'ar' ? ChevronRight : ChevronLeft;

  return (
    <div className="flex flex-col h-full">
      <div className={`flex items-center gap-2 px-4 py-3 border-b flex-shrink-0 ${headerBg}`}>
        <button
          onClick={() => navigate('/')}
          className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${textMain} hover:bg-gray-100 dark:hover:bg-gray-700`}
        >
          <BackIcon className="w-5 h-5" />
        </button>
        <div>
          <div className={`font-medium ${textMain}`}>{surah.name}</div>
          <div className={`text-xs ${textSub}`}>
            {surah.englishName} · {t.surahRead.verses(surah.verses.length)}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <MobileVerseView surah={surah} />
      </div>
    </div>
  );
}
