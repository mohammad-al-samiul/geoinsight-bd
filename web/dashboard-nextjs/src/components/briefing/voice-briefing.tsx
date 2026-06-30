"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Pause, Play, Volume2 } from "lucide-react";

interface VoiceBriefingProps {
  text: string;
  lang: "bn" | "en";
  className?: string;
}

export function VoiceBriefing({ text, lang, className }: VoiceBriefingProps) {
  const t = useTranslations("voice");
  const [playing, setPlaying] = useState(false);
  const [supported, setSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const stop = () => {
    window.speechSynthesis?.cancel();
    setPlaying(false);
  };

  const play = () => {
    if (!supported || !text) return;
    stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "bn" ? "bn-BD" : "en-US";
    utterance.rate = 0.92;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) =>
      lang === "bn"
        ? v.lang.startsWith("bn") || v.name.toLowerCase().includes("bengali")
        : v.lang.startsWith("en"),
    );
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
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
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={playing ? stop : play} className="gap-2">
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? t("pause") : t("play")}
          </Button>
        </div>
      )}

      <p className="line-clamp-3 text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
