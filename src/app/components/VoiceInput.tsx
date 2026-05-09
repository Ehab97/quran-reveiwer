import { useEffect, useRef, useState } from "react";
import { Mic, Square, MicOff } from "lucide-react";
import { useApp } from "../../context/AppContext";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onSearch: (text: string) => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function VoiceInput({ onTranscript, onSearch }: VoiceInputProps) {
  const { isDark } = useApp();
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimText, setInterimText] = useState("");

  const recognitionRef = useRef<any>(null);

  const finalTranscriptRef = useRef("");

  // =========================================================
  // INIT
  // =========================================================

  useEffect(() => {
    console.log("================================================");
    console.log("[STEP 1] COMPONENT MOUNTED");
    console.log("================================================");

    console.log("[STEP 2] Checking SpeechRecognition support");

    console.log("[DEBUG] window.SpeechRecognition =", window.SpeechRecognition);

    console.log("[DEBUG] window.webkitSpeechRecognition =", window.webkitSpeechRecognition);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("[ERROR] SpeechRecognition NOT supported");

      setIsSupported(false);

      return;
    }

    console.log("[SUCCESS] SpeechRecognition supported");

    // =========================================================
    // CREATE INSTANCE
    // =========================================================

    console.log("[STEP 3] Creating recognition instance");

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";

    recognition.continuous = true;

    recognition.interimResults = true;

    recognition.maxAlternatives = 1;

    console.log("[DEBUG] recognition.lang =", recognition.lang);

    console.log("[DEBUG] recognition.continuous =", recognition.continuous);

    console.log("[DEBUG] recognition.interimResults =", recognition.interimResults);

    // =========================================================
    // EVENTS
    // =========================================================

    recognition.onstart = () => {
      console.log("================================================");
      console.log("[EVENT] onstart");
      console.log("[SUCCESS] Recognition started");
      console.log("================================================");
    };

    recognition.onaudiostart = () => {
      console.log("[EVENT] onaudiostart");
      console.log("[INFO] Audio capture started");
    };

    recognition.onsoundstart = () => {
      console.log("[EVENT] onsoundstart");
      console.log("[INFO] Sound detected");
    };

    recognition.onspeechstart = () => {
      console.log("[EVENT] onspeechstart");
      console.log("[INFO] User started speaking");
    };

    recognition.onresult = (event: any) => {
      console.log("================================================");
      console.log("[EVENT] onresult");
      console.log("================================================");

      let interim = "";

      let final = "";

      console.log("[DEBUG] event.results =", event.results);

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];

        const transcript = result[0].transcript;

        const confidence = result[0].confidence;

        console.log("--------------------------------");
        console.log("[RESULT INDEX]", i);
        console.log("[TRANSCRIPT]", transcript);
        console.log("[CONFIDENCE]", confidence);
        console.log("[IS FINAL]", result.isFinal);
        console.log("--------------------------------");

        if (result.isFinal) {
          final += transcript + " ";

          console.log("[FINAL RESULT]", transcript);
        } else {
          interim += transcript;

          console.log("[INTERIM RESULT]", transcript);
        }
      }

      setInterimText(interim);

      if (final) {
        finalTranscriptRef.current += final;

        console.log("[SUCCESS] Updated Final Transcript:", finalTranscriptRef.current);

        console.log("[STEP] Calling onTranscript");

        onTranscript(finalTranscriptRef.current);
      }
    };

    recognition.onnomatch = () => {
      console.warn("[EVENT] onnomatch");
      console.warn("[WARNING] No speech match found");
    };

    recognition.onspeechend = () => {
      console.log("[EVENT] onspeechend");
      console.log("[INFO] User stopped speaking");
    };

    recognition.onsoundend = () => {
      console.log("[EVENT] onsoundend");
      console.log("[INFO] Sound ended");
    };

    recognition.onaudioend = () => {
      console.log("[EVENT] onaudioend");
      console.log("[INFO] Audio capture ended");
    };

    recognition.onerror = (event: any) => {
      console.log("================================================");
      console.log("[EVENT] onerror");
      console.log("================================================");

      console.error("[ERROR TYPE]", event.error);

      console.error("[FULL ERROR EVENT]", event);

      switch (event.error) {
        case "not-allowed":
          console.error("[CAUSE] Microphone permission denied");
          break;

        case "network":
          console.error("[CAUSE] Network issue");
          break;

        case "no-speech":
          console.error("[CAUSE] No speech detected");
          break;

        case "audio-capture":
          console.error("[CAUSE] No microphone found");
          break;

        case "aborted":
          console.error("[CAUSE] Recognition aborted");
          break;

        default:
          console.error("[CAUSE] Unknown error");
      }

      setIsListening(false);
    };

    recognition.onend = () => {
      console.log("================================================");
      console.log("[EVENT] onend");
      console.log("[INFO] Recognition ended");
      console.log("================================================");

      // AUTO RESTART
      if (isListening) {
        console.log("[STEP] Restarting recognition");

        setTimeout(() => {
          try {
            recognition.start();

            console.log("[SUCCESS] Recognition restarted");
          } catch (err) {
            console.error("[ERROR] Failed to restart", err);
          }
        }, 300);
      }
    };

    recognitionRef.current = recognition;

    console.log("[SUCCESS] Recognition instance saved");

    // =========================================================
    // CLEANUP
    // =========================================================

    return () => {
      console.log("================================================");
      console.log("[CLEANUP] Component unmount");
      console.log("================================================");

      try {
        recognition.stop();

        console.log("[SUCCESS] Recognition stopped");
      } catch (err) {
        console.error("[ERROR] Cleanup stop failed", err);
      }
    };
  }, [isListening, onTranscript]);

  // =========================================================
  // START LISTENING
  // =========================================================

  const startListening = async () => {
    console.log("================================================");
    console.log("[ACTION] START BUTTON CLICKED");
    console.log("================================================");

    try {
      console.log("[STEP 1] Checking recognitionRef");

      if (!recognitionRef.current) {
        console.error("[ERROR] recognitionRef.current is NULL");

        return;
      }

      console.log("[SUCCESS] recognitionRef exists");

      console.log("[STEP 2] Requesting microphone permission");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      console.log("[SUCCESS] getUserMedia success", stream);

      console.log("[STEP 3] Reset transcript");

      finalTranscriptRef.current = "";

      setInterimText("");

      console.log("[STEP 4] Setting listening state");

      setIsListening(true);

      console.log("[SUCCESS] isListening = TRUE");

      console.log("[STEP 5] Calling recognition.start()");

      recognitionRef.current.start();

      console.log("[SUCCESS] recognition.start() called");
    } catch (err) {
      console.log("================================================");
      console.log("[FATAL ERROR] Failed to start");
      console.log("================================================");

      console.error(err);

      setIsListening(false);
    }
  };

  // =========================================================
  // STOP LISTENING
  // =========================================================

  const stopListening = () => {
    console.log("================================================");
    console.log("[ACTION] STOP BUTTON CLICKED");
    console.log("================================================");

    try {
      if (!recognitionRef.current) {
        console.error("[ERROR] recognitionRef.current is NULL");

        return;
      }

      console.log("[STEP 1] Stopping recognition");

      recognitionRef.current.stop();

      console.log("[SUCCESS] recognition.stop() called");

      setIsListening(false);

      console.log("[SUCCESS] isListening = FALSE");

      const finalText = finalTranscriptRef.current.trim();

      console.log("[STEP 2] Final transcript =", finalText);

      if (finalText) {
        console.log("[STEP 3] Calling onSearch");

        onSearch(finalText);

        console.log("[SUCCESS] onSearch completed");
      } else {
        console.warn("[WARNING] No transcript available");
      }

      setInterimText("");
    } catch (err) {
      console.error("[ERROR] Failed to stop recognition", err);
    }
  };

  // =========================================================
  // UNSUPPORTED
  // =========================================================

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 text-red-500">
        <MicOff className="w-4 h-4" />
        <span>{t.voice.notSupported}</span>
      </div>
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={() => {
          if (isListening) {
            stopListening();
          } else {
            startListening();
          }
        }}
        className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 ${
          isListening ? "bg-red-500 hover:bg-red-400" : "bg-emerald-600 hover:bg-emerald-500"
        }`}
      >
        {isListening ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-8 h-8" />}
      </button>

      <div className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
        {isListening ? t.voice.listening : t.voice.tapToSpeak}
      </div>

      {interimText && (
        <div
          className={`px-4 py-2 rounded-lg max-w-sm text-center text-sm ${
            isDark ? "bg-gray-700 text-white" : "bg-emerald-50 text-emerald-900"
          }`}
        >
          "{interimText}"
        </div>
      )}
    </div>
  );
}
