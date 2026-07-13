"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ScanSearch, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModuleShell } from "@/components/modules/module-shell";
import { useAntiPhishing } from "@/hooks/use-anti-phishing";
import { useAppLang } from "@/hooks/use-app-lang";
import { cn } from "@/lib/utils";

const SAMPLE_URL = "https://bangladesh-gov.bd";

const riskStyle = {
  SAFE: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  REVIEW: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  RED_FLAG: "border-red-500/50 bg-red-500/10 text-red-400",
};

export function AntiPhishingPanel() {
  const lang = useAppLang();
  const [url, setUrl] = useState(SAMPLE_URL);
  const { result, loading, error, scan } = useAntiPhishing();
  const bn = lang === "bn";
  const scanUrl = () => void scan(url);

  return (
    <ModuleShell
      title={bn ? "সরকারি ডোমেইন জালিয়াতি শনাক্তকরণ" : "Government Domain Anti-Phishing Shield"}
      description={bn ? "বিশ্বস্ত সরকারি ডোমেইনের সাথে URL similarity পরীক্ষা করুন। ৯৫% বা বেশি মিল কিন্তু অনুমোদিত নয় হলে Red Flag হবে।" : "Compare a URL with trusted government domains. An unverified 95%+ match is marked as a Red Flag."}
      loading={false}
      error={error}
      onRetry={scanUrl}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="glass-panel rounded-xl p-5 shadow-panel">
          <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-5 w-5 text-primary" />{bn ? "URL স্ক্যান" : "URL scan"}</div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{bn ? "এই MVP কোনো ওয়েবসাইট খুলে বা scrape করে না। এটি অনুমোদিত domain registry ও typo/similarity signal ব্যবহার করে নিরাপদে পরীক্ষা করে।" : "This MVP does not open or scrape the submitted website. It safely compares the domain against an approved registry using typo and similarity signals."}</p>
          <label className="mt-5 block text-xs font-medium text-muted-foreground">{bn ? "সন্দেহজনক ওয়েবসাইটের URL" : "Suspicious website URL"}</label>
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.gov.bd" className="mt-2 h-10 w-full rounded-md border border-border bg-card px-3 text-sm" />
          <div className="mt-3 flex gap-2"><Button onClick={scanUrl} disabled={loading || !url.trim()} className="gap-2"><ScanSearch className="h-4 w-4" />{loading ? (bn ? "স্ক্যান হচ্ছে…" : "Scanning…") : (bn ? "স্ক্যান করুন" : "Scan domain")}</Button><Button variant="outline" onClick={() => setUrl(SAMPLE_URL)}>{bn ? "নমুনা" : "Sample"}</Button></div>
        </section>
        {result ? (
          <section className="space-y-4">
            <div className="glass-panel rounded-xl p-5 shadow-panel"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs text-muted-foreground">{bn ? "স্ক্যানকৃত ডোমেইন" : "Scanned domain"}</p><p className="mt-1 break-all font-mono text-sm font-semibold">{result.scanned_domain}</p></div><Badge className={cn("border text-xs", riskStyle[result.risk_level])}>{result.red_flag && <AlertTriangle className="mr-1 h-3.5 w-3.5" />}{result.risk_level.replace("_", " ")}</Badge></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-lg border border-border/50 bg-secondary/20 p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{bn ? "সাদৃশ্য" : "Similarity"}</p><p className="mt-1 text-2xl font-bold tabular-nums">{result.similarity_score}%</p></div><div className="rounded-lg border border-border/50 bg-secondary/20 p-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{bn ? "নিকটতম সরকারি ডোমেইন" : "Closest official domain"}</p><p className="mt-1 break-all text-sm font-medium">{result.official_domain ?? "—"}</p></div></div></div>
            <div className="glass-panel rounded-xl p-5 shadow-panel"><h3 className="flex items-center gap-2 text-sm font-semibold">{result.verified_official ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-amber-400" />}{bn ? "বিশ্লেষণের কারণ" : "Analysis signals"}</h3><ul className="mt-3 space-y-2">{(bn ? result.reasons_bn : result.reasons).map((reason) => <li key={reason} className="rounded-md border border-border/40 bg-secondary/10 p-2.5 text-xs leading-relaxed">{reason}</li>)}</ul><p className="mt-4 break-all font-mono text-[10px] text-muted-foreground">{bn ? "ডিজিটাল সিগনেচার" : "Digital signature"}: {result.digital_signature}</p></div>
          </section>
        ) : <section className="glass-panel flex min-h-64 flex-col items-center justify-center rounded-xl p-6 text-center shadow-panel"><ShieldCheck className="h-10 w-10 text-primary/70" /><p className="mt-3 text-sm font-medium">{bn ? "স্ক্যানের ফলাফল এখানে দেখাবে" : "Scan results will appear here"}</p><p className="mt-1 max-w-sm text-xs text-muted-foreground">{bn ? "শুধু অনুমোদিত analyst ব্যবহার ও যাচাইকৃত সরকারি registry-এর সিদ্ধান্তের ভিত্তিতে পরবর্তী পদক্ষেপ নিন।" : "Use the result as an analyst signal and verify it against the approved government registry before taking action."}</p></section>}
      </div>
    </ModuleShell>
  );
}
