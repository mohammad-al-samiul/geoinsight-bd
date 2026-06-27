import { UserRole } from "@prisma/client";
import request from "supertest";
import { createApp } from "../../src/create-app";
import { installPrismaMocks, UNIT } from "../helpers/fixtures";
import { authHeader } from "../helpers/tokens";

describe("RBAC middleware integration", () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
    installPrismaMocks();
  });

  describe("authentication", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const res = await request(app).get("/api/v1/kpis/definitions");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("returns 401 for an invalid JWT", async () => {
      const res = await request(app)
        .get("/api/v1/kpis/definitions")
        .set("Authorization", "Bearer not-a-valid-token");
      expect(res.status).toBe(401);
    });
  });

  describe("role-based route guards", () => {
    it("allows PMO to list alerts", async () => {
      const res = await request(app)
        .get("/api/v1/alerts")
        .set(authHeader(UserRole.PMO));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("allows DC to list alerts", async () => {
      const res = await request(app)
        .get("/api/v1/alerts")
        .set(authHeader(UserRole.DC, UNIT.district));
      expect(res.status).toBe(200);
    });

    it("blocks UNION_CHAIRMAN from listing alerts (403)", async () => {
      const res = await request(app)
        .get("/api/v1/alerts")
        .set(authHeader(UserRole.UNION_CHAIRMAN, UNIT.union));
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("blocks UNION_CHAIRMAN from registering users (403)", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .set(authHeader(UserRole.UNION_CHAIRMAN, UNIT.union))
        .send({
          email: "new@geoinsight.gov.bd",
          password: "SecurePass1",
          role: UserRole.DC,
          adminUnitId: UNIT.district,
        });
      expect(res.status).toBe(403);
    });

    it("blocks MINISTER from resolving alerts (403)", async () => {
      const res = await request(app)
        .patch("/api/v1/alerts/11111111-1111-1111-1111-111111111199/resolve")
        .set(authHeader(UserRole.MINISTER, UNIT.division));
      expect(res.status).toBe(403);
    });
  });

  describe("multi-tenant admin-unit scope", () => {
    it("allows PMO national access to any division tree", async () => {
      const res = await request(app)
        .get(`/api/v1/admin-units/${UNIT.division}/tree`)
        .set(authHeader(UserRole.PMO));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("allows DC to drill into child upazila within district scope", async () => {
      const res = await request(app)
        .get(`/api/v1/admin-units/${UNIT.upazila}`)
        .set(authHeader(UserRole.DC, UNIT.district));
      expect(res.status).toBe(200);
    });

    it("blocks DC from accessing a peer district (403)", async () => {
      const res = await request(app)
        .get(`/api/v1/admin-units/${UNIT.districtOther}`)
        .set(authHeader(UserRole.DC, UNIT.district));
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/scope/i);
    });

    it("blocks UNION_CHAIRMAN from accessing division-level unit (403)", async () => {
      const res = await request(app)
        .get(`/api/v1/admin-units/${UNIT.division}`)
        .set(authHeader(UserRole.UNION_CHAIRMAN, UNIT.union));
      expect(res.status).toBe(403);
    });

    it("allows MINISTER division scope for district drill-down", async () => {
      const res = await request(app)
        .get(`/api/v1/admin-units/${UNIT.district}/tree`)
        .set(authHeader(UserRole.MINISTER, UNIT.division));
      expect(res.status).toBe(200);
    });
  });

  describe("KPI read paths (authenticated, no role gate on GET)", () => {
    it("allows authenticated UNION_CHAIRMAN to read KPI definitions", async () => {
      const res = await request(app)
        .get("/api/v1/kpis/definitions")
        .set(authHeader(UserRole.UNION_CHAIRMAN, UNIT.union));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("allows authenticated DC to list KPI records", async () => {
      const res = await request(app)
        .get("/api/v1/kpis/records?limit=10")
        .set(authHeader(UserRole.DC, UNIT.district));
      expect(res.status).toBe(200);
    });
  });
});
