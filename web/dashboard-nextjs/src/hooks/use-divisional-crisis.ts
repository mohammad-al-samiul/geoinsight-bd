"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useAdminFilter } from "@/hooks/use-admin-filter";
import { getUnitById } from "@/lib/admin-units";
import { apiClient } from "@/lib/api-client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import {
  BANGLADESH_DIVISIONS_DATA,
  LIVE_INCIDENT_ALERTS,
  DivisionCrisisData,
  DistrictInfo,
  LiveIncidentAlert,
} from "@/lib/divisional-crisis-data";

export type SortOption = "severity" | "cases" | "gas" | "power" | "name";
export type RiskFilterOption = "all" | "Critical" | "High Risk" | "Moderate" | "Low Risk";

export interface ReallocationState {
  sourceDivId: string;
  targetDivId: string;
  policeUnitsShifted: number; // 0 to 500 units
  gasUnitsShifted: number; // 0 to 30 %
}

export interface DivisionalCrisisFilters {
  divisionId: string; // "all" or division.id
  timeframeDays: number; // 7, 30, 90, 365
  categoryFilter: "all" | "crime" | "gas" | "fuel" | "electricity" | "water";
  searchQuery: string;
  sortBy: SortOption;
  riskFilter: RiskFilterOption;
  stressSurgePercentage: number; // 0, 10, 20, 30 (%) energy & resource deficit surge simulation
}

export interface CitizenReportPayload {
  divisionId: string;
  category: string;
  title: string;
  location: string;
  description: string;
  urgency: "critical" | "warning" | "info";
}

export interface DivisionalLivePulse {
  generatedAt: string;
  lookbackHours: number;
  sources: string[];
  divisions: Array<{
    division: string;
    riskScore: number;
  }>;
}

function canonicalDivisionName(name: string): string {
  return name.toLowerCase().replace("chittagong", "chattogram").trim();
}

export function useDivisionalCrisis() {
  const { filter: globalAdminFilter } = useAdminFilter();

  const [filters, setFilters] = useState<DivisionalCrisisFilters>({
    divisionId: "all",
    timeframeDays: 30,
    categoryFilter: "all",
    searchQuery: "",
    sortBy: "severity",
    riskFilter: "all",
    stressSurgePercentage: 0,
  });

  const [compareDivisionIds, setCompareDivisionIds] = useState<[string, string] | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictInfo | null>(null);
  const [alertsList, setAlertsList] = useState<LiveIncidentAlert[]>(LIVE_INCIDENT_ALERTS);
  const [livePulse, setLivePulse] = useState<DivisionalLivePulse | null>(null);
  const [loading, setLoading] = useState(true);
  const [liveError, setLiveError] = useState<string | null>(null);

  const loadLivePulse = useCallback(async () => {
    setLoading(true);
    setLiveError(null);
    try {
      const response = await apiClient<{ success: boolean; data: DivisionalLivePulse }>(
        "divisional-crisis/pulse",
      );
      setLivePulse(response.data);
    } catch (error) {
      setLivePulse(null);
      setLiveError(error instanceof Error ? error.message : "Live crisis data unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLivePulse();
  }, [loadLivePulse]);
  useRealtimeRefresh(loadLivePulse, true, true);

  // Speech synthesis state
  const [isSpeechPlaying, setIsSpeechPlaying] = useState(false);

  // Force & Resource Tactical Re-Allocation State
  const [reallocation, setReallocation] = useState<ReallocationState>({
    sourceDivId: "mymensingh",
    targetDivId: "dhaka",
    policeUnitsShifted: 150,
    gasUnitsShifted: 10,
  });

  const divisions = useMemo(
    () =>
      BANGLADESH_DIVISIONS_DATA.map((division) => {
        const live = livePulse?.divisions.find(
          (item) => canonicalDivisionName(item.division) === canonicalDivisionName(division.nameEn),
        );
        if (!live) return division;

        return {
          ...division,
          // Live score derives from current weather, verified signals and
          // grievance news; baseline crime/resource values stay labelled estimates.
          overallSeverityScore: Math.round(
            division.overallSeverityScore * 0.7 + live.riskScore * 0.3,
          ),
        };
      }),
    [livePulse],
  );

  // Resolve global top bar division selection if active
  const globalDivisionUnit = useMemo(() => {
    if (!globalAdminFilter.divisionId) return null;
    return getUnitById(globalAdminFilter.divisionId);
  }, [globalAdminFilter.divisionId]);

  // Compute stress-test & tactical reallocation modified severity score and values
  const divisionsWithModifiers = useMemo(() => {
    const surge = filters.stressSurgePercentage;
    const { sourceDivId, targetDivId, policeUnitsShifted, gasUnitsShifted } = reallocation;

    return divisions.map((div) => {
      let simulatedGasDeficit = div.resources.gas.deficitPercentage;
      let simulatedLoadShedding = div.resources.electricity.avgLoadSheddingHours;
      let simulatedFuelDeficit = div.resources.fuelOil.stockDeficitPercentage;
      let simulatedSeverity = div.overallSeverityScore;

      // 1. Stress surge calculation
      if (surge > 0) {
        simulatedGasDeficit = Math.min(100, Math.round(simulatedGasDeficit * (1 + surge / 100)));
        simulatedLoadShedding = Number((simulatedLoadShedding * (1 + surge / 100)).toFixed(1));
        simulatedFuelDeficit = Math.min(100, Math.round(simulatedFuelDeficit * (1 + surge / 100)));
        simulatedSeverity = Math.min(100, Math.round(simulatedSeverity + surge * 0.45));
      }

      // 2. Re-allocation calculation
      if (div.id === targetDivId && (policeUnitsShifted > 0 || gasUnitsShifted > 0)) {
        const policeEffect = Math.round(policeUnitsShifted * 0.04);
        const gasEffect = Math.round(gasUnitsShifted * 0.5);
        simulatedSeverity = Math.max(20, simulatedSeverity - policeEffect - gasEffect);
        simulatedGasDeficit = Math.max(5, simulatedGasDeficit - gasUnitsShifted);
      } else if (div.id === sourceDivId && (policeUnitsShifted > 0 || gasUnitsShifted > 0)) {
        const strainEffect = Math.round(policeUnitsShifted * 0.015);
        simulatedSeverity = Math.min(100, simulatedSeverity + strainEffect);
      }

      return {
        ...div,
        overallSeverityScore: simulatedSeverity,
        resources: {
          ...div.resources,
          gas: {
            ...div.resources.gas,
            deficitPercentage: simulatedGasDeficit,
          },
          fuelOil: {
            ...div.resources.fuelOil,
            stockDeficitPercentage: simulatedFuelDeficit,
          },
          electricity: {
            ...div.resources.electricity,
            avgLoadSheddingHours: simulatedLoadShedding,
          },
        },
      };
    });
  }, [divisions, filters.stressSurgePercentage, reallocation]);

  const filteredDivisions = useMemo(() => {
    return divisionsWithModifiers
      .filter((div) => {
        // 1. Global Admin Filter Match (from top bar dropdown)
        if (globalDivisionUnit) {
          const globalName = (globalDivisionUnit.name || "").toLowerCase();
          const globalNameBn = globalDivisionUnit.nameBn || "";
          const matchGlobal =
            div.nameEn.toLowerCase().includes(globalName) ||
            globalName.includes(div.nameEn.toLowerCase()) ||
            (globalNameBn && div.nameBn.includes(globalNameBn));
          if (!matchGlobal) return false;
        }

        // 2. Panel Tab Division Switcher Match
        if (filters.divisionId !== "all" && div.id !== filters.divisionId) {
          return false;
        }

        // 3. Risk level filter
        if (filters.riskFilter !== "all" && div.riskLevel !== filters.riskFilter) {
          return false;
        }

        // 4. Search query match
        if (filters.searchQuery.trim()) {
          const query = filters.searchQuery.toLowerCase();
          const matchName =
            div.nameEn.toLowerCase().includes(query) ||
            div.nameBn.includes(query) ||
            div.headquarters.toLowerCase().includes(query) ||
            div.headquarters_bn.includes(query) ||
            div.crime.topHotspots.some((h) => h.toLowerCase().includes(query)) ||
            div.crime.topHotspots_bn.some((h) => h.includes(query)) ||
            div.districts.some((d) => d.nameEn.toLowerCase().includes(query) || d.nameBn.includes(query));
          if (!matchName) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === "severity") return b.overallSeverityScore - a.overallSeverityScore;
        if (filters.sortBy === "cases") return b.crime.totalCasesMonthly - a.crime.totalCasesMonthly;
        if (filters.sortBy === "gas") return b.resources.gas.deficitPercentage - a.resources.gas.deficitPercentage;
        if (filters.sortBy === "power") return b.resources.electricity.avgLoadSheddingHours - a.resources.electricity.avgLoadSheddingHours;
        if (filters.sortBy === "name") return a.nameEn.localeCompare(b.nameEn);
        return 0;
      });
  }, [divisionsWithModifiers, globalDivisionUnit, filters.divisionId, filters.riskFilter, filters.searchQuery, filters.sortBy]);

  // Filtered live incident alerts
  const liveAlerts = useMemo(() => {
    if (filters.divisionId === "all") return alertsList;
    return alertsList.filter((a) => a.divisionId === filters.divisionId);
  }, [filters.divisionId, alertsList]);

  // Add Citizen Report handler
  const addCitizenReport = (payload: CitizenReportPayload) => {
    const targetDiv = divisions.find((d) => d.id === payload.divisionId) || divisions[0];
    const newAlert: LiveIncidentAlert = {
      id: `citizen-${Date.now()}`,
      divisionId: payload.divisionId,
      divisionNameBn: targetDiv.nameBn,
      divisionNameEn: targetDiv.nameEn,
      timestamp: "সবেমাত্র প্রাপ্ত (Citizen Alert)",
      severity: payload.urgency,
      titleEn: `${payload.category}: ${payload.title}`,
      titleBn: `[নাগরিক রিপোর্ট] ${payload.category}: ${payload.title}`,
      locationEn: payload.location,
      locationBn: payload.location,
    };

    setAlertsList((prev) => [newAlert, ...prev]);
  };

  // Web Speech API Voice Briefing in Bangla
  const playVoiceBriefing = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Voice synthesis is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();

    const topDiv = filteredDivisions[0];
    const speechText = `বাংলাদেশে আটটি বিভাগের মধ্যে বর্তমানে সর্বোচ্চ ঝুঁকিপূর্ণ বিভাগ হলো ${topDiv?.nameBn || "ঢাকা"}। ` +
      `যেখানে ক্রাইসিস স্কোর ${topDiv?.overallSeverityScore || 88}। ` +
      `গড় গ্যাস ঘাটতি ${summaryStats.avgGasDeficit} শতাংশ এবং দৈনিক লোডশেডিং গড়ে ${summaryStats.avgLoadShedding} ঘণ্টা। ` +
      `নিরাপত্তা নিশ্চিতকরণে পুলিশ ও র্যাবের পেট্রোলিং জোরদার করা হয়েছে।`;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = "bn-BD";
    utterance.rate = 0.95;

    utterance.onstart = () => setIsSpeechPlaying(true);
    utterance.onend = () => setIsSpeechPlaying(false);
    utterance.onerror = () => setIsSpeechPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopVoiceBriefing = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeechPlaying(false);
    }
  };

  // Aggregate statistics across filtered divisions
  const summaryStats = useMemo(() => {
    const totalDivisionsCount = filteredDivisions.length;
    let totalCrimeCases = 0;
    let highestSeverityScore = 0;
    let highestRiskDivision: DivisionCrisisData | null = null;
    let totalGasDeficitSum = 0;
    let totalLoadSheddingSum = 0;
    let totalFuelDeficitSum = 0;

    for (const div of filteredDivisions) {
      const timeframeMultiplier = filters.timeframeDays / 30;
      const calculatedCases = Math.round(div.crime.totalCasesMonthly * timeframeMultiplier);

      totalCrimeCases += calculatedCases;
      totalGasDeficitSum += div.resources.gas.deficitPercentage;
      totalLoadSheddingSum += div.resources.electricity.avgLoadSheddingHours;
      totalFuelDeficitSum += div.resources.fuelOil.stockDeficitPercentage;

      if (div.overallSeverityScore > highestSeverityScore) {
        highestSeverityScore = div.overallSeverityScore;
        highestRiskDivision = div;
      }
    }

    const avgGasDeficit = totalDivisionsCount > 0 ? Math.round(totalGasDeficitSum / totalDivisionsCount) : 0;
    const avgLoadShedding = totalDivisionsCount > 0 ? (totalLoadSheddingSum / totalDivisionsCount).toFixed(1) : "0";
    const avgFuelDeficit = totalDivisionsCount > 0 ? Math.round(totalFuelDeficitSum / totalDivisionsCount) : 0;

    return {
      totalDivisionsCount,
      totalCrimeCases,
      highestRiskDivision,
      avgGasDeficit,
      avgLoadShedding,
      avgFuelDeficit,
    };
  }, [filteredDivisions, filters.timeframeDays]);

  // Data formatted for Recharts Bar Chart
  const crimeComparisonChartData = useMemo(() => {
    return filteredDivisions.map((div) => {
      const timeframeMultiplier = filters.timeframeDays / 30;
      return {
        id: div.id,
        name: div.nameBn,
        nameEn: div.nameEn,
        totalCases: Math.round(div.crime.totalCasesMonthly * timeframeMultiplier),
        crimeRate: div.crime.crimeRatePer100k,
        severityScore: div.overallSeverityScore,
      };
    }).sort((a, b) => b.totalCases - a.totalCases);
  }, [filteredDivisions, filters.timeframeDays]);

  // Aggregate crime breakdown percentages across filtered divisions for Donut Chart
  const aggregateCrimeTypeBreakdown = useMemo(() => {
    const typeMap = new Map<string, { type_bn: string; count: number }>();

    for (const div of filteredDivisions) {
      for (const item of div.crime.breakdown) {
        const existing = typeMap.get(item.type);
        if (!existing) {
          typeMap.set(item.type, { type_bn: item.type_bn, count: item.count });
        } else {
          existing.count += item.count;
        }
      }
    }

    const totalCount = Array.from(typeMap.values()).reduce((sum, item) => sum + item.count, 0);

    return Array.from(typeMap.entries()).map(([type, val]) => ({
      name: type,
      nameBn: val.type_bn,
      value: val.count,
      percentage: totalCount > 0 ? Math.round((val.count / totalCount) * 100) : 0,
    })).sort((a, b) => b.value - a.value);
  }, [filteredDivisions]);

  // Resource Crisis comparison data across divisions
  const resourceCrisisChartData = useMemo(() => {
    return filteredDivisions.map((div) => ({
      name: div.nameBn,
      nameEn: div.nameEn,
      gasDeficit: div.resources.gas.deficitPercentage,
      fuelDeficit: div.resources.fuelOil.stockDeficitPercentage,
      loadSheddingHours: div.resources.electricity.avgLoadSheddingHours,
      waterScarcity: div.resources.water.scarcityIndex,
      severityScore: div.overallSeverityScore,
    })).sort((a, b) => b.severityScore - a.severityScore);
  }, [filteredDivisions]);

  // Radar chart multi-dimensional matrix data across 8 divisions
  const radarChartData = useMemo(() => {
    return [
      { metric: "Crime Rate", metricBn: "অপরাধের হার" },
      { metric: "Gas Deficit", metricBn: "গ্যাস ঘাটতি %" },
      { metric: "Fuel Scarcity", metricBn: "তেল সংকট %" },
      { metric: "Power Outages", metricBn: "লোডশেডিং" },
      { metric: "Water Index", metricBn: "পানি সংকট" },
      { metric: "Inflation", metricBn: "মূল্যস্ফীতি" },
    ].map((m) => {
      const entry: Record<string, string | number> = {
        subject: m.metric,
        subjectBn: m.metricBn,
      };

      for (const div of filteredDivisions) {
        if (m.metric === "Crime Rate") entry[div.id] = Math.min(100, Math.round(div.crime.crimeRatePer100k * 1.5));
        else if (m.metric === "Gas Deficit") entry[div.id] = div.resources.gas.deficitPercentage;
        else if (m.metric === "Fuel Scarcity") entry[div.id] = div.resources.fuelOil.stockDeficitPercentage * 2;
        else if (m.metric === "Power Outages") entry[div.id] = Math.min(100, Math.round(div.resources.electricity.avgLoadSheddingHours * 15));
        else if (m.metric === "Water Index") entry[div.id] = div.resources.water.scarcityIndex;
        else if (m.metric === "Inflation") entry[div.id] = Math.min(100, Math.round(div.resources.commodities.inflationPercentage * 7.5));
      }

      return entry;
    });
  }, [filteredDivisions]);

  // 30-Day AI Forecast Chart Data aggregated
  const forecastChartData = useMemo(() => {
    const currentTotal = filteredDivisions.reduce((sum, d) => sum + d.crime.totalCasesMonthly, 0);
    const m1Total = filteredDivisions.reduce((sum, d) => sum + (d.forecast30Days[1]?.projectedCases || d.crime.totalCasesMonthly), 0);
    const m2Total = filteredDivisions.reduce((sum, d) => sum + (d.forecast30Days[2]?.projectedCases || d.crime.totalCasesMonthly), 0);

    const currentLoad = (filteredDivisions.reduce((sum, d) => sum + d.resources.electricity.avgLoadSheddingHours, 0) / (filteredDivisions.length || 1)).toFixed(1);
    const m1Load = (filteredDivisions.reduce((sum, d) => sum + (d.forecast30Days[1]?.projectedLoadShedding || 4), 0) / (filteredDivisions.length || 1)).toFixed(1);
    const m2Load = (filteredDivisions.reduce((sum, d) => sum + (d.forecast30Days[2]?.projectedLoadShedding || 4), 0) / (filteredDivisions.length || 1)).toFixed(1);

    return [
      { period: "Current Month", periodBn: "বর্তমান মাস", cases: currentTotal, loadShedding: Number(currentLoad) },
      { period: "Month +1 (Peak)", periodBn: "পরবর্তী মাস (পিক)", cases: m1Total, loadShedding: Number(m1Load) },
      { period: "Month +2 (Monsoon)", periodBn: "২ মাস পর (বর্ষা)", cases: m2Total, loadShedding: Number(m2Load) },
    ];
  }, [filteredDivisions]);

  // Historical YoY Chart Data aggregated (2024, 2025, 2026)
  const historicalYoYChartData = useMemo(() => {
    const y2024Crimes = filteredDivisions.reduce((sum, d) => sum + (d.historicalYoY[0]?.totalCrimes || 0), 0);
    const y2025Crimes = filteredDivisions.reduce((sum, d) => sum + (d.historicalYoY[1]?.totalCrimes || 0), 0);
    const y2026Crimes = filteredDivisions.reduce((sum, d) => sum + (d.historicalYoY[2]?.totalCrimes || 0), 0);

    const y2024Load = (filteredDivisions.reduce((sum, d) => sum + (d.historicalYoY[0]?.avgLoadShedding || 3), 0) / (filteredDivisions.length || 1)).toFixed(1);
    const y2025Load = (filteredDivisions.reduce((sum, d) => sum + (d.historicalYoY[1]?.avgLoadShedding || 3.5), 0) / (filteredDivisions.length || 1)).toFixed(1);
    const y2026Load = (filteredDivisions.reduce((sum, d) => sum + (d.historicalYoY[2]?.avgLoadShedding || 4), 0) / (filteredDivisions.length || 1)).toFixed(1);

    return [
      { year: "2024", totalCrimes: y2024Crimes, avgLoadShedding: Number(y2024Load) },
      { year: "2025", totalCrimes: y2025Crimes, avgLoadShedding: Number(y2025Load) },
      { year: "2026 (Est)", totalCrimes: y2026Crimes, avgLoadShedding: Number(y2026Load) },
    ];
  }, [filteredDivisions]);

  // Resolved side-by-side comparison data
  const comparisonData = useMemo(() => {
    if (!compareDivisionIds) return null;
    const divA = divisionsWithModifiers.find((d) => d.id === compareDivisionIds[0]);
    const divB = divisionsWithModifiers.find((d) => d.id === compareDivisionIds[1]);
    if (!divA || !divB) return null;
    return { divA, divB };
  }, [compareDivisionIds, divisionsWithModifiers]);

  return {
    loading,
    livePulse,
    liveError,
    reloadLivePulse: loadLivePulse,
    divisions,
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
    playVoiceBriefing,
    stopVoiceBriefing,
    isSpeechPlaying,
  };
}
