import { useState } from 'react';
import { Surah, Verse } from '../data/quranData';
import { BookmarkPlus, Bookmark, MessageSquare } from 'lucide-react';

interface VerseViewProps {
  surah: Surah;
}

export function VerseView({ surah }: VerseViewProps) {
  const [bookmarkedVerses, setBookmarkedVerses] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [activeNote, setActiveNote] = useState<string | null>(null);

  const toggleBookmark = (verseKey: string) => {
    const newBookmarks = new Set(bookmarkedVerses);
    if (newBookmarks.has(verseKey)) {
      newBookmarks.delete(verseKey);
    } else {
      newBookmarks.add(verseKey);
    }
    setBookmarkedVerses(newBookmarks);
  };

  const toggleNote = (verseKey: string) => {
    if (activeNote === verseKey) {
      setActiveNote(null);
    } else {
      setActiveNote(verseKey);
    }
  };

  const updateNote = (verseKey: string, note: string) => {
    setNotes({ ...notes, [verseKey]: note });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 bg-background z-10 border-b border-border p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1>{surah.name}</h1>
              <p className="text-muted-foreground mt-1">
                {surah.englishName} • {surah.verses.length} verses • {surah.revelation}
              </p>
            </div>
            <div className="text-right" style={{ fontFamily: 'Amiri, serif' }}>
              <p className="text-4xl">{surah.arabicName}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {surah.verses.map((verse) => {
            const verseKey = `${surah.number}-${verse.number}`;
            const isBookmarked = bookmarkedVerses.has(verseKey);
            const noteText = notes[verseKey] || '';
            const isNoteActive = activeNote === verseKey;

            return (
              <div key={verse.number} className="group">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground flex-shrink-0 mt-2">
                    {verse.number}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div
                      className="text-right leading-loose p-4 bg-accent/30 rounded-lg"
                      style={{ fontFamily: 'Amiri, serif', fontSize: '1.75rem', lineHeight: '2.5' }}
                    >
                      {verse.arabic}
                    </div>
                    <div className="leading-relaxed text-foreground">
                      {verse.english}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleBookmark(verseKey)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-md transition-colors ${
                          isBookmarked
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                      >
                        {isBookmarked ? (
                          <Bookmark className="w-4 h-4 fill-current" />
                        ) : (
                          <BookmarkPlus className="w-4 h-4" />
                        )}
                        <span className="text-sm">
                          {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                        </span>
                      </button>
                      <button
                        onClick={() => toggleNote(verseKey)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-md transition-colors ${
                          noteText
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-sm">Note</span>
                      </button>
                    </div>
                    {isNoteActive && (
                      <div className="mt-2">
                        <textarea
                          value={noteText}
                          onChange={(e) => updateNote(verseKey, e.target.value)}
                          placeholder="Add your notes or reflections..."
                          className="w-full p-3 bg-input-background rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                          rows={3}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
