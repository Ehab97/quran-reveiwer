import React, { useState, useEffect, useRef, useMemo, memo } from "react";
import { useParams, useNavigate } from "react-router";
import { quranData, Surah, Verse } from "../data/quranData";
import { useApp } from "../../context/AppContext";
import { type T } from "../../i18n";
import {
  Mic, Square, ChevronLeft, RotateCcw, Trophy,
  SkipForward, Languages, ChevronRight, RefreshCw,
} from "lucide-react";

// ─── Text helpers ─────────────────────────────────────────────────────────────

function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

function isSimilar(a: string, b: string): boolean {
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const max = Math.max(a.length, b.length);
  return max >= 2 && levenshtein(a, b) / max <= 0.35;
}

interface WordMatch { word: string; correct: boolean }
interface VerseResult { verseNumber: number; score: number; transcript: string }

function matchWords(spoken: string, arabic: string): WordMatch[] {
  const verseWords = arabic.split(/\s+/).filter(Boolean);
  const normVerse = verseWords.map(normalizeArabic);
  const normSpoken = normalizeArabic(spoken).split(/\s+/).filter(Boolean);
  const used = new Set<number>();
  return verseWords.map((word, i) => {
    let correct = false;
    for (let j = 0; j < normSpoken.length; j++) {
      if (used.has(j)) continue;
      if (isSimilar(normVerse[i], normSpoken[j])) {
        correct = true;
        used.add(j);
        break;
      }
    }
    return { word, correct };
  });
}

function calcScore(spoken: string, arabic: string): number {
  if (!spoken.trim()) return 0;
  const av = normalizeArabic(arabic).split(/\s+/).filter(w => w.length > 1);
  const sv = normalizeArabic(spoken).split(/\s+/).filter(w => w.length > 1);
  let hits = 0;
  for (const s of sv) if (av.some(v => v.includes(s) || s.includes(v))) hits++;
  return sv.length > 0 ? hits / Math.max(av.length, sv.length) : 0;
}

const toArabic = (n: number) => n.toString().replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[+d]);

// ─── VerseBlock ───────────────────────────────────────────────────────────────

type VerseState = "future" | "current-idle" | "live" | "done" | "skipped";

const VerseBlock = memo(function VerseBlock({
  verse,
  state,
  finalMatches,
  liveMatches,
  spokenCount,
  isDark,
  verseRef,
}: {
  verse: Verse;
  state: VerseState;
  finalMatches?: WordMatch[];
  liveMatches?: WordMatch[];
  spokenCount?: number;
  isDark: boolean;
  verseRef?: React.RefObject<HTMLSpanElement | null>;
}) {
  const num = (
    <span
      className={`mx-1 text-base ${isDark ? "text-emerald-500" : "text-emerald-700"}`}
      style={{ fontFamily: "Amiri, serif" }}
    >
      ﴿{toArabic(verse.number)}﴾
    </span>
  );

  // ── Completed verse: green/red per word ──
  if (state === "done" && finalMatches) {
    return (
      <>
        <span ref={verseRef as any}>
          {finalMatches.map((m, i) => (
            <span
              key={i}
              className={m.correct
                ? (isDark ? "text-emerald-400" : "text-emerald-600")
                : (isDark ? "text-red-400" : "text-red-500")}
              style={m.correct ? undefined : { textDecoration: "underline wavy" }}
            >
              {m.word}{" "}
            </span>
          ))}
        </span>
        {num}{" "}
      </>
    );
  }

  // ── Live verse: reveal word-by-word as user speaks ──
  if (state === "live") {
    const words = verse.arabic.split(/\s+/).filter(Boolean);
    const revealed = spokenCount ?? 0;
    return (
      <>
        <span
          ref={verseRef as any}
          className={`rounded px-0.5 ${isDark ? "bg-emerald-950/50" : "bg-emerald-50"}`}
        >
          {words.map((w, i) => {
            if (i >= revealed) {
              // Not yet spoken — blurred until user says it
              return (
                <span key={i} style={{ filter: "blur(5px)", userSelect: "none", opacity: 0.6 }}>
                  {w}{" "}
                </span>
              );
            }
            const m = liveMatches?.[i];
            if (!m || m.correct) {
              return (
                <span key={i} className={isDark ? "text-emerald-300" : "text-emerald-700"}>
                  {w}{" "}
                </span>
              );
            }
            return (
              <span key={i} className={isDark ? "text-red-400" : "text-red-500"} style={{ textDecoration: "underline wavy" }}>
                {w}{" "}
              </span>
            );
          })}
        </span>
        {num}{" "}
      </>
    );
  }

  // ── Skipped verse (no speech recorded) ──
  if (state === "skipped") {
    return (
      <>
        <span ref={verseRef as any} className={isDark ? "text-gray-600" : "text-gray-400"}>
          {verse.arabic}
        </span>
        {num}{" "}
      </>
    );
  }

  // ── Current-idle (waiting to start) or future (blurred) ──
  const isCurrent = state === "current-idle";
  return (
    <>
      <span
        ref={verseRef as any}
        className={isCurrent ? `rounded px-0.5 ${isDark ? "bg-emerald-950/40" : "bg-emerald-50"}` : undefined}
        style={{ filter: "blur(5px)", userSelect: "none", opacity: isCurrent ? 1 : 0.35 }}
      >
        {verse.arabic}
      </span>
      {num}{" "}
    </>
  );
});

// ─── Router wrapper ───────────────────────────────────────────────────────────

export function SurahReviewMode() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDark, t } = useApp();
  const idx = quranData.findIndex(s => s.number === Number(id));
  const surah = quranData[idx];
  const nextSurah = quranData[idx + 1] ?? null;
  if (!surah) {
    return <div className="flex items-center justify-center h-full text-gray-500">{t.review.notFound}</div>;
  }
  return (
    <SurahReview
      surah={surah}
      nextSurah={nextSurah}
      onExit={() => navigate("/")}
      onNextSurah={nextSurah ? () => navigate(`/review/${nextSurah.number}`) : undefined}
      isDark={isDark}
      t={t}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Phase = "idle" | "running" | "complete";

function SurahReview({
  surah,
  nextSurah,
  onExit,
  onNextSurah,
  isDark,
  t,
}: {
  surah: Surah;
  nextSurah: Surah | null;
  onExit: () => void;
  onNextSurah?: () => void;
  isDark: boolean;
  t: T;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [verseIndex, setVerseIndex] = useState(0);
  const [live, setLive] = useState<{ text: string; matches: WordMatch[] }>({ text: "", matches: [] });
  const [verseResults, setVerseResults] = useState<Map<number, WordMatch[]>>(new Map());
  const [sessionScores, setSessionScores] = useState<VerseResult[]>([]);
  const [arabicMode, setArabicMode] = useState(true);
  const [speechOk, setSpeechOk] = useState(true);
  const [pulseScale, setPulseScale] = useState(1);
  const [micHint, setMicHint] = useState("");
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState("");
  const recRef = useRef<any>(null);
  const verseIdxRef = useRef(0);
  const phaseRef = useRef<Phase>("idle");
  const accRef = useRef("");
  const interimRef = useRef("");
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceRef = useRef<() => void>(() => {});
  const animRef = useRef(0);
  const restartRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentRef = useRef<HTMLSpanElement>(null);
  const noSpeechRef = useRef(0);
  const startRecRef = useRef<() => void>(() => {});
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveAnimRef = useRef(0);
  const totalVerses = surah.verses.length;

  // Reveal verse words based on actual match results — not word count.
  // Only reveal a word once it AND all previous words are correctly matched.
  const spokenCount = useMemo(() => {
    if (!live.matches || live.matches.length === 0) return 0;
    let count = 0;
    for (const m of live.matches) {
      if (m.correct) count++;
      else break;
    }
    return count;
  }, [live.matches]);

  // Scroll current verse into view on advance
  useEffect(() => {
    currentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [verseIndex]);

  // Enumerate available microphones
  useEffect(() => {
    const enumerate = () =>
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const mics = devices.filter(d => d.kind === "audioinput");
        setMicDevices(mics);
        if (mics.length > 0 && !selectedMicId) setSelectedMicId(mics[0].deviceId);
      }).catch(() => {});
    enumerate();
    navigator.mediaDevices.addEventListener("devicechange", enumerate);
    return () => navigator.mediaDevices.removeEventListener("devicechange", enumerate);
  }, []);

  // Mic pulse animation
  useEffect(() => {
    if (phase === "running") {
      let f = 0;
      const tick = () => {
        f++;
        setPulseScale(1 + Math.sin(f * 0.06) * 0.12);
        animRef.current = requestAnimationFrame(tick);
      };
      animRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(animRef.current);
      setPulseScale(1);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [phase]);

  // ─── Advance to next verse ────────────────────────────────────────────────
  const doAdvance = () => {
    const verse = surah.verses[verseIdxRef.current];
    const text = (accRef.current || interimRef.current).trim();

    console.log("════════ ADVANCE ════════");
    console.log(`Verse #${verse?.number ?? "?"} | transcript: "${text || "(empty)"}"`);

    if (text && verse) {
      const score = calcScore(text, verse.arabic);
      const matches = matchWords(text, verse.arabic);

      console.log("Word results:");
      matches.forEach(m => console.log(`  "${m.word}" → ${m.correct ? "✓ correct" : "✗ wrong"}`));
      console.log(`Final score: ${Math.round(score * 100)}%`);

      setVerseResults(prev => new Map(prev).set(verse.number, matches));
      setSessionScores(prev => {
        const entry: VerseResult = { verseNumber: verse.number, score, transcript: text };
        const i = prev.findIndex(r => r.verseNumber === verse.number);
        return i >= 0 ? prev.map((r, j) => (j === i ? entry : r)) : [...prev, entry];
      });
    } else {
      console.log("No transcript — verse skipped");
    }

    setLive({ text: "", matches: [] });
    accRef.current = "";
    interimRef.current = "";
    if (silenceRef.current) clearTimeout(silenceRef.current);

    // Abort the current session immediately — prevents stale results from the
    // old verse bleeding into the new verse's word reveal.
    if (recRef.current) {
      try { recRef.current.onend = null; recRef.current.abort(); } catch {}
      recRef.current = null;
    }

    const next = verseIdxRef.current + 1;
    if (next >= totalVerses) {
      console.log("[COMPLETE]");
      phaseRef.current = "complete";
      setPhase("complete");
    } else {
      verseIdxRef.current = next;
      setVerseIndex(next);
      // Start fresh recognition for the new verse
      setTimeout(() => {
        if (phaseRef.current === "running") startRecRef.current();
      }, 150);
    }
  };
  advanceRef.current = doAdvance;

  // ─── Speech recognition ───────────────────────────────────────────────────
  const startRec = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSpeechOk(false); return; }

    if (recRef.current) {
      try { recRef.current.onend = null; recRef.current.abort(); } catch {}
    }

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = arabicMode ? "ar-SA" : "en-US";
    rec.maxAlternatives = 3;

    console.log("════════ REC START ════════");
    console.log("lang:", rec.lang);

    rec.onstart     = () => console.log("🟢 [START]");
    rec.onaudiostart = () => console.log("🎤 [AUDIO_START]");
    rec.onsoundstart = () => console.log("🔊 [SOUND_START]");
    rec.onspeechstart = () => console.log("🗣️ [SPEECH_START]");
    rec.onspeechend  = () => console.log("🛑 [SPEECH_END]");
    rec.onaudioend   = () => console.log("🎤 [AUDIO_END]");

    rec.onresult = (e: any) => {
      if (phaseRef.current !== "running") return;
      const verse = surah.verses[verseIdxRef.current];
      if (!verse) return;

      noSpeechRef.current = 0;
      setMicHint("");

      console.log("════════ STEP 1: Voice captured ════════");
      console.log(`resultIndex: ${e.resultIndex} | total results: ${e.results.length}`);

      let fin = "", inter = "", hasFinal = false;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r[0].transcript;
        const conf = r[0].confidence;
        if (r.isFinal) {
          fin += text;
          hasFinal = true;
          console.log(`  [${i}] FINAL   | ${(conf * 100).toFixed(0)}% | "${text}"`);
        } else {
          inter += text;
          console.log(`  [${i}] INTERIM | ${(conf * 100).toFixed(0)}% | "${text}"`);
        }
      }

      console.log("════════ STEP 2: Text extracted ════════");
      if (fin) { accRef.current = (accRef.current + " " + fin).trim(); interimRef.current = ""; }
      if (inter) interimRef.current = inter;
      const display = (accRef.current + (inter ? " " + inter : "")).trim();
      console.log("  accumulated:", accRef.current || "(none)");
      console.log("  display    :", display || "(none)");

      if (!display) return;

      console.log("════════ STEP 3: Normalize ════════");
      console.log("  spoken  raw :", display);
      console.log("  spoken  norm:", normalizeArabic(display));
      console.log("  verse   raw :", verse.arabic);
      console.log("  verse   norm:", normalizeArabic(verse.arabic));

      console.log("════════ STEP 4: Word match ════════");
      const matches = matchWords(display, verse.arabic);
      matches.forEach(m => console.log(`  "${m.word}" → ${m.correct ? "✓ correct" : "✗ wrong"}`));

      const score = calcScore(display, verse.arabic);
      const pct = Math.round(score * 100);
      console.log("════════ STEP 5: Score ════════");
      console.log(`  ${pct}% → ${pct >= 85 ? "EXCELLENT" : pct >= 65 ? "GOOD" : pct >= 40 ? "PARTIAL" : "NEEDS PRACTICE"}`);

      setLive({ text: display, matches });

      // ─ STEP 6: Advance only when ALL verse words matched in order ─
      if (silenceRef.current) clearTimeout(silenceRef.current);

      const verseWordCount = verse.arabic.split(/\s+/).filter(Boolean).length;
      // Count the consecutive correct prefix (same logic as spokenCount useMemo)
      let consecutiveCorrect = 0;
      for (const m of matches) {
        if (m.correct) consecutiveCorrect++;
        else break;
      }
      const allWordsMatched = consecutiveCorrect >= verseWordCount;

      console.log(`════════ STEP 6: ${consecutiveCorrect}/${verseWordCount} words matched in order ════════`);

      if (allWordsMatched) {
        console.log("All words matched — advancing to next verse");
        silenceRef.current = setTimeout(() => advanceRef.current(), 300);
      }
      // else: wait — user hasn't finished the verse yet
    };

    rec.onerror = (e: any) => {
      console.log("❌ [ERROR]", e.error);
      switch (e.error) {
        case "no-speech":
          noSpeechRef.current++;
          console.warn(`No speech #${noSpeechRef.current}`);
          if (noSpeechRef.current >= 2) {
            setMicHint("Speak louder, or check your internet connection. Tap EN to test in English.");
            console.warn("Possible causes: mic too quiet? No internet? Arabic model missing in Chrome?");
          }
          break;
        case "audio-capture":
        case "not-allowed":
          setSpeechOk(false);
          break;
        case "aborted":
          console.warn("[ABORTED]");
          break;
        default:
          console.error("Speech error:", e.error);
      }
    };

    rec.onend = () => {
      console.log("🔴 [END] phase:", phaseRef.current);
      if (phaseRef.current !== "running") return;
      restartRef.current = setTimeout(() => {
        if (phaseRef.current === "running") {
          console.log("[RESTART]");
          startRecRef.current();
        }
      }, 300);
    };

    recRef.current = rec;
    startRecRef.current = startRec;

    try { rec.start(); } catch (err) { console.error("start() failed", err); }
  };

  // ─── Audio visualization ──────────────────────────────────────────────────
  const stopVisualization = () => {
    cancelAnimationFrame(waveAnimRef.current);
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const startVisualization = async () => {
    stopVisualization();
    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedMicId ? { deviceId: { ideal: selectedMicId } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      navigator.mediaDevices.enumerateDevices().then(devices => {
        const mics = devices.filter(d => d.kind === "audioinput");
        setMicDevices(mics);
      });

      micStreamRef.current = stream;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;
      audioCtx.createMediaStreamSource(stream).connect(analyser);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx2d = canvas.getContext("2d")!;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Waveform layout constants
      const BAR_W = 3;
      const BAR_GAP = 2;
      const BAR_STEP = BAR_W + BAR_GAP;
      // Playhead sits at ~82% across — bars fill the left portion, dotted tail to the right
      const PLAYHEAD_RATIO = 0.82;
      const W = canvas.width;
      const H = canvas.height;
      const PLAYHEAD_X = Math.floor(W * PLAYHEAD_RATIO);
      const BAR_COUNT = Math.floor(PLAYHEAD_X / BAR_STEP);

      // Rolling amplitude history (one value per rendered bar)
      const ampHistory: number[] = new Array(BAR_COUNT).fill(0);

      const barColor   = isDark ? "#d1d5db" : "#111827";  // gray-300 / gray-900
      const dotColor   = isDark ? "#6b7280" : "#9ca3af";  // gray-500 / gray-400

      const render = () => {
        waveAnimRef.current = requestAnimationFrame(render);
        analyser.getByteFrequencyData(dataArray);

        // RMS of lower 40% of spectrum (speech-relevant)
        const len = Math.floor(dataArray.length * 0.4);
        let sum = 0;
        for (let i = 0; i < len; i++) sum += (dataArray[i] / 255) ** 2;
        const rms = Math.sqrt(sum / len);

        ampHistory.shift();
        ampHistory.push(rms);

        ctx2d.clearRect(0, 0, W, H);
        const centerY = H / 2;

        // ── Draw bars (left side, up to playhead) ──
        ctx2d.fillStyle = barColor;
        for (let i = 0; i < BAR_COUNT; i++) {
          const v = ampHistory[i];
          const halfH = Math.max(1.5, v * centerY * 0.92);
          const x = i * BAR_STEP;
          ctx2d.beginPath();
          ctx2d.roundRect(x, centerY - halfH, BAR_W, halfH * 2, 1);
          ctx2d.fill();
        }

        // ── Red playhead line ──
        ctx2d.strokeStyle = "#ef4444";
        ctx2d.lineWidth = 2;
        ctx2d.beginPath();
        ctx2d.moveTo(PLAYHEAD_X, H * 0.08);
        ctx2d.lineTo(PLAYHEAD_X, H * 0.92);
        ctx2d.stroke();

        // ── Dotted centre line (right of playhead) ──
        ctx2d.strokeStyle = dotColor;
        ctx2d.lineWidth = 1.5;
        ctx2d.setLineDash([4, 5]);
        ctx2d.beginPath();
        ctx2d.moveTo(PLAYHEAD_X + 5, centerY);
        ctx2d.lineTo(W - 6, centerY);
        ctx2d.stroke();
        ctx2d.setLineDash([]);
      };
      render();
    } catch (err) {
      console.warn("[VIZ] getUserMedia failed:", err);
    }
  };

  // ─── Actions ──────────────────────────────────────────────────────────────
  const startReview = () => {
    phaseRef.current = "running";
    noSpeechRef.current = 0;
    setPhase("running");
    verseIdxRef.current = 0;
    setVerseIndex(0);
    setVerseResults(new Map());
    setSessionScores([]);
    setLive({ text: "", matches: [] });
    accRef.current = "";
    interimRef.current = "";
    if (silenceRef.current) clearTimeout(silenceRef.current);
    startVisualization();
    setTimeout(startRec, 200);
  };

  const stopReview = () => {
    phaseRef.current = "idle";
    setPhase("idle");
    if (silenceRef.current) clearTimeout(silenceRef.current);
    if (recRef.current) {
      try { recRef.current.onend = null; recRef.current.abort(); } catch {}
    }
    setLive({ text: "", matches: [] });
    setMicHint("");
    stopVisualization();
  };

  const skipVerse = () => {
    if (phaseRef.current !== "running") return;
    if (silenceRef.current) clearTimeout(silenceRef.current);
    advanceRef.current();
  };

  const repeatVerse = () => {
    if (phaseRef.current !== "running") return;
    accRef.current = "";
    interimRef.current = "";
    setLive({ text: "", matches: [] });
    if (silenceRef.current) clearTimeout(silenceRef.current);
    if (recRef.current) {
      try { recRef.current.onend = null; recRef.current.abort(); } catch {}
    }
    setTimeout(() => { if (phaseRef.current === "running") startRecRef.current(); }, 200);
  };

  const reset = () => {
    phaseRef.current = "idle";
    verseIdxRef.current = 0;
    accRef.current = "";
    setPhase("idle");
    setVerseIndex(0);
    setVerseResults(new Map());
    setSessionScores([]);
    setLive({ text: "", matches: [] });
  };

  const toggleMode = () => { stopReview(); setArabicMode(a => !a); };

  useEffect(() => () => {
    if (silenceRef.current) clearTimeout(silenceRef.current);
    if (restartRef.current) clearTimeout(restartRef.current);
    if (recRef.current) {
      try { recRef.current.onend = null; recRef.current.abort(); } catch {}
    }
    stopVisualization();
  }, []);

  // ─── Theme ────────────────────────────────────────────────────────────────
  const bg        = isDark ? "bg-gray-900"                  : "bg-amber-50";
  const headerBg  = isDark ? "bg-gray-800 border-gray-700"  : "bg-white border-gray-200";
  const textMain  = isDark ? "text-white"                   : "text-gray-900";
  const textMuted = isDark ? "text-gray-400"                : "text-gray-500";
  const cardBg    = isDark ? "bg-gray-800 border-gray-700"  : "bg-white border-gray-200";
  const toolbarBg = isDark ? "bg-gray-800 border-gray-700"  : "bg-white border-gray-200";

  // ─── Stable verse nodes (no live.matches dependency) ─────────────────────
  const stableNodes = useMemo(() =>
    surah.verses.map((verse, vIdx) => {
      if (vIdx === verseIndex && phase === "running") return null;

      const finalMatches = verseResults.get(verse.number);
      let state: VerseState;
      if (finalMatches)             state = "done";
      else if (vIdx === verseIndex) state = "current-idle";
      else if (vIdx < verseIndex)   state = "skipped";
      else                          state = "future";

      return (
        <span key={verse.number}>
          <VerseBlock
            verse={verse}
            state={state}
            finalMatches={finalMatches}
            isDark={isDark}
            verseRef={vIdx === verseIndex ? currentRef : undefined}
          />
        </span>
      );
    }),
  [surah.verses, verseIndex, phase, verseResults, isDark]);

  // ─── Complete screen ──────────────────────────────────────────────────────
  if (phase === "complete") {
    const avg = sessionScores.length > 0
      ? sessionScores.reduce((s, r) => s + r.score, 0) / sessionScores.length
      : 0;
    const excellent = sessionScores.filter(r => r.score >= 0.85).length;

    return (
      <div className={`flex flex-col h-full ${bg}`}>
        <div className={`flex items-center gap-3 px-4 py-3 ${headerBg} border-b flex-shrink-0`}>
          <button onClick={onExit} className={`flex items-center justify-center w-9 h-9 rounded-full ${textMain}`}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className={`font-semibold ${textMain}`}>{t.review.completeTitle}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="text-center pt-4 pb-2">
            <div className="text-6xl mb-3">{avg >= 0.75 ? "🏆" : avg >= 0.5 ? "⭐" : "📖"}</div>
            <h2 className={`text-xl font-bold ${textMain}`}>{surah.name}</h2>
            <p className={`text-sm mt-0.5 ${textMuted}`}>{surah.englishName}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t.review.avgScore, value: `${Math.round(avg * 100)}%`, color: "text-emerald-500" },
              { label: t.review.excellentLabel, value: `${excellent}/${totalVerses}`, color: "text-sky-500" },
            ].map(stat => (
              <div key={stat.label} className={`${cardBg} border rounded-2xl p-4 text-center`}>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className={`text-xs mt-1 ${textMuted}`}>{stat.label}</div>
              </div>
            ))}
          </div>

          <p className={`text-xs font-medium uppercase tracking-wider ${textMuted}`}>{t.review.verseSummary}</p>
          <div className="space-y-2">
            {surah.verses.map(verse => {
              const result = sessionScores.find(r => r.verseNumber === verse.number);
              const pct = result ? Math.round(result.score * 100) : null;
              const scoreColor = pct === null ? textMuted
                : pct >= 85 ? "text-emerald-500"
                : pct >= 65 ? "text-sky-500"
                : pct >= 40 ? "text-amber-500"
                : "text-red-500";
              return (
                <div key={verse.number} className={`${cardBg} border rounded-xl px-4 py-3 flex items-center gap-3`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}>
                    {verse.number}
                  </div>
                  <p className={`flex-1 text-sm truncate ${textMain}`} dir="ltr">
                    {verse.english.slice(0, 60)}…
                  </p>
                  <span className={`text-xs font-semibold flex-shrink-0 ${scoreColor}`}>
                    {pct !== null ? `${pct}%` : t.review.skipped}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 pb-4">
            {nextSurah && onNextSurah && (
              <button
                onClick={onNextSurah}
                className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronRight className="w-4 h-4" />
                {nextSurah.name} — {nextSurah.englishName}
              </button>
            )}
            <button
              onClick={() => { phaseRef.current = "idle"; verseIdxRef.current = 0; accRef.current = ""; setPhase("idle"); setVerseIndex(0); setSessionScores([]); setVerseResults(new Map()); setLive({ text: "", matches: [] }); }}
              className={`w-full py-3 rounded-2xl border ${cardBg} ${textMain} font-semibold flex items-center justify-center gap-2`}
            >
              <RotateCcw className="w-4 h-4" />
              {t.review.reviewAgain}
            </button>
            <button onClick={onExit} className={`w-full py-3 rounded-2xl ${textMuted} font-medium`}>
              {t.review.backToList}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Idle start screen ────────────────────────────────────────────────────
  if (phase === "idle" && sessionScores.length === 0 && verseIndex === 0) {
    return (
      <div className={`flex flex-col h-full ${bg}`}>
        <div className={`flex items-center gap-3 px-4 py-3 ${headerBg} border-b flex-shrink-0`}>
          <button onClick={onExit} className={`flex items-center justify-center w-9 h-9 rounded-full ${textMain}`}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className={`text-sm font-semibold ${textMain}`}>{surah.name}</div>
            <div className={`text-xs ${textMuted}`}>{surah.englishName}</div>
          </div>
          <div className="flex-1" />
          <button
            onClick={toggleMode}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
              arabicMode
                ? isDark ? "bg-emerald-900/40 text-emerald-400" : "bg-emerald-100 text-emerald-700"
                : isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{arabicMode ? "عربي" : "EN"}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 gap-6 py-8">
          {/* Surah badge */}
          <div className={`w-full max-w-xs ${cardBg} border rounded-3xl p-6 text-center`}>
            <div className={`text-3xl font-bold mb-1 ${textMain}`} style={{ fontFamily: "Amiri, serif" }}>
              {surah.arabicName}
            </div>
            <div className={`text-base font-semibold ${textMain}`}>{surah.name}</div>
            <div className={`text-sm ${textMuted}`}>{surah.englishName}</div>
            <div className={`mt-3 flex items-center justify-center gap-3 text-xs ${textMuted}`}>
              <span>{totalVerses} {t.surahList.verses}</span>
              <span>·</span>
              <span>{surah.revelation === "Meccan" ? t.surahList.meccan : t.surahList.medinan}</span>
            </div>
          </div>

          {/* Mic selector */}
          {micDevices.length > 0 && (
            <div className="w-full max-w-xs">
              <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>Microphone</label>
              <select
                value={selectedMicId}
                onChange={e => setSelectedMicId(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl text-sm border appearance-none cursor-pointer ${cardBg} ${textMain}`}
              >
                {micDevices.map(mic => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}…`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Start button */}
          <div className="flex flex-col items-center gap-4">
            {speechOk ? (
              <button
                onClick={startReview}
                className="w-24 h-24 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-xl shadow-emerald-500/30 flex items-center justify-center transition-transform active:scale-95"
              >
                <Mic className="w-10 h-10" />
              </button>
            ) : (
              <div className={`text-sm text-center px-4 ${textMuted}`}>
                Speech recognition not supported in this browser.
              </div>
            )}
            <p className={`text-sm font-medium ${textMuted}`}>{t.review.tapToStart}</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Running / paused screen ──────────────────────────────────────────────
  const progressPct = ((verseIndex + 1) / totalVerses) * 100;

  return (
    <div className={`flex flex-col h-full ${bg} relative`}>
      {/* Header */}
      <div className={`flex-shrink-0 ${headerBg} border-b`}>
        <div className="flex items-center gap-2 px-4 py-3">
          <button onClick={onExit} className={`flex items-center justify-center w-9 h-9 rounded-full ${textMain}`}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-semibold ${textMain}`}>{surah.name}</div>
            <div className={`text-xs ${textMuted}`}>
              {phase === "running"
                ? t.review.verseOf(verseIndex + 1, totalVerses)
                : t.review.tapToStart}
            </div>
          </div>
          <button
            onClick={toggleMode}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
              arabicMode
                ? isDark ? "bg-emerald-900/40 text-emerald-400" : "bg-emerald-100 text-emerald-700"
                : isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{arabicMode ? "عربي" : "EN"}</span>
          </button>
        </div>

        {/* Progress bar with verse count */}
        <div className="px-4 pb-2">
          <div className="flex justify-between mb-1">
            <span className={`text-[10px] tabular-nums ${textMuted}`}>{verseIndex + 1} / {totalVerses}</span>
            <span className={`text-[10px] tabular-nums ${textMuted}`}>{Math.round(progressPct)}%</span>
          </div>
          <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? "bg-gray-700/60" : "bg-gray-100"}`}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: isDark
                  ? "linear-gradient(90deg, #059669 0%, #34d399 100%)"
                  : "linear-gradient(90deg, #059669 0%, #10b981 100%)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Mushaf body */}
      <div className="flex-1 overflow-y-auto pb-28">
        {/* Surah title plate */}
        <div className={`mx-4 mt-5 mb-3 border-2 rounded-lg relative text-center py-3 ${isDark ? "border-gray-600" : "border-gray-700"}`}>
          <div className={`absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 ${isDark ? "border-gray-500" : "border-gray-700"}`} />
          <div className={`absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 ${isDark ? "border-gray-500" : "border-gray-700"}`} />
          <span
            className={isDark ? "text-gray-100" : "text-gray-800"}
            style={{ fontFamily: "Amiri, serif", fontSize: "1.4rem" }}
          >
            سُورَةُ {surah.arabicName}
          </span>
        </div>

        {/* Bismillah (except Surah 9) */}
        {surah.number !== 9 && (
          <div
            className={`text-center mb-4 px-4 ${isDark ? "text-emerald-300" : "text-gray-700"}`}
            dir="rtl"
            style={{ fontFamily: "Amiri, serif", fontSize: "1.5rem" }}
          >
            بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
          </div>
        )}

        {/* Flowing Arabic text */}
        <div
          className={`px-5 pb-4 text-right leading-loose ${isDark ? "text-gray-100" : "text-gray-800"}`}
          dir="rtl"
          style={{ fontFamily: "Amiri, serif", fontSize: "1.65rem", lineHeight: "3" }}
        >
          {stableNodes.map((node, vIdx) =>
            node === null ? (
              <span key={surah.verses[vIdx].number}>
                <VerseBlock
                  verse={surah.verses[vIdx]}
                  state="live"
                  liveMatches={live.matches}
                  spokenCount={spokenCount}
                  isDark={isDark}
                  verseRef={currentRef}
                />
              </span>
            ) : node,
          )}
        </div>

        {/* Waveform + transcript */}
        {phase === "running" && (
          <div className={`mx-4 mb-3 rounded-2xl border overflow-hidden ${isDark ? "bg-gray-800/80 border-gray-700" : "bg-white border-gray-200"}`}>
            <canvas
              ref={canvasRef}
              width={600}
              height={64}
              className="w-full"
              style={{ display: "block", height: "64px" }}
            />
            <div className="px-4 pb-3 pt-1">
              {micHint ? (
                <p className={`text-xs ${isDark ? "text-amber-400" : "text-amber-600"}`}>{micHint}</p>
              ) : (
                <p className={`text-xs truncate ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {live.text || t.review.listeningText("")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mic FAB */}
      {speechOk && (
        <button
          onClick={phase === "running" ? stopReview : startReview}
          style={{ transform: `scale(${pulseScale})` }}
          className={`fixed bottom-20 end-4 w-16 h-16 rounded-full text-white shadow-xl flex items-center justify-center z-50 transition-colors ${
            phase === "running"
              ? "bg-red-500 shadow-red-500/30"
              : "bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-400"
          }`}
        >
          {phase === "running" ? <Square className="w-7 h-7 fill-current" /> : <Mic className="w-7 h-7" />}
        </button>
      )}

      {/* Bottom toolbar */}
      <div className={`fixed bottom-0 inset-x-0 flex items-center justify-around px-2 py-3 border-t z-50 ${toolbarBg}`}>
        <button
          onClick={toggleMode}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs ${
            arabicMode
              ? isDark ? "text-emerald-400" : "text-emerald-600"
              : isDark ? "text-gray-400" : "text-gray-500"
          }`}
        >
          <Languages className="w-5 h-5" />
          <span>{arabicMode ? "عربي" : "EN"}</span>
        </button>

        {phase === "running" && (
          <button
            onClick={repeatVerse}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800"}`}
          >
            <RefreshCw className="w-5 h-5" />
            <span>{t.review.repeat}</span>
          </button>
        )}

        {phase === "running" && (
          <button
            onClick={skipVerse}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-800"}`}
          >
            <SkipForward className="w-5 h-5" />
            <span>{t.review.next}</span>
          </button>
        )}

        {phase === "running" ? (
          <button
            onClick={stopReview}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs text-red-500"
          >
            <Square className="w-5 h-5 fill-current" />
            <span>{t.review.stop}</span>
          </button>
        ) : (
          <button
            onClick={reset}
            disabled={verseIndex === 0 && sessionScores.length === 0}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs disabled:opacity-30 ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            <RotateCcw className="w-5 h-5" />
            <span>{t.review.reset}</span>
          </button>
        )}

        {sessionScores.length > 0 && phase !== "running" && (
          <button
            onClick={() => { phaseRef.current = "complete"; setPhase("complete"); }}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            <Trophy className="w-5 h-5" />
            <span>{t.review.finish}</span>
          </button>
        )}
      </div>
    </div>
  );
}
