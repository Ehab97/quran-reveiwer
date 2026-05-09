import { useState } from 'react';
import { useNavigate } from 'react-router';
import { quranData } from '../data/quranData';
import { Search, X, BookOpen, Mic } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const revelationColors = {
  Meccan: { bg: 'bg-amber-100 text-amber-800', dark: 'bg-amber-900/30 text-amber-400' },
  Medinan: { bg: 'bg-emerald-100 text-emerald-800', dark: 'bg-emerald-900/30 text-emerald-400' },
};

export function MobileSurahList() {
  const navigate = useNavigate();
  const { isDark, bookmarkedVerses, t } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const surahs = quranData;

  const filtered = surahs.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.arabicName.includes(searchQuery) ||
      String(s.number).includes(searchQuery)
  );

  const bg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const inputBg = isDark
    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';
  const numBg = isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700';

  return (
    <div className={`flex flex-col h-full ${bg}`}>
      {/* Search bar */}
      <div className={`px-4 py-3 sticky top-0 z-10 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="relative">
          <Search className={`absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSub} pointer-events-none`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.surahList.searchPlaceholder}
            className={`w-full ps-9 pe-9 py-2.5 rounded-xl border ${inputBg} focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute end-3 top-1/2 -translate-y-1/2 ${textSub} hover:text-red-500 transition-colors`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Surah list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {filtered.length === 0 ? (
          <div className={`text-center py-10 ${textSub}`}>{t.surahList.noResults}</div>
        ) : (
          filtered.map((surah) => {
            const bookmarkCount = Array.from(bookmarkedVerses).filter((k) =>
              k.startsWith(`${surah.number}-`)
            ).length;
            const revColors = revelationColors[surah.revelation];
            const revLabel = surah.revelation === 'Meccan' ? t.surahList.meccan : t.surahList.medinan;

            return (
              <div
                key={surah.number}
                className={`${cardBg} border rounded-xl overflow-hidden transition-all hover:border-emerald-400/50`}
              >
                {/* Main tap area → Read */}
                <button
                  onClick={() => navigate(`/surah/${surah.number}`)}
                  className="w-full text-start p-4 active:bg-gray-50/50 dark:active:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Number badge */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full ${numBg} flex items-center justify-center text-sm font-semibold`}
                    >
                      {surah.number}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`truncate font-medium ${textMain}`}>{surah.name}</span>
                        {bookmarkCount > 0 && (
                          <span className="flex-shrink-0 text-xs bg-amber-500 text-white rounded-full px-1.5 py-0.5">
                            {bookmarkCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs ${textSub}`}>{surah.englishName}</span>
                        <span className={`text-xs ${textSub}`}>·</span>
                        <span className={`text-xs ${textSub}`}>{surah.verses.length} {t.surahList.verses}</span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full ${
                            isDark ? revColors.dark : revColors.bg
                          }`}
                        >
                          {revLabel}
                        </span>
                      </div>
                    </div>

                    {/* Arabic name */}
                    <div
                      style={{ fontFamily: 'Amiri, serif' }}
                      className={`flex-shrink-0 text-2xl ${textMain}`}
                    >
                      {surah.arabicName}
                    </div>
                  </div>
                </button>

                {/* Action buttons strip */}
                <div className={`flex border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  {/* Read button */}
                  <button
                    onClick={() => navigate(`/surah/${surah.number}`)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-e ${
                      isDark ? 'border-gray-700' : 'border-gray-100'
                    } ${
                      isDark
                        ? 'text-gray-400 hover:text-emerald-400 hover:bg-gray-700/50'
                        : 'text-gray-500 hover:text-emerald-700 hover:bg-emerald-50/60'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    {t.surahList.read}
                  </button>

                  {/* Review button */}
                  <button
                    onClick={() => navigate(`/review/${surah.number}`)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                      isDark
                        ? 'text-emerald-400 hover:bg-emerald-900/30 hover:text-emerald-300'
                        : 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    {t.surahList.review}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
