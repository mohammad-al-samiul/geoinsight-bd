"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { MapPin, ShieldAlert, Flame, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DivisionCrisisData } from "@/lib/divisional-crisis-data";

interface DivisionalMapProps {
  divisions: DivisionCrisisData[];
  selectedDivisionId: string;
  onSelectDivision: (id: string) => void;
}

// 8 Divisions simplified interactive SVG layout coordinates & labels
const DIVISION_SVG_PATHS = [
  {
    id: "rangpur",
    nameEn: "Rangpur",
    nameBn: "রংপুর",
    path: "M 130 30 L 190 25 L 210 75 L 150 90 L 110 70 Z",
    labelPos: { x: 160, y: 55 },
  },
  {
    id: "rajshahi",
    nameEn: "Rajshahi",
    nameBn: "রাজশাহী",
    path: "M 110 70 L 150 90 L 160 150 L 90 140 L 80 90 Z",
    labelPos: { x: 120, y: 110 },
  },
  {
    id: "mymensingh",
    nameEn: "Mymensingh",
    nameBn: "ময়মনসিংহ",
    path: "M 210 75 L 280 70 L 290 115 L 210 110 L 190 85 Z",
    labelPos: { x: 245, y: 92 },
  },
  {
    id: "sylhet",
    nameEn: "Sylhet",
    nameBn: "সিলেট",
    path: "M 280 70 L 370 60 L 380 120 L 290 115 Z",
    labelPos: { x: 330, y: 90 },
  },
  {
    id: "dhaka",
    nameEn: "Dhaka",
    nameBn: "ঢাকা",
    path: "M 160 150 L 210 110 L 290 115 L 270 190 L 180 200 Z",
    labelPos: { x: 220, y: 155 },
  },
  {
    id: "khulna",
    nameEn: "Khulna",
    nameBn: "খুলনা",
    path: "M 90 140 L 160 150 L 180 200 L 140 270 L 70 250 L 70 180 Z",
    labelPos: { x: 115, y: 200 },
  },
  {
    id: "barishal",
    nameEn: "Barishal",
    nameBn: "বরিশাল",
    path: "M 180 200 L 270 190 L 250 260 L 180 250 Z",
    labelPos: { x: 220, y: 225 },
  },
  {
    id: "chattogram",
    nameEn: "Chattogram",
    nameBn: "চট্টগ্রাম",
    path: "M 270 190 L 380 120 L 410 200 L 370 310 L 300 280 L 250 260 Z",
    labelPos: { x: 335, y: 215 },
  },
];

export function DivisionalMap({
  divisions,
  selectedDivisionId,
  onSelectDivision,
}: DivisionalMapProps) {
  const locale = useLocale();
  const bn = locale === "bn";

  const [hoveredDivisionId, setHoveredDivisionId] = useState<string | null>(null);

  const getSeverityFill = (score: number, isSelected: boolean, isHovered: boolean) => {
    if (score >= 80) return isSelected || isHovered ? "#ef4444" : "#dc2626";
    if (score >= 70) return isSelected || isHovered ? "#f97316" : "#d97706";
    if (score >= 60) return isSelected || isHovered ? "#eab308" : "#ca8a04";
    return isSelected || isHovered ? "#10b981" : "#059669";
  };

  const hoveredDivData = divisions.find((d) => d.id === hoveredDivisionId);

  return (
    <div className="glass-panel p-4 rounded-2xl border border-border/50 relative overflow-hidden bg-background/60 backdrop-blur-md">
      <div className="flex items-center justify-between mb-3 border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">
            {bn ? "বাংলাদেশ ৮ বিভাগীয় জিও-স্প্যাশিয়াল হিটম্যাপ" : "Bangladesh 8 Divisions Geo-Spatial Heatmap"}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> {bn ? "অতি ঝুঁকিপূর্ণ (৮০+)" : "Critical (80+)"}</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> {bn ? "উচ্চ (৭০-৭৯)" : "High (70-79)"}</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> {bn ? "মাঝারি/নিম্ন (<৭০)" : "Moderate (<70)"}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-4 items-center">
        {/* SVG Interactive Map Container */}
        <div className="lg:col-span-7 flex justify-center relative py-2">
          <svg viewBox="0 0 450 330" className="w-full max-w-[420px] h-auto drop-shadow-xl select-none">
            <defs>
              <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {DIVISION_SVG_PATHS.map((item) => {
              const divData = divisions.find((d) => d.id === item.id);
              const score = divData?.overallSeverityScore || 50;
              const isSelected = selectedDivisionId === item.id;
              const isHovered = hoveredDivisionId === item.id;

              return (
                <g key={item.id} className="cursor-pointer transition-all duration-300">
                  <motion.path
                    d={item.path}
                    fill={getSeverityFill(score, isSelected, isHovered)}
                    fillOpacity={isSelected ? 0.9 : isHovered ? 0.8 : 0.65}
                    stroke={isSelected ? "#ffffff" : isHovered ? "#f8fafc" : "#1e293b"}
                    strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1.2}
                    filter={score >= 80 ? "url(#glow-red)" : undefined}
                    onClick={() => onSelectDivision(item.id)}
                    onMouseEnter={() => setHoveredDivisionId(item.id)}
                    onMouseLeave={() => setHoveredDivisionId(null)}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.15 }}
                  />

                  {/* Division Name & Score Label */}
                  <text
                    x={item.labelPos.x}
                    y={item.labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#ffffff"
                    fontSize={11}
                    fontWeight="bold"
                    className="pointer-events-none drop-shadow-md font-sans"
                  >
                    {bn ? item.nameBn : item.nameEn} ({score})
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hovered / Selected Division Quick Intel Display */}
        <div className="lg:col-span-5 space-y-3">
          {hoveredDivData || divisions.find((d) => d.id === selectedDivisionId) ? (
            (() => {
              const displayDiv = hoveredDivData || divisions.find((d) => d.id === selectedDivisionId)!;
              return (
                <div className="p-4 rounded-xl border border-primary/30 bg-background/80 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <div>
                      <h4 className="font-display text-base font-bold text-foreground">
                        {bn ? displayDiv.nameBn : displayDiv.nameEn} {bn ? "বিভাগ" : "Division"}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {bn ? `সদরদপ্তর: ${displayDiv.headquarters_bn} • ${displayDiv.districtsCount} টি জেলা` : `HQ: ${displayDiv.headquarters} • ${displayDiv.districtsCount} Districts`}
                      </p>
                    </div>

                    <span
                      className={cn(
                        "text-xl font-bold font-mono px-2.5 py-1 rounded-lg border",
                        displayDiv.overallSeverityScore >= 80
                          ? "bg-red-500/20 text-red-300 border-red-500/40"
                          : displayDiv.overallSeverityScore >= 70
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      )}
                    >
                      {displayDiv.overallSeverityScore}/100
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-background/50 border border-border/30">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3 text-red-400" />
                        {bn ? "মাসিক অপরাধ:" : "Monthly Cases:"}
                      </span>
                      <strong className="text-foreground text-sm tabular-nums">{displayDiv.crime.totalCasesMonthly.toLocaleString()}</strong>
                    </div>

                    <div className="p-2 rounded bg-background/50 border border-border/30">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Flame className="h-3 w-3 text-amber-400" />
                        {bn ? "গ্যাস ঘাটতি:" : "Gas Deficit:"}
                      </span>
                      <strong className="text-amber-400 text-sm tabular-nums">{displayDiv.resources.gas.deficitPercentage}%</strong>
                    </div>

                    <div className="p-2 rounded bg-background/50 border border-border/30">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Zap className="h-3 w-3 text-purple-400" />
                        {bn ? "লোডশেডিং:" : "Load-shedding:"}
                      </span>
                      <strong className="text-purple-300 text-sm tabular-nums">{displayDiv.resources.electricity.avgLoadSheddingHours} hrs</strong>
                    </div>

                    <div className="p-2 rounded bg-background/50 border border-border/30">
                      <span className="text-[10px] text-muted-foreground block">{bn ? "শীর্ষ অপরাধ:" : "Top Crime:"}</span>
                      <strong className="text-xs text-foreground truncate block" title={bn ? displayDiv.crime.breakdown[0]?.type_bn : displayDiv.crime.breakdown[0]?.type}>
                        {bn ? displayDiv.crime.breakdown[0]?.type_bn : displayDiv.crime.breakdown[0]?.type}
                      </strong>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectDivision(displayDiv.id)}
                    className="w-full py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs transition-all hover:bg-primary/90"
                  >
                    {bn ? `${displayDiv.nameBn} বিভাগের পুরো ইনটেল প্যানেল ফিল্টার করুন` : `Filter ${displayDiv.nameEn} Division Panel`}
                  </button>
                </div>
              );
            })()
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-border/50 text-center text-xs text-muted-foreground space-y-1">
              <MapPin className="h-6 w-6 text-muted-foreground mx-auto" />
              <p className="font-medium text-foreground">{bn ? "ম্যাপের যেকোনো বিভাগে কার্সার রাখুন বা ক্লিক করুন" : "Hover or click any division on the map"}</p>
              <p>{bn ? "তাৎক্ষণিক ক্রাইসিস স্কোর ও মেট্রিক্স দেখতে পাবেন" : "Instant severity score & metrics preview"}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
