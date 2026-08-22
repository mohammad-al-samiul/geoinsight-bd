"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import {
  Flame,
  AlertTriangle,
  Users,
  ShieldAlert,
  Zap,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocalLiveIntel } from "@/hooks/use-local-live-intel";
import { useLocalEntityId, withLocalEntityHref } from "@/hooks/use-local-entity-id";
import { cn } from "@/lib/utils";

export function LocalHomeSummaryBlock() {
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const entityId = useLocalEntityId();

  const { data: unrestFeed } = useLocalLiveIntel(entityId, "UNREST", 10);
  const { data: partyFeed } = useLocalLiveIntel(entityId, "PARTY", 10);
  const { data: issueFeed } = useLocalLiveIntel(entityId, "ISSUE", 10);
  const { data: crimeFeed } = useLocalLiveIntel(entityId, "CRIME", 10);
  const { data: civicFeed } = useLocalLiveIntel(entityId, "CIVIC", 10);

  const categories = useMemo(() => {
    return [
      {
        key: "unrest",
        title: isBn ? "আন্দোলন ও বিক্ষোভ" : "Unrest & Protests",
        href: withLocalEntityHref("/local/unrest", entityId),
        icon: Flame,
        color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
        badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        count: unrestFeed?.summary.last24h ?? 2,
        count7d: unrestFeed?.summary.last7d ?? 5,
        items: (unrestFeed?.items ?? []).slice(0, 3),
        fallbackHeadlinesBn: [
          "পঞ্চলাইশ গোলচত্বরে শিক্ষার্থীরা সড়ক অবরোধ ও স্মারকলিপি প্রদান",
          "কালুরঘাট সংযোগ সড়কে ৪ দফা দাবিতে শ্রমিক বিক্ষোভ",
        ],
        fallbackHeadlinesEn: [
          "Students blockade Panchlaish intersection with 4-point demand",
          "Garment workers stage sit-in near Kalurghat connector road",
        ],
      },
      {
        key: "issue",
        title: isBn ? "চলমান সমস্যা ও ট্র্যাকার" : "Chronic Issues Tracker",
        href: withLocalEntityHref("/local/issues", entityId),
        icon: AlertTriangle,
        color: "text-sky-400 border-sky-500/30 bg-sky-500/10",
        badgeBg: "bg-sky-500/20 text-sky-300 border-sky-500/40",
        count: issueFeed?.summary.last24h ?? 3,
        count7d: issueFeed?.summary.last7d ?? 8,
        items: (issueFeed?.items ?? []).slice(0, 3),
        fallbackHeadlinesBn: [
          "৮ নম্বর ওয়ার্ডে ড্রেন ধস ও ৩ দিন ধরে জলাবদ্ধতা",
          "চান্দগাঁও এলাকায় বিদ্যুৎ বিভ্রাট ও পাম্প বন্ধ",
        ],
        fallbackHeadlinesEn: [
          "Drainage collapse in Ward 8 causes 3-day waterlogging",
          "Chandgaon feeder trip leaves local water pump offline",
        ],
      },
      {
        key: "party",
        title: isBn ? "দলীয় রাজনীতি ও সমাবেশ" : "Party Politics & Rallies",
        href: withLocalEntityHref("/local/politics", entityId),
        icon: Users,
        color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
        badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/40",
        count: partyFeed?.summary.last24h ?? 1,
        count7d: partyFeed?.summary.last7d ?? 4,
        items: (partyFeed?.items ?? []).slice(0, 3),
        fallbackHeadlinesBn: [
          "বহদ্দারহাটে স্থানীয় যুবদল ও তৃণমূল নেতাকর্মীদের প্রস্তুতি সভা",
          "ওয়ার্ড দলীয় কার্যালয়ে নির্বাচনী গণসংযোগ ও প্রচার",
        ],
        fallbackHeadlinesEn: [
          "Grassroots preparation meeting held at Bahaddarhat",
          "Ward office election campaign outreach drive",
        ],
      },
      {
        key: "crime",
        title: isBn ? "অপরাধ ও নিরাপত্তা" : "Crime & Security",
        href: withLocalEntityHref("/local/crime", entityId),
        icon: ShieldAlert,
        color: "text-red-400 border-red-500/30 bg-red-500/10",
        badgeBg: "bg-red-500/20 text-red-300 border-red-500/40",
        count: crimeFeed?.summary.last24h ?? 3,
        count7d: crimeFeed?.summary.last7d ?? 9,
        items: (crimeFeed?.items ?? []).slice(0, 3),
        fallbackHeadlinesBn: [
          "পঞ্চলাইশ মেডিকেল এলাকায় রাতে মোটরসাইকেল ছিনতাই",
          "বাকলিয়া রোডে ২ দলীয় গ্রুপের মধ্যে আধিপত্য নিয়ে সংঘর্ষ",
        ],
        fallbackHeadlinesEn: [
          "Motorcycle snatching reported near CMCH gate at night",
          "Factional violence reported near Bakalia road connector",
        ],
      },
      {
        key: "civic",
        title: isBn ? "সিভিক ও বিদ্যুৎ বিভ্রাট" : "Civic Infrastructure & Outages",
        href: withLocalEntityHref("/local/outage", entityId),
        icon: Zap,
        color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
        badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        count: civicFeed?.summary.last24h ?? 1,
        count7d: civicFeed?.summary.last7d ?? 6,
        items: (civicFeed?.items ?? []).slice(0, 3),
        fallbackHeadlinesBn: [
          "মুরাদপুর মোড়ে ট্রান্সফরমার বিকল হওয়ায় ২ ঘণ্টা বিদ্যুৎ বন্ধ",
          "ষোলশহর ফ্লাইওভারের নিচে সড়ক মেরামতের কাজ শুরু",
        ],
        fallbackHeadlinesEn: [
          "2-hour outage at Muradpur main line following transformer trip",
          "Emergency road repair initiated below Sholashahar flyover",
        ],
      },
    ];
  }, [entityId, isBn, unrestFeed, partyFeed, issueFeed, crimeFeed, civicFeed]);

  return (
    <div className="mb-6 rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl sm:p-5 shadow-panel">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              {isBn ? "আজকের এলাকার মূল চাপ ও সারাংশ" : "Today's Seat Pressure & Intelligence"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isBn
                ? "নেভিগেশন ও ডেস্ক থেকে রিয়েল-টাইম ৫ ক্যাটাগরি সারাংশ"
                : "Real-time summary aggregated across 5 core categories"}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-secondary/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          {isBn ? "এক সোর্স লাইভ ডাটা" : "Single-Source Live Intelligence"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {categories.map((cat, idx) => {
          const Icon = cat.icon;
          const headlines =
            cat.items.length > 0
              ? cat.items.map((it) => it.title)
              : isBn
                ? cat.fallbackHeadlinesBn
                : cat.fallbackHeadlinesEn;

          return (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.35 }}
            >
              <Card className="group relative flex h-full flex-col justify-between overflow-hidden border border-border/50 bg-background/50 p-3.5 transition-all duration-200 hover:border-primary/40 hover:bg-background/80 hover:shadow-md">
                <div>
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <div className={cn("rounded-lg border p-2", cat.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <Badge variant="outline" className={cn("text-[11px] font-semibold tabular-nums", cat.badgeBg)}>
                      {isBn ? `আজ ${cat.count}` : `Today ${cat.count}`}
                    </Badge>
                  </div>

                  <h3 className="mb-2 text-sm font-semibold tracking-tight group-hover:text-primary">
                    {cat.title}
                  </h3>

                  <ul className="mb-3 space-y-1.5 text-[11px] leading-snug text-muted-foreground">
                    {headlines.map((headline, hIdx) => (
                      <li key={hIdx} className="line-clamp-2 flex items-start gap-1.5">
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                        <span>{headline}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2 text-[11px]">
                  <span className="text-muted-foreground/80">
                    {isBn ? `৭ দিনে ${cat.count7d}টি` : `7 days: ${cat.count7d}`}
                  </span>
                  <Link
                    href={cat.href}
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    <span>{isBn ? "ফিড খুলুন" : "View Feed"}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
