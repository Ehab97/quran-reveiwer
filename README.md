# Quran & Islamic App

A mobile-first browser app for Quran reading, memorization review, and Islamic knowledge search. Built with React, Vite, and Tailwind CSS v4.

## Features

- **Quran Reader** — Browse surahs, read Arabic text with English translation, bookmark verses, and add personal notes
- **Voice Review Mode** — Recite verses aloud and receive instant scored feedback (Arabic or English) using the browser's Web Speech API — no internet required
- **Islamic Search** — Search Islamic topics with voice input; results pulled from Wikipedia
- **Bookmarks** — All saved verses aggregated in one place, with notes
- **Dark Mode** — Full dark theme toggle

## Tech Stack

| | |
|---|---|
| React 18 | UI framework |
| Vite 6 | Build tool |
| TypeScript 5 | Language |
| Tailwind CSS v4 | Styling |
| Radix UI | Headless UI primitives |
| Web Speech API | Voice input & recitation scoring |
| Bun | Runtime & package manager |

## Getting Started

**Prerequisites:** [Bun](https://bun.sh) 1.2+

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Commands

```bash
bun run dev      # Start dev server (Vite HMR)
bun run build    # Build for production
bun run lint     # Run ESLint
```

## Project Structure

```
src/
├── main.tsx                        # Entry point
└── app/
    ├── App.tsx                     # Root component, shared state
    ├── data/
    │   └── quranData.ts            # Static Quran data (5 surahs currently)
    └── components/
        ├── QuranReader.tsx         # View-mode state machine (list/read/review)
        ├── MobileSurahList.tsx     # Surah browser with search
        ├── MobileVerseView.tsx     # Verse reader with bookmarks & notes
        ├── SurahReviewMode.tsx     # Voice recitation review
        ├── IslamicSearch.tsx       # Wikipedia-backed Islamic search
        ├── VoiceInput.tsx          # Reusable mic button component
        └── BookmarksView.tsx       # Saved verses aggregator
```

## Voice Review

1. Open any surah and tap **Review**
2. Tap the mic button when a verse is shown
3. Recite the verse in Arabic or English
4. Receive a score (Excellent / Good / Partial / Keep Practicing)
5. Tap **Reveal** to see the full correct verse before moving on

Voice review uses the browser's built-in Web Speech API — Chrome and Edge have the best support. The feature degrades gracefully if unsupported.

## Data Coverage

Currently includes 5 surahs: Al-Fatihah, Al-Baqarah (sample), Al-Ikhlas, Al-Falaq, An-Nas. Full 114-surah dataset is a planned enhancement.

See [spec.md](./spec.md) for the full technical specification.

## License

MIT
