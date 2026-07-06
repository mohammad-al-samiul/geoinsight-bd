"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSovereignLlm } from "@/hooks/use-sovereign-llm";
import { useAdminFilter } from "@/hooks/use-admin-filter";
import { ModuleShell } from "@/components/modules/module-shell";
import { ChatMarkdown } from "@/components/chat/chat-markdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AiStatusBadge } from "@/components/ai/ai-status-badge";
import { useAppLang } from "@/hooks/use-app-lang";
import { useTranslations } from "next-intl";
import { Bot, Loader2, RotateCcw, Send, Shield, User } from "lucide-react";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export function SovereignLlmPanel() {
  const lang = useAppLang();
  const { filter } = useAdminFilter();
  const t = useTranslations("modules.sovereign");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const { chat, loading, error } = useSovereignLlm();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    const nextMessages: ChatMsg[] = [...messages, { role: "user", content: userMsg }];
    setMessages(nextMessages);

    const res = await chat(
      nextMessages.slice(-4).map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      lang,
      filter,
    );
    if (res) {
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    }
  }, [input, loading, messages, chat, lang, filter]);

  return (
    <ModuleShell title={t("title")} description={t("description")} error={error}>
      <div className="flex flex-wrap items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <AiStatusBadge />
        <span className="text-[10px] text-muted-foreground">
          {lang === "bn" ? "ভেরিফাইড DB + Ollama" : "Verified DB + Ollama"}
        </span>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-7 text-xs"
            onClick={() => setMessages([])}
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            {lang === "bn" ? "নতুন চ্যাট" : "New chat"}
          </Button>
        )}
      </div>

      <div className="mt-4 flex h-[min(70vh,560px)] flex-col glass-panel rounded-xl shadow-panel">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/60 p-6 text-center">
              <Bot className="mx-auto mb-2 h-8 w-8 text-primary/60" />
              <p className="text-sm text-muted-foreground">
                {lang === "bn" ? t("placeholderBn") : t("placeholderEn")}
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-2",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {m.role === "assistant" && (
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "rounded-xl px-4 py-3",
                  m.role === "user"
                    ? "max-w-[80%] bg-primary/20 text-foreground"
                    : "max-w-[92%] border border-border/50 bg-card/80 shadow-sm",
                )}
              >
                {m.role === "user" ? (
                  <div className="flex items-start gap-2 text-sm">
                    <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <p className="leading-relaxed">{m.content}</p>
                  </div>
                ) : (
                  <ChatMarkdown content={m.content} />
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {lang === "bn" ? "ভেরিফাইড ডেটা খুঁজছি…" : "Fetching verified data…"}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-border/60 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void handleSend()}
            placeholder={lang === "bn" ? t("inputBn") : t("inputEn")}
            disabled={loading}
            className="flex-1 rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
          <Button onClick={() => void handleSend()} disabled={loading || !input.trim()} size="icon">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </ModuleShell>
  );
}
