"use client";

import { useState } from "react";
import { useSovereignLlm } from "@/hooks/use-sovereign-llm";
import { ModuleShell } from "@/components/modules/module-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AiStatusBadge } from "@/components/ai/ai-status-badge";
import { Bot, Send, Shield } from "lucide-react";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export function SovereignLlmPanel() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const { chat, loading, error } = useSovereignLlm();

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    const res = await chat(
      [...messages, { role: "user" as const, content: userMsg }].map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
      lang,
    );
    if (res) {
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    }
  };

  return (
    <ModuleShell
      title="Sovereign Bangla LLM"
      description="On-prem generative AI via local Ollama (llama3.1:8b). Sensitive data stays on your machine."
      error={error}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <AiStatusBadge />
        <Button size="sm" variant={lang === "bn" ? "default" : "outline"} onClick={() => setLang("bn")}>
          বাংলা
        </Button>
        <Button size="sm" variant={lang === "en" ? "default" : "outline"} onClick={() => setLang("en")}>
          English
        </Button>
      </div>

      <div className="mt-4 flex h-[420px] flex-col glass-panel rounded-xl shadow-panel">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {lang === "bn"
                ? "জাতীয় KPI, প্রকল্প, red flag সম্পর্কে জিজ্ঞাসা করুন…"
                : "Ask about national KPIs, projects, or red flags…"}
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                m.role === "user"
                  ? "ml-auto bg-primary/20 text-foreground"
                  : "bg-secondary/40 text-foreground",
              )}
            >
              {m.role === "assistant" && <Bot className="mb-1 h-3.5 w-3.5 text-primary" />}
              {m.content}
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t border-border/60 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleSend()}
            placeholder={lang === "bn" ? "বার্তা লিখুন…" : "Type a message…"}
            className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm"
          />
          <Button onClick={() => void handleSend()} disabled={loading} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </ModuleShell>
  );
}
