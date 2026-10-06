// Optional voice features of the browser: reading questions aloud and dictating answers.
// Both are hidden by the UI when the browser does not support them.

import type { LanguageCode } from "./api";

// Swiss German has no voice of its own, so it uses the German one.
const speechLang: Record<LanguageCode, string> = {
  de: "de-CH",
  fr: "fr-CH",
  it: "it-CH",
  gsw: "de-CH",
};

// ---------- text to speech ----------

export const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

export function speak(text: string, language: LanguageCode) {
  if (!canSpeak) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = speechLang[language];
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (canSpeak) window.speechSynthesis.cancel();
}

// ---------- speech to text ----------

// The browser API is not in TypeScript's DOM types, so we describe the small part we use.
type RecognitionResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const RecognitionClass: (new () => Recognition) | undefined =
  typeof window === "undefined"
    ? undefined
    : (window as unknown as { SpeechRecognition?: new () => Recognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition;

export const canListen = RecognitionClass !== undefined;

/**
 * Starts dictation. `onText` gets everything spoken so far, `onEnd` is called when it stops.
 * Returns a function that stops it.
 */
export function startListening(
  language: LanguageCode,
  onText: (spoken: string) => void,
  onEnd: () => void,
): () => void {
  if (!RecognitionClass) {
    onEnd();
    return () => {};
  }
  const recognition = new RecognitionClass();
  recognition.lang = speechLang[language];
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = (event) => {
    const spoken = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ")
      .trim();
    onText(spoken);
  };
  recognition.onend = onEnd;
  recognition.onerror = onEnd;
  recognition.start();
  return () => recognition.stop();
}
