import { UserRole } from "@prisma/client";
import request from "supertest";
import { createApp } from "../../src/create-app";
import { installPrismaMocks } from "../helpers/fixtures";
import { authHeader } from "../helpers/tokens";
import { nationalSectorService } from "../../src/modules/national-sector/national-sector.service";
import { localPulseService } from "../../src/modules/local-entity/pulse.service";
import { complaintService } from "../../src/modules/local-entity/complaint.service";
import { alertDeliveryService } from "../../src/modules/alert-delivery/alert-delivery.service";

const MP_UNIT = "c8000001-0001-4001-8001-000000000011";

describe("Phase 7 smoke — pulse, SLA, sectors, alert SMS, health", () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
    installPrismaMocks();
    jest.spyOn(nationalSectorService, "getBoard").mockResolvedValue({
      csvDistricts: 3,
    } as never);
    jest.spyOn(localPulseService, "getPulse").mockResolvedValue({
      summary: { influencerCount: 0, pollingCenterCount: 0 },
    } as never);
    jest.spyOn(complaintService, "list").mockResolvedValue({
      summary: { overdue: 2 },
    } as never);
    jest.spyOn(alertDeliveryService, "list").mockResolvedValue({
      summary: { sms: 1, whatsapp: 1, voice: 0 },
      smsEnabled: true,
    } as never);
  });

  it("returns health info with sentimentMock and seedVersion", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(typeof res.body.info?.sentimentMock).toBe("boolean");
    expect(res.body.info?.seedVersion).toBe("2026.08.15.p7");
  });

  it("allows PMO to read the national sector board", async () => {
    const res = await request(app)
      .get("/api/v1/national-sector/board")
      .set(authHeader(UserRole.PMO));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.csvDistricts).toBe(3);
  });

  it("blocks UNION_CHAIRMAN from the national sector board (403)", async () => {
    const res = await request(app)
      .get("/api/v1/national-sector/board")
      .set(authHeader(UserRole.UNION_CHAIRMAN, "11111111-1111-1111-1111-111111111105"));
    expect(res.status).toBe(403);
  });

  it("allows MP to read local pulse", async () => {
    const res = await request(app)
      .get("/api/v1/local-entity/pulse")
      .set(authHeader(UserRole.MP, MP_UNIT));
    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBeDefined();
  });

  it("allows MP to read complaint SLA overdue summary", async () => {
    const res = await request(app)
      .get("/api/v1/local-entity/complaints")
      .set(authHeader(UserRole.MP, MP_UNIT));
    expect(res.status).toBe(200);
    expect(res.body.data.summary.overdue).toBe(2);
  });

  it("allows MP to read alert deliveries including SMS", async () => {
    const res = await request(app)
      .get("/api/v1/local-entity/alert-deliveries")
      .set(authHeader(UserRole.MP, MP_UNIT));
    expect(res.status).toBe(200);
    expect(res.body.data.summary.sms).toBe(1);
  });

  it("blocks UNION_CHAIRMAN from local pulse (403)", async () => {
    const res = await request(app)
      .get("/api/v1/local-entity/pulse")
      .set(authHeader(UserRole.UNION_CHAIRMAN, "11111111-1111-1111-1111-111111111105"));
    expect(res.status).toBe(403);
  });
});
