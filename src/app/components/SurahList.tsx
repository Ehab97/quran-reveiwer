import { Surah } from '../data/quranData';
import { BookOpen } from 'lucide-react';

interface SurahListProps {
  surahs: Surah[];
  onSelect: (surah: Surah) => void;
  selectedSurah: Surah | null;
}

export function SurahList({ surahs, onSelect, selectedSurah }: SurahListProps) {
  return (
    <div className="h-full overflow-y-auto bg-card border-r border-border">
      <div className="p-4 border-b border-border sticky top-0 bg-card z-10">
        <h2 className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Surahs
        </h2>
      </div>
      <div className="divide-y divide-border">
        {surahs.map((surah) => (
          <button
            key={surah.number}
            onClick={() => onSelect(surah)}
            className={`w-full p-4 text-left hover:bg-accent transition-colors ${
              selectedSurah?.number === surah.number ? 'bg-accent' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground flex-shrink-0">
                    {surah.number}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate">{surah.name}</h3>
                    <p className="text-muted-foreground text-sm">
                      {surah.englishName}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {surah.verses.length} verses • {surah.revelation}
                </p>
              </div>
              <div className="text-right flex-shrink-0" style={{ fontFamily: 'Amiri, serif' }}>
                <p className="text-xl">{surah.arabicName}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
