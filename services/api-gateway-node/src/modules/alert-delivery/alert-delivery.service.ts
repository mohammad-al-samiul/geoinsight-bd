import {
  AlertDeliveryChannel,
  AlertDeliveryStatus,
  UserRole,
} from "@prisma/client";
import { env } from "../../core/config/env";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";
import { ApiError } from "../../core/errors/api.error";
import { resolveLocalEntityId } from "../local-entity/local-entity.scope";

export interface CrisisAlertInput {
  entityId: string;
  sourceKind: "citizen_complaint" | "specialty_signal" | "manual" | "morning_digest";
  sourceId?: string;
  title: string;
  detail?: string;
  severity?: string;
  forceVoice?: boolean;
}

function preview(text: string, max = 480): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

async function recipientsForEntity(entityId: string) {
  return prismaRead.user.findMany({
    where: {
      isActive: true,
      adminUnitId: entityId,
      role: { in: [UserRole.MP, UserRole.MAYOR] },
      phone: { not: null },
    },
    select: { id: true, email: true, phone: true, role: true },
  });
}

async function deliverWhatsApp(to: string, body: string): Promise<{
  status: AlertDeliveryStatus;
  providerRef?: string;
  error?: string;
}> {
  if (env.ALERT_DELIVERY_MODE === "dry_run") {
    return { status: AlertDeliveryStatus.DRY_RUN, providerRef: `dry:${Date.now()}` };
  }

  if (env.ALERT_DELIVERY_MODE === "meta") {
    if (!env.WHATSAPP_API_URL || !env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
      return {
        status: AlertDeliveryStatus.FAILED,
        error: "Meta WhatsApp env incomplete",
      };
    }
    try {
      const res = await fetch(
        `${env.WHATSAPP_API_URL}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: to.replace(/\D/g, ""),
            type: "text",
            text: { body },
          }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as { messages?: Array<{ id?: string }> };
      if (!res.ok) {
        return { status: AlertDeliveryStatus.FAILED, error: `Meta HTTP ${res.status}` };
      }
      return {
        status: AlertDeliveryStatus.SENT,
        providerRef: json.messages?.[0]?.id,
      };
    } catch (err) {
      return {
        status: AlertDeliveryStatus.FAILED,
        error: err instanceof Error ? err.message : "Meta send failed",
      };
    }
  }

  // twilio whatsapp
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_WHATSAPP_FROM) {
    return { status: AlertDeliveryStatus.FAILED, error: "Twilio WhatsApp env incomplete" };
  }
  try {
    const auth = Buffer.from(
      `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`,
    ).toString("base64");
    const params = new URLSearchParams({
      To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
      From: env.TWILIO_WHATSAPP_FROM,
      Body: body,
    });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      },
    );
    const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
    if (!res.ok) {
      return {
        status: AlertDeliveryStatus.FAILED,
        error: json.message ?? `Twilio HTTP ${res.status}`,
      };
    }
    return { status: AlertDeliveryStatus.SENT, providerRef: json.sid };
  } catch (err) {
    return {
      status: AlertDeliveryStatus.FAILED,
      error: err instanceof Error ? err.message : "Twilio send failed",
    };
  }
}

async function deliverVoice(to: string, sayText: string): Promise<{
  status: AlertDeliveryStatus;
  providerRef?: string;
  error?: string;
}> {
  if (!env.ALERT_VOICE_ENABLED) {
    return { status: AlertDeliveryStatus.DRY_RUN, providerRef: "voice-disabled" };
  }
  if (env.ALERT_DELIVERY_MODE === "dry_run") {
    return { status: AlertDeliveryStatus.DRY_RUN, providerRef: `voice-dry:${Date.now()}` };
  }
  if (env.ALERT_DELIVERY_MODE !== "twilio") {
    return {
      status: AlertDeliveryStatus.FAILED,
      error: "Voice requires ALERT_DELIVERY_MODE=twilio",
    };
  }
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_VOICE_FROM) {
    return { status: AlertDeliveryStatus.FAILED, error: "Twilio voice env incomplete" };
  }
  try {
    const auth = Buffer.from(
      `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`,
    ).toString("base64");
    const twiml = `<Response><Say language="bn-BD">${sayText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</Say></Response>`;
    const params = new URLSearchParams({
      To: to,
      From: env.TWILIO_VOICE_FROM,
      Twiml: twiml,
    });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      },
    );
    const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
    if (!res.ok) {
      return {
        status: AlertDeliveryStatus.FAILED,
        error: json.message ?? `Twilio voice HTTP ${res.status}`,
      };
    }
    return { status: AlertDeliveryStatus.SENT, providerRef: json.sid };
  } catch (err) {
    return {
      status: AlertDeliveryStatus.FAILED,
      error: err instanceof Error ? err.message : "Twilio voice failed",
    };
  }
}

export class AlertDeliveryService {
  async notifyCrisis(input: CrisisAlertInput) {
    const recipients = await recipientsForEntity(input.entityId);
    const isDigest = input.sourceKind === "morning_digest";
    const body = isDigest
      ? [input.title, input.detail ? input.detail.slice(0, 420) : null]
          .filter(Boolean)
          .join("\n")
      : [
          `GeoInsight RED ALERT`,
          input.title,
          input.detail ? input.detail.slice(0, 200) : null,
          input.severity ? `Severity: ${input.severity}` : null,
          `Source: ${input.sourceKind}`,
        ]
          .filter(Boolean)
          .join("\n");

    const voiceText = isDigest
      ? `জিওইনসাইট সকালের ডাইজেস্ট। ${input.title}`
      : `জিওইনসাইট সতর্কতা। ${input.title}`;

    const logs = [];
    for (const user of recipients) {
      const phone = user.phone!.trim();
      const wa = await deliverWhatsApp(phone, body);
      const waFailed = wa.status === AlertDeliveryStatus.FAILED;
      logs.push(
        await prismaWrite.alertDeliveryLog.create({
          data: {
            channel: AlertDeliveryChannel.WHATSAPP,
            status: waFailed ? AlertDeliveryStatus.QUEUED : wa.status,
            toAddress: phone,
            bodyPreview: preview(body),
            providerRef: wa.providerRef,
            error: wa.error,
            sourceKind: input.sourceKind,
            sourceId: input.sourceId,
            entityId: input.entityId,
            userId: user.id,
            payload: { mode: env.ALERT_DELIVERY_MODE, title: input.title, body, voiceText },
            retryCount: 0,
            lastAttemptAt: new Date(),
            nextRetryAt: waFailed ? new Date(Date.now() + 5 * 60_000) : null,
          },
        }),
      );

      const critical =
        input.forceVoice ||
        input.severity === "CRITICAL" ||
        input.severity === "ALERT";
      if (critical) {
        const voice = await deliverVoice(phone, voiceText);
        const voiceFailed = voice.status === AlertDeliveryStatus.FAILED;
        logs.push(
          await prismaWrite.alertDeliveryLog.create({
            data: {
              channel: AlertDeliveryChannel.VOICE,
              status: voiceFailed ? AlertDeliveryStatus.QUEUED : voice.status,
              toAddress: phone,
              bodyPreview: preview(voiceText),
              providerRef: voice.providerRef,
              error: voice.error,
              sourceKind: input.sourceKind,
              sourceId: input.sourceId,
              entityId: input.entityId,
              userId: user.id,
              payload: { mode: env.ALERT_DELIVERY_MODE, title: input.title, body, voiceText },
              retryCount: 0,
              lastAttemptAt: new Date(),
              nextRetryAt: voiceFailed ? new Date(Date.now() + 5 * 60_000) : null,
            },
          }),
        );
      }
    }

    return {
      mode: env.ALERT_DELIVERY_MODE,
      recipientCount: recipients.length,
      deliveries: logs.length,
      items: logs,
    };
  }

  async retryDue(limit = 25) {
    const due = await prismaRead.alertDeliveryLog.findMany({
      where: {
        status: { in: [AlertDeliveryStatus.QUEUED, AlertDeliveryStatus.FAILED] },
        retryCount: { lt: 3 },
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    let retried = 0;
    let sent = 0;
    let failed = 0;
    for (const row of due) {
      const payload = (row.payload as { body?: string; voiceText?: string } | null) ?? {};
      const body = payload.body || row.bodyPreview;
      const voiceText = payload.voiceText || row.bodyPreview;
      const result =
        row.channel === AlertDeliveryChannel.VOICE
          ? await deliverVoice(row.toAddress, voiceText)
          : await deliverWhatsApp(row.toAddress, body);

      const nextCount = row.retryCount + 1;
      const stillFail = result.status === AlertDeliveryStatus.FAILED;
      await prismaWrite.alertDeliveryLog.update({
        where: { id: row.id },
        data: {
          status: stillFail
            ? nextCount >= 3
              ? AlertDeliveryStatus.FAILED
              : AlertDeliveryStatus.QUEUED
            : result.status,
          providerRef: result.providerRef ?? row.providerRef,
          error: result.error ?? null,
          retryCount: nextCount,
          lastAttemptAt: new Date(),
          nextRetryAt: stillFail && nextCount < 3
            ? new Date(Date.now() + Math.min(30, 5 * nextCount) * 60_000)
            : null,
        },
      });
      retried += 1;
      if (stillFail) failed += 1;
      else sent += 1;
    }

    return { due: due.length, retried, sent, failed };
  }

  async retryOne(
    user: { role: UserRole; adminUnitId: string | null },
    deliveryId: string,
  ) {
    const row = await prismaRead.alertDeliveryLog.findUnique({ where: { id: deliveryId } });
    if (!row) throw ApiError.notFound("Delivery not found");
    if (row.entityId) await resolveLocalEntityId(user, row.entityId);

    await prismaWrite.alertDeliveryLog.update({
      where: { id: deliveryId },
      data: {
        status: AlertDeliveryStatus.QUEUED,
        nextRetryAt: new Date(),
      },
    });
    return this.retryDue(1);
  }

  async list(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string; limit?: number } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const limit = Math.min(opts.limit ?? 40, 100);
    const items = await prismaRead.alertDeliveryLog.findMany({
      where: { entityId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    const summary = {
      total: items.length,
      dryRun: items.filter((i) => i.status === AlertDeliveryStatus.DRY_RUN).length,
      sent: items.filter((i) => i.status === AlertDeliveryStatus.SENT).length,
      failed: items.filter((i) => i.status === AlertDeliveryStatus.FAILED).length,
      queued: items.filter((i) => i.status === AlertDeliveryStatus.QUEUED).length,
      whatsapp: items.filter((i) => i.channel === AlertDeliveryChannel.WHATSAPP).length,
      voice: items.filter((i) => i.channel === AlertDeliveryChannel.VOICE).length,
    };
    return {
      entityId,
      mode: env.ALERT_DELIVERY_MODE,
      voiceEnabled: env.ALERT_VOICE_ENABLED,
      summary,
      items,
    };
  }
}

export const alertDeliveryService = new AlertDeliveryService();
