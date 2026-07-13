import { prismaRead } from "../../core/database/prisma.client";
import { ingestionService } from "../ingestion/ingestion.service";

export interface SearchResult {
  type: "page" | "project" | "representative" | "kpi" | "alert" | "news";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

const PAGES: SearchResult[] = [
  { type: "page", id: "home", title: "National Overview", href: "/" },
  { type: "page", id: "briefing", title: "PM Briefing Copilot", href: "/briefing" },
  { type: "page", id: "outlook", title: "Political & Economic Outlook", href: "/outlook" },
  { type: "page", id: "outlook-politics", title: "Political Outlook", href: "/outlook/politics" },
  { type: "page", id: "outlook-economy", title: "Economic Outlook", href: "/outlook/economy" },
  { type: "page", id: "sovereign", title: "Sovereign Bangla LLM", href: "/sovereign-ai" },
  { type: "page", id: "twin", title: "KPI Digital Twin", href: "/digital-twin" },
  { type: "page", id: "sentiment", title: "Citizen Sentiment", href: "/sentiment" },
  { type: "page", id: "unrest", title: "Protest & Public Unrest", href: "/unrest" },
  { type: "page", id: "simulator", title: "Impact Simulator", href: "/simulator" },
  { type: "page", id: "procurement", title: "Procurement Advisor", href: "/procurement" },
  { type: "page", id: "kpis", title: "Representative KPIs", href: "/kpis" },
  { type: "page", id: "projects", title: "Project Tracker", href: "/projects" },
  { type: "page", id: "alerts", title: "Red Flag Alerts", href: "/alerts" },
  { type: "page", id: "documents", title: "Document Intelligence", href: "/documents" },
  { type: "page", id: "audit", title: "AI Audit Trail", href: "/audit-trail" },
  { type: "page", id: "citizen", title: "Citizen Chatbot", href: "/citizen-chat" },
  { type: "page", id: "hazards", title: "Flood & Cyclone Risk", href: "/hazards" },
  { type: "page", id: "reps", title: "Representatives", href: "/representatives" },
];

export class SearchService {
  async search(query: string, limit = 20): Promise<SearchResult[]> {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const results: SearchResult[] = [];

    for (const page of PAGES) {
      if (page.title.toLowerCase().includes(q)) {
        results.push(page);
      }
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
