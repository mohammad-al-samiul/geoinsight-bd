import amqp, { Channel, ChannelModel, ConsumeMessage } from "amqplib";
import { env } from "../../core/config/env";
import { broadcastToHierarchy, emitToNational } from "../socket/socket.server";
import { mapGovEventType, SOCKET_EVENTS } from "../socket/socket.rooms";
import { govQueueMessageSchema } from "./gov-queue.schema";
import { setGovPublisherChannel } from "./gov-queue.publisher";

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

const RECONNECT_MS = 5_000;

export function isGovQueueConnected(): boolean {
  return Boolean(channel && connection);
}

export async function startGovQueueConsumer(): Promise<void> {
  await connectWithRetry();
}

async function connectWithRetry(): Promise<void> {
  try {
    connection = await amqp.connect(env.RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(env.RABBITMQ_GOV_QUEUE, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": env.RABBITMQ_EXCHANGE,
        "x-dead-letter-routing-key": "dead.gov",
      },
    });
    await channel.prefetch(10);
    setGovPublisherChannel(channel);

    console.info(`[rabbitmq] Consuming ${env.RABBITMQ_GOV_QUEUE}`);
    await channel.consume(env.RABBITMQ_GOV_QUEUE, onMessage, { noAck: false });

    connection.on("close", () => {
      channel = null;
      connection = null;
      setGovPublisherChannel(null);
      setTimeout(() => void connectWithRetry(), RECONNECT_MS);
    });
  } catch (error) {
    console.error("[rabbitmq] Connect failed, retrying...", error);
    setTimeout(() => void connectWithRetry(), RECONNECT_MS);
  }
}

function parsePayload(msg: ConsumeMessage): Record<string, unknown> | null {
  try {
    return JSON.parse(msg.content.toString()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function onMessage(msg: ConsumeMessage | null): Promise<void> {
  if (!msg || !channel) return;

  try {
    const raw = parsePayload(msg);
    if (!raw) {
      channel.ack(msg);
      return;
    }

    const type = String(raw.type ?? "");
    if (type === "arbitrage_update" || type === "arbitrage_result") {
      emitToNational(SOCKET_EVENTS.ARBITRAGE_UPDATE, {
        ...raw,
        timestamp: new Date().toISOString(),
      });
      channel.ack(msg);
      return;
    }

    const parsed = govQueueMessageSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn("[rabbitmq] Unknown gov message type:", type);
      channel.ack(msg);
      return;
    }

    const { type: eventType, adminUnitId, payload } = parsed.data;
    await broadcastToHierarchy(adminUnitId, mapGovEventType(eventType), {
      type: eventType,
      adminUnitId,
      payload,
      timestamp: new Date().toISOString(),
    });

    channel.ack(msg);
  } catch (error) {
    console.error("[rabbitmq] Processing error:", error);
    channel.nack(msg, false, true);
  }
}

export async function publishToExchange(
  routingKey: string,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!channel) throw new Error("RabbitMQ channel not ready");
  channel.publish(env.RABBITMQ_EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), {
    contentType: "application/json",
    persistent: true,
  });
}

export async function closeRabbitMq(): Promise<void> {
  setGovPublisherChannel(null);
  await channel?.close();
  await connection?.close();
  channel = null;
  connection = null;
}
