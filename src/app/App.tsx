import { Book, Search, Bookmark, Sun, Moon } from 'lucide-react';
import { Link, Routes, Route, useLocation } from 'react-router';
import { useApp } from '../context/AppContext';
import { MobileSurahList } from './components/MobileSurahList';
import { IslamicSearch } from './components/IslamicSearch';
import { BookmarksView } from './components/BookmarksView';
import { SurahReadView } from './components/SurahReadView';
import { SurahReviewMode } from './components/SurahReviewMode';

export default function App() {
  const { isDark, lang, bookmarkedVerses, toggleDark, toggleLang, t } = useApp();
  const location = useLocation();

  const isReaderPage =
    location.pathname.startsWith('/surah/') || location.pathname.startsWith('/review/');

  const headerBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-emerald-700 border-emerald-800';
  const navBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const bodyBg = isDark ? 'bg-gray-900' : 'bg-gray-50';

  const tabs = [
    { path: '/', label: t.nav.quran, icon: Book },
    { path: '/search', label: t.nav.search, icon: Search },
    { path: '/bookmarks', label: t.nav.saved, icon: Bookmark },
  ];

  return (
    <div className={`flex flex-col h-screen max-h-screen overflow-hidden ${bodyBg}`}>
      {!isReaderPage && (
        <header className={`flex items-center justify-between px-4 py-3 ${headerBg} border-b flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 flex items-center justify-center rounded-full bg-white/20">
              <Book className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-semibold tracking-wide leading-tight">
                {t.app.name}
              </div>
              <div className="text-emerald-200 text-xs leading-tight">
                {t.app.subtitle}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {bookmarkedVerses.size > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-500 rounded-full">
                <Bookmark className="w-3 h-3 text-white fill-current" />
                <span className="text-white text-xs font-semibold">{bookmarkedVerses.size}</span>
              </div>
            )}
            {/* Language toggle */}
            <button
              onClick={toggleLang}
              className="px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-semibold hover:bg-white/30 transition-colors min-w-[2.5rem] text-center"
              aria-label="Toggle language"
            >
              {lang === 'ar' ? 'EN' : 'AR'}
            </button>
            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>
      )}

      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<MobileSurahList />} />
          <Route path="/surah/:id" element={<SurahReadView />} />
          <Route path="/review/:id" element={<SurahReviewMode />} />
          <Route path="/search" element={<IslamicSearch />} />
          <Route path="/bookmarks" element={<BookmarksView />} />
        </Routes>
      </main>

      {!isReaderPage && (
        <nav className={`flex-shrink-0 ${navBg} border-t safe-area-pb`}>
          <div className="flex items-stretch">
            {tabs.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              const badgeCount = path === '/bookmarks' ? bookmarkedVerses.size : 0;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 relative transition-colors ${
                    isActive
                      ? isDark
                        ? 'text-emerald-400'
                        : 'text-emerald-700'
                      : isDark
                      ? 'text-gray-500 hover:text-gray-300'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-emerald-600" />
                  )}
                  <div className="relative">
                    <Icon
                      className={`w-5 h-5 ${isActive && path === '/bookmarks' ? 'fill-current' : ''}`}
                    />
                    {badgeCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center text-[10px] font-bold bg-amber-500 text-white rounded-full">
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </span>
                    )}
                  </div>
                  <span className={`text-[11px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
