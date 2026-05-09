import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { type Lang, translations } from '../i18n';

interface AppContextValue {
  isDark: boolean;
  lang: Lang;
  bookmarkedVerses: Set<string>;
  notes: Record<string, string>;
  toggleDark: () => void;
  toggleLang: () => void;
  toggleBookmark: (key: string) => void;
  updateNote: (key: string, note: string) => void;
  t: typeof translations.en;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('isDark') === 'true');

  const [lang, setLang] = useState<Lang>(() =>
    (localStorage.getItem('lang') as Lang) || 'ar'
  );

  const [bookmarkedVerses, setBookmarkedVerses] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('bookmarks') || '[]'));
    } catch {
      return new Set();
    }
  });

  const [notes, setNotes] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('notes') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('isDark', String(isDark));
  }, [isDark]);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('bookmarks', JSON.stringify(Array.from(bookmarkedVerses)));
  }, [bookmarkedVerses]);

  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes));
  }, [notes]);

  const toggleDark = () => setIsDark((d) => !d);
  const toggleLang = () => setLang((l) => (l === 'ar' ? 'en' : 'ar'));

  const toggleBookmark = (key: string) => {
    setBookmarkedVerses((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const updateNote = (key: string, note: string) => {
    setNotes((prev) => ({ ...prev, [key]: note }));
  };

  const t = translations[lang];

  return (
    <AppContext.Provider value={{ isDark, lang, bookmarkedVerses, notes, t, toggleDark, toggleLang, toggleBookmark, updateNote }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
