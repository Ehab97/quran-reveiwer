# Quran & Islamic App — Technical Specification

## 1. Overview

A mobile-first browser app for Quran reading, memorization review, and Islamic knowledge search. The key differentiator is voice-based Quran recitation review with automated Arabic/English scoring — users recite a verse aloud and receive instant feedback without needing an internet connection.

**Target platform:** Mobile browser (iOS Safari, Android Chrome); responsive on desktop.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Bun 1.2.x |
| Framework | React 18 (Vite 6) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 + CSS custom properties (OKLch) |
| UI Components | Radix UI (headless), shadcn-style components |
| Icons | Lucide React |
| Fonts | Amiri (Arabic), Inter (Latin) via Google Fonts |
| Voice | Web Speech API (browser-native) |
| Data | Static `quranData.ts` (no backend) |
| Build Tool | Vite 6 |

### Commands

```bash
bun run dev      # Start development server (Vite)
bun run build    # Build production bundle
bun run lint     # Run ESLint
```

---

## 3. Application Architecture

Single-page React app with no router — all navigation is pure state-driven.

### State topology

`App.tsx` owns all shared state:
- `activeTab: 'read' | 'search' | 'bookmarks'`
- `isDark: boolean`
- `bookmarkedVerses: Set<string>` — keys formatted as `"surahNumber-verseNumber"`
- `notes: Record<string, string>` — keyed by the same bookmark key

`QuranReader.tsx` owns view-level navigation:
- `viewMode: 'list' | 'read' | 'review'`
- `selectedSurah: Surah | null`

### Component tree (simplified)

```
App
├── QuranReader
│   ├── MobileSurahList   (viewMode === 'list')
│   ├── MobileVerseView   (viewMode === 'read')
│   └── SurahReviewMode   (viewMode === 'review')
├── IslamicSearch
│   └── VoiceInput
└── BookmarksView
```

---

## 4. Data Model

Defined in `src/app/data/quranData.ts`.

```ts
interface Verse {
  number: number;
  arabic: string;
  english: string;
}

interface Surah {
  number: number;
  name: string;         // e.g. "Al-Fatihah"
  arabicName: string;   // e.g. "الفاتحة"
  englishName: string;  // e.g. "The Opening"
  verses: Verse[];
  revelation: 'Meccan' | 'Medinan';
}
```

Bookmark key format: `"${surah.number}-${verse.number}"` (e.g. `"1-3"`).

---

## 5. Feature Specifications

### 5.1 Surah List (`MobileSurahList.tsx`)

- Real-time search filtering by surah name, number, or Arabic name
- Revelation type badges: Meccan (amber), Medinan (emerald)
- Bookmark count badge per surah (count of bookmarked verses within that surah)
- Two action buttons per surah: **Read** (→ `viewMode = 'read'`) and **Review** (→ `viewMode = 'review'`)

### 5.2 Verse Reader (`MobileVerseView.tsx`)

- Bismillah header shown for all surahs **except** Al-Fatihah (1) and At-Tawbah (9)
- Arabic text: Amiri font, RTL direction, ~1.65rem
- English translation below Arabic
- Per-verse actions:
  - Bookmark toggle (fills icon when active)
  - Note textarea (auto-saves on change, synced to `App.tsx` via `onUpdateNote`)
- Scrollable verse list within a fixed-height container

### 5.3 Voice Review Mode (`SurahReviewMode.tsx`)

Users recite each verse aloud. Web Speech API captures the transcript and scores it against the correct verse.

#### Scoring algorithm

1. **Normalize Arabic:** strip diacritics (harakat), standardize alef variants (أإآ → ا), standardize ya variants (ى → ي), remove tatweel
2. **Arabic score:** word overlap ratio between normalized transcript and normalized correct Arabic
3. **English score:** word overlap ratio for words longer than 3 characters
4. **Final score:** `max(arabicScore, englishScore)`, range 0–1

#### Grade thresholds

| Score | Grade | Color |
|---|---|---|
| ≥ 0.85 | Excellent | emerald |
| ≥ 0.65 | Good | sky |
| ≥ 0.40 | Partial | amber |
| < 0.40 | Keep Practicing | orange |

#### State machine

```
idle → listening → result → revealed → [next verse or session complete]
```

- **idle:** shows verse prompt (Arabic hidden), mic button
- **listening:** Web Speech API active, animated mic
- **result:** shows score, grade, transcript
- **revealed:** shows correct Arabic + English side-by-side with transcript

#### Session summary

Shown after all verses are reviewed:
- Average score
- Count of "Excellent" and "Revealed" responses
- Per-verse score breakdown

#### Recognition modes

- Arabic recitation: `lang = 'ar-SA'`
- English recitation: `lang = 'en-US'`
- Toggle available in review UI

### 5.4 Islamic Search (`IslamicSearch.tsx`)

- Search input with voice input support (`VoiceInput.tsx`)
- Appends "islam" to every query before hitting Wikipedia API
- Wikipedia API endpoint: `https://en.wikipedia.org/w/api.php` with `action=query&prop=extracts&exintro=true`
- Instant answer card: first ~600 characters of the top result's extract
- Expandable full result
- Suggested topics grid for quick access (Pillars of Islam, Prayer, Fasting, etc.)

### 5.5 Bookmarks (`BookmarksView.tsx`)

- Aggregates all bookmarked verses across all surahs
- Groups by surah
- Shows attached note if present
- Delete (un-bookmark) action
- Empty state when no bookmarks exist

### 5.6 Dark Mode

- Toggled via sun/moon button in header
- `isDark` state in `App.tsx` toggles `.dark` class on `<html>`
- Tailwind `dark:` utility variants throughout components
- CSS custom properties in `theme.css` for color tokens

---

## 6. Voice Input Component (`VoiceInput.tsx`)

Reusable mic button used in `IslamicSearch` and `SurahReviewMode`.

**Props:**
```ts
interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onSearch?: (text: string) => void;
  isDark?: boolean;
  lang?: string; // e.g. 'ar-SA', 'en-US'
}
```

**Behaviour:**
- Uses `window.SpeechRecognition || window.webkitSpeechRecognition`
- `continuous: false`, `interimResults: true`
- Animated mic button with sine-wave pulse via `requestAnimationFrame` while listening
- Gracefully hides if Web Speech API is unsupported (no error thrown)
- Calls `onTranscript` with interim results; calls `onSearch` with the final result

---

## 7. Routing / Navigation

No router library. All navigation is managed via React state.

| State | Location | Values |
|---|---|---|
| `activeTab` | `App.tsx` | `'read'`, `'search'`, `'bookmarks'` |
| `viewMode` | `QuranReader.tsx` | `'list'`, `'read'`, `'review'` |
| `selectedSurah` | `QuranReader.tsx` | `Surah \| null` |

Tab switching is instant (tabs are hidden via `display:none`, not unmounted) to preserve scroll position.

---

## 8. Current Data Coverage

`src/app/data/quranData.ts` currently includes 5 surahs:

| # | Name | Verses included |
|---|---|---|
| 1 | Al-Fatihah | 7 (complete) |
| 2 | Al-Baqarah | 5 (sample only) |
| 112 | Al-Ikhlas | 4 (complete) |
| 113 | Al-Falaq | 5 (complete) |
| 114 | An-Nas | 6 (complete) |

Full Quran = 114 surahs, ~6,236 verses (future expansion target).

---

## 9. Future Enhancements

- Full Quran dataset (all 114 surahs with complete verses)
- Offline support (PWA / service worker)
- Tajweed highlighting (color-coded recitation rules)
- Audio playback with selectable reciters
- Progress persistence via `localStorage`
- User accounts for cross-device bookmark/note sync
- Qibla direction compass
- Prayer time notifications
