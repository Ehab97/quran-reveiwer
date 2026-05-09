import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { quranData, Surah, Verse } from '../data/quranData';
import { useApp } from '../../context/AppContext';
import { type T } from '../../i18n';
import {
  Mic,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trophy,
  Languages,
  Bookmark,
  ChevronsLeft,
} from 'lucide-react';

/* ─── Text helpers ──────────────────────────────────────────────────────────── */
function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .trim();
}

function scoreMatch(transcript: string, verse: Verse): number {
  if (!transcript.trim()) return 0;

  const engWords = verse.english.toLowerCase().split(/\s+/).filter((w) => w.replace(/[^a-z]/g, '').length > 3);
  const transWords = transcript.toLowerCase().split(/\s+/).filter((w) => w.replace(/[^a-z]/g, '').length > 3);

  let engHits = 0;
  for (const tw of transWords) {
    const clean = tw.replace(/[^a-z]/g, '');
    if (engWords.some((ew) => ew.includes(clean) || clean.includes(ew))) engHits++;
  }
  const engScore = transWords.length > 0 ? engHits / Math.max(engWords.length, transWords.length) : 0;

  const arabNorm = normalizeArabic(verse.arabic).split(/\s+/).filter((w) => w.length > 1);
  const transArab = normalizeArabic(transcript).split(/\s+/).filter((w) => w.length > 1);

  let arabHits = 0;
  for (const tw of transArab) {
    if (arabNorm.some((aw) => aw.includes(tw) || tw.includes(aw))) arabHits++;
  }
  const arabScore = transArab.length > 0 ? arabHits / Math.max(arabNorm.length, transArab.length) : 0;

  return Math.max(engScore, arabScore);
}

const toArabicNumerals = (n: number) =>
  n.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

function matchWords(transcript: string, verseArabic: string): WordResult[] {
  const verseWords = verseArabic.split(/\s+/).filter(Boolean);
  const normVerse = verseWords.map(normalizeArabic);
  const normSpoken = normalizeArabic(transcript).split(/\s+/).filter(Boolean);

  const usedIdx = new Set<number>();
  return verseWords.map((word, i) => {
    const nv = normVerse[i];
    let found = false;
    for (let j = 0; j < normSpoken.length; j++) {
      if (usedIdx.has(j)) continue;
      const ns = normSpoken[j];
      if (nv.includes(ns) || ns.includes(nv)) {
        const similarity = Math.min(nv.length, ns.length) / Math.max(nv.length, ns.length);
        if (similarity > 0.55) { found = true; usedIdx.add(j); break; }
      }
    }
    return { verseWord: word, correct: found };
  });
}

/* ─── Types ─────────────────────────────────────────────────────────────────── */
type RecordState = 'idle' | 'listening' | 'result' | 'revealed';

interface WordResult {
  verseWord: string;
  correct: boolean;
}

interface VerseResult {
  verseNumber: number;
  score: number;
  transcript: string;
  revealed: boolean;
}


/* ─── Score helpers ─────────────────────────────────────────────────────────── */
function gradeInfo(score: number, t: T) {
  if (score >= 0.85) return { label: t.review.excellent, emoji: '✨', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30' };
  if (score >= 0.65) return { label: t.review.good, emoji: '👍', color: 'text-sky-500', bg: 'bg-sky-500/10 border-sky-500/30' };
  if (score >= 0.4)  return { label: t.review.partial, emoji: '🔄', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30' };
  return { label: t.review.keepPracticing, emoji: '💪', color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/30' };
}

/* ─── Component ─────────────────────────────────────────────────────────────── */
export function SurahReviewMode() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDark, t } = useApp();
  const surah = quranData.find((s) => s.number === Number(id));

  if (!surah) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        {t.review.notFound}
      </div>
    );
  }

  return <SurahReviewModeInner surah={surah} onExit={() => navigate('/')} isDark={isDark} t={t} />;
}

interface SurahReviewModeInnerProps {
  surah: Surah;
  onExit: () => void;
  isDark: boolean;
  t: T;
}

function SurahReviewModeInner({ surah, onExit, isDark, t }: SurahReviewModeInnerProps) {
  const [verseIndex, setVerseIndex] = useState(0);
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [score, setScore] = useState(0);
  const [sessionResults, setSessionResults] = useState<VerseResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [arabicMode, setArabicMode] = useState(true);
  const [pulseScale, setPulseScale] = useState(1);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [verseWordResults, setVerseWordResults] = useState<Map<number, WordResult[]>>(new Map());

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const animRef = useRef<number>();
  const currentVerseRef = useRef<HTMLSpanElement>(null);

  const currentVerse = surah.verses[verseIndex];
  const totalVerses = surah.verses.length;

  /* ─── Scroll current verse into view ───────────────────────────────────── */
  useEffect(() => {
    currentVerseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [verseIndex]);

  /* ─── Speech recognition setup ─────────────────────────────────────────── */
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSpeechSupported(false); return; }

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = arabicMode ? 'ar-SA' : 'en-US';

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let fin = '';
      let inter = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) fin += t;
        else inter += t;
      }
      setInterim(inter);
      if (fin) {
        const finalText = fin.trim();
        setTranscript(finalText);
        const matchScore = scoreMatch(finalText, currentVerse);
        setScore(matchScore);
        const words = matchWords(finalText, currentVerse.arabic);
        setVerseWordResults(prev => new Map(prev).set(currentVerse.number, words));
        setRecordState('result');
        setInterim('');
        setSessionResults((prev) => {
          const existing = prev.findIndex((r) => r.verseNumber === currentVerse.number);
          const entry: VerseResult = { verseNumber: currentVerse.number, score: matchScore, transcript: finalText, revealed: false };
          if (existing >= 0) { const next = [...prev]; next[existing] = entry; return next; }
          return [...prev, entry];
        });
      }
    };

    rec.onerror = () => { setRecordState('idle'); setInterim(''); };
    rec.onend = () => {
      if (interim) { setRecordState('idle'); setInterim(''); }
    };

    recognitionRef.current = rec;
    return () => { rec.abort(); };
  }, [arabicMode, currentVerse]);

  /* ─── Mic pulse animation ───────────────────────────────────────────────── */
  useEffect(() => {
    if (recordState === 'listening') {
      let t = 0;
      const animate = () => {
        t += 0.06;
        setPulseScale(1 + Math.sin(t) * 0.12);
        animRef.current = requestAnimationFrame(animate);
      };
      animRef.current = requestAnimationFrame(animate);
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      setPulseScale(1);
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [recordState]);

  /* ─── Actions ───────────────────────────────────────────────────────────── */
  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setRecordState('listening');
      setTranscript('');
      setInterim('');
    } catch { /* already started */ }
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setRecordState('idle');
    setInterim('');
  }, []);

  const tryAgain = () => {
    setRecordState('idle');
    setTranscript('');
    setInterim('');
    setShowResults(false);
    setVerseWordResults(prev => {
      const next = new Map(prev);
      next.delete(currentVerse.number);
      return next;
    });
  };

  const revealVerse = () => {
    setRecordState('revealed');
    setSessionResults((prev) => {
      const existing = prev.findIndex((r) => r.verseNumber === currentVerse.number);
      const entry: VerseResult = { verseNumber: currentVerse.number, score: 0, transcript: '', revealed: true };
      if (existing >= 0) { const next = [...prev]; next[existing] = { ...next[existing], revealed: true }; return next; }
      return [...prev, entry];
    });
  };

  const goNext = () => {
    if (verseIndex + 1 >= totalVerses) {
      setIsComplete(true);
    } else {
      setVerseIndex((i) => i + 1);
      setRecordState('idle');
      setTranscript('');
      setInterim('');
      setShowResults(false);
    }
  };

  const goPrev = () => {
    if (verseIndex > 0) {
      setVerseIndex((i) => i - 1);
      setRecordState('idle');
      setTranscript('');
      setInterim('');
      setShowResults(false);
    }
  };

  const resetToFirst = () => {
    setVerseIndex(0);
    setRecordState('idle');
    setTranscript('');
    setInterim('');
    setShowResults(false);
  };

  /* ─── Theme ─────────────────────────────────────────────────────────────── */
  const bg = isDark ? 'bg-gray-900' : 'bg-amber-50';
  const headerBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';
  const toolbarBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

  /* ─── Session complete screen ───────────────────────────────────────────── */
  if (isComplete) {
    const attempted = sessionResults.filter((r) => !r.revealed);
    const avgScore = attempted.length > 0 ? attempted.reduce((sum, r) => sum + r.score, 0) / attempted.length : 0;
    const perfect = attempted.filter((r) => r.score >= 0.85).length;
    const cardBg = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

    return (
      <div className={`flex flex-col h-full ${bg}`}>
        <div className={`flex items-center px-4 py-3 ${headerBg} border-b flex-shrink-0`}>
          <button onClick={onExit} className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${textMain} hover:bg-gray-100 dark:hover:bg-gray-700`}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className={`ms-2 font-medium ${textMain}`}>{t.review.completeTitle}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="text-center py-6">
            <div className="text-6xl mb-3">{avgScore >= 0.75 ? '🏆' : avgScore >= 0.5 ? '⭐' : '📖'}</div>
            <h2 className={`mb-1 ${textMain}`}>{surah.name}</h2>
            <p className={`text-sm ${textSub}`}>{surah.englishName}</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: t.review.avgScore, value: `${Math.round(avgScore * 100)}%`, color: 'text-emerald-500' },
              { label: t.review.excellentLabel, value: `${perfect}/${totalVerses}`, color: 'text-sky-500' },
              { label: t.review.revealedLabel, value: `${sessionResults.filter((r) => r.revealed).length}`, color: 'text-amber-500' },
            ].map((stat) => (
              <div key={stat.label} className={`${cardBg} border rounded-xl p-3 text-center`}>
                <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className={`text-xs mt-0.5 ${textSub}`}>{stat.label}</div>
              </div>
            ))}
          </div>

          <p className={`text-xs uppercase tracking-wider mb-3 ${textSub}`}>{t.review.verseSummary}</p>
          <div className="space-y-2 mb-6">
            {surah.verses.map((verse) => {
              const result = sessionResults.find((r) => r.verseNumber === verse.number);
              const s = result?.revealed ? null : result?.score ?? null;
              const grade = s !== null ? gradeInfo(s!, t) : null;
              return (
                <div key={verse.number} className={`${cardBg} border rounded-xl px-4 py-3 flex items-center gap-3`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                    {verse.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${textMain}`}>{verse.english.slice(0, 50)}…</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {result?.revealed ? (
                      <span className={`text-xs ${textSub}`}>{t.review.revealedLabel}</span>
                    ) : grade ? (
                      <span className={`text-xs font-semibold ${grade.color}`}>{Math.round((result?.score ?? 0) * 100)}%</span>
                    ) : (
                      <span className={`text-xs ${textSub}`}>{t.review.skipped}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setIsComplete(false); setVerseIndex(0); setRecordState('idle'); setTranscript(''); setSessionResults([]); setShowResults(false); }}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {t.review.reviewAgain}
            </button>
            <button onClick={onExit} className={`w-full py-3 rounded-xl border ${cardBg} ${textMain} font-medium transition-colors`}>
              {t.review.backToList}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Main review screen ────────────────────────────────────────────────── */
  const progressPct = (verseIndex / totalVerses) * 100;
  const grade = (recordState === 'result') ? gradeInfo(score, t) : null;

  // Bismillah — shown for all surahs except At-Tawbah (9)
  const showBismillah = surah.number !== 9;

  return (
    <div className={`flex flex-col h-full ${bg} relative`}>
      {/* ── Header ── */}
      <div className={`flex-shrink-0 ${headerBg} border-b`}>
        <div className="flex items-center gap-2 px-4 py-3">
          <button
            onClick={onExit}
            className={`flex items-center justify-center w-9 h-9 rounded-full transition-colors ${textMain} hover:bg-gray-100 dark:hover:bg-gray-700`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-medium ${textMain}`}>{surah.name}</div>
            <div className={`text-xs ${textSub}`}>{t.review.verseOf(verseIndex + 1, totalVerses)}</div>
          </div>
        </div>
        {/* Progress bar */}
        <div className={`h-1 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <div className="h-full bg-emerald-500 transition-all duration-500 ease-out" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* ── Mushaf body ── */}
      <div className="flex-1 overflow-y-auto pb-36">

        {/* Ornamental surah header */}
        <div className={`mx-4 mt-5 mb-3 border-2 rounded relative text-center py-3 ${isDark ? 'border-gray-600' : 'border-gray-700'}`}>
          <div className={`absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 ${isDark ? 'border-gray-500' : 'border-gray-700'}`} />
          <div className={`absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 ${isDark ? 'border-gray-500' : 'border-gray-700'}`} />
          <span
            style={{ fontFamily: 'Amiri, serif', fontSize: '1.4rem' }}
            className={isDark ? 'text-gray-100' : 'text-gray-800'}
          >
            سُورَةُ {surah.arabicName}
          </span>
        </div>

        {/* Bismillah */}
        {showBismillah && (
          <div
            className={`text-center mb-4 px-4 ${isDark ? 'text-emerald-300' : 'text-gray-700'}`}
            dir="rtl"
            style={{ fontFamily: 'Amiri, serif', fontSize: '1.5rem' }}
          >
            بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
          </div>
        )}

        {/* Flowing Arabic paragraph */}
        <div
          className={`px-5 pb-4 leading-loose text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}
          dir="rtl"
          style={{ fontFamily: 'Amiri, serif', fontSize: '1.65rem', lineHeight: '3' }}
        >
          {surah.verses.map((verse, vIdx) => {
            const isCurrent = verse.number === currentVerse.number;
            const wordResults = verseWordResults.get(verse.number);
            const verseWords = verse.arabic.split(/\s+/).filter(Boolean);

            // Determine what to render for this verse's text
            let verseContent: React.ReactNode;

            if (wordResults) {
              // Post-recitation: color-coded word results
              verseContent = (
                <span ref={isCurrent ? currentVerseRef : undefined}>
                  {wordResults.map((wr, idx) => (
                    <span
                      key={idx}
                      className={wr.correct
                        ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                        : isDark ? 'text-red-400' : 'text-red-500'}
                      style={{ textDecoration: wr.correct ? 'none' : 'underline wavy' }}
                    >
                      {wr.verseWord}{' '}
                    </span>
                  ))}
                </span>
              );
            } else if (isCurrent && recordState === 'revealed') {
              // Revealed without recitation
              verseContent = (
                <span
                  ref={currentVerseRef}
                  className={`rounded px-1 ${isDark ? 'bg-amber-900/50' : 'bg-amber-100'}`}
                >
                  {verse.arabic}
                </span>
              );
            } else if (isCurrent && recordState === 'listening') {
              // Progressive reveal during listening
              const interimResults = interim ? matchWords(interim, verse.arabic) : [];
              verseContent = (
                <span ref={currentVerseRef} className={`rounded px-1 ${isDark ? 'bg-emerald-900/40' : 'bg-emerald-50'}`}>
                  {verseWords.map((word, idx) => {
                    const matched = interimResults[idx]?.correct;
                    return matched ? (
                      <span key={idx}>{word}{' '}</span>
                    ) : (
                      <span
                        key={idx}
                        className="inline-block align-middle rounded mx-0.5"
                        style={{
                          width: `${Math.max(1.5, word.length * 0.55)}em`,
                          height: '1.1em',
                          background: isDark ? '#4b5563' : '#d1d5db',
                          filter: 'blur(3px)',
                          verticalAlign: 'middle',
                        }}
                      />
                    );
                  })}
                </span>
              );
            } else if (isCurrent) {
              // Current verse idle — all blurred
              verseContent = (
                <span ref={currentVerseRef} className={`rounded px-1 ${isDark ? 'bg-emerald-900/40' : 'bg-emerald-50'}`}>
                  {verseWords.map((word, idx) => (
                    <span
                      key={idx}
                      className="inline-block align-middle rounded mx-0.5"
                      style={{
                        width: `${Math.max(1.5, word.length * 0.55)}em`,
                        height: '1.1em',
                        background: isDark ? '#4b5563' : '#d1d5db',
                        filter: 'blur(3px)',
                        verticalAlign: 'middle',
                      }}
                    />
                  ))}
                </span>
              );
            } else if (vIdx < verseIndex) {
              // Past verse with no results (skipped)
              verseContent = (
                <span className={textSub}>{verse.arabic}</span>
              );
            } else {
              // Future verse — all blurred
              verseContent = (
                <span>
                  {verseWords.map((word, idx) => (
                    <span
                      key={idx}
                      className="inline-block align-middle rounded mx-0.5"
                      style={{
                        width: `${Math.max(1.5, word.length * 0.55)}em`,
                        height: '1.1em',
                        background: isDark ? '#4b5563' : '#d1d5db',
                        filter: 'blur(3px)',
                        verticalAlign: 'middle',
                      }}
                    />
                  ))}
                </span>
              );
            }

            return (
              <span key={verse.number}>
                {verseContent}
                {/* Inline ornamental verse number — always visible */}
                <span
                  className={`mx-1 text-base ${isDark ? 'text-emerald-500' : 'text-emerald-700'}`}
                  style={{ fontFamily: 'Amiri, serif' }}
                >
                  ﴿{toArabicNumerals(verse.number)}﴾
                </span>
                {' '}
              </span>
            );
          })}
        </div>

        {/* English translation (when not in Arabic mode) */}
        {!arabicMode && (
          <div className={`px-5 pt-2 pb-4 text-sm leading-relaxed ${textSub} border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <span className={`text-xs uppercase tracking-wider block mb-1 ${textSub}`}>Verse {currentVerse.number}</span>
            {currentVerse.english}
          </div>
        )}

        {/* Listening indicator */}
        {recordState === 'listening' && (
          <div className={`mx-4 mb-3 ${isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} border rounded-2xl p-3 text-center`}>
            <p className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-600'} flex items-center justify-center gap-2`}>
              <span className="flex gap-0.5 items-end">
                {[0, 100, 200].map((delay) => (
                  <span key={delay} className="w-1 rounded-full bg-red-500 animate-bounce" style={{ height: '12px', animationDelay: `${delay}ms` }} />
                ))}
              </span>
              {t.review.listeningText(interim)}
            </p>
          </div>
        )}
      </div>

      {/* ── Score overlay (slide-up when result/revealed) ── */}
      {(recordState === 'result' || recordState === 'revealed') && (
        <div className={`absolute inset-x-0 bottom-16 mx-3 rounded-2xl shadow-xl border overflow-hidden z-40 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {/* Score banner */}
          {recordState === 'result' && grade && (
            <div className={`px-4 py-3 flex items-center justify-between border-b ${isDark ? 'border-gray-700' : 'border-gray-100'} ${grade.bg}`}>
              <div className="flex items-center gap-2">
                {score >= 0.65 ? <CheckCircle2 className={`w-4 h-4 ${grade.color}`} />
                  : score >= 0.4 ? <AlertCircle className={`w-4 h-4 ${grade.color}`} />
                  : <XCircle className={`w-4 h-4 ${grade.color}`} />}
                <span className={`text-sm font-semibold ${grade.color}`}>{grade.emoji} {grade.label}</span>
              </div>
              <span className={`text-sm font-bold ${grade.color}`}>{Math.round(score * 100)}%</span>
            </div>
          )}
          {recordState === 'revealed' && (
            <div className={`px-4 py-2.5 flex items-center gap-2 border-b ${isDark ? 'border-gray-700 text-gray-400' : 'border-gray-100 text-gray-500'}`}>
              <Eye className="w-4 h-4" />
              <span className="text-xs">{t.review.verseRevealed}</span>
            </div>
          )}

          {/* Transcript */}
          {recordState === 'result' && transcript && (
            <div className={`px-4 py-3 text-sm italic ${textSub}`}>"{transcript}"</div>
          )}

          {/* Actions */}
          <div className="flex gap-3 px-4 py-3">
            <button
              onClick={tryAgain}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${isDark ? 'border-gray-600 text-gray-300 bg-gray-700' : 'border-gray-200 text-gray-600 bg-gray-50'}`}
            >
              <RotateCcw className="w-4 h-4" />
              {t.review.tryAgain}
            </button>
            <button
              onClick={goNext}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors flex items-center justify-center gap-1.5"
            >
              {verseIndex + 1 >= totalVerses ? (
                <><Trophy className="w-4 h-4" /> {t.review.finish}</>
              ) : (
                <>{t.review.next} <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Floating mic FAB ── */}
      <button
        onClick={recordState === 'listening' ? stopListening : startListening}
        disabled={!speechSupported}
        style={{ transform: `scale(${pulseScale})` }}
        className={`fixed bottom-20 right-4 w-16 h-16 rounded-full text-white shadow-lg flex items-center justify-center z-50 transition-colors disabled:opacity-40 ${
          recordState === 'listening' ? 'bg-red-500 shadow-red-500/40' : 'bg-emerald-500 shadow-emerald-500/30 hover:bg-emerald-400'
        }`}
      >
        <Mic className="w-7 h-7" />
      </button>

      {/* ── Bottom toolbar ── */}
      <div className={`fixed bottom-0 inset-x-0 flex items-center justify-around px-2 py-3 border-t z-50 ${toolbarBg}`}>
        {/* Errors / results toggle */}
        <button
          onClick={revealVerse}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
        >
          <Eye className="w-5 h-5" />
          <span>{t.review.reveal}</span>
        </button>

        {/* Bookmark placeholder */}
        <button className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}>
          <Bookmark className="w-5 h-5" />
          <span>{t.review.save}</span>
        </button>

        {/* Language toggle */}
        <button
          onClick={() => { setArabicMode((a) => !a); tryAgain(); }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs transition-colors ${
            arabicMode
              ? isDark ? 'text-emerald-400' : 'text-emerald-600'
              : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Languages className="w-5 h-5" />
          <span>{arabicMode ? 'عربي' : 'EN'}</span>
        </button>

        {/* Prev verse */}
        <button
          onClick={goPrev}
          disabled={verseIndex === 0}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs transition-colors disabled:opacity-30 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
        >
          <ChevronLeft className="w-5 h-5" />
          <span>{t.review.prev}</span>
        </button>

        {/* Reset to first */}
        <button
          onClick={resetToFirst}
          disabled={verseIndex === 0}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs transition-colors disabled:opacity-30 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
        >
          <ChevronsLeft className="w-5 h-5" />
          <span>{t.review.reset}</span>
        </button>
      </div>
    </div>
  );
}
