/**
 * Bangla Web Speech helpers — pick a real bn voice and normalize copy
 * so Edge/Chrome do not mangle Bengali with an English voice.
 */

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"] as const;

export function toBengaliDigits(input: string): string {
  return input.replace(/\d/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

/** Strip markdown / symbols and expand tokens Bangla TTS reads badly. */
export function prepareBanglaSpeechText(raw: string): string {
  let text = raw
    .replace(/\r\n/g, "\n")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_#>`~]+/g, " ")
    .replace(/^\s*[-•●▪]\s*/gm, "")
    .replace(/\n+/g, "। ")
    .replace(/\s+/g, " ")
    .trim();

  // Common English tokens that break Bangla voices
  const swaps: Array<[RegExp, string]> = [
    [/%/g, " শতাংশ"],
    [/\bPMO\b/gi, "পি এম ও"],
    [/\bKPI\b/gi, "কে পি আই"],
    [/\bAI\b/g, "এ আই"],
    [/\bLLM\b/g, "এল এল এম"],
    [/\bRAB\b/gi, "র্যাব"],
    [/\bBD\b/g, "বাংলাদেশ"],
    [/\bvs\.?\b/gi, "বনাম"],
    [/&/g, " এবং "],
    [/\bapprox\.?\b/gi, "প্রায়"],
    [/\bkm\b/gi, "কিলোমিটার"],
    [/\bmt\b/gi, "মেট্রিক টন"],
  ];
  for (const [re, to] of swaps) text = text.replace(re, to);

  // "45.2" → "৪৫ দশমিক ২" (clearer than raw decimals for many bn voices)
  text = text.replace(/(\d+)\.(\d+)/g, (_, a: string, b: string) => `${a} দশমিক ${b}`);
  text = toBengaliDigits(text);

  // Ensure sentence pauses for the synthesizer
  text = text
    .replace(/[;:]+/g, "। ")
    .replace(/,+/g, ", ")
    .replace(/।+/g, "। ")
    .replace(/\s+/g, " ")
    .trim();

  if (text && !/[।!?]$/.test(text)) text += "।";
  return text;
}

export function prepareEnglishSpeechText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_#>`~]+/g, " ")
    .replace(/^\s*[-•●▪]\s*/gm, "")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreBanglaVoice(voice: SpeechSynthesisVoice): number {
  const lang = voice.lang.toLowerCase();
  const name = voice.name.toLowerCase();
  let score = 0;

  if (lang === "bn-bd") score += 120;
  else if (lang.startsWith("bn")) score += 90;
  if (name.includes("bangladesh") || name.includes("bangla (bangladesh)")) score += 40;
  if (name.includes("bengali") || name.includes("bangla") || name.includes("বাংলা")) score += 35;
  // Natural / neural voices sound far better for Bangla
  if (name.includes("natural") || name.includes("online") || name.includes("neural")) score += 25;
  if (name.includes("promila") || name.includes("nabanita") || name.includes("bashkar")) score += 20;
  if (voice.localService) score += 5;
  // Prefer Microsoft / Google over unknown fallbacks
  if (name.includes("microsoft") || name.includes("google")) score += 10;

  return score;
}

export function pickSpeechVoice(
  voices: SpeechSynthesisVoice[],
  lang: "bn" | "en",
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;

  if (lang === "bn") {
    const ranked = [...voices]
      .map((v) => ({ v, score: scoreBanglaVoice(v) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    return ranked[0]?.v ?? null;
  }

  const preferred =
    voices.find((v) => v.lang.toLowerCase() === "en-us" && /natural|neural|online/i.test(v.name)) ??
    voices.find((v) => v.lang.toLowerCase().startsWith("en"));
  return preferred ?? null;
}

export async function loadSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];

  const existing = window.speechSynthesis.getVoices();
  if (existing.length) return existing;

  return new Promise((resolve) => {
    const done = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", done);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", done);
    // Some browsers never fire voiceschanged if the list is already cached empty.
    window.setTimeout(done, 600);
  });
}

export function splitSpeechChunks(text: string, maxLen = 180): string[] {
  const sentences = text
    .split(/(?<=[।!?\.])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buf = "";
  for (const sentence of sentences) {
    if ((buf + " " + sentence).trim().length > maxLen && buf) {
      chunks.push(buf.trim());
      buf = sentence;
    } else {
      buf = buf ? `${buf} ${sentence}` : sentence;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.length ? chunks : [text];
}

export type SpeakHandle = {
  stop: () => void;
};

/**
 * Speak Bangla (or English) with best-effort voice selection + chunking.
 * Returns a handle to cancel mid-flight.
 */
export async function speakPreparedText(options: {
  text: string;
  lang: "bn" | "en";
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
  onVoice?: (voiceName: string | null, hasBanglaVoice: boolean) => void;
}): Promise<SpeakHandle> {
  const { text, lang, rate, onStart, onEnd, onError, onVoice } = options;
  let cancelled = false;
  let chromeKeepAlive: number | undefined;

  const stop = () => {
    cancelled = true;
    if (chromeKeepAlive) window.clearInterval(chromeKeepAlive);
    window.speechSynthesis?.cancel();
  };

  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onError?.("unsupported");
    return { stop };
  }

  const prepared =
    lang === "bn" ? prepareBanglaSpeechText(text) : prepareEnglishSpeechText(text);
  if (!prepared) {
    onError?.("empty");
    return { stop };
  }

  const voices = await loadSpeechVoices();
  if (cancelled) return { stop };

  const voice = pickSpeechVoice(voices, lang);
  const hasBanglaVoice =
    lang === "bn" &&
    voices.some((v) => scoreBanglaVoice(v) >= 90 || /bengali|bangla|বাংলা/i.test(v.name));

  onVoice?.(voice?.name ?? null, hasBanglaVoice);

  if (lang === "bn" && !hasBanglaVoice) {
    onError?.("no-bn-voice");
    // Still attempt speak — some systems route bn-BD without listing voices.
  }

  window.speechSynthesis.cancel();
  const chunks = splitSpeechChunks(prepared, lang === "bn" ? 160 : 220);
  let index = 0;

  const speakNext = () => {
    if (cancelled) return;
    if (index >= chunks.length) {
      if (chromeKeepAlive) window.clearInterval(chromeKeepAlive);
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    utterance.lang = lang === "bn" ? "bn-BD" : "en-US";
    utterance.rate = rate ?? (lang === "bn" ? 0.88 : 0.95);
    utterance.pitch = 1;
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      index += 1;
      speakNext();
    };
    utterance.onerror = () => {
      if (cancelled) return;
      if (chromeKeepAlive) window.clearInterval(chromeKeepAlive);
      onError?.("speak-failed");
      onEnd?.();
    };

    if (index === 0) onStart?.();
    window.speechSynthesis.speak(utterance);
  };

  // Chrome occasionally pauses long speech; nudge resume while active.
  chromeKeepAlive = window.setInterval(() => {
    if (cancelled || !window.speechSynthesis.speaking) return;
    window.speechSynthesis.pause();
    window.speechSynthesis.resume();
  }, 12_000);

  speakNext();
  return { stop };
}
