import { quranData } from '../data/quranData';
import { Bookmark, Trash2, MessageSquare } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function BookmarksView() {
  const { isDark, bookmarkedVerses, notes, toggleBookmark, t } = useApp();

  const bg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';
  const arabicBg = isDark ? 'bg-gray-700/60' : 'bg-emerald-50/70';

  const bookmarkedItems = Array.from(bookmarkedVerses)
    .map((key) => {
      const [surahNum, verseNum] = key.split('-').map(Number);
      const surah = quranData.find((s) => s.number === surahNum);
      const verse = surah?.verses.find((v) => v.number === verseNum);
      if (!surah || !verse) return null;
      return { key, surah, verse, note: notes[key] || '' };
    })
    .filter(Boolean) as Array<{
    key: string;
    surah: (typeof quranData)[number];
    verse: { number: number; arabic: string; english: string };
    note: string;
  }>;

  return (
    <div className={`flex flex-col h-full ${bg}`}>
      {/* Header */}
      <div className={`px-4 pt-6 pb-4 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-amber-500 fill-current" />
          <h2 className={textMain}>{t.bookmarks.title}</h2>
          {bookmarkedItems.length > 0 && (
            <span className="ms-auto text-xs bg-amber-500 text-white rounded-full px-2 py-0.5">
              {bookmarkedItems.length}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {bookmarkedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className={`w-16 h-16 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-100'} flex items-center justify-center mb-4`}>
              <Bookmark className={`w-7 h-7 ${textSub}`} />
            </div>
            <p className={`mb-1 ${textMain}`}>{t.bookmarks.empty}</p>
            <p className={`text-sm ${textSub} max-w-xs`}>{t.bookmarks.emptyDesc}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookmarkedItems.map(({ key, surah, verse, note }) => (
              <div key={key} className={`${cardBg} border rounded-xl overflow-hidden`}>
                {/* Surah label */}
                <div className={`flex items-center justify-between px-4 py-2.5 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                      {surah.name}
                    </span>
                    <span className={`text-xs ${textSub}`}>{t.bookmarks.verse} {verse.number}</span>
                  </div>
                  <button
                    onClick={() => toggleBookmark(key)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    aria-label={t.bookmarks.removeBookmark}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Arabic */}
                <div
                  className={`px-4 py-4 text-right ${arabicBg}`}
                  style={{ fontFamily: 'Amiri, serif', fontSize: '1.5rem', lineHeight: '2.2' }}
                  dir="rtl"
                >
                  <span className={isDark ? 'text-emerald-300' : 'text-gray-800'}>{verse.arabic}</span>
                  <span className={`mr-2 text-base ${isDark ? 'text-emerald-600' : 'text-emerald-600'}`}>
                    ﴿{verse.number}﴾
                  </span>
                </div>

                {/* English */}
                <div className={`px-4 py-3 text-sm leading-relaxed ${textSub}`} dir="ltr">
                  {verse.english}
                </div>

                {/* Note if exists */}
                {note && (
                  <div className={`px-4 pb-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'} pt-3`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <MessageSquare className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`} />
                      <span className={`text-xs ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`}>{t.bookmarks.yourNote}</span>
                    </div>
                    <p className={`text-sm italic leading-relaxed ${textSub}`}>{note}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
