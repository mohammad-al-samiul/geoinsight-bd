"use client";

import { useState } from "react";
import { useCitizenChat } from "@/hooks/use-citizen-chat";
import { ModuleShell } from "@/components/modules/module-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppLang } from "@/hooks/use-app-lang";
import { useTranslations } from "next-intl";
import { MessageCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "bot";
  text: string;
  meta?: string;
}

export function CitizenChatbotPanel() {
  const lang = useAppLang();
  const t = useTranslations("modules.citizen");
  const tc = useTranslations("common");
  const [channel, setChannel] = useState<"333" | "999">("333");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const { send, loading, error } = useCitizenChat(channel);

  const handleSend = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    const reply = await send(text, lang, "Dhaka");
    if (reply) {
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: lang === "bn" ? reply.reply_bn : reply.reply,
          meta: `${reply.category} → ${lang === "bn" ? reply.route_ministry_bn : reply.route_ministry}`,
        },
      ]);
    }
  };

  return (
    <ModuleShell title={t("title")} description={t("description")} error={error}>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={channel === "333" ? "default" : "outline"}
          onClick={() => setChannel("333")}
        >
          {t("channel333")}
        </Button>
        <Button
          size="sm"
          variant={channel === "999" ? "default" : "outline"}
          onClick={() => setChannel("999")}
        >
          {t("channel999")}
        </Button>
      </div>

      <div className="mt-4 flex h-[400px] flex-col glass-panel rounded-xl shadow-panel">
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                m.role === "user" ? "ml-auto bg-primary/15" : "bg-secondary/30",
              )}
            >
              {m.text}
              {m.meta && (
                <Badge variant="outline" className="mt-1 block w-fit text-[10px]">
                  {m.meta}
                </Badge>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t border-border/60 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("inputPlaceholder")}
            className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm font-bengali"
            onKeyDown={(e) => e.key === "Enter" && void handleSend()}
          />
          <Button onClick={() => void handleSend()} disabled={loading} aria-label={tc("send")}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        <MessageCircle className="h-3 w-3" />
        {t("footerNote")}
      </p>
    </ModuleShell>
  );
}
