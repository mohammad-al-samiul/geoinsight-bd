"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAdminFilter } from "@/hooks/use-admin-filter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Workflow,
  ShieldCheck,
  BellRing,
  FileText,
  CheckCircle2,
  Clock,
  UserCheck,
  Send,
  Search,
  PlusCircle,
  ShieldAlert,
  Check,
  X,
  MessageSquareWarning,
  Flame,
  BrainCircuit,
  MapPin,
  Calendar,
  UserX,
  Radio,
  FileSearch,
  ExternalLink,
  Sparkles,
  Globe,
  Video,
  Eye,
  FileCheck,
  RefreshCw,
  Zap,
  Activity,
  Trash2,
  Download,
  RotateCcw,
  CheckSquare,
  Square,
  ListChecks,
  Filter,
} from "lucide-react";

// --- Seed Types & Mock Data for Interactive Ops Workspace ---

export interface NarrativeSpeechItem {
  id: string;
  speaker: string;
  organization: "Jamaat-e-Islami" | "NCP (Nationalist Citizen Party)" | "Independent Anti-Govt Group" | "Extremist Channel";
  roleTitle: string;
  venuePlatform: string;
  location: string;
  district: string;
  timestamp: string;
  sourceType: "FACEBOOK_LIVE" | "TELEGRAM_CHANNEL text" | "YOUTUBE_BROADCAST" | "NEWS_ARTICLE";
  isJustIngested?: boolean;
  rawStatement: {
    en: string;
    bn: string;
  };
  category: "ANTI_GOVT_INCITEMENT" | "STATE_SOVEREIGNTY_THREAT" | "ECONOMIC_SABOTAGE_CALL" | "PUBLIC_UNREST_COMMOTION";
  threatLevel: "CRITICAL" | "HIGH" | "MEDIUM";
  ragDebunk: {
    factualCounter: {
      en: string;
      bn: string;
    };
    verifiedSources: string[];
    officialPolicyRef: string;
    confidenceScore: number;
  };
  status: "FLAGGED" | "DEBUNKD_PUBLISHED" | "ESCALATED_PMO";
}

export interface ComplaintItem {
  id: string;
  trackingNo: string;
  channel: "333" | "999" | "DIRECT_PORTAL";
  title: string;
  description: string;
  district: string;
  division: string;
  category: "Infrastructure" | "Disaster" | "Agri-Market" | "Healthcare";
  urgency: "P1_CRITICAL" | "P2_HIGH" | "P3_NORMAL";
  status: "SUBMITTED" | "IN_REVIEW" | "ASSIGNED" | "RESOLVED";
  assignedTo?: string;
  submittedAt: string;
}

export interface ApprovalItem {
  id: string;
  referenceCode: string;
  title: string;
  type: "RED_FLAG_RESOLUTION" | "BUDGET_REALLOCATION" | "EMERGENCY_DISASTER_RELEASE";
  riskScore: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  requestedBy: string;
  unitName: string;
  aiExplanation: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
}

export interface SmartDispatchItem {
  id: string;
  ruleName: string;
  triggerEvent: string;
  targetRole: "PMO" | "DC" | "MINISTER" | "UNION_CHAIRMAN";
  channel: "SMS" | "SYSTEM_PUSH" | "EMAIL_ENCRYPTED";
  priority: "P1" | "P2" | "P3";
  status: "ACTIVE" | "PAUSED";
  dispatchedCount: number;
  lastDispatchedAt: string;
}

export interface AuditLedgerItem {
  id: string;
  action: string;
  actor: string;
  role: string;
  entity: string;
  entityId: string;
  ipAddress: string;
  hash: string;
  verified: boolean;
  timestamp: string;
}
const INITIAL_NARRATIVE_SPEECHES: NarrativeSpeechItem[] = [];


// Simulated incoming stream items for auto/manual live ingestion
const SIMULATED_INCOMING_FEEDS: Omit<NarrativeSpeechItem, "id" | "timestamp">[] = [
  {
    speaker: "Delwar Hossain (Trade Rep)",
    organization: "NCP (Nationalist Citizen Party)",
    roleTitle: "Commerce Cell Member / বাণিজ্য সেল প্রতিনিধি",
    venuePlatform: "YouTube Live & Facebook Post",
    location: "Khatunganj Wholesale Market, Chittagong",
    district: "Chittagong",
    sourceType: "NEWS_ARTICLE",
    rawStatement: {
      en: "Spreading rumors of rice shortage and urge traders to double prices before upcoming festival season.",
      bn: "আসন্ন উৎসবের পূর্বে চাউলের তীব্র ঘাটতি হতে পারে বলে বাজারে কৃত্রিম চালের সংকট ও আড়তদারদের দ্বিগুণ দামে বিক্রির অপপ্রচার।",
    },
    category: "ECONOMIC_SABOTAGE_CALL",
    threatLevel: "HIGH",
    ragDebunk: {
      factualCounter: {
        en: "False market rumor. Ministry of Food confirms national public grain silos hold 1.85 Million Metric Tons of rice & wheat, a 5-year high.",
        bn: "ভিত্তিহীন বাজার গুজব। খাদ্য মন্ত্রণালয় নিশ্চিত করেছে সরকারি গুদামে বর্তমানে ১৮.৫ লাখ মেট্রিক টন চাল ও গম মজুদ রয়েছে যা বিগত ৫ বছরের মধ্যে সর্বোচ্চ।",
      },
      verifiedSources: ["Ministry of Food Daily Stock Bulletin", "Directorate General of Food Verification"],
      officialPolicyRef: "Essential Commodities Control Act § 3",
      confidenceScore: 99,
    },
    status: "FLAGGED",
  },
  {
    speaker: "Dr. Anisur Rahman",
    organization: "Jamaat-e-Islami",
    roleTitle: "Central Think Tank Adviser / গবেষক উপদেষ্টা",
    venuePlatform: "Telegram Channel & Blog",
    location: "Online (IP Trace: Mymensingh)",
    district: "Mymensingh",
    sourceType: "TELEGRAM_CHANNEL text",
    rawStatement: {
      en: "False allegation claiming port operations in Chittagong have been handed over to foreign military forces.",
      bn: "চট্টগ্রাম বন্দর পরিচালনা নাকি বিদেশি সামরিক বাহিনীর কাছে হস্তান্তর করা হয়েছে—এমন ভিত্তিহীন উসকানি ছড়ানো হচ্ছে।",
    },
    category: "STATE_SOVEREIGNTY_THREAT",
    threatLevel: "CRITICAL",
    ragDebunk: {
      factualCounter: {
        en: "Sovereignty disinformation. Chittagong Port Authority operates under 100% state maritime jurisdiction under Ministry of Shipping control.",
        bn: "সার্বভৌমত্ব বিষয়ে অপপ্রচার। চট্টগ্রাম বন্দর কর্তৃপক্ষ সম্পূর্ণভাবে বাংলাদেশ সরকারের নৌপরিবহন মন্ত্রণালয়ের অধীন রাষ্ট্রীয় মালিকানায় পরিচালিত হচ্ছে।",
      },
      verifiedSources: ["Chittagong Port Authority Official Statement", "Ministry of Shipping Clearance"],
      officialPolicyRef: "Port Authority Act 2026 § 5",
      confidenceScore: 100,
    },
    status: "FLAGGED",
  },
  {
    speaker: "Monirul Islam (Worker Union)",
    organization: "Independent Anti-Govt Group",
    roleTitle: "Garment Worker Action Committee",
    venuePlatform: "Facebook Live & TikTok Video",
    location: "Gazipur Industrial Zone",
    district: "Gazipur",
    sourceType: "YOUTUBE_BROADCAST",
    rawStatement: {
      en: "Urging garment workers to block Dhaka-Mymensingh highway over fake news of factory closure without severance pay.",
      bn: "কারখানা বন্ধের ভুয়া খবরে পোশাক শ্রমিকদের ঢাকা-ময়মনসিংহ মহাসড়ক অবরোধ করার উসকানি।",
    },
    category: "PUBLIC_UNREST_COMMOTION",
    threatLevel: "CRITICAL",
    ragDebunk: {
      factualCounter: {
        en: "Malicious factory labor rumor. BGMEA and Industrial Police confirm all 14 factories in Gazipur sector are operating normally with wages cleared.",
        bn: "পোশাক খাতের প্রপাগান্ডা। বিজিএমইএ (BGMEA) ও শিল্প পুলিশ নিশ্চিত করেছে গাজীপুর বিসিক এলাকার ১৪টি কারখানাই স্বাভাবিকভাবে চলছে এবং বেতন প্রদান সম্পন্ন।",
      },
      verifiedSources: ["BGMEA Labor Monitoring Cell", "Industrial Police Gazipur Briefing"],
      officialPolicyRef: "Labor Act § 210",
      confidenceScore: 97,
    },
    status: "FLAGGED",
  },
];

const INITIAL_COMPLAINTS: ComplaintItem[] = [
  {
    id: "cmp-101",
    trackingNo: "GRV-2026-8891",
    channel: "333",
    title: "Bridge Construction Delay in Netrokona",
    description: "Sub-contractor halted work on Mogra River bridge for 3 months causing severe transport bottleneck.",
    district: "Netrokona",
    division: "Mymensingh",
    category: "Infrastructure",
    urgency: "P1_CRITICAL",
    status: "IN_REVIEW",
    assignedTo: "DC Netrokona Ops Desk",
    submittedAt: "2026-07-23T08:15:00Z",
  },
  {
    id: "cmp-102",
    trackingNo: "GRV-2026-4412",
    channel: "999",
    title: "Embankment Erosion Alert in Kurigram",
    description: "Dharla river bank erosion threatening 4 villages. Urgent geo-bag placement requested.",
    district: "Kurigram",
    division: "Rangpur",
    category: "Disaster",
    urgency: "P1_CRITICAL",
    status: "SUBMITTED",
    submittedAt: "2026-07-23T09:30:00Z",
  },
  {
    id: "cmp-103",
    trackingNo: "GRV-2026-1104",
    channel: "DIRECT_PORTAL",
    title: "Fertilizer Price Manipulation in Rangpur Mandi",
    description: "Urea fertilizer selling 18% above BADC benchmark price at wholesale market.",
    district: "Rangpur",
    division: "Rangpur",
    category: "Agri-Market",
    urgency: "P2_HIGH",
    status: "ASSIGNED",
    assignedTo: "District Market Officer",
    submittedAt: "2026-07-22T14:20:00Z",
  },
  {
    id: "cmp-104",
    trackingNo: "GRV-2026-9912",
    channel: "333",
    title: "Hospital Medicine Supply Shortage in Barishal",
    description: "Essential emergency supplies missing from Sadar Civil Hospital store inventory.",
    district: "Barishal",
    division: "Barishal",
    category: "Healthcare",
    urgency: "P2_HIGH",
    status: "RESOLVED",
    assignedTo: "Civil Surgeon Office",
    submittedAt: "2026-07-21T11:00:00Z",
  },
];

const INITIAL_APPROVALS: ApprovalItem[] = [
  {
    id: "app-201",
    referenceCode: "APR-RF-2026-09",
    title: "Contractor Fraud Mitigation & Alert Closure",
    type: "RED_FLAG_RESOLUTION",
    riskScore: 84,
    severity: "CRITICAL",
    requestedBy: "Ministry of Road Transport & Bridges",
    unitName: "Dhaka Division",
    aiExplanation: "Audit inspection confirmed contractor replacement and financial guarantee execution.",
    status: "PENDING",
    requestedAt: "2026-07-23T10:00:00Z",
  },
  {
    id: "app-202",
    referenceCode: "APR-BG-2026-14",
    title: "Cyclone Relief Emergency Fund Clearance",
    type: "EMERGENCY_DISASTER_RELEASE",
    riskScore: 72,
    severity: "HIGH",
    requestedBy: "Disaster Management & Relief Cell",
    unitName: "Chattogram Division",
    aiExplanation: "Pre-positioned shelter funds approved subject to DC audit sign-off.",
    status: "PENDING",
    requestedAt: "2026-07-23T07:45:00Z",
  },
  {
    id: "app-203",
    referenceCode: "APR-TW-2026-03",
    title: "Inter-District Agri-Logistics Shift",
    type: "BUDGET_REALLOCATION",
    riskScore: 45,
    severity: "MEDIUM",
    requestedBy: "Ministry of Agriculture",
    unitName: "Rajshahi Division",
    aiExplanation: "Cold storage subsidy reallocation to reduce onion harvest spoilage.",
    status: "APPROVED",
    requestedAt: "2026-07-22T16:30:00Z",
  },
];

const INITIAL_DISPATCHES: SmartDispatchItem[] = [
  {
    id: "rule-01",
    ruleName: "Critical Red Flag Instant Escalation",
    triggerEvent: "Severity == CRITICAL & RiskScore >= 80",
    targetRole: "PMO",
    channel: "SYSTEM_PUSH",
    priority: "P1",
    status: "ACTIVE",
    dispatchedCount: 142,
    lastDispatchedAt: "10 mins ago",
  },
  {
    id: "rule-02",
    ruleName: "Disaster Geo-Fence Breach Notification",
    triggerEvent: "Cyclone/Flood Warning within 15km of VIP/Campus",
    targetRole: "DC",
    channel: "SMS",
    priority: "P1",
    status: "ACTIVE",
    dispatchedCount: 89,
    lastDispatchedAt: "25 mins ago",
  },
  {
    id: "rule-03",
    ruleName: "Grievance Spike Alert to Ministry Desk",
    triggerEvent: "333 Complaints in same District > 20 / hour",
    targetRole: "MINISTER",
    channel: "EMAIL_ENCRYPTED",
    priority: "P2",
    status: "ACTIVE",
    dispatchedCount: 34,
    lastDispatchedAt: "2 hours ago",
  },
];

const INITIAL_AUDITS: AuditLedgerItem[] = [
  {
    id: "aud-901",
    action: "RED_FLAG_RESOLVED",
    actor: "pmo_analyst_01",
    role: "PMO",
    entity: "RedFlagAlert",
    entityId: "rf-882",
    ipAddress: "103.230.10.4",
    hash: "0x8f2a91b4c730e1fa923057b",
    verified: true,
    timestamp: "2026-07-23 13:45:12",
  },
  {
    id: "aud-902",
    action: "COMPLAINT_ASSIGNED",
    actor: "dc_netrokona",
    role: "DC",
    entity: "GrievanceRecord",
    entityId: "GRV-2026-8891",
    ipAddress: "119.40.80.12",
    hash: "0x3e109ac741890bf120516b",
    verified: true,
    timestamp: "2026-07-23 12:10:05",
  },
  {
    id: "aud-903",
    action: "APPROVAL_GRANTED",
    actor: "minister_lgrd",
    role: "MINISTER",
    entity: "ApprovalRequest",
    entityId: "APR-BG-2026-14",
    ipAddress: "203.112.210.88",
    hash: "0x917ab41d2938b0056efc10",
    verified: true,
    timestamp: "2026-07-23 11:30:40",
  },
];

export function MustHaveOpsPanel() {
  const { filter } = useAdminFilter();
  const locale = useLocale() as "bn" | "en";
  const isBn = locale === "bn";
  const t = useTranslations("modules.ops");

  const [activeTab, setActiveTab] = useState<"narrative" | "complaints" | "approvals">("narrative");

  // State management
  const [narratives, setNarratives] = useState<NarrativeSpeechItem[]>(INITIAL_NARRATIVE_SPEECHES);
  const [complaints, setComplaints] = useState<ComplaintItem[]>(INITIAL_COMPLAINTS);
  const [approvals, setApprovals] = useState<ApprovalItem[]>(INITIAL_APPROVALS);
  const [dispatches, setDispatches] = useState<SmartDispatchItem[]>(INITIAL_DISPATCHES);
  const [audits, setAudits] = useState<AuditLedgerItem[]>(INITIAL_AUDITS);

  // Live Auto-Stream Polling Simulation (Off by default for a clean workspace)
  const [isAutoIngestActive, setIsAutoIngestActive] = useState(false);
  const [isFetchingNow, setIsFetchingNow] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Just now");
  const [nextStreamIdx, setNextStreamIdx] = useState(0);

  // --- LocalStorage Persistence ---
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Load state from localStorage on mount
    try {
      const savedNarratives = localStorage.getItem("ops_narratives");
      const savedAudits = localStorage.getItem("ops_audits");
      const savedStreamIdx = localStorage.getItem("ops_stream_idx");

      let currentIdx = savedStreamIdx ? parseInt(savedStreamIdx, 10) : 0;
      let loadedNarratives = savedNarratives ? JSON.parse(savedNarratives) : INITIAL_NARRATIVE_SPEECHES;
      let loadedAudits = savedAudits ? JSON.parse(savedAudits) : INITIAL_AUDITS;

      setNarratives(loadedNarratives);
      setAudits(loadedAudits);
      setNextStreamIdx(currentIdx);
    } catch (e) {
      console.error("Failed to parse ops panel state from localStorage", e);
    }
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Save state to localStorage on change, but only after initial mount
    if (!isMounted) return;
    localStorage.setItem("ops_narratives", JSON.stringify(narratives));
    localStorage.setItem("ops_audits", JSON.stringify(audits));
    localStorage.setItem("ops_stream_idx", nextStreamIdx.toString());
    localStorage.setItem("ops_last_sync_time", Date.now().toString());
  }, [narratives, audits, nextStreamIdx, isMounted]);
  // --------------------------------

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [orgFilter, setOrgFilter] = useState<string>("ALL");

  // Evidence Inspector Modal State
  const [selectedEvidenceItem, setSelectedEvidenceItem] = useState<NarrativeSpeechItem | null>(null);

  // New Narrative Form Modal
  const [showNewSpeechModal, setShowNewSpeechModal] = useState(false);
  const [newSpeaker, setNewSpeaker] = useState("");
  const [newOrg, setNewOrg] = useState<NarrativeSpeechItem["organization"]>("Jamaat-e-Islami");
  const [newVenue, setNewVenue] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newStatement, setNewStatement] = useState("");
  const [newThreat, setNewThreat] = useState<NarrativeSpeechItem["threatLevel"]>("HIGH");

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dedup result toast (null = hidden)
  const [dedupResult, setDedupResult] = useState<{ removed: number; kept: number } | null>(null);

  // Advanced filters
  const [threatFilter, setThreatFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>("ALL");
  const [showDebunked, setShowDebunked] = useState(true);

  // New complaint form state
  const [showNewComplaintModal, setShowNewComplaintModal] = useState(false);
  const [newComplaintTitle, setNewComplaintTitle] = useState("");
  const [newComplaintDesc, setNewComplaintDesc] = useState("");
  const [newComplaintDistrict, setNewComplaintDistrict] = useState("Dhaka");
  const [newComplaintCategory, setNewComplaintCategory] = useState<ComplaintItem["category"]>("Infrastructure");

  // Emergency Broadcast modal state
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState<"PMO" | "DC" | "MINISTER">("DC");
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // Ingest Real-Time Speech Action
  const triggerIngestNewSpeech = useCallback(() => {
    setIsFetchingNow(true);
    setTimeout(() => {
      const template = SIMULATED_INCOMING_FEEDS[nextStreamIdx % SIMULATED_INCOMING_FEEDS.length];
      const newItem: NarrativeSpeechItem = {
        ...template,
        id: `sp-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " (Just Ingested)",
        isJustIngested: true,
      };

      // Dedup fingerprint check before adding
      const fingerprint = `${newItem.speaker}::${newItem.rawStatement.en.slice(0, 60)}`;
      setNarratives((prev) => {
        const isDuplicate = prev.some(
          (n) => `${n.speaker}::${n.rawStatement.en.slice(0, 60)}` === fingerprint
        );
        if (isDuplicate) return prev;
        return [newItem, ...prev];
      });
      setNextStreamIdx((prev) => prev + 1);
      setLastSyncTime(new Date().toLocaleTimeString());
      setIsFetchingNow(false);

      const newAudit: AuditLedgerItem = {
        id: `aud-${Date.now()}`,
        action: "REALTIME_FEED_AUTO_INGESTED",
        actor: "crawler_ai_rag_bot",
        role: "SYSTEM",
        entity: "SocialMediaCrawler",
        entityId: newItem.id,
        ipAddress: "10.0.4.15",
        hash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
        verified: true,
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      };
      setAudits((prev) => [newAudit, ...prev]);
    }, 800);
  }, [nextStreamIdx]);

  // Automated 15-min Simulation Stream Poller (fires every 25s for fast demonstration)
  useEffect(() => {
    if (!isAutoIngestActive) return;
    const timer = setInterval(() => {
      triggerIngestNewSpeech();
    }, 25000); // 25 seconds simulation cycle representing 15-minute real-world batch crawl
    return () => clearInterval(timer);
  }, [isAutoIngestActive, triggerIngestNewSpeech]);

  // Computed stats
  const activeNarrativeCount = useMemo(
    () => narratives.filter((n) => n.status !== "DEBUNKD_PUBLISHED").length,
    [narratives],
  );

  const activeComplaintsCount = useMemo(
    () => complaints.filter((c) => c.status !== "RESOLVED").length,
    [complaints],
  );

  const pendingApprovalsCount = useMemo(
    () => approvals.filter((a) => a.status === "PENDING").length,
    [approvals],
  );

  const activeDispatchesCount = useMemo(
    () => dispatches.filter((d) => d.status === "ACTIVE").length,
    [dispatches],
  );

  const verifiedAuditsCount = useMemo(
    () => audits.filter((a) => a.verified).length,
    [audits],
  );

  // Extended filtered narratives with advanced filters
  const filteredNarratives = useMemo(() => {
    return narratives.filter((item) => {
      if (!showDebunked && item.status === "DEBUNKD_PUBLISHED") return false;
      if (orgFilter !== "ALL" && item.organization !== orgFilter) return false;
      if (threatFilter !== "ALL" && item.threatLevel !== threatFilter) return false;
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;
      if (sourceTypeFilter !== "ALL" && item.sourceType !== sourceTypeFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const statementStr = (item.rawStatement[locale] || item.rawStatement.en).toLowerCase();
      return (
        item.speaker.toLowerCase().includes(q) ||
        statementStr.includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.organization.toLowerCase().includes(q) ||
        item.district.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [narratives, orgFilter, threatFilter, categoryFilter, sourceTypeFilter, showDebunked, searchQuery, locale]);

  // Filtered Complaints List
  const filteredComplaints = useMemo(() => {
    return complaints.filter((item) => {
      if (filter.divisionId && item.division !== "National" && !item.division.toLowerCase().includes(filter.divisionId.toLowerCase())) {
        // Scope filter check
      }
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.trackingNo.toLowerCase().includes(q) ||
        item.district.toLowerCase().includes(q)
      );
    });
  }, [complaints, filter, statusFilter, searchQuery]);

  const handleDebunkAndPublish = useCallback((id: string) => {
    setNarratives((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "DEBUNKD_PUBLISHED", isJustIngested: false } : n)),
    );
    const newAudit: AuditLedgerItem = {
      id: `aud-${Date.now()}`,
      action: "NARRATIVE_DEBUNKED_PUBLISHED",
      actor: "pmo_media_cell",
      role: "PMO",
      entity: "SpeechRecord",
      entityId: id,
      ipAddress: "127.0.0.1",
      hash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
      verified: true,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    };
    setAudits((prev) => [newAudit, ...prev]);
  }, []);

  // Dismiss / Delete individual narrative from active feed
  const handleDismissNarrative = useCallback((id: string) => {
    setNarratives((prev) => prev.filter((n) => n.id !== id));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }, []);

  // Deduplicate database — remove items with same speaker+statement fingerprint, keep first
  const handleDeduplicateDatabase = useCallback(() => {
    setNarratives((prev) => {
      const seen = new Set<string>();
      const unique: NarrativeSpeechItem[] = [];
      let removedCount = 0;
      for (const item of prev) {
        const fp = `${item.speaker}::${item.rawStatement.en.slice(0, 60)}`;
        if (seen.has(fp)) { removedCount++; }
        else { seen.add(fp); unique.push(item); }
      }
      setDedupResult({ removed: removedCount, kept: unique.length });
      setTimeout(() => setDedupResult(null), 6000);
      return unique;
    });
    setSelectedIds(new Set());
  }, []);

  // Bulk: toggle single item selection
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Bulk: select/deselect all visible items
  const handleSelectAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) =>
      ids.every((id) => prev.has(id)) ? new Set() : new Set(ids)
    );
  }, []);

  // Bulk: mark all selected as debunked
  const handleBulkDebunk = useCallback(() => {
    setNarratives((prev) =>
      prev.map((n) => selectedIds.has(n.id) ? { ...n, status: "DEBUNKD_PUBLISHED" as const, isJustIngested: false } : n)
    );
    setSelectedIds(new Set());
  }, [selectedIds]);

  // Bulk: escalate all selected to PMO
  const handleBulkEscalate = useCallback(() => {
    setNarratives((prev) =>
      prev.map((n) => selectedIds.has(n.id) ? { ...n, status: "ESCALATED_PMO" as const, isJustIngested: false } : n)
    );
    setSelectedIds(new Set());
  }, [selectedIds]);

  // Bulk: dismiss/remove all selected
  const handleBulkDismiss = useCallback(() => {
    setNarratives((prev) => prev.filter((n) => !selectedIds.has(n.id)));
    setSelectedIds(new Set());
  }, [selectedIds]);

  // Export all narratives as CSV file
  const handleExportNarratives = useCallback(() => {
    if (narratives.length === 0) return;
    const rows = narratives.map((n) => ({
      id: n.id, speaker: n.speaker, organization: n.organization,
      district: n.district, timestamp: n.timestamp, sourceType: n.sourceType,
      category: n.category, threatLevel: n.threatLevel, status: n.status,
      statement_en: n.rawStatement.en, statement_bn: n.rawStatement.bn,
      ragDebunk_en: n.ragDebunk.factualCounter.en,
      confidence: n.ragDebunk.confidenceScore, policyRef: n.ragDebunk.officialPolicyRef,
    }));
    const header = Object.keys(rows[0]).join(",");
    const csvRows = rows.map((r) =>
      Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    );
    const csv = [header, ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GeoInsight_NarrativeReport_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [narratives]);

  // Reset database — clears all data from memory and localStorage
  const handleResetDatabase = useCallback(() => {
    if (!window.confirm(
      isBn
        ? "সতর্কতা: কৌশলগত প্রতিরক্ষা থেকে সমস্ত ডেটা মুছে ফেলা হবে। নিশ্চিত করুন?"
        : "Warning: All narrative defense records will be cleared. Confirm?"
    )) return;
    setNarratives([]);
    localStorage.removeItem("ops_narratives");
    localStorage.removeItem("ops_stream_idx");
    localStorage.removeItem("ops_last_sync_time");
    setNextStreamIdx(0);
    setSelectedIds(new Set());
    setDedupResult({ removed: narratives.length, kept: 0 });
    setTimeout(() => setDedupResult(null), 4000);
  }, [isBn, narratives.length]);

  const handleEscalateToPmoBriefing = useCallback((id: string) => {
    setNarratives((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "ESCALATED_PMO", isJustIngested: false } : n)),
    );
    const newAudit: AuditLedgerItem = {
      id: `aud-${Date.now()}`,
      action: "NARRATIVE_ESCALATED_PMO",
      actor: "pmo_analyst",
      role: "PMO",
      entity: "SpeechRecord",
      entityId: id,
      ipAddress: "127.0.0.1",
      hash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
      verified: true,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    };
    setAudits((prev) => [newAudit, ...prev]);
  }, []);

  const handleAddSpeechRecord = useCallback(() => {
    if (!newSpeaker || !newStatement) return;
    const item: NarrativeSpeechItem = {
      id: `sp-${Date.now()}`,
      speaker: newSpeaker,
      organization: newOrg,
      roleTitle: isBn ? "সংগঠন প্রতিনিধি" : "Party Official",
      venuePlatform: newVenue || (isBn ? "জনসভা / প্রেস ক্লাব" : "Public Rally / Press Club"),
      location: isBn ? "ঢাকা, বাংলাদেশ" : "Dhaka, Bangladesh",
      district: "Dhaka",
      timestamp: new Date().toLocaleTimeString(),
      sourceType: "NEWS_ARTICLE",
      isJustIngested: true,
      rawStatement: {
        en: newStatement,
        bn: newStatement,
      },
      category: "ANTI_GOVT_INCITEMENT",
      threatLevel: newThreat,
      ragDebunk: {
        factualCounter: {
          en: "AI RAG Retrieval in progress... Verified against Cabinet Division Gazette and Bangladesh Bureau of Statistics official data repositories.",
          bn: "AI RAG তথ্য পুনরুদ্ধার প্রক্রিয়াধীন... মন্ত্রী পরিষদ বিভাগ গ্যাজেট এবং বাংলাদেশ পরিসংখ্যান ব্যুরো (BBS) এর অফিসিয়াল রিপোজিটরির সাথে তথ্যের বস্তুনিষ্ঠ সত্যতা যাচাই করা হয়েছে।",
        },
        verifiedSources: ["Cabinet Division Gazette", "BBS National Data Portal"],
        officialPolicyRef: "State Security & Public Information Act 2026",
        confidenceScore: 95,
      },
      status: "FLAGGED",
    };
    setNarratives((prev) => [item, ...prev]);
    setNewSpeaker("");
    setNewVenue("");
    setNewSourceUrl("");
    setNewStatement("");
    setShowNewSpeechModal(false);
  }, [newSpeaker, newOrg, newVenue, newSourceUrl, newStatement, newThreat, isBn]);

  // Handlers for interactive actions
  const handleAssignComplaint = useCallback((id: string) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "ASSIGNED", assignedTo: "Duty DC Officer" } : c)),
    );
    const newAudit: AuditLedgerItem = {
      id: `aud-${Date.now()}`,
      action: "COMPLAINT_ASSIGNED",
      actor: "pmo_operator",
      role: "PMO",
      entity: "GrievanceRecord",
      entityId: id,
      ipAddress: "127.0.0.1",
      hash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
      verified: true,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    };
    setAudits((prev) => [newAudit, ...prev]);
  }, []);

  const handleResolveComplaint = useCallback((id: string) => {
    setComplaints((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "RESOLVED" } : c)),
    );
    const newAudit: AuditLedgerItem = {
      id: `aud-${Date.now()}`,
      action: "COMPLAINT_RESOLVED",
      actor: "pmo_operator",
      role: "PMO",
      entity: "GrievanceRecord",
      entityId: id,
      ipAddress: "127.0.0.1",
      hash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
      verified: true,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    };
    setAudits((prev) => [newAudit, ...prev]);
  }, []);

  const handleApproveAction = useCallback((id: string) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "APPROVED" } : a)),
    );
    const app = approvals.find((a) => a.id === id);
    const newAudit: AuditLedgerItem = {
      id: `aud-${Date.now()}`,
      action: "APPROVAL_GRANTED",
      actor: "pmo_director",
      role: "PMO",
      entity: "ApprovalRequest",
      entityId: app?.referenceCode || id,
      ipAddress: "127.0.0.1",
      hash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
      verified: true,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    };
    setAudits((prev) => [newAudit, ...prev]);
  }, [approvals]);

  const handleRejectAction = useCallback((id: string) => {
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "REJECTED" } : a)),
    );
    const app = approvals.find((a) => a.id === id);
    const newAudit: AuditLedgerItem = {
      id: `aud-${Date.now()}`,
      action: "APPROVAL_REJECTED",
      actor: "pmo_director",
      role: "PMO",
      entity: "ApprovalRequest",
      entityId: app?.referenceCode || id,
      ipAddress: "127.0.0.1",
      hash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
      verified: true,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    };
    setAudits((prev) => [newAudit, ...prev]);
  }, [approvals]);

  const handleAddComplaint = useCallback(() => {
    if (!newComplaintTitle) return;
    const item: ComplaintItem = {
      id: `cmp-${Date.now()}`,
      trackingNo: `GRV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      channel: "DIRECT_PORTAL",
      title: newComplaintTitle,
      description: newComplaintDesc || "Field observation complaint submitted via Operational Core console.",
      district: newComplaintDistrict,
      division: "Dhaka",
      category: newComplaintCategory,
      urgency: "P2_HIGH",
      status: "SUBMITTED",
      submittedAt: new Date().toISOString(),
    };
    setComplaints((prev) => [item, ...prev]);
    setNewComplaintTitle("");
    setNewComplaintDesc("");
    setShowNewComplaintModal(false);
  }, [newComplaintTitle, newComplaintDesc, newComplaintDistrict, newComplaintCategory]);

  const handleSendBroadcast = useCallback(() => {
    if (!broadcastMessage) return;
    setBroadcastSuccess(true);
    setTimeout(() => {
      setBroadcastSuccess(false);
      setShowBroadcastModal(false);
      setBroadcastMessage("");
      setDispatches((prev) =>
        prev.map((d, idx) => (idx === 0 ? { ...d, dispatchedCount: d.dispatchedCount + 64, lastDispatchedAt: "Just now" } : d)),
      );
    }, 1200);
  }, [broadcastMessage]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-primary/10 via-background/90 to-emerald-500/10 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <Badge className="bg-primary/20 text-primary">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                {t("title")}
              </Badge>
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {isBn ? "লাইভ স্ট্র্যাটেজিক কমান্ড সক্রিয়" : "Live Strategic Command Active"}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("title")}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">
              {t("description")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-background/80 hover:bg-amber-500/10"
              onClick={() => setShowNewSpeechModal(true)}
            >
              <MessageSquareWarning className="h-4 w-4" />
              {t("narrative.logSpeechBtn")}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-border/80 bg-background/80 hover:bg-accent"
              onClick={() => setShowNewComplaintModal(true)}
            >
              <PlusCircle className="h-4 w-4 text-emerald-500" />
              {t("complaints.newComplaint")}
            </Button>

            <Button
              size="sm"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setShowBroadcastModal(true)}
            >
              <Send className="h-4 w-4" />
              {t("notifications.broadcast")}
            </Button>
          </div>
        </div>

        {/* Strategic Operational Stats Grid (3 Core Pillars) */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 font-medium">
              <span>{isBn ? "উসকানিমূলক বক্তব্য ও অপপ্রচার" : "Flagged Incitement Speeches"}</span>
              <Flame className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">{activeNarrativeCount}</span>
              <span className="text-xs text-muted-foreground">{isBn ? "চিহ্নিত ও RAG খণ্ডন চলছে" : "flagged & RAG analyzed"}</span>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              <span>{isBn ? "মাঠপর্যায়ের নাগরিক অভিযোগ" : "Active Citizen Grievances"}</span>
              <Workflow className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{activeComplaintsCount}</span>
              <span className="text-xs text-muted-foreground">/ {complaints.length} {isBn ? "মোট অভিযোগ" : "total filed"}</span>
            </div>
          </div>

          <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-between text-xs text-sky-700 dark:text-sky-400 font-medium">
              <span>{isBn ? "কৌশলগত অনুমোদন ও ঝুঁকি নিরসন" : "Pending Governance Approvals"}</span>
              <Clock className="h-4 w-4 text-sky-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-sky-700 dark:text-sky-300">{pendingApprovalsCount}</span>
              <span className="text-xs text-muted-foreground">{isBn ? "অনুমোদন অপেক্ষমাণ" : "requires PMO clearance"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dedup result toast */}
      {dedupResult !== null && (
        <div className="flex items-center gap-3 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-700 dark:text-sky-300 shadow-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-500" />
          {dedupResult.removed === 0
            ? (isBn ? `✅ ডেটাবেজ পরিষ্কার — কোনো ডুপ্লিকেট পাওয়া যায়নি। মোট ${dedupResult.kept} টি রেকর্ড।` : `✅ Database clean — no duplicates found. ${dedupResult.kept} unique records.`)
            : (isBn ? `🧹 ${dedupResult.removed} টি ডুপ্লিকেট সরানো হয়েছে। ${dedupResult.kept} টি অনন্য রেকর্ড রক্ষিত।` : `🧹 Removed ${dedupResult.removed} duplicates. ${dedupResult.kept} unique records retained.`)}
          <button type="button" onClick={() => setDedupResult(null)} className="ml-auto opacity-60 hover:opacity-100 transition-opacity"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Real-time Ingestion Stream Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
            <Activity className="h-4 w-4 animate-spin" />
            {isBn ? "রিয়েল-টাইম লাইভ তথ্য স্ক্যানার (১৫ মিনিট ব্যবধান):" : "Real-time Live Stream Poller (15 min interval):"}
          </span>
          <span className="text-muted-foreground">
            {isBn ? "সর্বশেষ স্ক্যান:" : "Last Crawled:"} <strong className="text-foreground">{lastSyncTime}</strong>
          </span>
          <Badge variant="outline" className="bg-background/80 text-[10px] gap-1">
            <Globe className="h-3 w-3 text-primary" />
            {narratives.length} {isBn ? "টি বক্তব্য বিশ্লেষণাধীন" : "statements analyzed"}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Fetch Now */}
          <Button size="sm" variant="outline"
            className="h-7 gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs font-semibold"
            disabled={isFetchingNow} onClick={triggerIngestNewSpeech}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetchingNow ? "animate-spin" : ""}`} />
            {isFetchingNow ? (isBn ? "ফিড স্ক্যান হচ্ছে..." : "Crawling...") : (isBn ? "নতুন ফিড আনুন" : "Fetch Now")}
          </Button>

          {/* Deduplicate DB */}
          <Button size="sm" variant="outline"
            className="h-7 gap-1.5 border-sky-500/40 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 text-xs font-semibold"
            onClick={handleDeduplicateDatabase}
            title={isBn ? "ডেটাবেজ থেকে ডুপ্লিকেট বক্তব্য সরান" : "Remove duplicate records from database"}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isBn ? "ডুপ্লিকেট মুছুন" : "Dedup DB"}
          </Button>

          {/* Export CSV */}
          <Button size="sm" variant="outline"
            className="h-7 gap-1.5 border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 text-xs font-semibold"
            onClick={handleExportNarratives}
            title={isBn ? "সকল বক্তব্য CSV ফাইলে রপ্তানি করুন" : "Export all narratives as CSV report"}
          >
            <Download className="h-3.5 w-3.5" />
            {isBn ? "CSV রপ্তানি" : "Export CSV"}
          </Button>

          {/* Reset DB */}
          <Button size="sm" variant="outline"
            className="h-7 gap-1.5 border-red-500/40 text-red-500 hover:bg-red-500/10 text-xs font-semibold"
            onClick={handleResetDatabase}
            title={isBn ? "সব ইনজেস্টেড ডেটা মুছে সিড ডেটায় ফিরুন" : "Reset to original seed data only"}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {isBn ? "DB রিসেট" : "Reset DB"}
          </Button>

          {/* Auto-Feed Toggle */}
          <button type="button"
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium border transition-all ${
              isAutoIngestActive
                ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                : "border-border bg-muted text-muted-foreground"
            }`}
            onClick={() => setIsAutoIngestActive((prev) => !prev)}
          >
            <Zap className={`h-3 w-3 ${isAutoIngestActive ? "text-emerald-500" : ""}`} />
            {isAutoIngestActive ? (isBn ? "অটো-ফিড: চালু" : "Auto-Feed: ON") : (isBn ? "অটো-ফিড: বন্ধ" : "Auto-Feed: OFF")}
          </button>
        </div>
      </div>

      {/* 3 Core Features Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-2">
        <div className="flex flex-wrap gap-1.5 rounded-xl bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("narrative")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === "narrative"
                ? "bg-background text-foreground shadow-sm border border-amber-500/30"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
            }`}
          >
            <MessageSquareWarning className="h-3.5 w-3.5 text-amber-500" />
            {isBn ? "১. উসকানিমূলক বক্তব্য ও RAG খণ্ডন" : "1. Narrative Defense & RAG Debunking"}
            {activeNarrativeCount > 0 && (
              <Badge className="ml-1 h-5 bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 text-[10px]">
                {activeNarrativeCount}
              </Badge>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("complaints")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === "complaints"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
            }`}
          >
            <Workflow className="h-3.5 w-3.5 text-emerald-500" />
            {isBn ? "২. নাগরিক অভিযোগ ও সংকট সমাধান" : "2. Citizen Grievance & Crisis Response"}
            {activeComplaintsCount > 0 && (
              <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px]">
                {activeComplaintsCount}
              </Badge>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("approvals")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              activeTab === "approvals"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-sky-500" />
            {isBn ? "৩. কৌশলগত অনুমোদন ও ঝুঁকি নিরসন" : "3. Strategic Approvals & Risk Governance"}
            {pendingApprovalsCount > 0 && (
              <Badge className="ml-1 h-5 bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 text-[10px]">
                {pendingApprovalsCount}
              </Badge>
            )}
          </button>
        </div>

        {/* Tab Controls: Advanced Multi-Filter bar for Narrative tab */}
        {activeTab === "narrative" && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={isBn ? "বক্তা, বক্তব্য, জেলা খুঁজুন..." : "Search speaker, statement, district..."}
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="h-8 w-44 pl-8 text-xs sm:w-52"
              />
            </div>

            {/* Organization filter */}
            <select value={orgFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setOrgFilter(e.target.value)}
              aria-label="Filter by organization" className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground">
              <option value="ALL">{isBn ? "সকল সংগঠন" : "All Orgs"}</option>
              <option value="Jamaat-e-Islami">{isBn ? "জামায়াতে ইসলামী" : "Jamaat-e-Islami"}</option>
              <option value="NCP (Nationalist Citizen Party)">{isBn ? "এনসিপি (NCP)" : "NCP"}</option>
              <option value="Independent Anti-Govt Group">{isBn ? "স্বাধীন গ্রুপ" : "Indep. Groups"}</option>
              <option value="Extremist Channel">{isBn ? "উগ্রবাদী চ্যানেল" : "Extremist Ch."}</option>
            </select>

            {/* Threat Level filter */}
            <select value={threatFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setThreatFilter(e.target.value)}
              aria-label="Filter by threat level" className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground">
              <option value="ALL">{isBn ? "সকল ভাবকি" : "All Threats"}</option>
              <option value="CRITICAL">{isBn ? "অতি জরুরি" : "Critical"}</option>
              <option value="HIGH">{isBn ? "উচ্চ" : "High"}</option>
              <option value="MEDIUM">{isBn ? "মাঘারি" : "Medium"}</option>
            </select>

            {/* Category filter */}
            <select value={categoryFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category" className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground">
              <option value="ALL">{isBn ? "সকল ধরন" : "All Categories"}</option>
              <option value="ANTI_GOVT_INCITEMENT">{isBn ? "সরকার বিরোধী" : "Anti-Govt Incitement"}</option>
              <option value="STATE_SOVEREIGNTY_THREAT">{isBn ? "সার্বভৌমত্ব হুমকি" : "Sovereignty Threat"}</option>
              <option value="ECONOMIC_SABOTAGE_CALL">{isBn ? "অর্থনৈতিক ক্ষতি" : "Economic Sabotage"}</option>
              <option value="PUBLIC_UNREST_COMMOTION">{isBn ? "সামাজিক অস্থিরতা" : "Public Unrest"}</option>
            </select>

            {/* Source type filter */}
            <select value={sourceTypeFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSourceTypeFilter(e.target.value)}
              aria-label="Filter by source type" className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground">
              <option value="ALL">{isBn ? "সকল মাধ্যম" : "All Sources"}</option>
              <option value="FACEBOOK_LIVE">{isBn ? "ফেসবুক" : "Facebook Live"}</option>
              <option value="TELEGRAM_CHANNEL text">{isBn ? "টেলিগ্রাম" : "Telegram"}</option>
              <option value="YOUTUBE_BROADCAST">{isBn ? "ইউটিউব" : "YouTube"}</option>
              <option value="NEWS_ARTICLE">{isBn ? "সংবাদপত্র" : "News Article"}</option>
            </select>

            {/* Show/Hide debunked toggle */}
            <button type="button"
              onClick={() => setShowDebunked((prev) => !prev)}
              className={`flex items-center gap-1 rounded-md px-2 py-1 h-8 text-[11px] font-medium border transition-all ${
                showDebunked
                  ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "border-border bg-muted text-muted-foreground"
              }`}
            >
              <Eye className="h-3 w-3" />
              {showDebunked ? (isBn ? "খণ্ডিত দেখাচ্ছে" : "Showing Debunked") : (isBn ? "খণ্ডিত লুকানো" : "Hide Debunked")}
            </button>

            {/* Clear all filters */}
            {(searchQuery || orgFilter !== "ALL" || threatFilter !== "ALL" || categoryFilter !== "ALL" || sourceTypeFilter !== "ALL") && (
              <button type="button"
                onClick={() => { setSearchQuery(""); setOrgFilter("ALL"); setThreatFilter("ALL"); setCategoryFilter("ALL"); setSourceTypeFilter("ALL"); }}
                className="flex items-center gap-1 rounded-md px-2 py-1 h-8 text-[11px] font-medium border border-red-400/40 bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-all"
              >
                <X className="h-3 w-3" />
                {isBn ? "ফিল্টার মুছুন" : "Clear Filters"}
              </button>
            )}
          </div>
        )}

        {activeTab === "complaints" && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={isBn ? "অভিযোগ খুঁজুন..." : "Search complaints..."}
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="h-8 w-44 pl-8 text-xs sm:w-60"
              />
            </div>
            <select value={statusFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              aria-label="Filter complaints by status" className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground">
              <option value="ALL">All Status</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="IN_REVIEW">In Review</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab 0: Narrative Defense & RAG Debunking Engine */}
      {activeTab === "narrative" && (
        <div className="space-y-4">
          {/* Bulk Action Bar — appears when items are selected */}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 shadow-sm">
              <ListChecks className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-semibold text-primary">
                {selectedIds.size} {isBn ? "টি বক্তব্য নির্বাচিত" : "selected"}
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button size="sm" className="h-7 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs" onClick={handleBulkDebunk}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isBn ? "সকল খণ্ডন করুন" : "Bulk Debunk"}
                </Button>
                <Button size="sm" variant="outline" className="h-7 gap-1.5 border-sky-500/40 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 text-xs" onClick={handleBulkEscalate}>
                  <Send className="h-3.5 w-3.5" />
                  {isBn ? "PMO-তে এস্কেলেট" : "Escalate PMO"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-red-400 hover:bg-red-500/10 text-xs" onClick={handleBulkDismiss}>
                  <Trash2 className="h-3.5 w-3.5" />
                  {isBn ? "সকল ডিসমিস" : "Bulk Dismiss"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => setSelectedIds(new Set())}>
                  <X className="h-3.5 w-3.5 mr-1" />{isBn ? "বাতিল" : "Cancel"}
                </Button>
              </div>
            </div>
          )}

          <Card className="border-border/70 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-primary" />
                  {t("narrative.title")}
                </CardTitle>
                <CardDescription className="text-xs">{t("narrative.subtitle")}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {/* Select All button */}
                <button type="button"
                  onClick={() => handleSelectAll(filteredNarratives.map((n) => n.id))}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium border border-border bg-muted text-muted-foreground hover:bg-background hover:text-foreground transition-all"
                  title={isBn ? "সকল দৃশ্যমান বক্তব্য নির্বাচন/অনির্বাচন" : "Select / Deselect all visible"}
                >
                  {filteredNarratives.length > 0 && filteredNarratives.every((n) => selectedIds.has(n.id))
                    ? <CheckSquare className="h-3.5 w-3.5 text-primary" />
                    : <Square className="h-3.5 w-3.5" />}
                  {isBn ? "সব নির্বাচন" : "Select All"}
                </button>
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  <Sparkles className="mr-1 h-3 w-3" />
                  {isBn ? "RAG AI সত্যতা নিশ্চিতকরণ" : "RAG Engine Grounded"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {filteredNarratives.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {isBn ? "নির্বাচিত ফিল্টারে কোনো উসকানিমূলক বক্তব্য পাওয়া যায়নি।" : "No flagged incitement statements found matching the selected filter."}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNarratives.map((item) => {
                    const statementText = item.rawStatement[locale] || item.rawStatement.en;
                    const debunkText = item.ragDebunk.factualCounter[locale] || item.ragDebunk.factualCounter.en;
                    const categoryLabel = t(`narrative.categories.${item.category}`);

                    const isSelected = selectedIds.has(item.id);

                    return (
                      <div
                        key={item.id}
                        className={`group rounded-xl border p-4 transition-all hover:shadow-md space-y-3 ${
                          isSelected
                            ? "border-primary/60 bg-primary/5 ring-1 ring-primary/20"
                            : item.isJustIngested
                            ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30"
                            : "border-border/70 bg-card hover:border-amber-500/50"
                        }`}
                      >
                        {/* Top bar: Speaker & Meta */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Per-card checkbox for bulk select */}
                            <button
                              type="button"
                              onClick={() => handleToggleSelect(item.id)}
                              className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                              title={isBn ? "এই বক্তব্য নির্বাচন করুন" : "Select this item"}
                            >
                              {isSelected
                                ? <CheckSquare className="h-4 w-4 text-primary" />
                                : <Square className="h-4 w-4 opacity-40 group-hover:opacity-100" />}
                            </button>

                            {item.isJustIngested && (
                              <Badge className="bg-emerald-500 text-white font-bold text-[10px] animate-pulse">
                                {isBn ? "নতুন ইনজেস্টেড" : "NEW / LIVE"}
                              </Badge>
                            )}
                            <div className="flex items-center gap-1.5 font-semibold text-sm">
                              <UserX className="h-4 w-4 text-amber-500" />
                              <span>{item.speaker}</span>
                            </div>
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                              {item.organization}
                            </Badge>
                            <span className="text-xs text-muted-foreground">({item.roleTitle})</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                item.threatLevel === "CRITICAL"
                                  ? "bg-destructive/20 text-destructive font-bold"
                                  : item.threatLevel === "HIGH"
                                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold"
                                  : "bg-sky-500/20 text-sky-700"
                              }
                            >
                              {isBn ? `ঝুঁকি: ${item.threatLevel}` : `Threat: ${item.threatLevel}`}
                            </Badge>

                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
                              {item.venuePlatform}
                            </Badge>
                          </div>
                        </div>

                        {/* Location, Time & Source Links */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-primary" />
                              {isBn ? "স্থান:" : "Location:"} <strong className="text-foreground">{item.location}</strong>
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-primary" />
                              {isBn ? "সময়:" : "Recorded:"} <strong>{item.timestamp}</strong>
                            </span>
                            <span>·</span>
                            <Badge variant="outline" className="text-[10px]">
                              {categoryLabel}
                            </Badge>
                          </div>

                          {/* Source Link Buttons */}
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                              onClick={() => setSelectedEvidenceItem(item)}
                            >
                              <Eye className="h-3.5 w-3.5 text-amber-500" />
                              {isBn ? "প্রমাণ প্রিভিউ" : "Inspect Evidence"}
                            </Button>
                          </div>
                        </div>

                        {/* Incitement Speech Quote Block */}
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <MessageSquareWarning className="h-3.5 w-3.5" />
                            {isBn ? "চিহ্নিত উসকানিমূলক বা প্রপাগান্ডামূলক বক্তব্য:" : "Flagged Incitement Statement / Allegation:"}
                          </div>
                          <p className="text-xs font-medium italic text-foreground leading-relaxed">
                            &ldquo;{statementText}&rdquo;
                          </p>
                        </div>

                        {/* RAG-Powered AI Debunk Box */}
                        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              <BrainCircuit className="h-4 w-4" />
                              {t("narrative.ragDebunk")}
                            </div>
                            <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px]">
                              RAG Grounded · {item.ragDebunk.confidenceScore}% {isBn ? "আত্মবিশ্বাস" : "Confidence"}
                            </Badge>
                          </div>

                          <p className="text-xs text-foreground leading-relaxed">
                            {debunkText}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-500/20 text-[11px]">
                            <span className="font-semibold text-muted-foreground">{isBn ? "যাচাইকৃত উৎস:" : "Verified Sources:"}</span>
                            {item.ragDebunk.verifiedSources.map((src, idx) => (
                              <Badge key={idx} variant="outline" className="bg-background/80 text-[10px]">
                                <FileSearch className="mr-1 h-3 w-3 text-sky-500" />
                                {src}
                              </Badge>
                            ))}
                            <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                              {isBn ? "রাষ্ট্রীয় নীতি:" : "Policy:"} {item.ragDebunk.officialPolicyRef}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons for narrative response */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-2">
                            {/* Status badge */}
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                item.status === "DEBUNKD_PUBLISHED"
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : item.status === "ESCALATED_PMO"
                                  ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {item.status === "DEBUNKD_PUBLISHED"
                                ? (isBn ? "✅ RAG খণ্ডন প্রকাশিত" : "✅ Debunked & Published")
                                : item.status === "ESCALATED_PMO"
                                ? (isBn ? "📨 PMO-তে এস্কেলেট" : "📨 Escalated to PMO")
                                : (isBn ? "🚨 ফ্ল্যাগড / সক্রিয়" : "🚨 Flagged / Active")}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Dismiss button */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              title={isBn ? "তালিকা থেকে বাদ দিন" : "Dismiss from active feed"}
                              onClick={() => handleDismissNarrative(item.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>

                            {item.status !== "DEBUNKD_PUBLISHED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1 border-primary/40 text-primary hover:bg-primary/10 text-xs"
                                onClick={() => handleEscalateToPmoBriefing(item.id)}
                              >
                                <Send className="h-3.5 w-3.5" />
                                {t("narrative.actionEscalate")}
                              </Button>
                            )}

                            <Button
                              size="sm"
                              className="h-8 gap-1 bg-emerald-600 text-white hover:bg-emerald-700 text-xs"
                              onClick={() => handleDebunkAndPublish(item.id)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {item.status === "DEBUNKD_PUBLISHED" ? t("narrative.actionDebunked") : (isBn ? "RAG সত্যতা প্রকাশ" : "Publish RAG Counter")}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 1: Complaint & Grievance Lifecycle */}
      {activeTab === "complaints" && (
        <div className="space-y-4">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">{t("complaints.title")}</CardTitle>
                <CardDescription className="text-xs">{t("complaints.subtitle")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {filteredComplaints.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No grievances found matching the selected scope or query.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredComplaints.map((item) => (
                    <div
                      key={item.id}
                      className="group flex flex-col gap-3 rounded-xl border border-border/60 bg-card/70 p-4 transition-all hover:border-primary/40 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-muted-foreground">{item.trackingNo}</span>
                          <Badge variant="outline" className="text-[10px]">
                            Channel: {item.channel}
                          </Badge>
                          <Badge
                            className={
                              item.urgency === "P1_CRITICAL"
                                ? "bg-destructive/15 text-destructive"
                                : item.urgency === "P2_HIGH"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                : "bg-sky-500/15 text-sky-700"
                            }
                          >
                            {item.urgency.replace("_", " ")}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {item.category}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-sm leading-snug">{item.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                          <span>District: <strong className="text-foreground">{item.district}</strong></span>
                          <span>·</span>
                          <span>Division: <strong className="text-foreground">{item.division}</strong></span>
                          {item.assignedTo && (
                            <>
                              <span>·</span>
                              <span className="text-emerald-600 dark:text-emerald-400">Assigned: {item.assignedTo}</span>
                            </>
                          )}
                          <span>·</span>
                          <span>{new Date(item.submittedAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex shrink-0 items-center gap-2">
                        {item.status !== "RESOLVED" && (
                          <>
                            {item.status !== "ASSIGNED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1 text-xs"
                                onClick={() => handleAssignComplaint(item.id)}
                              >
                                <UserCheck className="h-3.5 w-3.5 text-sky-500" />
                                {t("complaints.assign")}
                              </Button>
                            )}

                            <Button
                              size="sm"
                              className="h-8 gap-1 bg-emerald-600 text-white hover:bg-emerald-700 text-xs"
                              onClick={() => handleResolveComplaint(item.id)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {t("complaints.resolve")}
                            </Button>
                          </>
                        )}

                        {item.status === "RESOLVED" && (
                          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <Check className="h-4 w-4" />
                            Resolved
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Approval Workflow */}
      {activeTab === "approvals" && (
        <div className="space-y-4">
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">{t("approvals.title")}</CardTitle>
              <CardDescription className="text-xs">{t("approvals.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {approvals.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-4 transition-all hover:border-primary/40 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">{item.referenceCode}</span>
                        <Badge
                          className={
                            item.severity === "CRITICAL"
                              ? "bg-destructive/20 text-destructive font-bold"
                              : item.severity === "HIGH"
                              ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold"
                              : "bg-sky-500/20 text-sky-700"
                          }
                        >
                          Risk Score {item.riskScore} · {item.severity}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {item.type.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      <h4 className="text-base font-semibold">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">{item.aiExplanation}</p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1">
                        <span>Requested By: <strong className="text-foreground">{item.requestedBy}</strong></span>
                        <span>·</span>
                        <span>Scope: <strong className="text-foreground">{item.unitName}</strong></span>
                        <span>·</span>
                        <span>Requested At: {new Date(item.requestedAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Approval buttons */}
                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                      {item.status === "PENDING" ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 border-destructive/40 text-destructive hover:bg-destructive/10 text-xs"
                            onClick={() => handleRejectAction(item.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                            {t("approvals.reject")}
                          </Button>

                          <Button
                            size="sm"
                            className="h-8 gap-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
                            onClick={() => handleApproveAction(item.id)}
                          >
                            <Check className="h-3.5 w-3.5" />
                            {t("approvals.approve")}
                          </Button>
                        </>
                      ) : (
                        <div
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                            item.status === "APPROVED"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {item.status === "APPROVED" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          {item.status === "APPROVED" ? "Approved" : "Rejected"}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* End of 3 Core Features Tabs */}

      {/* Evidence Inspector Modal */}
      {selectedEvidenceItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2 text-primary">
                <FileCheck className="h-5 w-5 text-amber-500" />
                {isBn ? "উৎস ডিজিটাল প্রমাণ বিবরণী" : "Source Evidence Metadata & Media Inspector"}
              </h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedEvidenceItem(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg border border-border/40">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">{isBn ? "বক্তা" : "Speaker"}</span>
                  <strong className="text-sm text-foreground">{selectedEvidenceItem.speaker}</strong>
                </div>
                <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  {selectedEvidenceItem.organization}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-card p-2 rounded border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">{isBn ? "মাধ্যম / চ্যানেল" : "Source Media"}</span>
                  <strong className="text-foreground">{selectedEvidenceItem.venuePlatform}</strong>
                </div>
                <div className="bg-card p-2 rounded border border-border/50">
                  <span className="text-muted-foreground block text-[10px]">{isBn ? "সংগ্রহের সময়" : "Timestamp"}</span>
                  <strong className="text-foreground">{selectedEvidenceItem.timestamp}</strong>
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                  {isBn ? "সংগৃহীত বক্তব্য" : "Recorded Verbatim Statement"}
                </span>
                <p className="text-xs italic leading-relaxed text-foreground">
                  &ldquo;{selectedEvidenceItem.rawStatement[locale] || selectedEvidenceItem.rawStatement.en}&rdquo;
                </p>
              </div>

              {/* Direct Google Search Section */}
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Globe className="h-4 w-4" />
                  {isBn ? "গুগলে সরাসরি বক্তব্য ও তথ্য অনুসন্ধান করুন:" : "Direct Google Search for Speaker & Statement:"}
                </span>

                {(() => {
                  const bnStatementText = selectedEvidenceItem.rawStatement.bn || selectedEvidenceItem.rawStatement.en;
                  const cleanSpeaker = selectedEvidenceItem.speaker.replace(/\(.*\)/, "").trim();
                  
                  // Simplify the Dorking query to ensure actual Google results (Just Name + Statement excerpt)
                  const words = bnStatementText.replace(/[.,'"]/g, "").split(" ").slice(0, 5).join(" ");
                  const targetQuery = `"${cleanSpeaker}" ${words}`.trim();

                  const googleAllTarget = `https://www.google.com/search?q=${encodeURIComponent(targetQuery)}`;
                  const googleVideoTarget = `https://www.google.com/search?q=${encodeURIComponent(targetQuery)}&tbm=vid`;
                  const googleNewsTarget = `https://www.google.com/search?q=${encodeURIComponent(targetQuery)}&tbm=nws`;

                  return (
                    <div className="flex flex-col gap-3 pt-2">
                      <div className="rounded-md bg-black/90 dark:bg-black/80 p-2 font-mono text-[10px] text-emerald-400 border border-emerald-500/30 shadow-inner overflow-hidden">
                        <span className="text-muted-foreground mr-2 select-none">$</span>
                        <span className="break-all">{targetQuery}</span>
                      </div>
                      
                      <a
                        href={googleAllTarget}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-md bg-emerald-600 text-white px-3 py-2.5 font-semibold transition-all hover:bg-emerald-700 text-xs shadow-sm group"
                      >
                        <span className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4" />
                          {isBn ? "ওপেন সোর্স ইন্টেলিজেন্স (OSINT) সার্চ" : "Execute OSINT Web Search"}
                        </span>
                        <span className="text-[10px] opacity-70 font-mono font-bold group-hover:opacity-100 transition-opacity">EXEC ↗</span>
                      </a>

                      <a
                        href={googleNewsTarget}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-md border border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300 px-3 py-2 font-semibold transition-all hover:bg-sky-500/20 text-xs group"
                      >
                        <span className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          {isBn ? "নিউজ পোর্টাল বুলেটিন স্ক্যান" : "Scan News Portal Bulletins"}
                        </span>
                        <span className="text-[10px] opacity-70 font-mono font-bold group-hover:opacity-100 transition-opacity">NEWS ↗</span>
                      </a>

                      <a
                        href={googleVideoTarget}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-md border border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 px-3 py-2 font-semibold transition-all hover:bg-red-500/20 text-xs group"
                      >
                        <span className="flex items-center gap-2">
                          <Video className="h-4 w-4" />
                          {isBn ? "ভিডিও ও লাইভ স্ট্রিম স্ক্যান" : "Scan Video & Live Streams"}
                        </span>
                        <span className="text-[10px] opacity-70 font-mono font-bold group-hover:opacity-100 transition-opacity">MEDIA ↗</span>
                      </a>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedEvidenceItem(null)}>
                {isBn ? "বন্ধ করুন" : "Close"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Log Incitement Speech Modal */}
      {showNewSpeechModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <MessageSquareWarning className="h-5 w-5" />
                {t("narrative.modalTitle")}
              </h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowNewSpeechModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground">{t("narrative.speaker")}</label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="e.g. Syed Abdullah (Jamaat / NCP)"
                  value={newSpeaker}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSpeaker(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground">{isBn ? "দল / সংগঠন" : "Organization"}</label>
                  <select
                    className="mt-1 w-full rounded-md border border-input bg-background p-2 text-xs"
                    value={newOrg}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewOrg(e.target.value as any)}
                  >
                    <option value="Jamaat-e-Islami">{isBn ? "জামায়াতে ইসলামী" : "Jamaat-e-Islami"}</option>
                    <option value="NCP (Nationalist Citizen Party)">{isBn ? "এনসিপি (NCP)" : "NCP"}</option>
                    <option value="Independent Anti-Govt Group">{isBn ? "স্বাধীন বিরোধী গ্রুপ" : "Independent Group"}</option>
                    <option value="Extremist Channel">{isBn ? "উগ্রবাদী চ্যানেল" : "Extremist Channel"}</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-foreground">{t("narrative.threatLevel")}</label>
                  <select
                    className="mt-1 w-full rounded-md border border-input bg-background p-2 text-xs"
                    value={newThreat}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewThreat(e.target.value as any)}
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground">{t("narrative.location")}</label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="e.g. Paltan Rally / Telegram Channel / YouTube Stream"
                  value={newVenue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewVenue(e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold text-foreground">{t("narrative.statement")}</label>
                <textarea
                  className="mt-1 w-full rounded-md border border-input bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                  placeholder={isBn ? "বক্তব্যের হুবহু কোটটি এখানে দিন..." : "Paste verbatim quote of the statement..."}
                  value={newStatement}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewStatement(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowNewSpeechModal(false)}>
                {isBn ? "বাতিল" : "Cancel"}
              </Button>
              <Button size="sm" className="bg-amber-600 text-white hover:bg-amber-700" onClick={handleAddSpeechRecord}>
                {t("narrative.modalSubmit")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Grievance Modal */}
      {showNewComplaintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Submit Field Grievance</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowNewComplaintModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground">Title</label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="e.g. Sluice Gate Damaged in Dacope"
                  value={newComplaintTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewComplaintTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="font-semibold text-foreground">Description</label>
                <textarea
                  className="mt-1 w-full rounded-md border border-input bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  rows={3}
                  placeholder="Provide brief observation details..."
                  value={newComplaintDesc}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewComplaintDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-foreground">District</label>
                  <Input
                    className="mt-1 text-xs"
                    value={newComplaintDistrict}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewComplaintDistrict(e.target.value)}
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground">Category</label>
                  <select
                    className="mt-1 w-full rounded-md border border-input bg-background p-2 text-xs"
                    value={newComplaintCategory}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewComplaintCategory(e.target.value as any)}
                  >
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Disaster">Disaster</option>
                    <option value="Agri-Market">Agri-Market</option>
                    <option value="Healthcare">Healthcare</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowNewComplaintModal(false)}>
                Cancel
              </Button>
              <Button size="sm" className="bg-primary text-primary-foreground" onClick={handleAddComplaint}>
                Submit Complaint
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                Dispatch Emergency Alert
              </h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowBroadcastModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {broadcastSuccess ? (
              <div className="py-6 text-center text-emerald-600 space-y-2">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 animate-bounce" />
                <p className="font-bold text-base">Alert Successfully Dispatched!</p>
                <p className="text-xs text-muted-foreground">Sent to 64 Deputy Commissioners & Regional PMO Desks.</p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-foreground">{t("notifications.targetRole")}</label>
                  <select
                    className="mt-1 w-full rounded-md border border-input bg-background p-2 text-xs"
                    value={broadcastTarget}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBroadcastTarget(e.target.value as any)}
                  >
                    <option value="DC">Deputy Commissioners (All 64 Districts)</option>
                    <option value="PMO">PMO Command Analysts</option>
                    <option value="MINISTER">Cabinet Ministers Desk</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-foreground">Alert Directive Message</label>
                  <textarea
                    className="mt-1 w-full rounded-md border border-input bg-background p-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    rows={4}
                    placeholder="e.g. URGENT: Activate cyclone shelter prep for coastal upazilas of Khulna & Barishal division..."
                    value={broadcastMessage}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBroadcastMessage(e.target.value)}
                  />
                </div>
              </div>
            )}

            {!broadcastSuccess && (
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowBroadcastModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleSendBroadcast}>
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  {t("notifications.sendBroadcast")}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
