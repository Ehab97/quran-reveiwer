import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Surah } from '../data/quranData';
import { MobileSurahList } from './MobileSurahList';
import { MobileVerseView } from './MobileVerseView';
import { SurahReviewMode } from './SurahReviewMode';

interface QuranReaderProps {
  surahs: Surah[];
  bookmarkedVerses: Set<string>;
  notes: Record<string, string>;
  onToggleBookmark: (key: string) => void;
  onUpdateNote: (key: string, note: string) => void;
  isDark: boolean;
}

type View = 'list' | 'read' | 'review';

export function QuranReader({
  surahs,
  bookmarkedVerses,
  notes,
  onToggleBookmark,
  onUpdateNote,
  isDark,
}: QuranReaderProps) {
  const [view, setView] = useState<View>('list');
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);

  const headerBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const textMain = isDark ? 'text-white' : 'text-gray-900';

  if (view === 'review' && selectedSurah) {
    return (
      <SurahReviewMode
        surah={selectedSurah}
        onExit={() => setView('list')}
        isDark={isDark}
      />
    );
  }

  if (view === 'read' && selectedSurah) {
    return (
      <div className="flex flex-col h-full">
        <div className={`flex items-center gap-2 px-4 py-3 border-b flex-shrink-0 ${headerBg}`}>
          <button
            onClick={() => setView('list')}
            className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${textMain} hover:bg-gray-100 dark:hover:bg-gray-700`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className={`font-medium ${textMain}`}>{selectedSurah.name}</div>
            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {selectedSurah.englishName} · {selectedSurah.verses.length} verses
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <MobileVerseView
            surah={selectedSurah}
            bookmarkedVerses={bookmarkedVerses}
            notes={notes}
            onToggleBookmark={onToggleBookmark}
            onUpdateNote={onUpdateNote}
            isDark={isDark}
          />
        </div>
      </div>
    );
  }

  return (
    <MobileSurahList
      surahs={surahs}
      bookmarkedVerses={bookmarkedVerses}
      onSelect={(surah) => { setSelectedSurah(surah); setView('read'); }}
      onReview={(surah) => { setSelectedSurah(surah); setView('review'); }}
      isDark={isDark}
    />
  );
}
