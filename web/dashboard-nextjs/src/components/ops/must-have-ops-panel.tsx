"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAdminFilter } from "@/hooks/use-admin-filter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Workflow,
  ShieldCheck,
  CheckCircle2,
  Clock,
  UserCheck,
  Send,
  Search,
  PlusCircle,
  ShieldAlert,
  Check,
  X,
} from "lucide-react";

// --- Seed Types & Mock Data for Interactive Ops Workspace ---

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
    triggerEvent: "Category == Disaster & Urgency == P1_CRITICAL",
    targetRole: "DC",
    channel: "SMS",
    priority: "P1",
    status: "ACTIVE",
    dispatchedCount: 89,
    lastDispatchedAt: "1 hour ago",
  },
];

const INITIAL_AUDITS: AuditLedgerItem[] = [
  {
    id: "aud-001",
    action: "APPROVAL_EXECUTED",
    actor: "pmo_director",
    role: "PMO",
    entity: "ApprovalRequest",
    entityId: "APR-TW-2026-03",
    ipAddress: "10.0.1.42",
    hash: "0x8f2a1b9c4d3e2f1a",
    verified: true,
    timestamp: "2026-07-23 12:45:10",
  },
  {
    id: "aud-002",
    action: "COMPLAINT_ASSIGNED",
    actor: "ops_coordinator",
    role: "DC",
    entity: "GrievanceRecord",
    entityId: "GRV-2026-1104",
    ipAddress: "10.0.2.18",
    hash: "0x3e7a9b1c2d5f4e6a",
    verified: true,
    timestamp: "2026-07-23 12:15:30",
  },
];

export function MustHaveOpsPanel() {
  const { filter } = useAdminFilter();
  const locale = useLocale() as "bn" | "en";
  const isBn = locale === "bn";
  const t = useTranslations("modules.ops");

  const [activeTab, setActiveTab] = useState<"complaints" | "approvals">("complaints");

  // State management
  const [complaints, setComplaints] = useState<ComplaintItem[]>(INITIAL_COMPLAINTS);
  const [approvals, setApprovals] = useState<ApprovalItem[]>(INITIAL_APPROVALS);
  const [dispatches, setDispatches] = useState<SmartDispatchItem[]>(INITIAL_DISPATCHES);
  const [audits, setAudits] = useState<AuditLedgerItem[]>(INITIAL_AUDITS);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

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

  // Computed stats
  const activeComplaintsCount = useMemo(
    () => complaints.filter((c) => c.status !== "RESOLVED").length,
    [complaints],
  );

  const pendingApprovalsCount = useMemo(
    () => approvals.filter((a) => a.status === "PENDING").length,
    [approvals],
  );

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

  // Handlers for Complaints & Approvals
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
      action: "APPROVAL_EXECUTED",
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

        {/* Operational Stats Grid */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
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

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-2">
        <div className="flex flex-wrap gap-1.5 rounded-xl bg-muted/40 p-1">
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
            {isBn ? "১. নাগরিক অভিযোগ ও সংকট সমাধান" : "1. Citizen Grievance & Crisis Response"}
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
            {isBn ? "২. কৌশলগত অনুমোদন ও ঝুঁকি নিরসন" : "2. Strategic Approvals & Risk Governance"}
            {pendingApprovalsCount > 0 && (
              <Badge className="ml-1 h-5 bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 text-[10px]">
                {pendingApprovalsCount}
              </Badge>
            )}
          </button>
        </div>

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
