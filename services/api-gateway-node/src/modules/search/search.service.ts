import { prismaRead } from "../../core/database/prisma.client";
import { ingestionService } from "../ingestion/ingestion.service";
import { UserRole } from "@prisma/client";

export interface SearchResult {
  type: "page" | "project" | "representative" | "kpi" | "alert" | "news";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

const LOCAL_PAGES: SearchResult[] = [
  { type: "page", id: "local-entity", title: "Local Entity DSS", href: "/local" },
  { type: "page", id: "local-complaints", title: "Instant Action SLA", href: "/local/complaints" },
  { type: "page", id: "local-wpi", title: "Ward Performance Index", href: "/local/wpi" },
  { type: "page", id: "local-osint", title: "Local OSINT Feed", href: "/local/osint" },
  { type: "page", id: "local-pulse", title: "Unrest Pulse", href: "/local/pulse" },
  { type: "page", id: "local-evidence", title: "Research & experts", href: "/local/evidence" },
  { type: "page", id: "local-education", title: "Education desk", href: "/local/education" },
  { type: "page", id: "local-health", title: "Health desk", href: "/local/health" },
  { type: "page", id: "local-jobs", title: "Jobs & unemployment", href: "/local/jobs" },
  { type: "page", id: "local-crime", title: "Crime desk", href: "/local/crime" },
  { type: "page", id: "local-corruption", title: "Corruption desk", href: "/local/corruption" },
  { type: "page", id: "local-command", title: "Command room", href: "/local/command" },
  { type: "page", id: "local-specialty", title: "Role Specialty Pack", href: "/local/specialty" },
  { type: "page", id: "local-alerts", title: "WhatsApp / Voice Alerts", href: "/local/alerts" },
  { type: "page", id: "local-security", title: "Security & 2FA", href: "/local/security" },
  { type: "page", id: "notifications", title: "Notifications", href: "/notifications" },
];

const NATIONAL_PAGES: SearchResult[] = [
  { type: "page", id: "home", title: "National Overview", href: "/" },
  { type: "page", id: "briefing", title: "PM Briefing Copilot", href: "/briefing" },
  { type: "page", id: "narrative", title: "Narrative Shield", href: "/narrative-shield" },
  { type: "page", id: "outlook", title: "Strategic Outlook", href: "/outlook" },
  { type: "page", id: "sovereign", title: "Sovereign Bangla LLM", href: "/sovereign-ai" },
  { type: "page", id: "twin", title: "KPI Digital Twin", href: "/digital-twin" },
  { type: "page", id: "sentiment", title: "Citizen Sentiment", href: "/sentiment" },
  { type: "page", id: "unrest", title: "Protest & Public Unrest", href: "/unrest" },
  { type: "page", id: "anti-phishing", title: "Anti-Phishing Shield", href: "/anti-phishing" },
  { type: "page", id: "simulator", title: "Impact Simulator", href: "/simulator" },
  { type: "page", id: "procurement", title: "Procurement Advisor", href: "/procurement" },
  { type: "page", id: "divisional-crisis", title: "8 Divisions Crime & Crisis", href: "/divisional-crisis" },
  { type: "page", id: "national-sectors", title: "National education, health & jobs", href: "/sectors" },
  { type: "page", id: "kpis", title: "Representative KPIs", href: "/kpis" },
  { type: "page", id: "projects", title: "Project Tracker", href: "/projects" },
  { type: "page", id: "alerts", title: "Red Flag Alerts", href: "/alerts" },
  { type: "page", id: "documents", title: "Document Intelligence", href: "/documents" },
  { type: "page", id: "audit", title: "AI Audit Trail", href: "/audit-trail" },
  { type: "page", id: "citizen", title: "Citizen Chatbot", href: "/citizen-chat" },
  { type: "page", id: "hazards", title: "Flood & Cyclone Risk", href: "/hazards" },
  { type: "page", id: "proximity", title: "Proximity Alert Map", href: "/proximity" },
  { type: "page", id: "face-intel", title: "Face Intel / Ethical Card", href: "/face-intel" },
  { type: "page", id: "agro", title: "Agri Markets", href: "/agro" },
  { type: "page", id: "reps", title: "Representatives", href: "/representatives" },
  { type: "page", id: "local-entity", title: "Local Entity DSS", href: "/local" },
];

function pagesForRole(role: UserRole): SearchResult[] {
  if (role === UserRole.MP || role === UserRole.MAYOR) return LOCAL_PAGES;
  return NATIONAL_PAGES;
}

export class SearchService {
  async search(
    query: string,
    limit = 20,
    role: UserRole = UserRole.PMO,
  ): Promise<SearchResult[]> {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const results: SearchResult[] = [];
    const localOnly = role === UserRole.MP || role === UserRole.MAYOR;

    for (const page of pagesForRole(role)) {
      if (page.title.toLowerCase().includes(q)) {
        results.push(page);
      }
    }

    if (localOnly) {
      return results.slice(0, limit);
    }

    const [projects, reps, kpis, alerts, news] = await Promise.all([
      prismaRead.project.findMany({
        where: { title: { contains: q, mode: "insensitive" } },
        select: { id: true, title: true, status: true },
        take: 8,
      }),
      prismaRead.representative.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { party: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, role: true, party: true },
        take: 8,
      }),
      prismaRead.kpiDefinition.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, code: true },
        take: 6,
      }),
      prismaRead.redFlagAlert.findMany({
        where: {
          resolvedAt: null,
          OR: [
            { aiExplanation: { contains: q, mode: "insensitive" } },
            { project: { title: { contains: q, mode: "insensitive" } } },
          ],
        },
        include: { project: { select: { title: true } } },
        take: 6,
      }),
      ingestionService.searchArticles(q, 6),
    ]);

    for (const p of projects) {
      results.push({
        type: "project",
        id: p.id,
        title: p.title,
        subtitle: p.status,
        href: `/projects?highlight=${p.id}`,
      });
    }
    for (const r of reps) {
      results.push({
        type: "representative",
        id: r.id,
        title: r.name,
        subtitle: `${r.role}${r.party ? ` · ${r.party}` : ""}`,
        href: "/representatives",
      });
    }
    for (const k of kpis) {
      results.push({
        type: "kpi",
        id: k.id,
        title: k.name,
        subtitle: k.code,
        href: "/kpis",
      });
    }
    for (const a of alerts) {
      results.push({
        type: "alert",
        id: a.id,
        title: a.project.title,
        subtitle: a.flagType.replace(/_/g, " "),
        href: "/alerts",
      });
    }
    for (const n of news) {
      results.push({
        type: "news",
        id: n.id,
        title: n.title,
        subtitle: `${n.sourceName}${n.district ? ` · ${n.district}` : ""}`,
        href: n.url,
      });
    }

    return results.slice(0, limit);
  }
}

export const searchService = new SearchService();
