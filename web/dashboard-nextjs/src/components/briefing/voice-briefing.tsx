"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Pause, Play, Volume2 } from "lucide-react";
import { loadSpeechVoices, speakPreparedText, type SpeakHandle } from "@/lib/bangla-tts";

interface VoiceBriefingProps {
  text: string;
  lang: "bn" | "en";
  className?: string;
}

export function VoiceBriefing({ text, lang, className }: VoiceBriefingProps) {
  const t = useTranslations("voice");
  const [playing, setPlaying] = useState(false);
  const [supported, setSupported] = useState(true);
  const [voiceName, setVoiceName] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const handleRef = useRef<SpeakHandle | null>(null);

  useEffect(() => {
    const ok = typeof window !== "undefined" && "speechSynthesis" in window;
    setSupported(ok);
    if (ok) {
      void loadSpeechVoices().then((voices) => {
        const hasBn = voices.some(
          (v) =>
            v.lang.toLowerCase().startsWith("bn") ||
            /bengali|bangla|বাংলা/i.test(v.name),
        );
        if (lang === "bn" && !hasBn) {
          setWarning(
            "এই ব্রাউজারে বাংলা ভয়েস পাওয়া যায়নি। Edge ব্যবহার করুন অথবা Windows Language settings থেকে Bangla speech pack ইনস্টল করুন।",
          );
        }
      });
    }
    return () => {
      handleRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, [lang]);

  const stop = () => {
    handleRef.current?.stop();
    handleRef.current = null;
    window.speechSynthesis?.cancel();
    setPlaying(false);
  };

  const play = async () => {
    if (!supported || !text) return;
    stop();
    setWarning(null);

    handleRef.current = await speakPreparedText({
      text,
      lang,
      onStart: () => setPlaying(true),
      onEnd: () => {
        setPlaying(false);
        handleRef.current = null;
      },
      onError: (code) => {
        if (code === "no-bn-voice") {
          setWarning(
            "বাংলা ভয়েস পাওয়া যায়নি — উচ্চারণ ভুল হতে পারে। Microsoft Edge + Bangla speech pack সুপারিশ করা হচ্ছে।",
          );
        } else if (code === "unsupported") {
          setSupported(false);
        }
        setPlaying(false);
      },
      onVoice: (name, hasBanglaVoice) => {
        setVoiceName(name);
        if (lang === "bn" && !hasBanglaVoice) {
          setWarning(
            "বাংলা ভয়েস পাওয়া যায়নি — উচ্চারণ ভুল হতে পারে। Microsoft Edge + Bangla speech pack সুপারিশ করা হচ্ছে।",
          );
        }
      },
    });
  };

  return (
    <div
      className={cn(
        "glass-panel flex flex-col gap-3 rounded-xl border border-primary/20 p-4 shadow-panel",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Volume2 className="h-4 w-4 text-primary" />
        {t("title")}
        <span className="text-xs font-normal text-muted-foreground">
          ({lang === "bn" ? t("ttsBn") : t("ttsEn")} · {t("duration")})
        </span>
      </div>

      {!supported ? (
        <p className="text-xs text-muted-foreground">{t("unsupported")}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={playing ? stop : () => void play()} className="gap-2">
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? t("pause") : t("play")}
          </Button>
          {voiceName ? (
            <span className="text-[10px] text-muted-foreground">Voice: {voiceName}</span>
          ) : null}
        </div>
      )}

      {warning ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-100">
          {warning}
        </p>
      ) : null}

      <p className="line-clamp-4 text-xs leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}
