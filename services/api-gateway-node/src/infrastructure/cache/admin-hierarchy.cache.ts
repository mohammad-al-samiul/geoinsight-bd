import { AdminUnitType, Prisma } from "@prisma/client";
import { prismaRead } from "../../core/database/prisma.client";
import { redisCacheService } from "./redis-cache.service";

const HIERARCHY_CACHE_KEY = "geoinsight:admin:hierarchy:bd:full";
const HIERARCHY_TTL_SECONDS = 86_400; // 24h
const TREE_KEY_PREFIX = "geoinsight:admin:tree:";

export interface AdminHierarchyNode {
  id: string;
  code: string;
  name: string;
  nameBn: string | null;
  type: AdminUnitType;
  parentId: string | null;
  geoJson?: Prisma.JsonValue;
  children?: AdminHierarchyNode[];
}

type FlatUnit = {
  id: string;
  code: string;
  name: string;
  nameBn: string | null;
  type: AdminUnitType;
  parentId: string | null;
  geoJson: Prisma.JsonValue;
};

function buildForest(units: FlatUnit[]): AdminHierarchyNode[] {
  const byId = new Map<string, AdminHierarchyNode>();
  const roots: AdminHierarchyNode[] = [];

  for (const unit of units) {
    byId.set(unit.id, { ...unit, children: [] });
  }

  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: AdminHierarchyNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => n.children?.length && sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}

/**
 * Cache-Aside: full Bangladesh admin hierarchy (Division → Union).
 */
export class AdminHierarchyCacheService {
  async getFullHierarchy(): Promise<AdminHierarchyNode[]> {
    const cached = await redisCacheService.get<AdminHierarchyNode[]>(HIERARCHY_CACHE_KEY);
    if (cached) return cached;

    const units = await prismaRead.adminUnit.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        nameBn: true,
        type: true,
        parentId: true,
        geoJson: true,
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    const forest = buildForest(units);
    await redisCacheService.set(HIERARCHY_CACHE_KEY, forest, HIERARCHY_TTL_SECONDS);
    return forest;
  }

  async getTree(unitId: string): Promise<AdminHierarchyNode | null> {
    const cacheKey = `${TREE_KEY_PREFIX}${unitId}`;
    const cached = await redisCacheService.get<AdminHierarchyNode>(cacheKey);
    if (cached) return cached;

    const unit = await prismaRead.adminUnit.findUnique({
      where: { id: unitId },
      include: {
        children: {
          include: {
            children: { include: { children: true } },
          },
        },
      },
    });

    if (!unit) return null;

    await redisCacheService.set(cacheKey, unit, HIERARCHY_TTL_SECONDS);
    return unit as AdminHierarchyNode;
  }

  async invalidateAll(): Promise<void> {
    await redisCacheService.del(HIERARCHY_CACHE_KEY);
    await redisCacheService.delByPattern(`${TREE_KEY_PREFIX}*`);
  }
}

export const adminHierarchyCache = new AdminHierarchyCacheService();
