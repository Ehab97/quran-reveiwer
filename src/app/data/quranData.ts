import chapters from 'quran-json/dist/quran_en.json';

export interface Verse {
  number: number;
  arabic: string;
  english: string;
}

export interface Surah {
  number: number;
  name: string;
  arabicName: string;
  englishName: string;
  verses: Verse[];
  revelation: 'Meccan' | 'Medinan';
}

type ChapterEntry = {
  id: number;
  name: string;
  transliteration: string;
  translation: string;
  type: string;
  verses: { id: number; text: string; translation: string }[];
};

export const quranData: Surah[] = (chapters as ChapterEntry[]).map((ch) => ({
  number: ch.id,
  name: ch.transliteration,
  arabicName: ch.name,
  englishName: ch.translation,
  revelation: ch.type === 'meccan' ? 'Meccan' : 'Medinan',
  verses: ch.verses.map((v) => ({
    number: v.id,
    arabic: v.text,
    english: v.translation,
  })),
}));
