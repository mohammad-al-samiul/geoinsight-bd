"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Building,
  Droplets,
  Flame,
  PhoneCall,
  Search,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  Sliders,
  Scale,
  Filter,
  ArrowUpDown,
  Radar as RadarIcon,
  Radio,
  Sparkles,
  X,
  Siren,
  Calendar,
  History,
  Printer,
  MapPin,
  Truck,
  ShieldCheck,
  Volume2,
  VolumeX,
  Send,
  Mail,
  MessageSquare,
  Check,
  PlusCircle,
  Map as MapIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppSelect } from "@/components/ui/app-select";
import { IntelCard } from "@/components/ui/intel-card";
import { DivisionalMap } from "@/components/divisional-crisis/divisional-map";
import { PmoLocalIntegrityHits } from "@/components/divisional-crisis/pmo-local-integrity-hits";
import {
  useDivisionalCrisis,
  SortOption,
  RiskFilterOption,
  CitizenReportPayload,
} from "@/hooks/use-divisional-crisis";
import { chartTooltipProps } from "@/lib/chart-tooltip";
import { chartLayout, piePercentLabel } from "@/lib/chart-theme";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cn } from "@/lib/utils";
import type { DivisionCrisisData, DistrictInfo } from "@/lib/divisional-crisis-data";

const CRIME_COLORS = [
  "#ef4444", // Theft - Red
  "#f97316", // Extortion - Orange
  "#a855f7", // Narcotics - Purple
  "#3b82f6", // Cyber - Blue
  "#10b981", // Violent - Green
];

const DIVISION_COLOR_MAP: Record<string, string> = {
  dhaka: "#ef4444",
  chattogram: "#f97316",
  khulna: "#a855f7",
  rajshahi: "#eab308",
  sylhet: "#3b82f6",
  barishal: "#06b6d4",
  rangpur: "#10b981",
  mymensingh: "#ec4899",
};

export function DivisionalCrisisPanel() {
  const t = useTranslations("modules.divisionalCrisis");
  const locale = useLocale();
  const bn = locale === "bn";
  const bp = useBreakpoint();
  const layout = chartLayout(bp);

  const {
    loading,
    livePulse,
    divisions,
    mapDivisions,
    filteredDivisions,
    filters,
    setFilters,
    summaryStats,
    crimeComparisonChartData,
    aggregateCrimeTypeBreakdown,
    resourceCrisisChartData,
    radarChartData,
    forecastChartData,
    historicalYoYChartData,
    compareDivisionIds,
    setCompareDivisionIds,
    comparisonData,
    selectedDistrict,
    setSelectedDistrict,
    reallocation,
    setReallocation,
    liveAlerts,
    addCitizenReport,
    addAlertFromShortageSite,
    timelineHour,
    setTimelineHour,
    timelinePlaying,
    setTimelinePlaying,
    playVoiceBriefing,
    stopVoiceBriefing,
    isSpeechPlaying,
  } = useDivisionalCrisis();

  const [selectedDivision, setSelectedDivision] = useState<DivisionCrisisData | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "map" | "crime" | "resources" | "radar" | "forecast" | "history" | "hotlines">("overview");
  const [activeIncidentModal, setActiveIncidentModal] = useState<DivisionCrisisData | null>(null);
  const [showStressSimulator, setShowStressSimulator] = useState(false);
  const [showTacticalSimulator, setShowTacticalSimulator] = useState(false);
  const [showAutoAlertDrawer, setShowAutoAlertDrawer] = useState(false);
  const [showCitizenReportModal, setShowCitizenReportModal] = useState(false);
  const [activeDistrictModalDiv, setActiveDistrictModalDiv] = useState<DivisionCrisisData | null>(null);

  // Dispatch success feedback state
  const [dispatchSuccess, setDispatchSuccess] = useState(false);

  // Citizen report form local state
  const [reportForm, setReportForm] = useState<CitizenReportPayload>({
    divisionId: "dhaka",
    category: "গ্যাস লিকেজ / স্বল্পচাপ",
    title: "",
    location: "",
    description: "",
    urgency: "warning",
  });

  const handleExportJson = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(filteredDivisions, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `Bangladesh_Divisional_Crisis_Report_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleCitizenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportForm.title || !reportForm.location) return;

    addCitizenReport(reportForm);
    setShowCitizenReportModal(false);
    setReportForm({
      divisionId: "dhaka",
      category: "গ্যাস লিকেজ / স্বল্পচাপ",
      title: "",
      location: "",
      description: "",
      urgency: "warning",
    });
  };

  const handleDispatchNotification = () => {
    setDispatchSuccess(true);
    setTimeout(() => setDispatchSuccess(false), 4000);
  };

  const handleCompareClick = (divId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!compareDivisionIds) {
      const defaultOther = divisions.find((d) => d.id !== divId)?.id || "chattogram";
      setCompareDivisionIds([divId, defaultOther]);
    } else if (compareDivisionIds[0] === divId) {
      setCompareDivisionIds(null);
    } else {
      setCompareDivisionIds([compareDivisionIds[0], divId]);
    }
  };

  const handleDistrictSelect = (district: DistrictInfo, division: DivisionCrisisData) => {
    setSelectedDistrict(district);
    setActiveDistrictModalDiv(division);
  };

  const handlePinAlert = (site: Parameters<typeof addAlertFromShortageSite>[0]) => {
    addAlertFromShortageSite(site);
    setShowAutoAlertDrawer(true);
  };

  const criticalDivisions = filteredDivisions.filter((d) => d.overallSeverityScore >= 80);

  return (
    <ModuleShell
      title={bn ? "৮ বিভাগীয় অপরাধ ও সম্পদ সংকট ইন্টেলিজেন্স" : "8 Divisions Crime & Resource Crisis Intelligence"}
      description={
        bn
          ? "বাংলাদেশের ৮টি বিভাগের সাম্প্রতিক অপরাধের ধরন, জিও-হিটম্যাপ, এআই ভয়েস ব্রিপিং, নাগরিক রিপোর্ট ও অটোমেটিক ইমার্জেন্সি অ্যালার্ট ডিসপ্যাচ ইনটেল।"
          : "Comprehensive visual analytics on crime distribution, geo-heatmap, AI voice briefing, citizen reports & automated emergency alert dispatch."
      }
      loading={loading && !livePulse}
      loadingLabel={bn ? "৮ বিভাগের সর্বশেষ ঝুঁকি সংকেত সিঙ্ক হচ্ছে…" : "Syncing the latest divisional risk signals…"}
      stats={
        <StatGrid>
          <StatCard
            label={bn ? "মোট আনুমানিক অপরাধ মামলা" : "Total Estimated Crimes"}
            value={summaryStats.totalCrimeCases.toLocaleString()}
            hint={bn ? `গত ${filters.timeframeDays} দিনের আনুমানিক হিসাব` : `Est. in last ${filters.timeframeDays} days`}
            accent="danger"
          />
          <StatCard
            label={bn ? "সর্বোচ্চ ঝুঁকিপূর্ণ বিভাগ" : "Highest Risk Division"}
            value={summaryStats.highestRiskDivision ? (bn ? summaryStats.highestRiskDivision.nameBn : summaryStats.highestRiskDivision.nameEn) : "N/A"}
            hint={
              summaryStats.highestRiskDivision
                ? `${bn ? "ক্রাইসিস স্কোর" : "Crisis Score"}: ${summaryStats.highestRiskDivision.overallSeverityScore}/100`
                : undefined
            }
            accent="danger"
          />
          <StatCard
            label={bn ? "গড় গ্যাস ঘাটতি" : "Avg Gas Deficit"}
            value={`${summaryStats.avgGasDeficit}%`}
            hint={bn ? "শিল্প ও বাসাবাড়ির গ্যাসের স্বল্পচাপ" : "Industrial & domestic supply deficit"}
            accent="warning"
          />
          <StatCard
            label={bn ? "গড় বিদ্যুৎ লোডশেডিং" : "Avg Daily Load-Shedding"}
            value={`${summaryStats.avgLoadShedding} ${bn ? "ঘণ্টা/দিন" : "hrs/day"}`}
            hint={bn ? "দৈনিক বিদ্যুৎ ঘাটতি" : "Daily power deficit per division"}
            accent="warning"
          />
        </StatGrid>
      }
    >
      <div className="space-y-6 print:p-0">
        {/* Top Header Controls: AI Voice Briefing, Citizen Report, & Auto-Alerts */}
        <div className="glass-panel p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 border border-border/50 bg-background/80">
          {/* AI Voice Briefing Player */}
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={isSpeechPlaying ? stopVoiceBriefing : playVoiceBriefing}
              className={`text-xs h-8 gap-1.5 font-semibold ${isSpeechPlaying ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
            >
              {isSpeechPlaying ? <VolumeX className="h-4 w-4 animate-bounce" /> : <Volume2 className="h-4 w-4" />}
              {isSpeechPlaying ? (bn ? "অডিও ব্রিপিং থামান" : "Stop Voice Briefing") : (bn ? "এআই অডিও ব্রিপিং শুনুন" : "AI Voice Briefing")}
            </Button>
            <span className="text-[11px] text-muted-foreground hidden md:inline">
              {isSpeechPlaying ? (bn ? "বাংলা ভয়েস ইন্টেল প্লে হচ্ছে..." : "Speaking Bangla audio summary...") : (bn ? "৮ বিভাগের ক্রাইসিস রিপোর্ট শুনতে ক্লিক করুন" : "Click to hear Bangla voice report")}
            </span>
          </div>

          {/* Citizen Report & Auto Alert Drawer Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCitizenReportModal(true)}
              className="text-xs h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              {bn ? "সিটিজেন রিপোর্ট জমা দিন" : "Submit Citizen Report"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAutoAlertDrawer(!showAutoAlertDrawer)}
              className={`text-xs h-8 gap-1.5 ${showAutoAlertDrawer ? "bg-red-600 text-white border-red-600 hover:bg-red-700" : "border-red-500/40 text-red-400 hover:bg-red-500/10"}`}
            >
              <Mail className="h-3.5 w-3.5" />
              {bn ? `অটো-অ্যালার্ট মেইল/এসএমএস (${criticalDivisions.length})` : `Auto-Alert Dispatch (${criticalDivisions.length})`}
            </Button>
          </div>
        </div>

        <PmoLocalIntegrityHits />

        {/* Automated Emergency Email/SMS Notification Dispatch Drawer */}
        <AnimatePresence>
          {showAutoAlertDrawer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-panel shield-float-slow shield-shimmer-wrap shield-glow-danger p-4 rounded-xl border border-red-500/40 space-y-4 bg-background/90 backdrop-blur-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                  <Siren className="h-4 w-4 animate-pulse" />
                  {bn ? "জরুরি অটোমেটিক ইমেইল ও এসএমএস নোটিফিকেশন ডিসপ্যাচ ডিরেক্টরি:" : "Automated Emergency Email & SMS Dispatch Engine:"}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {bn ? "অতি ঝুঁকিপূর্ণ বিভাগ:" : "Critical Divisions:"} <strong className="text-red-400">{criticalDivisions.length} টি</strong>
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-3 text-xs">
                {criticalDivisions.map((critDiv) => (
                  <div key={critDiv.id} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 space-y-2">
                    <div className="flex justify-between items-center">
                      <strong className="text-foreground text-sm">{bn ? critDiv.nameBn : critDiv.nameEn} {bn ? "বিভাগ" : "Division"}</strong>
                      <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/40 text-[10px]">
                        {bn ? `স্কোর: ${critDiv.overallSeverityScore}/১০০` : `Score: ${critDiv.overallSeverityScore}/100`}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-muted-foreground text-[11px]">
                      <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-red-400" /> {bn ? `ডিসি অফিস ও এসপি কন্ট্রোল: dc_${critDiv.id}@gov.bd` : `DC & SP Office: dc_${critDiv.id}@gov.bd`}</div>
                      <div className="flex items-center gap-1"><MessageSquare className="h-3 w-3 text-amber-400" /> {bn ? `জরুরি এসএমএস কন্টাক্ট: ${critDiv.emergencyContacts.policeHelpline}` : `SMS Hotline: ${critDiv.emergencyContacts.policeHelpline}`}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <span className="text-xs text-muted-foreground">
                  {dispatchSuccess
                    ? (bn ? "✅ নোটিফিকেশন ইমেইল ও এসএমএস সংশ্লিষ্ট ডিসি ও র্যাব অফিসে সফলভাবে প্রেরিত হয়েছে!" : "✅ Emergency email & SMS successfully dispatched!")
                    : (bn ? "স্কোর ৮০+ হলে স্বয়ংক্রিয় ডিসপ্যাচ প্রোটোকল সক্রিয় হবে।" : "Automatic dispatch protocol active for scores >= 80.")}
                </span>

                <Button
                  variant="default"
                  size="sm"
                  onClick={handleDispatchNotification}
                  disabled={dispatchSuccess}
                  className="text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                  {dispatchSuccess ? <Check className="h-4 w-4 text-emerald-300" /> : <Send className="h-3.5 w-3.5" />}
                  {dispatchSuccess ? (bn ? "প্রেরিত হয়েছে" : "Dispatched") : (bn ? "অটো-অ্যালার্ট মেল ও এসএমএস পাঠান" : "Dispatch Emergency Alert")}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Secondary Bar: Tactical Simulators Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-primary/10 to-purple-500/10 border border-primary/20 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/20 text-primary">
              <Truck className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>{bn ? "কৌশলগত ফোর্স ও গ্যাস রি-অ্যালোকোশন সিমুলেটর" : "Tactical Force & Gas Re-allocation Suite"}</span>
                <Badge variant="outline" className="text-[9px] bg-purple-500/20 text-purple-300 border-purple-500/30">
                  {bn ? "ট্যাকটিক্যাল ইনটেল" : "Tactical Intel"}
                </Badge>
              </h4>
              <p className="text-[11px] text-muted-foreground">
                {bn
                  ? "কম ঝুঁকিপূর্ণ বিভাগ থেকে অতিরিক্ত বাহিনী বা গ্যাস উচ্চ ঝুঁকিপূর্ণ বিভাগে স্থানান্তর করে ক্রাইসিস স্কোর হ্রাস পরীক্ষা করুন।"
                  : "Simulate re-allocating police/RAB patrols or emergency gas between divisions to evaluate risk drop."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={showTacticalSimulator ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setShowTacticalSimulator(!showTacticalSimulator);
                if (showStressSimulator) setShowStressSimulator(false);
              }}
              className="text-xs h-8 gap-1.5"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {showTacticalSimulator ? (bn ? "ট্যাকটিক্যাল প্যানেল বন্ধ" : "Close Tactical Sim") : (bn ? "ফোর্স রি-অ্যালোকোশন সিমুলেটর" : "Force Re-allocation Sim")}
            </Button>

            <Button
              variant={showStressSimulator ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setShowStressSimulator(!showStressSimulator);
                if (showTacticalSimulator) setShowTacticalSimulator(false);
              }}
              className="text-xs h-8 gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {showStressSimulator ? (bn ? "স্ট্রেস সিমুলেটর বন্ধ" : "Close Stress Sim") : (bn ? "জাতীয় স্ট্রেস সিমুলেটর" : "National Stress Sim")}
            </Button>
          </div>
        </div>

        {/* Tactical Re-allocation Simulator Control Drawer */}
        <AnimatePresence>
          {showTacticalSimulator && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-panel shield-float-slow shield-float-delay-1 shield-shimmer-wrap p-4 rounded-xl border border-purple-500/30 space-y-4 bg-background/90 backdrop-blur-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-purple-400" />
                  {bn ? "কৌশলগত পুলিশ বাহিনী ও গ্যাস সরবরাহ স্থানান্তরের সিমুলেশন:" : "Tactical Force & Emergency Gas Shift Simulation:"}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Source Division */}
                <div className="space-y-1">
                  <label className="text-muted-foreground block text-[11px] font-medium">{bn ? "উৎসহ বিভাগ (Source):" : "Source Division:"}</label>
                  <AppSelect
                    value={reallocation.sourceDivId}
                    onValueChange={(value) => setReallocation({ ...reallocation, sourceDivId: value })}
                    className="w-full"
                    triggerClassName="w-full"
                    options={divisions.map((d) => ({
                      value: d.id,
                      label: bn ? d.nameBn : d.nameEn,
                    }))}
                  />
                </div>

                {/* Target Division */}
                <div className="space-y-1">
                  <label className="text-muted-foreground block text-[11px] font-medium">{bn ? "টার্গেট বিভাগ (Target):" : "Target Division:"}</label>
                  <AppSelect
                    value={reallocation.targetDivId}
                    onValueChange={(value) => setReallocation({ ...reallocation, targetDivId: value })}
                    className="w-full"
                    triggerClassName="w-full"
                    options={divisions.map((d) => ({
                      value: d.id,
                      label: bn ? d.nameBn : d.nameEn,
                    }))}
                  />
                </div>

                {/* Police Units Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">{bn ? "স্থানান্তরিত বাহিনী:" : "Shifted Forces:"}</span>
                    <strong className="text-purple-300">{reallocation.policeUnitsShifted} {bn ? "ইউনিট" : "Units"}</strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={500}
                    step={25}
                    value={reallocation.policeUnitsShifted}
                    onChange={(e) => setReallocation({ ...reallocation, policeUnitsShifted: Number(e.target.value) })}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* Gas Emergency Shift Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">{bn ? "জরুরি গ্যাস রি-রুট:" : "Gas Re-route:"}</span>
                    <strong className="text-amber-300">+{reallocation.gasUnitsShifted}%</strong>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={5}
                    value={reallocation.gasUnitsShifted}
                    onChange={(e) => setReallocation({ ...reallocation, gasUnitsShifted: Number(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs flex items-center justify-between">
                <span className="text-muted-foreground">
                  {bn
                    ? `ফলাফল: টার্গেট বিভাগে ক্রাইসিস স্কোর আনুমানিক ${Math.round(reallocation.policeUnitsShifted * 0.04 + reallocation.gasUnitsShifted * 0.5)} পয়েন্ট হ্রাস পাবে।`
                    : `Projected result: Estimated ${Math.round(reallocation.policeUnitsShifted * 0.04 + reallocation.gasUnitsShifted * 0.5)} point drop in target division risk score.`}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReallocation({ sourceDivId: "mymensingh", targetDivId: "dhaka", policeUnitsShifted: 0, gasUnitsShifted: 0 })}
                  className="text-[11px] h-6 hover:text-purple-300"
                >
                  {bn ? "রিসেট করুন" : "Reset Shift"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stress Simulator Control Drawer */}
        <AnimatePresence>
          {showStressSimulator && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-panel shield-float-slow shield-float-delay-2 shield-shimmer-wrap p-4 rounded-xl border border-amber-500/30 space-y-3 bg-background/80 backdrop-blur-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <Flame className="h-4 w-4" />
                  {bn ? "জাতীয় জ্বালানি ঘাটতি বৃদ্ধি নির্বাচন করুন:" : "Simulate National Energy Shortage Surge:"}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {bn ? "বর্তমান সার্জ লেভেল:" : "Current Surge Level:"} <strong className="text-amber-300">+{filters.stressSurgePercentage}%</strong>
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={40}
                step={1}
                value={filters.stressSurgePercentage}
                onChange={(e) => setFilters({ ...filters, stressSurgePercentage: Number(e.target.value) })}
                className="w-full accent-amber-500"
              />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[0, 10, 20, 30].map((surge) => (
                  <button
                    key={surge}
                    type="button"
                    onClick={() => setFilters({ ...filters, stressSurgePercentage: surge })}
                    className={cn(
                      "py-2 px-3 rounded-lg text-xs font-semibold transition-all border text-center",
                      filters.stressSurgePercentage === surge
                        ? "bg-amber-500 text-black border-amber-400 font-bold shadow-md shadow-amber-500/20"
                        : "bg-secondary/40 text-muted-foreground border-border/40 hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {surge === 0 ? (bn ? "স্বাভাবিক (0%)" : "Normal (0%)") : `+${surge}% ${bn ? "ঘাটতি" : "Surge"}`}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {bn
                  ? "স্লাইডার ম্যাপ ও রিসোর্স চার্টে একসাথে কাজ করে (হোয়াট-ইফ)।"
                  : "Slider drives map + resource charts together (what-if)."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live alerts / citizen feed */}
        {liveAlerts.length > 0 ? (
          <div className="glass-panel rounded-xl border border-rose-500/25 bg-background/70 p-3.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-rose-200">
                <Radio className="h-4 w-4" />
                {bn ? "লাইভ অ্যালার্ট ও নাগরিক রিপোর্ট" : "Live alerts & citizen reports"}
              </h3>
              <span className="font-mono text-[11px] text-muted-foreground">{liveAlerts.length}</span>
            </div>
            <ul className="grid max-h-40 gap-2 overflow-y-auto sm:grid-cols-2">
              {liveAlerts.slice(0, 8).map((alert) => (
                <li
                  key={alert.id}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs",
                    alert.severity === "critical"
                      ? "border-red-500/35 bg-red-500/10"
                      : alert.severity === "warning"
                        ? "border-amber-500/30 bg-amber-500/10"
                        : "border-border/40 bg-background/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold leading-snug text-foreground">
                      {bn ? alert.titleBn : alert.titleEn}
                    </p>
                    <Badge variant="outline" className="shrink-0 text-[9px]">
                      {alert.source === "citizen"
                        ? bn
                          ? "নাগরিক"
                          : "Citizen"
                        : alert.source === "pin-alert"
                          ? bn
                            ? "পিন"
                            : "Pin"
                          : "Ops"}
                    </Badge>
                  </div>
                  <p className="mt-1 leading-snug text-muted-foreground">
                    {bn ? alert.locationBn : alert.locationEn}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/80">{alert.timestamp}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Main Controls & Filters Bar */}
        <div className="glass-panel flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl print:hidden">
          {/* Division Selector Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" />
              {bn ? "বিভাগ:" : "Division:"}
            </span>
            <div className="scroll-x-strip max-w-full">
              <button
                type="button"
                onClick={() => setFilters({ ...filters, divisionId: "all" })}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  filters.divisionId === "all"
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {bn ? "সকল ৮ বিভাগ" : "All 8 Divisions"}
              </button>
              {divisions.map((div) => (
                <button
                  key={div.id}
                  type="button"
                  onClick={() => setFilters({ ...filters, divisionId: div.id })}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                    filters.divisionId === div.id
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <span>{bn ? div.nameBn : div.nameEn}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1 rounded font-mono",
                      div.overallSeverityScore >= 80
                        ? "bg-red-500/20 text-red-300"
                        : div.overallSeverityScore >= 70
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-emerald-500/20 text-emerald-300"
                    )}
                  >
                    {div.overallSeverityScore}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Search, Sort, Risk Level, Timeframe & Export */}
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder={bn ? "জেলা বা হটস্পট খুঁজুন..." : "Search district/hotspot..."}
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border/50 bg-background/60 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary w-44 sm:w-52"
              />
            </div>

            {/* Sort Dropdown */}
            <AppSelect
              value={filters.sortBy}
              onValueChange={(value) => setFilters({ ...filters, sortBy: value as SortOption })}
              icon={<ArrowUpDown className="h-3 w-3" />}
              triggerClassName="min-w-[10.5rem]"
              options={[
                { value: "severity", label: bn ? "সর্ট: ক্রাইসিস স্কোর" : "Sort: Crisis Score" },
                { value: "cases", label: bn ? "সর্ট: মোট অপরাধ" : "Sort: Crime Cases" },
                { value: "gas", label: bn ? "সর্ট: গ্যাস ঘাটতি" : "Sort: Gas Deficit" },
                { value: "power", label: bn ? "সর্ট: লোডশেডিং" : "Sort: Load-shedding" },
                { value: "name", label: bn ? "সর্ট: নাম অনুযায়ী" : "Sort: Division Name" },
              ]}
            />

            {/* Risk Level Filter */}
            <AppSelect
              value={filters.riskFilter}
              onValueChange={(value) => setFilters({ ...filters, riskFilter: value as RiskFilterOption })}
              icon={<Filter className="h-3 w-3" />}
              triggerClassName="min-w-[10.5rem]"
              options={[
                { value: "all", label: bn ? "ঝুঁকি: সকল মাত্রা" : "Risk: All Levels" },
                { value: "Critical", label: bn ? "ঝুঁকি: অতি ঝুঁকিপূর্ণ" : "Risk: Critical" },
                { value: "High Risk", label: bn ? "ঝুঁকি: উচ্চ ঝুঁকিপূর্ণ" : "Risk: High Risk" },
                { value: "Moderate", label: bn ? "ঝুঁকি: মাঝারি" : "Risk: Moderate" },
                { value: "Low Risk", label: bn ? "ঝুঁকি: নিম্ন" : "Risk: Low Risk" },
              ]}
            />

            {/* Category focus */}
            <AppSelect
              value={filters.categoryFilter}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  categoryFilter: value as typeof filters.categoryFilter,
                })
              }
              icon={<Layers className="h-3 w-3" />}
              triggerClassName="min-w-[10.5rem]"
              options={[
                { value: "all", label: bn ? "ক্যাটাগরি: সব" : "Category: All" },
                { value: "crime", label: bn ? "ক্যাটাগরি: অপরাধ" : "Category: Crime" },
                { value: "gas", label: bn ? "ক্যাটাগরি: গ্যাস" : "Category: Gas" },
                { value: "fuel", label: bn ? "ক্যাটাগরি: তেল" : "Category: Fuel" },
                { value: "electricity", label: bn ? "ক্যাটাগরি: বিদ্যুৎ" : "Category: Power" },
                { value: "water", label: bn ? "ক্যাটাগরি: পানি" : "Category: Water" },
              ]}
            />

            {/* Timeframe */}
            <AppSelect
              value={String(filters.timeframeDays)}
              onValueChange={(value) => setFilters({ ...filters, timeframeDays: Number(value) })}
              triggerClassName="min-w-[7.5rem]"
              options={[
                { value: "7", label: bn ? "গত ৭ দিন" : "7 Days" },
                { value: "30", label: bn ? "গত ৩০ দিন" : "30 Days" },
                { value: "90", label: bn ? "গত ৯০ দিন" : "90 Days" },
                { value: "365", label: bn ? "গত ১ বছর" : "1 Year" },
              ]}
            />

            {/* Print & Export */}
            <Button variant="outline" size="sm" onClick={handlePrintReport} className="gap-1.5 text-xs h-8">
              <Printer className="h-3.5 w-3.5" />
              {bn ? "প্রিন্ট রিপোর্ট" : "Print PDF"}
            </Button>

            <Button variant="outline" size="sm" onClick={handleExportJson} className="gap-1.5 text-xs h-8">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              {bn ? "এক্সপোর্ট" : "Export Report"}
            </Button>
          </div>
        </div>

        {/* Side-by-Side Division Comparison Modal / Panel */}
        <AnimatePresence>
          {comparisonData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="glass-panel shield-float-slow shield-shimmer-wrap shield-glow p-5 rounded-2xl border-2 border-primary/40 space-y-4 bg-background/95 shadow-xl relative print:hidden"
            >
              <button
                onClick={() => setCompareDivisionIds(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary/60"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                <h3 className="font-display text-base font-bold text-foreground">
                  {bn ? "বিভাগীয় হেড-টু-হেড তুলনামূলক ইনটেল" : "Head-to-Head Divisional Intelligence Comparison"}
                </h3>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                  {bn ? `${comparisonData.divA.nameBn} বনাম ${comparisonData.divB.nameBn}` : `${comparisonData.divA.nameEn} vs ${comparisonData.divB.nameEn}`}
                </Badge>
              </div>

              {/* Head to Head Cards */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Div A */}
                <div className="p-4 rounded-xl border border-border/50 bg-background/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display text-lg font-bold text-foreground">
                      {bn ? comparisonData.divA.nameBn : comparisonData.divA.nameEn} {bn ? "বিভাগ" : "Division"}
                    </h4>
                    <span className="text-xl font-bold font-mono text-red-400">
                      {comparisonData.divA.overallSeverityScore}/100
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">{bn ? "মাসিক অপরাধ মামলা:" : "Monthly Cases:"}</span>
                      <strong className="text-foreground">{comparisonData.divA.crime.totalCasesMonthly.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">{bn ? "প্রতি ১ লাখে অপরাধ:" : "Crime Rate / 100k:"}</span>
                      <strong className="text-foreground">{comparisonData.divA.crime.crimeRatePer100k}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">{bn ? "গ্যাস ঘাটতি:" : "Gas Deficit:"}</span>
                      <strong className="text-amber-400">{comparisonData.divA.resources.gas.deficitPercentage}%</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">{bn ? "দৈনিক লোডশেডিং:" : "Load Shedding:"}</span>
                      <strong className="text-purple-400">{comparisonData.divA.resources.electricity.avgLoadSheddingHours} hrs</strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">{bn ? "পানি সংকট ইনডেক্স:" : "Water Scarcity:"}</span>
                      <strong className="text-cyan-400">{comparisonData.divA.resources.water.scarcityIndex}/100</strong>
                    </div>
                  </div>
                </div>

                {/* Div B */}
                <div className="p-4 rounded-xl border border-border/50 bg-background/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display text-lg font-bold text-foreground">
                      {bn ? comparisonData.divB.nameBn : comparisonData.divB.nameEn} {bn ? "বিভাগ" : "Division"}
                    </h4>
                    <span className="text-xl font-bold font-mono text-red-400">
                      {comparisonData.divB.overallSeverityScore}/100
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">{bn ? "মাসিক অপরাধ মামলা:" : "Monthly Cases:"}</span>
                      <strong className="text-foreground">{comparisonData.divB.crime.totalCasesMonthly.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">{bn ? "প্রতি ১ লাখে অপরাধ:" : "Crime Rate / 100k:"}</span>
                      <strong className="text-foreground">{comparisonData.divB.crime.crimeRatePer100k}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">{bn ? "গ্যাস ঘাটতি:" : "Gas Deficit:"}</span>
                      <strong className="text-amber-400">{comparisonData.divB.resources.gas.deficitPercentage}%</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">{bn ? "দৈনিক লোডশেডিং:" : "Load Shedding:"}</span>
                      <strong className="text-purple-400">{comparisonData.divB.resources.electricity.avgLoadSheddingHours} hrs</strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">{bn ? "পানি সংকট ইনডেক্স:" : "Water Scarcity:"}</span>
                      <strong className="text-cyan-400">{comparisonData.divB.resources.water.scarcityIndex}/100</strong>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analytics Tabs Header */}
        <div className="flex flex-col gap-2 border-b border-border/40 pb-2 print:hidden sm:flex-row sm:items-center sm:justify-between">
          <div className="scroll-x-strip min-w-0 flex-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                activeTab === "overview"
                  ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              )}
            >
              <Activity className="h-3.5 w-3.5" />
              {bn ? "সার্বিক চার্ট" : "Overview"}
            </button>

            <button
              onClick={() => setActiveTab("map")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                activeTab === "map"
                  ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              )}
            >
              <MapIcon className="h-3.5 w-3.5 text-cyan-400" />
              {bn ? "জিও-ম্যাপ হিটম্যাপ" : "Geo-Map Heatmap"}
            </button>

            <button
              onClick={() => setActiveTab("crime")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                activeTab === "crime"
                  ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              )}
            >
              <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
              {bn ? "অপরাধের ধরন & %" : "Crime Breakdown"}
            </button>

            <button
              onClick={() => setActiveTab("resources")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                activeTab === "resources"
                  ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              )}
            >
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              {bn ? "গ্যাস ও শক্তি সংকট" : "Gas & Energy"}
            </button>

            <button
              onClick={() => setActiveTab("forecast")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                activeTab === "forecast"
                  ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              )}
            >
              <Calendar className="h-3.5 w-3.5 text-cyan-400" />
              {bn ? "এআই ৩০ দিনের পূর্বাভাস" : "AI 30-Day Forecast"}
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                activeTab === "history"
                  ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              )}
            >
              <History className="h-3.5 w-3.5 text-emerald-400" />
              {bn ? "বাৎসরিক ইতিহাস (YoY)" : "Historical YoY"}
            </button>

            <button
              onClick={() => setActiveTab("radar")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                activeTab === "radar"
                  ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              )}
            >
              <RadarIcon className="h-3.5 w-3.5 text-purple-400" />
              {bn ? "রাডার ফিঙ্গারপ্রিন্ট" : "Radar Matrix"}
            </button>

            <button
              onClick={() => setActiveTab("hotlines")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                activeTab === "hotlines"
                  ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                  : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              )}
            >
              <PhoneCall className="h-3.5 w-3.5 text-emerald-400" />
              {bn ? "জরুরি হটলাইন" : "Hotlines"}
            </button>
          </div>

          <span className="text-[11px] text-muted-foreground hidden sm:inline font-mono">
            {bn ? `প্রদর্শিত: ${filteredDivisions.length} টি বিভাগ` : `Showing: ${filteredDivisions.length} divisions`}
          </span>
        </div>

        {/* Tab: Geo-Spatial Interactive Heatmap */}
        {(activeTab === "overview" || activeTab === "map") && (
          <DivisionalMap
            divisions={mapDivisions}
            selectedDivisionId={filters.divisionId}
            onSelectDivision={(id) => setFilters({ ...filters, divisionId: id })}
            liveUpdatedAt={livePulse?.generatedAt}
            compareDivisionIds={compareDivisionIds}
            onComparePick={(id) => handleCompareClick(id)}
            liveAlerts={liveAlerts}
            onAlertFromSite={handlePinAlert}
            onSelectDistrict={handleDistrictSelect}
            stressSurgePercentage={filters.stressSurgePercentage}
            onStressChange={(value) => setFilters({ ...filters, stressSurgePercentage: value })}
            timelineHour={timelineHour}
            onTimelineHourChange={setTimelineHour}
            timelinePlaying={timelinePlaying}
            onTimelinePlayingChange={setTimelinePlaying}
          />
        )}

        {/* Tab 1: Overview & Interactive Bar / Pie Charts */}
        {(activeTab === "overview" || activeTab === "crime") && (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Chart 1: Crime Comparison Bar Chart across Divisions */}
            <div className="lg:col-span-7 space-y-3">
              <IntelCard accent="danger" padding="md">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-display text-sm font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-red-400" />
                      {bn ? "৮ বিভাগে অপরাধের হার ও তুলনামূলক চিত্র" : "Division Crime Rate & Case Load Comparison"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {bn ? "প্রতি বিভাগে মোট অপরাধ মামলার সংখ্যা ও ক্রাইসিস স্কোর" : "Total reported crime cases and severity score per division"}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-300">
                    {bn ? "লাইভ ইনটেল" : "Live Intel"}
                  </Badge>
                </div>

                <div className="w-full pt-2" style={{ height: layout.chartHeightLg }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={crimeComparisonChartData} margin={{ top: 28, right: 16, left: 0, bottom: 28 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                      <XAxis
                        dataKey={bn ? "name" : "nameEn"}
                        tick={layout.tick}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={56}
                      />
                      <YAxis tick={layout.tick} width={layout.yAxisNumberWidth} />
                      <Tooltip
                        {...chartTooltipProps}
                        formatter={(value, name) => [
                          value as number,
                          name === "totalCases"
                            ? (bn ? "মোট অপরাধ মামলা" : "Total Cases")
                            : (bn ? "ক্রাইসিস স্কোর" : "Crisis Score"),
                        ]}
                      />
                      <Bar dataKey="totalCases" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={layout.barMaxSize} name={bn ? "মোট মামলা" : "Total Cases"}>
                        {crimeComparisonChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.severityScore >= 85
                                ? "#ef4444"
                                : entry.severityScore >= 75
                                ? "#f97316"
                                : "#eab308"
                            }
                          />
                        ))}
                        <LabelList dataKey="totalCases" position="top" style={layout.labelList} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </IntelCard>
            </div>

            {/* Chart 2: Crime Percentage Breakdown Donut Chart */}
            <div className="lg:col-span-5 space-y-3">
              <IntelCard accent="warning" padding="md">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-display text-base font-semibold flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5 text-amber-400" />
                      {bn ? "জাতীয় অপরাধের ধরণ ও শতাংশ (Percentage)" : "National Crime Breakdown & Percentage"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {bn ? "অপরাধের ধরণের শতকরা ভাগের অনুপাত" : "Distribution percentage of major crime categories"}
                    </p>
                  </div>
                </div>

                <div className="w-full overflow-visible" style={{ height: Math.max(layout.pieChartHeight, 340) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ ...layout.pieMargin, bottom: 20 }}>
                      <Pie
                        data={aggregateCrimeTypeBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={layout.pieInner}
                        outerRadius={layout.pieOuter}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey={bn ? "nameBn" : "name"}
                        /* Percent only on the ring — full names live in the list below */
                        label={(props) =>
                          piePercentLabel({
                            ...props,
                            showName: false,
                            fontSize: layout.pieFontSize,
                            offset: layout.pieLabelOffset,
                          })
                        }
                        labelLine={{ stroke: "#94a3b8", strokeWidth: 1.25 }}
                      >
                        {aggregateCrimeTypeBreakdown.map((entry, index) => (
                          <Cell key={`pie-cell-${index}`} fill={CRIME_COLORS[index % CRIME_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        {...chartTooltipProps}
                        formatter={(value, _name, item) => [
                          `${Number(value).toLocaleString()} (${item.payload.percentage}%)`,
                          bn ? item.payload.nameBn : item.payload.name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Full labels + % — no truncation so Bangla names stay readable */}
                <div className="grid grid-cols-1 gap-2 pt-3 border-t border-border/40 sm:grid-cols-2">
                  {aggregateCrimeTypeBreakdown.map((item, idx) => (
                    <div
                      key={item.name}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border/20 bg-background/30 p-2.5"
                    >
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span
                          className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full"
                          style={{ backgroundColor: CRIME_COLORS[idx % CRIME_COLORS.length] }}
                        />
                        <span className="text-sm font-semibold leading-snug text-foreground/95">
                          {bn ? item.nameBn : item.name}
                        </span>
                      </div>
                      <span className="shrink-0 text-base font-extrabold tabular-nums text-foreground">
                        {item.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </IntelCard>
            </div>
          </div>
        )}

        {/* Tab: AI 30-Day Predictive Trend Forecast */}
        {activeTab === "forecast" && (
          <div className="space-y-4">
            <IntelCard accent="default" padding="md">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display text-base font-semibold flex items-center gap-2 text-cyan-300">
                    <Calendar className="h-5 w-5 text-cyan-400" />
                    {bn ? "এআই ৩০ দিনের অপরাধ ও শক্তি ফোরকাস্ট (Predictive Model)" : "AI 30-Day Predictive Crime & Power Outage Forecast"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {bn ? "মৌসুমী প্রবণতা ও ঐতিহাসিক ডেটা বিশ্লেষণ করে আগামী ২ মাসের আনুমানিক পূর্বাভাস।" : "30-day to 60-day predictive analytics projecting seasonal crime spikes and power strain."}
                  </p>
                </div>
              </div>

              <div className="w-full" style={{ height: layout.chartHeightMd }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastChartData} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                    <XAxis dataKey={bn ? "periodBn" : "period"} tick={layout.tick} />
                    <YAxis yAxisId="left" tick={layout.tick} width={layout.yAxisNumberWidth} />
                    {layout.showSecondaryYAxis && (
                      <YAxis yAxisId="right" orientation="right" tick={{ ...layout.tick, fill: "#c084fc" }} width={layout.yAxisNumberWidth} />
                    )}
                    <Tooltip {...chartTooltipProps} />
                    <Legend wrapperStyle={layout.legend} />
                    <Area yAxisId="left" type="monotone" dataKey="cases" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} strokeWidth={2.5} name={bn ? "পূর্বাভাসকৃত মোট অপরাধ" : "Projected Crime Cases"} />
                    <Area yAxisId={layout.showSecondaryYAxis ? "right" : "left"} type="monotone" dataKey="loadShedding" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} strokeWidth={2.5} name={bn ? "পূর্বাভাসকৃত লোডশেডিং (ঘণ্টা)" : "Projected Load-shedding (hrs)"} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </IntelCard>

            {/* Division Seasonal Warning Cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              {filteredDivisions.map((div) => (
                <div key={div.id} className="p-3 rounded-xl bg-background/50 border border-border/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{bn ? div.nameBn : div.nameEn}</span>
                    <Badge variant="outline" className="text-[10px] bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
                      {bn ? "মৌসুমী সতর্কতা" : "Seasonal Warning"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    {bn ? div.forecast30Days[1]?.seasonalWarning_bn : div.forecast30Days[1]?.seasonalWarning}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Historical YoY Trend Comparison */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <IntelCard accent="success" padding="md">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display text-base font-semibold flex items-center gap-2 text-emerald-300">
                    <History className="h-5 w-5 text-emerald-400" />
                    {bn ? "বাৎসরিক ঐতিহাসিক অপরাধ ও লোডশেডিং ধারা (২০২৪ - ২০২৬)" : "Historical Year-over-Year (YoY) Crime & Outage Growth (2024 - 2026)"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {bn ? "বিগত বছরগুলোর তুলনা করে দীর্ঘমেয়াদী পরিবর্তন বিশ্লেষণ।" : "Multi-year historical analytics tracking divisional growth trajectories."}
                  </p>
                </div>
              </div>

              <div className="w-full" style={{ height: layout.chartHeightMd }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historicalYoYChartData} margin={{ top: 28, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                    <XAxis dataKey="year" tick={layout.tick} />
                    <YAxis tick={layout.tick} width={52} />
                    <Tooltip {...chartTooltipProps} />
                    <Legend wrapperStyle={layout.legend} />
                    <Bar dataKey="totalCrimes" fill="#10b981" name={bn ? "বাৎসরিক মোট অপরাধ" : "Annual Total Crimes"} radius={[6, 6, 0, 0]} maxBarSize={48}>
                      <LabelList dataKey="totalCrimes" position="top" style={layout.labelList} />
                    </Bar>
                    <Bar dataKey="avgLoadShedding" fill="#f59e0b" name={bn ? "গড় লোডশেডিং (ঘণ্টা)" : "Avg Load-shedding (hrs)"} radius={[6, 6, 0, 0]} maxBarSize={48}>
                      <LabelList dataKey="avgLoadShedding" position="top" style={layout.labelList} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </IntelCard>
          </div>
        )}

        {/* Tab: Multi-Dimensional Radar Chart Matrix */}
        {activeTab === "radar" && (
          <div className="space-y-4">
            <IntelCard accent="default" padding="md">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display text-base font-semibold flex items-center gap-2 text-purple-300">
                    <RadarIcon className="h-5 w-5 text-purple-400" />
                    {bn ? "৮ বিভাগীয় মাল্টি-ডাইমেনশনাল ক্রাইসিস ফিঙ্গারপ্রিন্ট (Radar)" : "8 Division Multi-Dimensional Crisis Radar Fingerprint"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {bn ? "অপরাধের হার, গ্যাস ঘাটতি, তেল সংকট, বিদ্যুৎ ঘাটতি, পানি সংকট ও মূল্যস্ফীতির যৌগিক তুলনামূলক ম্যাট্রিক্স।" : "Composite radar fingerprint mapping crime rate, gas shortage, fuel deficit, load-shedding, water index & inflation across divisions."}
                  </p>
                </div>
              </div>

              <div className="w-full" style={{ height: layout.chartHeightLg }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius={layout.narrow ? "58%" : "75%"} data={radarChartData}>
                    <PolarGrid stroke="rgba(148,163,184,0.15)" />
                    <PolarAngleAxis dataKey={bn ? "subjectBn" : "subject"} tick={layout.tickMuted} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={layout.tickMuted} tickFormatter={(v) => `${v}%`} />
                    {filteredDivisions.map((div) => (
                      <Radar
                        key={div.id}
                        name={bn ? div.nameBn : div.nameEn}
                        dataKey={div.id}
                        stroke={DIVISION_COLOR_MAP[div.id] || "#3b82f6"}
                        fill={DIVISION_COLOR_MAP[div.id] || "#3b82f6"}
                        fillOpacity={0.12}
                        strokeWidth={2}
                      />
                    ))}
                    <Tooltip {...chartTooltipProps} />
                    <Legend wrapperStyle={layout.legend} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </IntelCard>
          </div>
        )}

        {/* Tab: Resource Crisis Analysis (Gas, Tel/Oil, Electricity, Water) */}
        {(activeTab === "overview" || activeTab === "resources") && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-semibold flex items-center gap-2">
                  <Flame className="h-5 w-5 text-amber-400" />
                  {bn ? "৮ বিভাগে গ্যাস, তেল ও বিদ্যুৎ সংকটের তুলনামূলক চিত্র" : "Division Resource Deficit & Scarcity Metrics"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {bn ? "গ্যাসের ঘাটতি %, তেলের মজুদ সংকট, লোডশেডিংয়ের ঘণ্টা ও পানি শূন্যতার ইনডেক্স" : "Gas deficit %, fuel stock shortage, power outages and water scarcity"}
                </p>
              </div>
            </div>

            {/* Multi-Metric Resource Chart */}
            <IntelCard accent="warning" padding="md">
              <div className="w-full" style={{ height: layout.chartHeightMd }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resourceCrisisChartData} margin={{ top: 16, right: 16, left: 4, bottom: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                    <XAxis dataKey={bn ? "name" : "nameEn"} tick={layout.tick} />
                    <YAxis tick={layout.tick} tickFormatter={(v) => `${v}%`} width={48} />
                    <Tooltip {...chartTooltipProps} />
                    <Legend wrapperStyle={layout.legend} />
                    <Bar dataKey="gasDeficit" fill="#f59e0b" name={bn ? "গ্যাস ঘাটতি (%)" : "Gas Deficit (%)"} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="fuelDeficit" fill="#f97316" name={bn ? "তেল/জ্বালানি সংকট (%)" : "Fuel Stock Deficit (%)"} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="loadSheddingHours" fill="#a855f7" name={bn ? "দৈনিক লোডশেডিং (ঘণ্টা)" : "Load-shedding (hrs)"} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="waterScarcity" fill="#06b6d4" name={bn ? "পানি সংকট ইনডেক্স" : "Water Scarcity Index"} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </IntelCard>
          </div>
        )}

        {/* Comprehensive Grid of 8 Division Intel Cards */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <h3 className="font-display text-base font-semibold flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              {bn ? "বিভাগ ভিত্তিক বিস্তারিত ইনসাইট কার্ডসমূহ (৮ বিভাগ)" : "Division Detailed Intel Cards (8 Divisions)"}
            </h3>
            <span className="text-xs text-muted-foreground font-mono">
              {bn ? "কার্ডে ক্লিক করে জেলা ও বিস্তারিত ইনটেল দেখুন" : "Click card to view district drill-down & details"}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {filteredDivisions.map((div, idx) => {
              const isSelected = selectedDivision?.id === div.id;
              const isComparing = compareDivisionIds && (compareDivisionIds[0] === div.id || compareDivisionIds[1] === div.id);
              const severityColor =
                div.overallSeverityScore >= 80
                  ? "border-red-500/40 bg-red-500/5 text-red-400"
                  : div.overallSeverityScore >= 70
                  ? "border-amber-500/40 bg-amber-500/5 text-amber-400"
                  : "border-emerald-500/40 bg-emerald-500/5 text-emerald-400";

              return (
                <motion.div
                  key={div.id}
                  layout
                  onClick={() => setSelectedDivision(isSelected ? null : div)}
                  className="cursor-pointer"
                >
                  <IntelCard
                    index={idx}
                    accent={
                      div.overallSeverityScore >= 80
                        ? "danger"
                        : div.overallSeverityScore >= 70
                        ? "warning"
                        : "default"
                    }
                    padding="md"
                    className={cn(
                      "transition-all duration-200 hover:scale-[1.01] relative",
                      isSelected && "ring-2 ring-primary shadow-lg shadow-primary/10",
                      isComparing && "ring-2 ring-purple-500"
                    )}
                  >
                    {/* Division Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-display text-lg font-bold text-foreground">
                            {bn ? div.nameBn : div.nameEn} {bn ? "বিভাগ" : "Division"}
                          </h4>
                          <Badge variant="outline" className={cn("text-[11px] font-semibold", severityColor)}>
                            {bn ? div.riskLevel_bn : div.riskLevel}
                          </Badge>
                          {isComparing && (
                            <Badge className="bg-purple-500 text-white text-[9px] font-mono">
                              {bn ? "তুলনায় যুক্ত" : "Comparing"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span>
                            {bn ? `সদরদপ্তর: ${div.headquarters_bn}` : `HQ: ${div.headquarters}`}
                          </span>
                          <span>•</span>
                          <span>
                            {bn ? `${div.districtsCount} টি জেলা` : `${div.districtsCount} Districts`}
                          </span>
                          <span>•</span>
                          <span>
                            {bn ? `${div.populationMillions} মিলিয়ন মানুষ` : `${div.populationMillions}M Pop.`}
                          </span>
                        </p>
                      </div>

                      {/* Action Buttons & Crisis Severity Badge */}
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDistrictModalDiv(div);
                            }}
                            title={bn ? "জেলা ভিত্তিক ড্রিল-ডাউন দেখুন" : "District Level Drill-down"}
                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg gap-1"
                          >
                            <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                            <span>{bn ? "জেলা ভিউ" : "Districts"}</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleCompareClick(div.id, e)}
                            title={bn ? "বিভাগ তুলনা করুন" : "Compare Division"}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-purple-400 hover:bg-purple-500/10 rounded-lg"
                          >
                            <Scale className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveIncidentModal(div);
                            }}
                            title={bn ? "জরুরি অ্যালার্ট ও হটলাইন" : "Emergency Alert & Hotlines"}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                          >
                            <Siren className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div
                          className={cn(
                            "text-2xl font-bold font-mono tabular-nums",
                            div.overallSeverityScore >= 80
                              ? "text-red-400"
                              : div.overallSeverityScore >= 70
                              ? "text-amber-400"
                              : "text-emerald-400"
                          )}
                        >
                          {div.overallSeverityScore}
                          <span className="text-xs font-normal text-muted-foreground">/100</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-border/40">
                      {/* Crime Section */}
                      <div className="bg-background/40 p-2.5 rounded-lg border border-border/30">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                            <ShieldAlert className="h-3 w-3 text-red-400" />
                            {bn ? "অপরাধের মাসিক হার" : "Monthly Crime"}
                          </span>
                          <span className="text-xs font-bold text-red-400 tabular-nums">
                            {div.crime.totalCasesMonthly.toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{bn ? "প্রতি ১ লাখে:" : "Per 100k:"} {div.crime.crimeRatePer100k}</span>
                          <span className={cn("font-semibold flex items-center gap-0.5", div.crime.trendChange > 0 ? "text-red-400" : "text-emerald-400")}>
                            {div.crime.trendChange > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {div.crime.trendChange > 0 ? `+${div.crime.trendChange}%` : `${div.crime.trendChange}%`}
                          </span>
                        </div>
                      </div>

                      {/* Gas & Fuel Crisis */}
                      <div className="bg-background/40 p-2.5 rounded-lg border border-border/30">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                            <Flame className="h-3 w-3 text-amber-400" />
                            {bn ? "গ্যাস ও তেল ঘাটতি" : "Gas & Fuel Shortage"}
                          </span>
                          <span className="text-xs font-bold text-amber-400 tabular-nums">
                            {div.resources.gas.deficitPercentage}% {bn ? "ঘাটতি" : "Deficit"}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{bn ? "তেল মজুত:" : "Oil Stock:"} -{div.resources.fuelOil.stockDeficitPercentage}%</span>
                          <span className="font-semibold text-amber-300">
                            {bn ? `কিউ: ${div.resources.fuelOil.stationQueueIndex_bn}` : `Queue: ${div.resources.fuelOil.stationQueueIndex}`}
                          </span>
                        </div>
                      </div>

                      {/* Power Outages */}
                      <div className="bg-background/40 p-2.5 rounded-lg border border-border/30">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                            <Zap className="h-3 w-3 text-purple-400" />
                            {bn ? "দৈনিক লোডশেডিং" : "Daily Power Outage"}
                          </span>
                          <span className="text-xs font-bold text-purple-300 tabular-nums">
                            {div.resources.electricity.avgLoadSheddingHours} {bn ? "ঘণ্টা" : "hrs"}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                          {bn ? div.resources.electricity.ruralStatus_bn : div.resources.electricity.ruralStatus}
                        </p>
                      </div>

                      {/* Water & Scarcity */}
                      <div className="bg-background/40 p-2.5 rounded-lg border border-border/30">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                            <Droplets className="h-3 w-3 text-cyan-400" />
                            {bn ? "পানি ও নিত্যপণ্য সংকট" : "Water & Commodities"}
                          </span>
                          <span className="text-xs font-bold text-cyan-300 tabular-nums">
                            {div.resources.water.scarcityIndex}/100
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                          {bn ? div.resources.water.salinityOrDepletion_bn : div.resources.water.salinityOrDepletion}
                        </p>
                      </div>
                    </div>

                    {/* Crime Breakdown Progress Bars */}
                    <div className="mt-3 space-y-2">
                      <div className="space-y-1 text-sm font-semibold text-muted-foreground">
                        <span>{bn ? "শীর্ষ অপরাধের ধরণ ও শতাংশ:" : "Top Crime Breakdown (%):"}</span>
                        <p className="text-xs font-mono font-normal leading-snug text-muted-foreground">
                          {bn
                            ? `হটস্পট: ${div.crime.topHotspots_bn.join(", ")}`
                            : `Hotspots: ${div.crime.topHotspots.join(", ")}`}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {div.crime.breakdown.slice(0, 5).map((item, idx) => (
                          <div key={item.type} className="space-y-1">
                            <div className="flex items-center justify-between text-sm gap-2">
                              <span className="text-foreground/90 font-semibold">{bn ? item.type_bn : item.type}</span>
                              <span className="text-base font-extrabold tabular-nums text-foreground shrink-0">
                                {item.percentage}%
                                <span className="ml-1.5 text-xs font-semibold text-muted-foreground">
                                  ({item.count.toLocaleString()})
                                </span>
                              </span>
                            </div>
                            <div className="h-2.5 w-full bg-secondary/50 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${item.percentage}%`,
                                  backgroundColor: CRIME_COLORS[idx % CRIME_COLORS.length],
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-primary/30 space-y-3"
                        >
                          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-2 text-xs">
                            <div className="font-semibold text-primary flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4" />
                              {bn ? `${div.nameBn} বিভাগীয় জরুরি বার্তা ও ইনটেল` : `${div.nameEn} Divisional Actionable Intel`}
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                              {bn
                                ? `গ্যাস ও জ্বালানি ঘাটতির কারণে ${div.headquarters_bn} শিল্পাঞ্চলে গ্যাসের চাপ কমে গেছে। পাশাপাশি ${div.crime.topHotspots_bn.join(", ")} এলাকায় নিরাপত্তা পেট্রোল জোরদার করা হয়েছে।`
                                : `Gas & fuel shortages have impacted industrial areas around ${div.headquarters}. Security patrols tightened in ${div.crime.topHotspots.join(", ")}.`}
                            </p>
                          </div>

                          {/* Emergency Contacts List */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                            <div className="p-2 rounded bg-background/50 border border-border/40">
                              <span className="text-[10px] text-muted-foreground block">{bn ? "পুলিশ কন্ট্রোল রুম:" : "Police Control:"}</span>
                              <span className="font-semibold text-red-400 font-mono">{div.emergencyContacts.policeHelpline}</span>
                            </div>
                            <div className="p-2 rounded bg-background/50 border border-border/40">
                              <span className="text-[10px] text-muted-foreground block">{bn ? "গ্যাস জরুরি সেবা:" : "Gas Emergency:"}</span>
                              <span className="font-semibold text-amber-400 font-mono">{div.emergencyContacts.gasEmergency}</span>
                            </div>
                            <div className="p-2 rounded bg-background/50 border border-border/40">
                              <span className="text-[10px] text-muted-foreground block">{bn ? "বিদ্যুৎ হেল্পলাইন:" : "Power Helpline:"}</span>
                              <span className="font-semibold text-purple-400 font-mono">{div.emergencyContacts.powerHelpline}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </IntelCard>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Tab 5: Emergency Hotline Directory */}
        {(activeTab === "hotlines" || activeTab === "overview") && (
          <div className="space-y-4 pt-4 border-t border-border/40">
            <h3 className="font-display text-base font-semibold flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-emerald-400" />
              {bn ? "জাতীয় ও বিভাগীয় জরুরি সহায়তা হটলাইন ডিরেক্টরি" : "National & Divisional Emergency Hotline Directory"}
            </h3>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <IntelCard accent="success" padding="sm">
                <div className="text-xs font-semibold text-emerald-400">{bn ? "জাতীয় জরুরি সেবা" : "National Emergency"}</div>
                <div className="text-2xl font-bold font-mono text-foreground mt-1">999</div>
                <div className="text-[10px] text-muted-foreground mt-1">{bn ? "পুলিশ, ফায়ার সার্ভিস ও অ্যাম্বুলেন্স" : "Police, Fire & Ambulance"}</div>
              </IntelCard>

              <IntelCard accent="warning" padding="sm">
                <div className="text-xs font-semibold text-amber-400">{bn ? "গ্যাস জরুরি সেন্ট্রাল হেল্পলাইন" : "Gas Central Helpline"}</div>
                <div className="text-2xl font-bold font-mono text-foreground mt-1">16496</div>
                <div className="text-[10px] text-muted-foreground mt-1">{bn ? "তিতাস, বাখরাবাদ, কেজিডিবিসিএল" : "Titas, KGDCL & Gas Leaks"}</div>
              </IntelCard>

              <IntelCard accent="default" padding="sm">
                <div className="text-xs font-semibold text-purple-400">{bn ? "বিদ্যুৎ সেন্ট্রাল হেল্পলাইন" : "Power Central Helpline"}</div>
                <div className="text-2xl font-bold font-mono text-foreground mt-1">16999</div>
                <div className="text-[10px] text-muted-foreground mt-1">{bn ? "ডিপিডিসি, ডেসকো, আরইবি, পিজিসিবি" : "PDB, DPDC, DESCO, REB"}</div>
              </IntelCard>

              <IntelCard accent="default" padding="sm">
                <div className="text-xs font-semibold text-cyan-400">{bn ? "ভোক্তা অধিকার সংরক্ষণ" : "Consumer Rights Hotline"}</div>
                <div className="text-2xl font-bold font-mono text-foreground mt-1">19121</div>
                <div className="text-[10px] text-muted-foreground mt-1">{bn ? "নিত্যপণ্যের বাজারে অনিয়ম ও চাঁদাবাজি" : "Price Gouging & Commodity Fraud"}</div>
              </IntelCard>
            </div>
          </div>
        )}

        {/* Citizen Incident Report Modal */}
        <AnimatePresence>
          {showCitizenReportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-primary/40 bg-background/95 space-y-4 relative shadow-2xl"
              >
                <button
                  onClick={() => setShowCitizenReportModal(false)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary/60"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-3 border-b border-border/40 pb-3">
                  <div className="p-2.5 rounded-xl bg-primary/20 text-primary">
                    <PlusCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">
                      {bn ? "নাগরিক ও ফিল্ড কর্মকর্তা জরুরি রিপোর্ট সাবমিশন" : "Submit Citizen & Field Incident Report"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {bn ? "তাৎক্ষণিক স্থানীয় অপরাধ বা গ্যাস/বিদ্যুৎ ঘটনার তথ্য জমা দিন" : "Submit live crime, gas leak, or outage incident report"}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCitizenSubmit} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-muted-foreground font-medium">{bn ? "বিভাগ নির্বাচন:" : "Select Division:"}</label>
                      <AppSelect
                        value={reportForm.divisionId}
                        onValueChange={(value) => setReportForm({ ...reportForm, divisionId: value })}
                        className="w-full"
                        triggerClassName="w-full"
                        options={divisions.map((d) => ({
                          value: d.id,
                          label: bn ? d.nameBn : d.nameEn,
                        }))}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-muted-foreground font-medium">{bn ? "জরুরিতা:" : "Urgency:"}</label>
                      <AppSelect
                        value={reportForm.urgency}
                        onValueChange={(value) =>
                          setReportForm({
                            ...reportForm,
                            urgency: value as "critical" | "warning" | "info",
                          })
                        }
                        className="w-full"
                        triggerClassName="w-full"
                        options={[
                          { value: "critical", label: bn ? "জরুরি (Critical)" : "Critical" },
                          { value: "warning", label: bn ? "সতর্কতা (Warning)" : "Warning" },
                          { value: "info", label: bn ? "তথ্য (Info)" : "Info" },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground font-medium">{bn ? "ক্যাটাগরি:" : "Category:"}</label>
                    <AppSelect
                      value={reportForm.category}
                      onValueChange={(value) => setReportForm({ ...reportForm, category: value })}
                      className="w-full"
                      triggerClassName="w-full"
                      options={[
                        { value: "গ্যাস লিকেজ / স্বল্পচাপ", label: bn ? "গ্যাস লিকেজ / স্বল্পচাপ" : "Gas leak / low pressure" },
                        { value: "তেল / পাম্প সংকট", label: bn ? "তেল / পাম্প সংকট" : "Fuel / pump shortage" },
                        { value: "বিদ্যুৎ লোডশেডিং", label: bn ? "বিদ্যুৎ লোডশেডিং" : "Power load-shedding" },
                        { value: "পানি সংকট", label: bn ? "পানি সংকট" : "Water scarcity" },
                        { value: "অপরাধ / নিরাপত্তা", label: bn ? "অপরাধ / নিরাপত্তা" : "Crime / security" },
                      ]}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground font-medium">{bn ? "ঘটনার শিরোনাম:" : "Incident Title:"}</label>
                    <input
                      type="text"
                      required
                      placeholder={bn ? "যেমন: গ্যাস লিকেজ ও তীব্র গন্ধ" : "e.g., Gas leakage alert in Tongi"}
                      value={reportForm.title}
                      onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                      className="w-full rounded-lg border border-border/50 bg-background px-3 py-1.5 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground font-medium">{bn ? "সুনির্দিষ্ট স্থান / জেলা:" : "Specific Location / District:"}</label>
                    <input
                      type="text"
                      required
                      placeholder={bn ? "যেমন: মিরপুর ১০ নাম্বার মোড়, ঢাকা" : "e.g., Mirpur 10 Circle, Dhaka"}
                      value={reportForm.location}
                      onChange={(e) => setReportForm({ ...reportForm, location: e.target.value })}
                      className="w-full rounded-lg border border-border/50 bg-background px-3 py-1.5 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-muted-foreground font-medium">{bn ? "বিবরণ:" : "Description:"}</label>
                    <textarea
                      rows={3}
                      placeholder={bn ? "ঘটনার অতিরিক্ত তথ্য লিখুন..." : "Enter details about the incident..."}
                      value={reportForm.description}
                      onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                      className="w-full rounded-lg border border-border/50 bg-background px-3 py-1.5 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <Button variant="outline" size="sm" type="button" onClick={() => setShowCitizenReportModal(false)}>
                      {bn ? "বাতিল" : "Cancel"}
                    </Button>
                    <Button variant="default" size="sm" type="submit" className="gap-1.5">
                      <Send className="h-3.5 w-3.5" />
                      {bn ? "রিপোর্ট জমা দিন" : "Submit Incident"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* District Drill-Down Modal */}
        <AnimatePresence>
          {activeDistrictModalDiv && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-panel w-full max-w-2xl p-6 rounded-2xl border border-cyan-500/40 bg-background/95 space-y-4 relative shadow-2xl max-h-[85vh] overflow-y-auto"
              >
                <button
                  onClick={() => setActiveDistrictModalDiv(null)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary/60"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-3 border-b border-border/40 pb-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">
                      {bn ? `${activeDistrictModalDiv.nameBn} বিভাগীয় জেলা-ভিত্তিক ড্রিল-ডাউন (Districts)` : `${activeDistrictModalDiv.nameEn} Division District Drill-Down`}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {bn ? `${activeDistrictModalDiv.districtsCount} টি জেলার অপরাধ, লোডশেডিং ও হটস্পটের তালিকা` : `Individual metrics across ${activeDistrictModalDiv.districtsCount} districts`}
                    </p>
                  </div>
                </div>

                {/* District Cards Grid */}
                <div className="grid sm:grid-cols-2 gap-3 pt-1">
                  {activeDistrictModalDiv.districts.map((dist) => (
                    <button
                      type="button"
                      key={dist.id}
                      onClick={() => setSelectedDistrict(dist)}
                      className={cn(
                        "p-3.5 rounded-xl bg-background/60 border space-y-2 text-left transition-all hover:border-cyan-500/40",
                        selectedDistrict?.id === dist.id
                          ? "border-cyan-400/60 ring-1 ring-cyan-400/40"
                          : "border-border/50",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-foreground">{bn ? dist.nameBn : dist.nameEn}</h4>
                        <span className="text-xs font-mono font-bold text-red-400">
                          {dist.severityScore}/100
                        </span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-muted-foreground">
                          <span>{bn ? "মাসিক অপরাধ মামলা:" : "Monthly Cases:"}</span>
                          <strong className="text-foreground">{dist.totalCrimeCasesMonthly}</strong>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>{bn ? "লোডশেডিং:" : "Load-shedding:"}</span>
                          <strong className="text-purple-400">{dist.loadSheddingHours} hrs</strong>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>{bn ? "গ্যাস ঘাটতি:" : "Gas Deficit:"}</span>
                          <strong className="text-amber-400">{dist.gasDeficitPercentage}%</strong>
                        </div>
                      </div>

                      <div className="pt-1.5 border-t border-border/30 flex items-center justify-between gap-2 text-[11px]">
                        <span className="shrink-0 text-muted-foreground">{bn ? "প্রধান হটস্পট:" : "Top Hotspot:"}</span>
                        <Badge variant="outline" className="max-w-[70%] whitespace-normal text-left text-[10px] leading-snug bg-red-500/10 text-red-300 border-red-500/30">
                          {bn ? dist.topHotspot_bn : dist.topHotspot}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <Button variant="default" size="sm" onClick={() => setActiveDistrictModalDiv(null)} className="text-xs">
                    {bn ? "বন্ধ করুন" : "Close"}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Incident Alert Modal */}
        <AnimatePresence>
          {activeIncidentModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-red-500/40 bg-background/95 space-y-4 relative shadow-2xl"
              >
                <button
                  onClick={() => setActiveIncidentModal(null)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary/60"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-3 border-b border-border/40 pb-3">
                  <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400">
                    <Siren className="h-6 w-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">
                      {bn ? `${activeIncidentModal.nameBn} বিভাগীয় ক্রাইসিস রেসপন্স ডিরেক্টরি` : `${activeIncidentModal.nameEn} Division Crisis Response Directory`}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {bn ? "জরুরি হটলাইন, কন্ট্রোল রুম ও তাৎক্ষণিক পদক্ষেপ" : "Emergency hotline numbers, control room & swift dispatch protocol"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 space-y-1">
                    <span className="font-semibold text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      {bn ? "পুলিশ ও র্যাব জরুরি হেল্পলাইন" : "Police & RAB Emergency Helpline"}
                    </span>
                    <p className="text-foreground font-mono text-sm font-bold">
                      {activeIncidentModal.emergencyContacts.policeHelpline}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1">
                    <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                      <Flame className="h-4 w-4" />
                      {bn ? "গ্যাস সরবরাহ ও লিকেজ জরুরী নম্বর" : "Gas Supply & Leakage Emergency Number"}
                    </span>
                    <p className="text-foreground font-mono text-sm font-bold">
                      {activeIncidentModal.emergencyContacts.gasEmergency}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 space-y-1">
                    <span className="font-semibold text-purple-400 flex items-center gap-1.5">
                      <Zap className="h-4 w-4" />
                      {bn ? "বিদ্যুৎ গ্রিড কন্ট্রোল সেন্টার" : "Power Grid Control Center"}
                    </span>
                    <p className="text-foreground font-mono text-sm font-bold">
                      {activeIncidentModal.emergencyContacts.powerHelpline}
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 space-y-1">
                    <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                      <Droplets className="h-4 w-4" />
                      {bn ? "ওয়াসা / ডিসি অফিস কন্ট্রোল রুম" : "WASA / DC Office Control Room"}
                    </span>
                    <p className="text-foreground font-mono text-sm font-bold">
                      {activeIncidentModal.emergencyContacts.dcOfficeControl}
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button variant="default" size="sm" onClick={() => setActiveIncidentModal(null)} className="text-xs">
                    {bn ? "বন্ধ করুন" : "Close"}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ModuleShell>
  );
}
