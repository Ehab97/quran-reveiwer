import { useState, useCallback, useRef } from 'react';
import { Surah } from '../data/quranData';
import { Bookmark, BookmarkPlus, MessageSquare, Volume2, VolumeX } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface MobileVerseViewProps {
  surah: Surah;
}

export function MobileVerseView({ surah }: MobileVerseViewProps) {
  const { isDark, bookmarkedVerses, notes, toggleBookmark, updateNote, t } = useApp();
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speakVerse = useCallback((verseKey: string, arabic: string, english: string) => {
    if (!window.speechSynthesis) return;

    if (speakingKey === verseKey) {
      window.speechSynthesis.cancel();
      setSpeakingKey(null);
      return;
    }

    window.speechSynthesis.cancel();

    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(v => v.lang.startsWith('ar'));

    const text = arabicVoice ? arabic : english;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = arabicVoice ? 'ar-SA' : 'en-US';
    utterance.rate = 0.85;
    if (arabicVoice) utterance.voice = arabicVoice;

    utterance.onstart = () => setSpeakingKey(verseKey);
    utterance.onend = () => setSpeakingKey(null);
    utterance.onerror = () => setSpeakingKey(null);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [speakingKey]);

  const bg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const arabicBg = isDark ? 'bg-gray-700/60' : 'bg-emerald-50/70';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-600';
  const numBg = isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500';
  const textareaBg = isDark
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400';

  return (
    <div className={`${bg} min-h-full`}>
      {/* Bismillah */}
      {surah.number !== 1 && surah.number !== 9 && (
        <div className={`mx-4 mt-4 p-4 ${isDark ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200'} border rounded-xl text-center`}>
          <div
            style={{ fontFamily: 'Amiri, serif', fontSize: '1.6rem', lineHeight: '2.2' }}
            className={isDark ? 'text-emerald-400' : 'text-emerald-800'}
          >
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </div>
          <div className={`text-xs mt-1 ${isDark ? 'text-emerald-600' : 'text-emerald-600'}`}>
            {t.verseView.bismillahTranslation}
          </div>
        </div>
      )}

      {/* Verses */}
      <div className="p-4 space-y-4">
        {surah.verses.map((verse) => {
          const verseKey = `${surah.number}-${verse.number}`;
          const isBookmarked = bookmarkedVerses.has(verseKey);
          const noteText = notes[verseKey] || '';
          const isNoteOpen = activeNote === verseKey;

          return (
            <div
              key={verse.number}
              className={`${cardBg} border rounded-xl overflow-hidden`}
            >
              {/* Verse number banner */}
              <div className={`flex items-center justify-between px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className={`w-7 h-7 rounded-full ${numBg} flex items-center justify-center text-xs font-semibold`}>
                  {verse.number}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleBookmark(verseKey)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isBookmarked
                        ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : `${textSub} hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20`
                    }`}
                    aria-label={isBookmarked ? t.verseView.removeBookmark : t.verseView.addBookmark}
                  >
                    {isBookmarked ? (
                      <Bookmark className="w-4 h-4 fill-current" />
                    ) : (
                      <BookmarkPlus className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveNote(isNoteOpen ? null : verseKey)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      noteText
                        ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                        : `${textSub} hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20`
                    }`}
                    aria-label={t.verseView.addNote}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => speakVerse(verseKey, verse.arabic, verse.english)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      speakingKey === verseKey
                        ? 'text-sky-600 bg-sky-50 dark:bg-sky-900/20'
                        : `${textSub} hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20`
                    }`}
                    aria-label={speakingKey === verseKey ? t.verseView.stopSpeaking : t.verseView.speakVerse}
                  >
                    {speakingKey === verseKey ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Arabic text */}
              <div
                className={`px-4 py-5 text-right ${arabicBg}`}
                style={{ fontFamily: 'Amiri, serif', fontSize: '1.65rem', lineHeight: '2.4' }}
                dir="rtl"
              >
                <span className={isDark ? 'text-emerald-300' : 'text-gray-800'}>{verse.arabic}</span>
                <span className={`mr-2 text-lg ${isDark ? 'text-emerald-600' : 'text-emerald-600'}`}>
                  ﴿{verse.number}﴾
                </span>
              </div>

              {/* English translation */}
              <div className={`px-4 py-3 text-sm leading-relaxed ${textSub}`} dir="ltr">
                {verse.english}
              </div>

              {/* Note area */}
              {isNoteOpen && (
                <div className={`px-4 pb-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'} pt-3`}>
                  <label className={`block text-xs mb-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {t.verseView.noteLabel}
                  </label>
                  <textarea
                    value={noteText}
                    onChange={(e) => updateNote(verseKey, e.target.value)}
                    placeholder={t.verseView.notePlaceholder}
                    className={`w-full p-3 text-sm rounded-lg border ${textareaBg} focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none`}
                    rows={3}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
