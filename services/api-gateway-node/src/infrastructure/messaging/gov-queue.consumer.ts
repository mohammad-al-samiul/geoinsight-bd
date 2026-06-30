import amqp, { Channel, ChannelModel, ConsumeMessage } from "amqplib";
import { env } from "../../core/config/env";
import { broadcastToHierarchy } from "../socket/socket.server";
import { mapGovEventType } from "../socket/socket.rooms";
import { govQueueMessageSchema } from "./gov-queue.schema";
import { setGovPublisherChannel } from "./gov-queue.publisher";

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

const RECONNECT_MS = 5_000;

export async function startGovQueueConsumer(): Promise<void> {
  await connectWithRetry();
}

async function connectWithRetry(): Promise<void> {
  try {
    connection = await amqp.connect(env.RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(env.RABBITMQ_GOV_QUEUE, { durable: true });
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

async function onMessage(msg: ConsumeMessage | null): Promise<void> {
  if (!msg || !channel) return;

  try {
    const parsed = govQueueMessageSchema.safeParse(JSON.parse(msg.content.toString()));
    if (!parsed.success) {
      channel.ack(msg);
      return;
    }

    const { type, adminUnitId, payload } = parsed.data;
    await broadcastToHierarchy(adminUnitId, mapGovEventType(type), {
      type,
      adminUnitId,
      payload,
      timestamp: new Date().toISOString(),
    });

    channel.ack(msg);
  } catch (error) {
    console.error("[rabbitmq] Processing error:", error);
    channel.nack(msg, false, false);
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
